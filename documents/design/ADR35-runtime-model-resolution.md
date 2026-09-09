---
name: ADR35-runtime-model-resolution
description: ADR35 — the model is whichever one Ollama currently has loaded, resolved per call from /api/ps, and a call with nothing loaded is an error rather than an implicit load
date: 2026-09-08
metadata:
  version: 1.0
  created-by: Claude Opus 5
  story: P2.12
  adr: ADR35
---

# ADR35 — The model is whichever one Ollama has loaded

**Date:** 2026-09-08
**Status:** Accepted
**Supersedes:** nothing
**Arises from:** Story P2.12, and P2.10's closing finding
**Related:** ADR31 (classification contract), `design/SPIKE-LOCAL-MODEL-SELECTION.md`, Story P2.11

Filed as its own file, following ADR29, ADR30 and ADR31. Fold the four into `ADRS.md` together.

## Context

`application.yaml` has carried `ollama.model: mistral` since the skeleton, and
`OllamaHttpClient` puts that string into every request body. P2.10 closed on 2026-09-08 having
established that `mistral` is installed nowhere: `ollama list` holds `devstral:24b` and
`gemma4:12b`. The first real Classifier call would get a model-not-found.

That went unnoticed for the length of the project because nothing ever asked the server for a model.
P2.4's 33 tests run against a hand-written fake `OllamaClient`, and P2.1's own verification is
against `MockRestServiceServer`. A configured name is exactly the kind of value that is never wrong
until it is used.

The work immediately ahead makes it worse rather than better. Story P2.11 compares models for speed
and tag quality, and `design/SPIKE-LOCAL-MODEL-SELECTION.md` recommends a model the machine does not
have. With a configured name, every arm of that comparison is an `application.yaml` edit and an
application restart, and the config drifts from what is actually loaded on every one of them.

Ollama already holds the answer. It loads a model on demand, keeps it resident for `keep_alive`, and
reports what is resident from `GET /api/ps`.

## Decision 1 — the model is resolved per call from `/api/ps`, and `ollama.model` is removed

The client asks Ollama which model is loaded and uses that name. There is no configured model name
anywhere, so the configuration cannot name something that does not exist.

Swapping models becomes `ollama stop <a>; ollama run <b>` with the application untouched and running.
That is the workflow P2.11 needs, and it is the workflow a person comparing two models would use
anyway.

**Resolved per call, not cached at startup.** Caching would make a mid-session swap silently stale,
and a stale answer here is worse than a slow one: the log would attribute a result to a model that
did not produce it, which is precisely what P2.11's measurements must not do. The cost is one
loopback GET against a classification measured in tens of seconds. The resolution happens inside the
call the `ConcurrencyGate` already serialises, so it adds no concurrency of its own.

## Decision 2 — the native API root is derived by stripping one trailing `/v1`

`/api/ps` is not on the OpenAI-compatible surface. `ollama.url` ends in `/v1` by configuration, by
the comment above it, and by `OllamaHttpClient`'s own javadoc, which warns that appending
`/v1/chat/completions` to it yields a 404 that reads like the service being down.

So the client keeps `baseUrl` for `/chat/completions` and derives a second root by stripping one
trailing `/v1` segment, giving `http://localhost:11434/api/ps`. A URL that does not end in `/v1` is
used as-is. No new configuration key: two keys that must agree are two keys that will not.

## Decision 3 — nothing loaded is an error, raised before the request

**When `/api/ps` reports no models, the call throws `OllamaException` without contacting
`/chat/completions`.** The message names the fix, so the log says `ollama run <model>` rather than
leaving somebody to work out what a model-not-found means.

The alternative is to name a model and let Ollama load it implicitly, which is what the code does
today and what produced a configuration pointing at nothing for the whole life of the project. An
implicit load also takes minutes on this hardware for a large model, inside a call whose read timeout
is 120 seconds, so the failure it produces is a timeout rather than a diagnosis.

A machine with a probe that cannot reach Ollama at all keeps its existing behaviour — that is an
unreachable-service error, and it stays distinct from a reachable service with nothing loaded.

## Decision 4 — several loaded: use the first and warn

`/api/ps` returns a list. When it holds more than one entry, the client uses the first and logs a
WARN naming all of them.

Erroring on ambiguity is defensible and was rejected as too brittle for the workflow this exists to
serve: someone comparing models will have two loaded at some point, and failing every classification
until they stop one is a worse default than picking one and saying so. The existing
`Ollama chat model=…` INFO line already attributes each result, so a P2.11 run stays readable even
if it happens under an ambiguous `ps`.

## Decision 5 — `isAvailable()` means a model is loaded

It currently probes `/v1/models`, which lists *installed* models. That returns true in exactly the
situation where every chat call fails, which makes it worse than no probe at all. It now reports
whether a model is loaded, which is the question its callers are asking.

## Consequences

**ADR31's failure semantics are unchanged, and that is now load-bearing.** An `OllamaException` in
the Classifier is non-fatal: it logs at ERROR, leaves `topic` null, writes no tags, and routes on to
the Indexer. So on a machine with nothing loaded, documents flow through the pipeline unclassified
with one ERROR each, and the vault fills with untagged files rather than stopping. That is ADR31's
deliberate choice and this ADR does not revisit it. Changing model resolution and failure semantics
in one pass would make both unreviewable, and ADR31's argument — an unclassified document in the
vault is worth more than a document stopped outside it — is not weakened by the cause of the failure
changing.

**An existing deployment's `ollama.model` value is ignored rather than rejected.** Acceptable here
because the only value it ever held names a model installed nowhere. A configuration key that is read
by nothing is removed from `application.yaml` in the same change, so nothing is left claiming to
control something.

**Nothing auto-loads a model any more.** Before, naming a model made Ollama load it on first use.
Now the person decides what runs. That is the point of the decision and it is also its cost: a
machine that reboots and starts the application will fail every LLM call until someone runs a model,
with no startup warning, because P2.10 left the startup-probe question out of scope and no story has
picked it up.

**P2.11 swaps models with `ollama run`, not with configuration.** Its harness gets simpler and its
per-arm attribution comes from the log line rather than from the config file it was launched with.

## Alternatives rejected

| | Why not |
|---|---|
| Keep `ollama.model`, pin it to a real model | Fixes today's symptom and keeps the mechanism that caused it. It also puts an `application.yaml` edit and a restart in the middle of every P2.11 comparison arm |
| Keep `ollama.model` as an override when set, fall back to `/api/ps` | Two sources of truth for one value, and the one that wins is the one that is wrong more often — a stale config outlives a running process |
| Resolve once at startup and cache | A mid-session `ollama run` swap would be invisible, and the log would attribute results to the wrong model. The saving is one loopback GET per classification |
| Error when more than one model is loaded | Brittle for the comparison workflow this exists to serve; the log line already attributes each result. Decision 4 |
| Fall back to the first *installed* model when none is loaded | Silently loads a 24B model on a machine that cannot hold it, inside a 120-second read timeout. The failure would be a timeout rather than a diagnosis |
| Add a second config key for the native API root | Two keys that must agree will stop agreeing. Decision 2 derives it instead |
