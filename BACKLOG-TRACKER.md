---
name: BACKLOG-TRACKER
description: Delivery status of every Story and Bug in 4thBrain v04, grouped by WIP, READY, NOT-READY and COMPLETED
metadata:
  version: 1.3
  created-by: Claude Haiku 4.5
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

26 stories: 1 WIP, 4 READY, 13 NOT-READY, 8 COMPLETED.
1 bug: 1 NOT-READY.

### WIP

| ID | Title | Note |
|----|-------|------|
| P1.9 | Actuator Instantiation & Registration | Blocks application startup |

### READY

| ID | Title | Note |
|----|-------|------|
| P1.10 | Actuator Run Loop | Explicitly out of scope for P1.9, so not blocked by it |
| P1.12 | Status Endpoint Reports Document Counts | No dependency |
| P2.8 | Spike: MarkItDown as the Extractor's converter | Runs against files on disk; needs no booting application |
| P3.5 | Upgrade to JUnit 5 | No dependency; testing infrastructure modernization |

### NOT-READY

| ID | Title | Blocked by |
|----|-------|------------|
| P1.11 | Coordinator Entry Point & Message Addressing | P1.9 |
| P1.13 | Text and URL Ingestion Endpoints | P1.11 |
| P2.1 | OllamaClient & ConcurrencyGate | Phase 1 does not boot |
| P2.2 | Ingestor Real Logic | Phase 1 does not boot |
| P2.3 | TextExtractor Real Logic | Phase 1 does not boot; P2.8 |
| P2.4 | Classifier Real Logic | Phase 1 does not boot |
| P2.5 | Indexer Real Logic | Phase 1 does not boot |
| P2.6 | Briefing Real Logic | Phase 1 does not boot |
| P2.7 | File Watcher | Phase 1 does not boot |
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

No Bugs are currently logged. A Bug row goes in the table matching its status, kept in sync
with the per-bug file.

## Story Detail Files

Detailed descriptions and acceptance criteria for each story are maintained in individual files under `documents/story/`:
- P1.8 through P1.13 (Phase 1)
- P2.1 through P2.8 (Phase 2)
- P3.1 through P3.5 (Phase 3)

See `documents/story/PXXX.md` for full details on any story.

## Bugs

Bug tracking follows the same process as stories. Detailed descriptions for each bug are maintained in individual files under `documents/bug/`.

### NOT-READY

| ID | Title | Blocked by | Note |
|----|-------|-----------|------|
| BUG-001 | UI Is Not Showing Up | P1.7 | UIController or static resources not serving; blocks P1.13, P3.4 |

See `documents/bug/BUG-XXX.md` for full details on any bug.

## Notes

**Phase 2 blocking:** All Phase 2 stories (P2.1–P2.7) are blocked by Phase 1 not booting. P2.3 has a second blocker: its extraction stack is inherited from v03 Node.js (Turndown, Mammoth) and must be re-chosen via P2.8 spike.

**Phase 3 blocking:** P3.1, P3.2, P3.4 blocked by Phase 2. P3.3 blocked by P1.13. P3.5 (JUnit 5 upgrade) has no dependencies and can proceed independently.

**Completed stories:** P1.8 verified against fresh SQLite database. P1.3, P1.4, P1.6 marked complete as skeleton wiring but carry known defects now tracked in later stories (P1.10, P1.11, P1.13); they are not re-opened.

## Changelog

- 2026-09-06: Created. Seeded from the 24 stories in `PROJECT_4thBrain.md`.
- 2026-09-06: Summary split into four tables, one per status. The COMPLETED section's own table was dropped as a duplicate of the Summary's.
- 2026-09-07: Added P2.8 (MarkItDown spike) to READY. P2.3 gains it as a second blocker. Counts now 25 stories: 1 WIP, 3 READY, 13 NOT-READY, 8 COMPLETED.
- 2026-09-07: Created individual story files under `documents/story/`. Added P3.5 (JUnit 5 upgrade) to READY. Renamed `documets/` directory to `documents/`. Updated summary to 26 stories: 1 WIP, 4 READY, 13 NOT-READY, 8 COMPLETED.
- 2026-09-07: Added BUG-001 (UI Is Not Showing Up) to NOT-READY. Created Bugs section and per-bug documentation structure matching story files. Summary updated: 26 stories, 1 bug NOT-READY.
