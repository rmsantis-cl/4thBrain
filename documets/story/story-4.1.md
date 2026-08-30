---
name: story-4.1
description: Working notes for Story 4.1 - Background Sweep & Queue Execution Script
date: 2026-08-30
metadata:
  version: 1.0
  created-by: Claude Sonnet 5
---

# Story 4.1: Background Sweep & Queue Execution Script

Canonical story text lives in `documets/design/Project 4thBrain.md` (EP4).
This file tracks the working context behind it, and reconciles/supersedes
`documets/story/story-4.1-plan.md` (2026-08-28), which predates the Story
12.2 schema redesign and drifted from the live schema in several places —
see "Reconciling story-4.1-plan.md" below.

## Abstract

Automated overnight queue processing: pick up pending jobs, execute them
through whatever real handler exists for their `job_type`, update job/document
state, clean up orphaned work left behind by a crashed prior run.

## Implementation (2026-08-30)

Implemented alongside Story 1.1, whose `ingest-executor.js` this story's
worker is the first (and currently only) registered handler for.

### What was built

| File | Purpose |
|---|---|
| `batch/lock-manager.js` | File-based PID mutex enforcing ADR10's concurrency=1 |
| `batch/job-executors.js` | `job_type -> executor` dispatch table |
| `batch/cleanup.js` | Orphan detection: stale `Running` jobs, stale `job_file` locks |
| `batch/worker.js` | `runCycle()` (one sweep) + `main()` (real entrypoint: lock, sweep, release) |

### Design decisions

**One sweep per invocation, not an in-process poll loop.** The original
`story-4.1-plan.md` draft sketched a `while (true) { ...; sleep(DELTA) }`
loop (Option B) or a `FileSystemWatcher` on the database file (Option A).
This implementation does neither: `runCycle()` runs exactly one pass —
fetch pending jobs, attempt each, run cleanup, return a summary — and exits.
`main()` is meant to be invoked periodically by an external scheduler
(systemd timer or cron, per ADR9), matching the story's own name
("**Sweep**", not "daemon" or "watcher"). Reasoning: it's dramatically
simpler to test deterministically (call `runCycle()` once, assert the
result — no timing races, no needing to start/stop a loop in test teardown),
and it composes cleanly with the file-lock concurrency guard: a sweep either
gets the lock and runs once, or finds another sweep already in progress and
exits immediately (exit 0 — "already running" is not an error).

**`canHandle()` gate before claiming a job.** `job_type='ingest'` covers
both directly-indexable files (Story 1.1, built) and files needing
transcoding (Story 1.2, not built). The worker calls the registered
executor's `canHandle(db, job)` *before* marking a job `Running` — a job it
can't yet handle is left untouched in `New`, not stranded in `Running`
forever and not misleadingly marked `Failed`. This means `convert`,
`classify`, and `index` jobs (valid `job_type` enum values with no
registered executor at all) are also never picked up — they simply
accumulate as `New` until a later story registers a handler, which is
correct behavior, not a bug: the alternative (marking them Failed because
"no executor" looks like an error) would misrepresent "not yet implemented"
as "broken."

**Concurrency=1 via a file lock, not a DB-level lock.** ADR10 mandates
strict concurrency=1 for Ollama-bound work. None of Story 4.1's currently
registered executors call Ollama, but the lock is implemented as
infrastructure now rather than deferred, since every future job type
(`classify` especially) will need it and retrofitting a concurrency guard
onto an already-shipped worker is worse than building it once, correctly.
`lock-manager.js` uses an atomic exclusive-create write (`wx` flag) so two
racing processes can't both succeed, and treats a lock file naming a dead
PID as stale and clears it automatically (a crashed prior sweep shouldn't
require manual cleanup).

**Job status transitions live in the worker, not the executor.** Executors
(`ingest-executor.js`) only throw on failure or return a result on success —
they never touch `job.status` directly. `runCycle()` owns
`markRunning`/`markCompleted`/`markFailed`. This keeps the executor
contract simple (implementers of future executors don't need to know the
job lifecycle state machine) and keeps status-transition logic in one
place, testable independent of any particular executor.

**`job_file.lock_by_PID` is wired up but currently unused.** The schema
provides a per-file OS-process lock (distinct from the worker's own
single-instance lock), evidently intended for a long-running executor that
holds a file open across some duration. Story 1.1's ingest executor is a
single brief SQLite transaction (ADR17) with no such window, so nothing
sets `lock_by_PID` yet. `cleanup.js` still sweeps for stale locks (dead-PID
detection via `lock-manager.isProcessAlive()`) so the mechanism is tested
and ready the moment a future executor (Story 1.2's transcoding step is the
likely first user) needs it.

**No error-message column on `job`.** `schema.sql`'s `job` table has no
field to record *why* a job failed — only `status='Failed'` and `end_date`.
The only record of the reason is `cleanup.js`'s structured JSON log line at
the moment of failure. This is a real schema gap, not a code gap; noted
here rather than worked around by, e.g., overloading an unrelated column.

### Reconciling story-4.1-plan.md (2026-08-28)

The earlier draft plan predates the live schema and disagrees with it in
several places, superseded here:

| Draft said | Live schema / ADRs say | Resolution |
|---|---|---|
| `job_type` enum: ingest, transcode, classify, batch-run, index | `schema.sql` seeds: ingest, convert, classify, index | Followed the live schema |
| Query jobs `ORDER BY created_at` | `job` has no `created_at` column (only `start_date`/`end_date`, both null until claimed) | Order by `id` instead |
| PowerShell scripts (`queue-processor.ps1`, etc.) under `server/jobs/` | ADR5: Node.js is the single orchestration layer; the rest of `server/` and `batch/`'s sibling `ingest-executor.js` are already Node.js | Implemented in Node.js, consistent with ADR5 |
| Testing strategy: "set THREAD_COUNT > 1, verify N process in parallel" | ADR10: strict concurrency=1, closed decision | Not implemented — would contradict a closed ADR. `lock-manager.js` enforces exactly the opposite (only one sweep runs at a time) |
| Recommends polling loop with configurable `DELTA` | — | Superseded by the one-sweep-per-invocation model above |

`story-4.1-plan.md` is left in place as historical context (its "Option A vs
B" analysis of watch-vs-poll triggers is still a reasonable survey) but
should not be treated as the current design.

### Testing

`batch/test/lock-manager.test.js` (6 tests), `batch/test/cleanup.test.js`
(6 tests), `batch/test/worker.test.js` (6 tests, including a full
end-to-end sweep against Story 1.1's real executor — stage a file, run one
`runCycle()`, assert the vault file exists and job/document status is
correct). All run against an in-memory SQLite database built from the live
schema and real temp directories on disk.

**Not verified in this session**: the systemd timer / cron scheduling
itself (no real WSL2/systemd host available here — `systemctl` exists in
this container's PATH but PID 1 is not systemd, so a service/timer unit
can't actually be exercised), and behavior under genuinely concurrent
sweeps on a real multi-process host (the lock's correctness was verified by
simulating a second sweep with a live PID already holding the lock file,
not by literally racing two OS processes).

## Acceptance Criteria

- [x] Batch worker executes unattended against pending queue items — `runCycle()`, tested end-to-end
- [x] Job state flags (`New`/`Running`/`Completed`/`Failed`) update correctly upon processing completion — tested
- [x] Concurrency capped at 1 — `lock-manager.js`, tested (single-instance enforcement; not tested under real OS-level concurrency, see above)

## Status

**WIP** — core logic implemented and tested (18 passing tests). The
scheduling half (systemd timer/cron invoking `batch/worker.js` periodically)
is a deployment concern for the real WSL2 host, not exercised here.

## Changelog

- 2026-08-30: Implemented lock-manager, job-executors, cleanup, worker, with
  18 tests. Reconciled against the earlier story-4.1-plan.md draft (schema
  drift, PowerShell-vs-Node.js, polling-loop-vs-single-sweep, and the
  THREAD_COUNT>1 test scenario that contradicted ADR10).
