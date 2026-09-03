---
name: story-1.3
description: Working notes for Story 1.3 [REGRESSION] - Actuator Message-Driven Handoff (Coordinator)
date: 2026-09-03
metadata:
  version: 1.0
  created-by: Claude Sonnet 5
---

# Story 1.3 [REGRESSION]: Actuator Message-Driven Handoff (Coordinator)

Canonical story text lives in `documets/design/Project 4thBrain.md` (EP1). This file tracks the working context behind it.

## Abstract

Actuators are triggered by messages from a Coordinator and produce a message to the next actuator on completion, instead of relying on a periodic sweep to notice a queued job.

## Description

Per `documets/OriginalProcess.uml` — a sequence diagram already in this repo, predating the current job-queue implementation — a `Coordinator` actor delivers documents to actuators, and actuators then message each other directly (`Ingestor -> TextExtractor`, `TextExtractor -> Ingestor`, `Ingestor -> Indexer`, `Indexer -> Classifier`). Story 4.1's implementation (`batch/worker.js`) diverged from this without a recorded reason: actuators only write a `job` row for the next stage, and a periodic external-scheduler sweep (`runCycle()`, per ADR9) is the only thing that ever picks it up.

Bug 101 (`documets/bugs/Bug-101.md`) fixed the job-row chain itself — each actuator now creates the correct next-stage row, matching `documets/design/Ingestion-State-Diagram.md`'s routing (Ingest/Convert → Index → RouteByResult{Classify | VAULT_NOTES | VAULT_RAW} → Classify → VAULT_TREE). That fix did not change the delivery mechanism: a document still only advances when something invokes `batch/worker.js`, and nothing in this repo currently schedules that (no cron/systemd timer/Windows Task Scheduler entry exists — see Evidence below). This story is the delivery-mechanism fix: actuators call a Coordinator directly on completion, and the sweep becomes an auxiliary backstop rather than the only path.

Full design: `documets/design/adr24-actuator-coordinator.md` (ADR24, status **Proposed** — this story implements it once accepted).

## Evidence

Observed live, 2026-09-03, on the running dev server (main checkout, not this worktree):

1. User uploaded `Anti-slop.md` via the web ingestion form. Response confirmed: `staged "Anti-slop.md" (4094 bytes) to ...\RAW_DIR\inbox\8048d114-...\.md (jobId 30)`.
2. `server/bootstrap.log` showed `job_created`/`add_skipped` entries from the file watcher up through job 29, then an `add_skipped` line for job 30's file (`"reason":"already tracked by job_file 30"` — expected: the watcher correctly deferred to the job the web form had already created). **No further log line for job 30 exists anywhere** — no `job_started`, `job_completed`, `job_skipped`, or `job_failed` from `batch/worker.js`.
3. Queried the live database directly: `job` row 30 — `job_type: "ingest"`, `document_id: 30`, `start_date: null`, `end_date: null`, `status: "New"`. Confirmed stuck exactly as reported, with zero processing activity.
4. Root cause confirmed by inspection, not just log absence: `scripts/Start-4thBrain.ps1` starts the web server only and never invokes `batch/worker.js`; no Windows scheduled task exists for it either (`schtasks /query` returned nothing matching). `batch/worker.js`'s own "Design decisions" section (in `documets/story/story-4.1.md`) explicitly assumes "invoked periodically by an external scheduler" — that scheduler was never actually configured, so the sweep, and therefore the entire pipeline past `ingest`, has never run automatically in this environment.
5. User's correction, same session: "sweep is auxiliary to discover down actuators. The main interaction is between actuators — through a coordinator. You did not implement this" — pointing at `documets/OriginalProcess.uml` as the design this diverged from.

This evidence is what job 30 looked like before any Story 1.3 code exists — it demonstrates the gap this story closes, not a result of implementing it.

## Sources Involved and How

| Source | Role in this story |
|---|---|
| `documets/OriginalProcess.uml` | Pre-existing sequence diagram — the design authority for the Coordinator/direct-message pattern. `actor Coordinator` delivers to `Ingestor`; actuators call each other directly from there. This story's acceptance criteria are checked against it. |
| `documets/design/Ingestion-State-Diagram.md` | Canonical state/transition rules (what each actuator hands off to, and under what branch condition). Unaffected by this story — it specifies *what* transitions are legal, not *how* they're delivered. Bug 101 implements this diagram's routing; this story implements the delivery mechanism on top of it. |
| `documets/design/adr24-actuator-coordinator.md` (ADR24) | The formal architecture decision this story implements — Coordinator component, sweep demoted to backstop, plus three open questions (Story ownership — resolved as this story; Ollama concurrency-lock granularity under direct dispatch; sync-vs-fire-and-forget call semantics) that must be resolved during this story's implementation. |
| `documets/bugs/Bug-101.md` | Prerequisite fix already shipped — the `job` row for each next stage now gets created correctly. This story's Coordinator calls read that same row (via `job.create()`'s return value) rather than reinventing routing logic. |
| `documets/DESIGN-DEBT.md` item 7 | Where this gap was formally logged before being promoted to ADR24 + this story. |
| `documets/story/story-4.1.md` | Story 4.1 (the sweep) — this story doesn't replace it, it narrows its role. Story 4.1's `batch/worker.js`, `job-executors.js` dispatch table, and `lock-manager.js` concurrency guard are all reused/extended, not rebuilt, by the Coordinator. |
| `server/lib/ingest-service.js`, `server/lib/ingestion/watcher.js` | The two entry points with no "previous actuator" — per ADR24, these call the Coordinator directly after creating the first job in a chain (web-form submission, or a file dropped straight into `$RAW_DIR/inbox`). |
| `server/lib/ingestion/{ingest,transcode,html-sanitize}-executor.js`, `vault/index-executor.js`, `server/lib/ingestion/classification-executor.js` | The four actuators Bug 101 wired to create next-stage `job` rows — this story adds the Coordinator call alongside each `job.create()` call already added there. |
| `batch/lock-manager.js` | ADR10's concurrency=1 guard (Ollama-bound work). Must be re-verified under direct dispatch — today it's acquired once per sweep invocation in `main()`; a Coordinator call can arrive at any time, so the lock needs to move to per-job-claim granularity (ADR24 open question 2). |

## Status

**READY** — not started. Blocked on ADR24 moving from Proposed to Accepted (its three open questions must be resolved as part of this story's implementation, per its acceptance criteria).

## Changelog

- 2026-09-03: Working notes created. Captured the live evidence (job 30 stuck, no scheduler configured) that prompted this story, and the source map for what ADR24's Coordinator design touches.
