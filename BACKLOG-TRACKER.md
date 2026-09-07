---
name: BACKLOG-TRACKER
description: Delivery status of every Story and Bug in 4thBrain v04, grouped by WIP, READY, NOT-READY and COMPLETED
metadata:
  version: 1.8
  created-by: Claude Code
  date: 2026-09-07
---

# BACKLOG-TRACKER — 4thBrain v04

Status of record for delivery. Stories are defined in `PROJECT_4thBrain.md`; this file tracks
where each one stands. A story moves READY → WIP → COMPLETED, or sits in NOT-READY until its
blocker clears.

Section meanings:

- **WIP** — being worked on now. At most one or two at a time.
- **READY** — design is settled, acceptance criteria written, nothing blocking. Can be picked up.
- **NOT-READY** — blocked by another story, or the design is not yet decided.
- **COMPLETED** — acceptance criteria met and verified.

## Summary

30 stories: 0 WIP, 7 READY, 12 NOT-READY, 11 COMPLETED.
2 bugs: 1 READY, 1 COMPLETED.

### WIP

Nothing in progress.

### READY

| ID | Title | Note |
|----|-------|------|
| P1.11 | Coordinator Entry Point & Message Addressing | Unblocked by P1.9 |
| P1.12 | Status Endpoint Reports Document Counts | No dependency |
| P1.15 | Orderly Shutdown | Unblocked by P1.9 and P1.10; `/api/shutdown` is what remains |
| P1.16 | Crash Recovery | Unblocked by P1.9 |
| P1.17 | Spike: A Unified Composer | Prototypes against stubs; deliberately runs before P1.13, which it constrains |
| P2.8 | Spike: MarkItDown as the Extractor's converter | Runs against files on disk; needs no booting application |
| P3.5 | Upgrade to JUnit 5 | No dependency; testing infrastructure modernization |

### NOT-READY

| ID | Title | Blocked by |
|----|-------|------------|
| P1.13 | Text and URL Ingestion Endpoints | P1.11 |
| P2.1 | OllamaClient & ConcurrencyGate | P1.11 — no working pipeline entry point |
| P2.2 | Ingestor Real Logic | P1.11 — no working pipeline entry point |
| P2.3 | TextExtractor Real Logic | P1.11 — no working pipeline entry point; P2.8 |
| P2.4 | Classifier Real Logic | P1.11 — no working pipeline entry point |
| P2.5 | Indexer Real Logic | P1.11 — no working pipeline entry point |
| P2.6 | Briefing Real Logic | P1.11 — no working pipeline entry point |
| P2.7 | File Watcher | P1.11 — no working pipeline entry point |
| P3.1 | Unit Tests | Phase 2 |
| P3.2 | Integration Tests | Phase 2 |
| P3.3 | REST API Tests | P1.13 |
| P3.4 | Smoke Test | Phase 2 |

### COMPLETED

| ID | Title | Completed | Note |
|----|-------|-----------|------|
| P1.1 | Spring Boot Skeleton | Phase 1 skeleton | |
| P1.2 | Database Setup | Phase 1 skeleton | |
| P1.3 | Actuator Framework | Phase 1 skeleton | Run loop superseded by P1.10 |
| P1.4 | Coordinator & Messaging | Phase 1 skeleton | Defects tracked as P1.11 |
| P1.5 | Monitor Component | Phase 1 skeleton | |
| P1.6 | REST API Skeleton | Phase 1 skeleton | text/url endpoints stubbed, see P1.13 |
| P1.7 | Web UI Wiring | Phase 1 skeleton | |
| P1.8 | Document Copies | 2026-09-06 | Verified against a fresh database |
| P1.9 | Actuator Instantiation & Registration | 2026-09-06 | Verified by boot log and `ActuatorManagerTest`; three defects found and fixed in the pass. Re-confirmed 2026-09-07 against a running app |
| P1.10 | Actuator Run Loop | 2026-09-06 | Landed with P1.9; idle actuators cost no CPU |
| P1.14 | View Layer & Template Engine | 2026-09-07 | Closes BUG-001. All six endpoints return 200; the inline script's `${...}` literals survive rendering intact |

Bugs are listed in their own section below. A Bug row goes in the table matching its status, kept
in sync with the per-bug file.

## Story Detail Files

Detailed descriptions and acceptance criteria for each story are maintained in individual files under `documents/story/`:
- P1.8 through P1.17 (Phase 1)
- P2.1 through P2.8 (Phase 2)
- P3.1 through P3.5 (Phase 3)

See `documents/story/PXXX.md` for full details on any story.

## Bugs

Bug tracking follows the same process as stories. Detailed descriptions for each bug are maintained in individual files under `documents/bug/`.

### READY

| ID | Title | Note |
|----|-------|------|
| BUG-002 | A fresh clone will not start | SQLite will not create the `data/` directory holding its database file, and `data/` is untracked. Every clone fails on first run. Found during P1.14 verification |

### COMPLETED

| ID | Title | Resolved | Fixed by |
|----|-------|----------|----------|
| BUG-001 | UI Is Not Showing Up | 2026-09-07 | P1.14 |

See `documents/bug/BUG-XXX.md` for full details on any bug.

## Notes

**Phase 2 blocking.** P2.1–P2.7 were recorded as blocked by "Phase 1 does not boot". That is no longer true — the application boots as of P1.9 and serves every endpoint — so their blocker is restated as P1.11: nothing yet starts a chain, `startChain()` is a stub that throws, and `IngestionController` calls `sendMessage()` instead, which builds messages that NPE when logged. The seven stories stay in NOT-READY. P2.3 keeps a genuine second blocker: its extraction stack is inherited from v03 Node.js (Turndown, Mammoth) and must be re-chosen via the P2.8 spike.

**Phase 3 blocking:** P3.1, P3.2, P3.4 blocked by Phase 2. P3.3 blocked by P1.13. P3.5 (JUnit 5 upgrade) has no dependencies and can proceed independently.

**Completed stories.** P1.8, P1.9 and P1.10 have recorded verification.

P1.8: the application was booted against a fresh SQLite database with `ddl-auto: validate` passing, confirming `document_copy`, `source_url`, `area`, `end_date` and `copy_id` all exist and `document.path` is gone.

P1.9 and P1.10 were verified together on 2026-09-06, since P1.10's changes landed in the same pass. `gradlew bootRun` against a fresh database logs `Created 1 <Type> instance(s)` for all five types, `Registered 5 actuator instance(s)`, `Started 5 actuator thread(s)` and `Started FourthBrainApplication`, with no `IllegalThreadStateException` and no `Main loop error`. Actuator threads consume no measurable CPU while idle. `ActuatorManagerTest` asserts instance counts, injection and shared queues against the registry rather than the log, and its context close logs `Thread exiting.` exactly once per actuator followed by `Shut down N actuator thread(s)`.

P1.3, P1.4 and P1.6 are marked complete as skeleton wiring, but each has known defects now carried by a later story — P1.10 (now closed), P1.11 and P1.13 respectively. They are not re-opened; the follow-up story owns the fix.

## Changelog

- 2026-09-06: Created. Seeded from the 24 stories in `PROJECT_4thBrain.md`.
- 2026-09-06: Summary split into four tables, one per status. The COMPLETED section's own table was dropped as a duplicate of the Summary's.
- 2026-09-07: Added P2.8 (MarkItDown spike) to READY. P2.3 gains it as a second blocker. Counts now 25 stories: 1 WIP, 3 READY, 13 NOT-READY, 8 COMPLETED.
- 2026-09-07: Created individual story files under `documents/story/`. Added P3.5 (JUnit 5 upgrade) to READY. Renamed `documets/` directory to `documents/`. Updated summary to 26 stories: 1 WIP, 4 READY, 13 NOT-READY, 8 COMPLETED.
- 2026-09-07: Added BUG-001 (UI Is Not Showing Up) to NOT-READY. Created Bugs section and per-bug documentation structure matching story files. Summary updated: 26 stories, 1 bug NOT-READY.
- 2026-09-07: BUG-001 diagnosed. Cause is view resolution, not static resources: the controllers return view names and no template engine is on the classpath. Its blocker is now the choice of fix, not P1.7.
- 2026-09-07: BUG-001's fix decided (ADR25, Thymeleaf) and moved to READY. Added Story P1.14 (View Layer & Template Engine) to carry it out. Counts now 27 stories: 1 WIP, 5 READY, 13 NOT-READY, 8 COMPLETED.
- 2026-09-07: P1.14 implemented and verified against a running application; BUG-001 closed. P1.9 moved from WIP to COMPLETED — its code had already landed and the boot proved it works. Added BUG-002 (a fresh clone cannot start, because nothing creates the `data/` directory). The "Phase 1 does not boot" blocker on P2.1–P2.7 is now false and those seven need re-triage. Counts: 0 WIP, 4 READY, 13 NOT-READY, 10 COMPLETED; 2 bugs.
- 2026-09-07: P1.10 moved to COMPLETED — it landed in the same pass as P1.9 and was verified with it. P1.11 unblocked into READY. P2.1–P2.7's blocker restated as P1.11 rather than "Phase 1 does not boot", closing the re-triage note. Added Stories P1.15 (Orderly Shutdown) and P1.16 (Crash Recovery), both READY; they were drafted as P1.14 and P1.15 on the branch carrying the P1.9/P1.10 verification and are renumbered because P1.14 was already taken. Counts: 29 stories — 0 WIP, 6 READY, 12 NOT-READY, 11 COMPLETED.
- 2026-09-07: Added Story P1.17 (Spike: A Unified Composer) to READY, with its brief in `documents/design/SPIKE-UNIFIED-COMPOSER.md`. It collapses the Add File, Add Text, Add URL and Chat panels into one composer, and exists mainly to settle how one input tells capture from conversation — auto-detection can spot a URL but cannot tell a note from a question. Sequenced before P1.13 deliberately: what the text and URL endpoints should accept depends on what the composer sends. Counts: 30 stories — 0 WIP, 7 READY, 12 NOT-READY, 11 COMPLETED.
