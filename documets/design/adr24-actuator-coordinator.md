---
name: adr24-actuator-coordinator
description: Actuators hand off directly to each other through a Coordinator; the sweep becomes an auxiliary stalled-job detector, not the primary delivery path
metadata:
  version: 1.0
  created-by: Claude Sonnet 5
  date: 2026-09-03
---

# ADR 24: Actuator Coordinator — direct handoff, sweep as auxiliary backstop

**Date Created:** 2026-09-03
**Status:** Proposed
**Epic:** EP4 (Overnight Batch Processing Engine), touches EP1/EP2/EP3's actuators
**Story:** 4.1 (Background Sweep & Queue Execution Script) — revises its scope; a new Story is needed for the Coordinator itself (see Open Questions)

## Problem

`documets/OriginalProcess.uml` — a sequence diagram already in this repo, predating the current job-queue implementation — shows a `Coordinator` actor delivering documents to actuators, with actuators then messaging each other directly (`Ingestor -> TextExtractor`, `Ingestor -> Indexer`, `Indexer -> Classifier`, etc.). Story 4.1 was implemented without reference to this diagram: `batch/worker.js`'s "Design decisions" section explicitly chose a different model — actuators only write a `job` row for the next stage, and a periodic external-scheduler sweep (`runCycle()`, per ADR9) is the only thing that ever picks it up.

Bug 101 (`documets/bugs/Bug-101.md`) exposed the consequence: a document can sit fully processed at one stage with a valid next-stage `job` row already `New` in the database, and go nowhere, because nothing is currently scheduled to run the sweep at all (no cron/systemd timer/Windows scheduled task exists yet — see that bug's investigation). Bug 101's fix corrected the job-row chain (each actuator now creates the right next-stage row, matching `Ingestion-State-Diagram.md`'s routing) but did not address delivery: the chain still depends entirely on some future sweep invocation to advance, with no bound on how long a document waits.

Per user direction (2026-09-03): the sweep was only ever meant to be **auxiliary** — a mechanism to discover actuators that are "down" (crashed mid-job, never picked up a `job` row it should have) — not the main way work moves through the pipeline. The main interaction is actuators handing off directly to each other, through a Coordinator.

## Decision

Introduce a **Coordinator** component that actuators call synchronously (in-process) after they finish, instead of relying solely on the next sweep to notice a new `job` row.

- Each actuator, on successful completion, still writes the next-stage `job` row (Bug 101's fix — this stays, because it's also the sweep's source of truth and the audit trail Story 13.4's dashboard reads).
- Additionally, the actuator immediately calls the Coordinator with the newly created job. The Coordinator looks up the registered executor for that job's `job_type` (the same `job-executors.js` dispatch table `batch/worker.js` already uses), claims it (`markRunning`), and invokes it — synchronously, in the same process, no network hop. If that executor in turn produces another handoff, the Coordinator recurses down the chain immediately.
- `batch/worker.js`'s sweep keeps its `runCycle()` implementation as-is, but its role changes: it becomes the backstop that catches jobs the Coordinator path missed — a `New` job whose creating actuator crashed before calling the Coordinator, a job that failed transiently and needs the orphan/stale-lock cleanup it already does (`cleanup.js`), or the very first job in a chain (created by `ingest-service.js` from a web-form submission or the file watcher, which has no "previous actuator" to call the Coordinator on its behalf — so the watcher/ingest-service call the Coordinator directly too, same as an actuator would for its own handoff).
- Still invoked periodically by an external scheduler (per ADR9) — but now as a safety net running every N minutes, not as the only delivery mechanism. Its expected steady-state result is "nothing to do," not "here's what accumulated since last time."

## Why

- Matches `OriginalProcess.uml`, the design artifact that already existed for this — Story 4.1's implementation diverged from it without a recorded reason to override it.
- Fixes the actual symptom the user hit: a real document (job 30) staged successfully and sat untouched with zero relevant log lines, because nothing was scheduled to run the sweep at all. A direct Coordinator call removes the dependency on a scheduler existing/firing for the common case; the scheduler only needs to exist at all as a backstop, and its absence becomes a degraded-but-not-broken state rather than a silent full stop.
- Keeps ADR10 (concurrency=1 for Ollama-bound work) intact — the Coordinator still calls into the same `lock-manager.js`-guarded path before invoking an executor that touches Ollama (classify), so a direct call and a sweep-claimed call can't race on the concurrency lock.
- Low blast radius: no new process, no message broker, no new schema. The Coordinator is a function each actuator/entry-point already imports and calls — an in-process design consistent with ADR5 (single Node.js orchestration process) and ADR13 (single repository, no separate services).

## Alternatives rejected

- **Message queue / broker (e.g. a local Redis or SQLite-backed pub/sub):** adds an operational dependency for a single-user, single-process, local-first app (ADR1, ADR12) with no clear benefit over an in-process function call — nothing here needs cross-process delivery yet.
- **Sweep-only, but scheduled tightly (e.g. every few seconds):** doesn't fix the actual problem (no scheduler was ever configured) and turns the "auxiliary" backstop into disguised polling, which is the pattern the user explicitly rejected.
- **HTTP callback between actuators:** actuators are in-process functions in the same Node.js server/batch codebase (ADR5, ADR13) — routing a handoff through HTTP would add latency and a new failure mode (the server not being up) for no isolation benefit.

## Open Questions

1. **Which Story owns building the Coordinator?** Story 4.1 currently owns `batch/worker.js`/the sweep; this ADR changes what the sweep is *for* but the Coordinator itself (a new module, likely `batch/coordinator.js` or `server/lib/coordinator.js`) isn't clearly Story 4.1's scope anymore since it needs to be callable from `server/lib/ingestion/watcher.js` and `server/lib/ingest-service.js` (server-side, web-form/watcher entry points) as well as from every executor (`batch`/`server` mixed). Needs either a Story 4.1 revision or a new Story under EP4/EP1.
2. **Ollama concurrency under direct dispatch:** today `lock-manager.js`'s file lock is acquired once per sweep invocation (`main()`), around the whole `runCycle()`. Under direct dispatch, a Coordinator call could arrive at any time, including while a sweep already holds the lock — needs the lock acquired per-job-claim (already close to this, since `markRunning` is a guarded single-row UPDATE), not per-sweep. Worth re-verifying against ADR10 before implementing.
3. **Should the Coordinator call be synchronous (blocks the calling actuator/HTTP request until the next stage — or the whole chain — finishes) or fire-and-forget (schedule via `setImmediate`/a microtask, so e.g. the web ingestion form's HTTP response isn't held open through the whole ingest→index→classify chain)?** Fire-and-forget seems necessary for the web-form path (Story 6.1's ingestion endpoint shouldn't block on Ollama classification) but needs to be reconciled with "no unhandled promise rejection crashes the server" — needs a decision before implementation.

**This ADR is Proposed, not Accepted — it requires sign-off (and resolution of the open questions above) before implementation. No code has been changed for this ADR; the Coordinator is not yet built.**
