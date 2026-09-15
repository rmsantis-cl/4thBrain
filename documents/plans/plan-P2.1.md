---
name: plan-P2.1
description: Execution plan for Story P2.1 (OllamaClient & ConcurrencyGate) — a gated HTTP client for the local model, in a new package no other plan opens
date: 2026-09-07
metadata:
  version: 1.0
  created-by: Claude Opus 5
  story: P2.1
  owns: src/main/java/com/fourthbrain/llm/**, the ollama block in application.yaml
  new-adr: none
---

# Plan — P2.1 (OllamaClient & ConcurrencyGate)

One of five plans written to run in parallel. See *Parallel safety*. The others are `plan-P1.18.md`,
`plan-P2.2.md`, `plan-P2.4.md` and `plan-P2.5.md`.

This plan is the one the others wait on least and depend on most: it creates files nothing else
opens, and it publishes the interface `plan-P2.4.md` codes against. Merge it early.

## Scope

A `com.fourthbrain.llm` package holding an `OllamaClient` interface, one HTTP implementation, a
`ConcurrencyGate` that admits one call at a time, and the configuration behind them. Nothing else.

The story's third implementation requirement — "inject into `Classifier` and `Briefing`" — is
**deliberately not done here**. `Classifier.java` belongs to `plan-P2.4.md`, and no `Briefing` class
exists in `src/main` at all (`application.yaml:33` reserves a thread count for one that was never
written). Injecting from this plan would put two parallel branches in the same file for no gain. That
criterion re-maps to P2.4 and P2.6; see *Acceptance criteria mapping*.

## Design gate

**No new ADR.** The story specifies the shape (RestTemplate wrapper, `Semaphore(1)`, config from
`application.yaml`), and `ollama.url` / `ollama.model` / `ollama.concurrency` have been in
`application.yaml` since the skeleton. What this plan adds beyond the story is a published interface,
which is a consequence of running P2.4 in parallel rather than a design decision.

**ADR numbers 29, 30 and 31 are reserved** by the other plans in this set (P2.2, P2.5, P2.4
respectively). This plan claims none.

## Verified state of the tree

Read 2026-09-07 on branch `v04`.

| Claim | Verified |
|---|---|
| Nothing in `src/main` calls Ollama; no HTTP client of any kind exists | No match for `RestTemplate`, `WebClient` or `11434` outside `application.yaml` |
| `ollama.url` already includes the `/v1` suffix | `application.yaml:36` |
| `ollama.model` is the floating tag `mistral` | `application.yaml:37` |
| `ollama.concurrency: 1` is configured and unread | `application.yaml:38` |
| `spring-boot-starter-web` is on the classpath, so `RestTemplate` and Jackson are available | `build.gradle:24` |
| `spring-boot-starter-test` brings `MockRestServiceServer` | `build.gradle:49` |
| No `Briefing` class exists | `src/main/java/com/fourthbrain/actuators/` holds five actuators, none named Briefing |
| Tests are failed at 15s each and the task is killed at 3 minutes | `build.gradle:52-61` |

**P2.10 (Deploy Ollama on Windows) disagrees with itself.** `BACKLOG-TRACKER.md:78` records it
COMPLETED on 2026-09-07; `documents/story/P2.10.md`'s own header still says `status: READY`. This
plan's live verification needs a service answering on `localhost:11434`. Settle which is true before
starting step 5 — if the story header is right, P2.10 runs first.

## Step 1 — `ConcurrencyGate`

`com.fourthbrain.llm.ConcurrencyGate`, a `@Component`.

```java
@Component
public class ConcurrencyGate {

    private final Semaphore permits;
    private final long acquireTimeoutMs;

    public ConcurrencyGate(@Value("${ollama.concurrency:1}") int concurrency,
                           @Value("${ollama.acquire-timeout-ms:120000}") long acquireTimeoutMs) {
        this.permits = new Semaphore(concurrency, true);   // fair: FIFO, no starving actuator
        this.acquireTimeoutMs = acquireTimeoutMs;
    }

    public <T> T call(Callable<T> work) throws InterruptedException { ... }
}
```

Four properties the implementation has to hold, and each is a test in step 4:

- **Release in a `finally`.** A call that throws must not leak the permit; one leak and the pipeline
  stops for good.
- **`tryAcquire` with a timeout**, not a bare `acquire()`. A gate with no timeout turns a hung Ollama
  into a permanently blocked actuator thread, which is invisible in a status-driven pipeline for the
  same reason ADR28 gives about stalled conversions. On timeout, throw `OllamaException` naming the
  wait.
- **`InterruptedException` propagates and the interrupt flag is restored.** `Actuator.shutdown()`
  interrupts its thread, and the run loop's `catch (InterruptedException)` breaks the loop. A gate
  that swallowed the interrupt would keep a daemon thread parked through shutdown.
- **Fair mode.** With one permit and two actuator types competing (Classifier now, Briefing later),
  unfair mode can starve one indefinitely.

`concurrency` is a constructor parameter rather than a hardcoded `1` so a machine with headroom can
raise it in config. The default stays 1, which is what the story specifies.

## Step 2 — the `OllamaClient` interface

**This file is a shared contract.** `plan-P2.4.md` reproduces it verbatim and creates it if it is not
already on the branch, so P2.4 can compile before this plan merges. Git resolves an add/add of
byte-identical content without a conflict; if the two ever differ, **this plan's copy wins** and the
other is discarded.

```java
package com.fourthbrain.llm;

/** A call to the local model. Implementations are gated: one call is in flight at a time (P2.1). */
public interface OllamaClient {

    /**
     * Sends one prompt and returns the assistant's message content.
     *
     * @param systemPrompt instruction context, or null for none
     * @param userPrompt   the message; never null
     * @return the reply text, never null (an empty reply comes back as "")
     * @throws OllamaException      the service was unreachable, answered non-2xx, or returned
     *                              a body with no choices
     * @throws InterruptedException the calling thread was interrupted while waiting for the gate
     */
    String chat(String systemPrompt, String userPrompt) throws InterruptedException;

    /** A cheap reachability check that does not consume a gate permit. */
    boolean isAvailable();
}
```

Plus `OllamaException extends RuntimeException`, carrying the HTTP status where there was one and a
truncated body snippet. Unchecked on purpose: an actuator's `doTheThing` cannot add a checked
exception without changing `Actuator`, which is frozen (see *Parallel safety*).

Two things deliberately absent. There is no streaming variant — nothing in the roadmap consumes
tokens as they arrive. And there is no multi-turn `List<Message>` overload; `ChatController` will
want one when DD-5 gets an owner, and adding it before there is a caller is guessing at the shape.

## Step 3 — `OllamaHttpClient`

`com.fourthbrain.llm.OllamaHttpClient implements OllamaClient`, a `@Component`.

- `POST ${ollama.url}/chat/completions`. **`ollama.url` already ends in `/v1`** (`application.yaml:36`),
  so the path appended is `/chat/completions` and nothing else. Getting this wrong yields a 404 that
  reads like the service being down.
- Body: `{ "model": "${ollama.model}", "messages": [...], "stream": false }`. The system message is
  omitted when `systemPrompt` is null rather than sent as an empty string.
- `RestTemplate` built from `RestTemplateBuilder` with `connectTimeout` and `readTimeout` from config.
  Build it in the constructor; do not declare a `RestTemplate` `@Bean`, which would be a shared object
  another plan might later configure differently.
- The whole request goes inside `gate.call(...)`. The gate is the only thing serialising these calls,
  so no path may reach the HTTP call around it.
- Response: read `choices[0].message.content` with Jackson. A 2xx body with an empty `choices` array
  is an `OllamaException`, not a null return — a silent null would land in the Classifier's parser as
  a parse failure and hide the real cause.
- Non-2xx and `ResourceAccessException`: log at error with the status and the first ~200 characters of
  the body, then wrap in `OllamaException`. The story asks for errors "logged and propagated"; both,
  not one.
- `isAvailable()` does a `GET ${ollama.url}/models` with a short timeout, outside the gate, and
  returns false on any exception. Used by the startup log line in step 5 and by nothing on the hot
  path.
- Log one line per call at INFO with the model, the prompt length and the elapsed time, and the reply
  at DEBUG. Elapsed time is what ADR28's trigger 3 wants as its comparison point for conversion cost,
  and it is free to capture here.

## Step 4 — configuration

**This plan owns the `ollama:` block and nothing else in `application.yaml`.** Add keys to the end of
that block; do not reorder the file or touch another plan's block.

```yaml
ollama:
  url: http://localhost:11434/v1
  model: mistral
  concurrency: 1
  connect-timeout-ms: 5000
  read-timeout-ms: 120000
  acquire-timeout-ms: 120000
```

Every new key carries a default in its `@Value`, so a deployment with the old three-key block still
starts.

`model: mistral` is a floating tag, which P2.10 exists partly to pin. Leave it alone here — changing
it is that story's, and doing it from this plan would move classification behaviour under a change
that is supposed to be about transport.

## Step 5 — tests

**`ConcurrencyGateTest`** — plain JUnit 5, no Spring context, so it runs in milliseconds:

- Two threads, one permit: the second does not enter until the first returns. Assert on ordering
  through a `CountDownLatch`, not on sleeps — the suite fails any method running past 15 seconds.
- A `Callable` that throws leaves a permit available.
- `tryAcquire` timing out throws `OllamaException` rather than blocking.
- Interrupting a waiting thread throws `InterruptedException` with the interrupt flag set.

**`OllamaHttpClientTest`** — `MockRestServiceServer` bound to the client's own `RestTemplate`:

- A canned `/v1/chat/completions` body returns the assistant content.
- The request URI is `.../v1/chat/completions` exactly once, and the body carries `stream: false` and
  the configured model.
- A null `systemPrompt` produces a one-message array.
- HTTP 500 raises `OllamaException` carrying the status.
- A 2xx body with `"choices": []` raises `OllamaException`, not a null.

**No live-Ollama test in the suite.** A real round trip against a 7B model can exceed the 15s
per-method timeout on a cold model load, which would make the build fail for a reason unrelated to
the code. The live check is manual, in verification below.

## Verification

1. `scripts/build-log.ps1 -Task build` compiles.
2. `scripts/build-log.ps1 -Task test` is green with nothing skipped.
3. With Ollama running (P2.10), a manual round trip — a throwaway `CommandLineRunner`, a JShell
   snippet, or the temporary `@GetMapping` you delete before committing — returns a real reply and
   logs the elapsed time. Record that number: ADR28's trigger 3 wants it.
4. With Ollama stopped, the same call logs an error naming the connection failure and throws
   `OllamaException`. The application still starts — nothing in this plan fails the context.
5. Two concurrent calls: the second's log line starts after the first's completes.

## Parallel safety

**Owns:** `src/main/java/com/fourthbrain/llm/` (new package, four files) and the `ollama:` block in
`application.yaml`.

**Shared contract published:** `OllamaClient.java` and `OllamaException.java`, reproduced verbatim in
`plan-P2.4.md`. If both branches created them, this plan's copies are authoritative.

**Must not touch:** `Actuator.java`, `Coordinator.java`, `DatabaseService.java`, any actuator
subclass, `schema.sql`, `index.html`. In particular **do not inject into `Classifier.java`** — that
file belongs to `plan-P2.4.md`.

`Actuator.java` is frozen across all five plans. DD-1 (two services write `Document.status`, only one
synchronized) lives in that file and stays open; a plan touching it would collide with the other three
actuator plans at once.

**Merge order:** first of the five, if there is a choice. P2.4 compiles cleanly against a tree that
already has this.

## Scope boundary

Out, deliberately:

- **Wiring `Classifier`** — P2.4 owns that file.
- **`Briefing`** — the class does not exist. P2.6.
- **`/api/chat/llama`** — still the stub that echoes. ADR27 makes ASK a first-class action and no
  story owns making it real; logged as DD-5. This plan supplies exactly what that work will need.
- **Pinning the model tag, installing Ollama, autostart** — P2.10.
- **Retries and backoff.** One call, one outcome. A retry policy under a one-permit gate needs a
  decision about whether a retry re-queues behind other work, and there is no evidence yet about what
  fails.
- **Prompt content of any kind.** P2.4 and P2.6 own their prompts.

## Acceptance criteria mapping

| Criterion (P2.1) | Closed by |
|---|---|
| OllamaClient calls Ollama and parses responses | Step 3, verification 3 and `OllamaHttpClientTest` |
| ConcurrencyGate enforces concurrency=1 | Step 1, `ConcurrencyGateTest`, verification 5 |
| Classifier and Briefing wait for the prior call | **Re-mapped.** The gate is what enforces it (step 1); the injection is P2.4's for Classifier and P2.6's for Briefing, which does not exist |
| Error responses logged and propagated | Step 3, verification 4 |

The re-mapping is the one place this plan departs from the story as written, and the reason is
parallel safety rather than scope. Record it in the story's closing note.

## Risks

- **`ollama.url` already ends in `/v1`.** Appending `/v1/chat/completions` gives a 404 that presents
  as "Ollama is down". The test asserting the exact URI is there for this.
- **A hung model with no acquire timeout parks an actuator thread permanently**, and a
  status-driven pipeline shows nothing. Step 1's `tryAcquire` is the guard.
- **The 15s per-test timeout is a trap for anyone adding a live test later.** Keep live calls out of
  the suite.
- **P2.10's status is unresolved**, so verification 3 may be blocked on an install. Nothing else in
  this plan is.
