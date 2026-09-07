---
name: BACKLOG-TRACKER
description: Delivery status of every Story and Bug in 4thBrain v04, grouped by WIP, READY, NOT-READY and COMPLETED
metadata:
  version: 1.2
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

25 stories: 1 WIP, 3 READY, 13 NOT-READY, 8 COMPLETED.

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

## WIP

### P1.9 — Actuator Instantiation & Registration

Give actuator creation a single owner. Every actuator is currently built twice, by component
scan and again by `ActuatorThreadConfig`, and the second instance NPEs in
`Coordinator.register()` because the guard is keyed by class while the map it seeds is keyed by
name. That NPE aborts the Spring context, which is why the application does not start.

Three defects sit underneath it: registration runs before the thread is named, `start()` is
called twice, and the thread starts before Spring has injected anything.

Acceptance criteria are written. `src/main/java/com/fourthbrain/actuators/Actuator.java` is
mid-restructure (it became an abstract class extending `Thread`), and the constructor still
calls `Coordinator.register(this)` and `start()`, both of which this story removes.

Note: `gradle build` does not currently compile. That is a separate missing-import problem in
`Indexer.java`, not part of this story.

## READY

### P1.10 — Actuator Run Loop

`Actuator.run()` polls with `poll()`, dereferences the null it gets on an empty queue, swallows
the NPE in `catch (Throwable)`, and loops again with no back-off. Five idle actuators spin five
cores. Replace the queue with a `BlockingQueue` and take with `take()`, which is what P1.3
specified originally. Also add a real `shutdown()`, move the exit log outside the loop, and
narrow the `Throwable` catch.

Not blocked by P1.9 — P1.9 explicitly puts this out of its own scope.

### P1.12 — Status Endpoint Reports Document Counts

`/api/status` returns zeros for every stage. `StatusController` reads keys named after document
statuses, `Coordinator.getStatusCounts()` returns queue depths keyed by actuator name, and the
two key spaces never intersect. Source the counts from `DocumentRepository.countByStatus`
instead, and derive the stage list from the actuators' own gerund/participle values so a new
actuator shows up without editing the controller.

### P2.8 — Spike: MarkItDown as the Extractor's converter

Timeboxed at one day. P2.3 names Turndown and Mammoth, JavaScript libraries inherited from v03, so
v04's extraction stack was never actually chosen and `Extractor` converts nothing today. The spike
measures `microsoft/markitdown` (Python, MIT) against Apache Tika on a real fixture corpus, and
settles how the JVM would call the Python side. Options and tradeoffs are written up in
`documets/design/SPIKE-MARKITDOWN.md`.

Not blocked by Phase 1: it runs against files on disk, outside the actuator chain. Output is a
recommendation, an ADR, and a rewritten P2.3. No production code lands under this story.

## NOT-READY

### P1.11 — Coordinator Entry Point & Message Addressing

**Blocked by P1.9**, which changes how actuators land in the registry.

Two entry points exist and the one the tests use throws. `startChain()` is an unimplemented
stub; `IngestionController` calls `sendMessage()` instead, which builds messages with a null
`from` that NPE the moment anything logs them.

### P1.13 — Text and URL Ingestion Endpoints

**Blocked by P1.11.** Rewriting the tests before the entry point is settled would only move them
onto a contract that is about to change.

`POST /api/ingest/text` and `/url` return `{"not":"implemented"}`. All 23 tests in
`IngestionControllerTest` assert the removed Job design.

### P2.1–P2.7 — Phase 2, Real Actuator Implementation

**Blocked by Phase 1.** The application does not start, so no actuator logic can be exercised
end to end.

P2.1 OllamaClient & ConcurrencyGate · P2.2 Ingestor · P2.3 TextExtractor · P2.4 Classifier ·
P2.5 Indexer · P2.6 Briefing · P2.7 File Watcher.

P2.3 carries a second blocker: its extraction stack is the v03 Node one and has to be re-chosen,
which is what P2.8 is for.

Worth flagging: the Phase 2 deliverable checkboxes in `PROJECT_4thBrain.md` are ticked, which
contradicts Phase 1 not booting. Treat those ticks as stale rather than as evidence of
completion.

### P3.1–P3.4 — Phase 3, Testing & Verification

**Blocked by Phase 2**, except P3.3, which is blocked by P1.13.

P3.1 Unit Tests · P3.2 Integration Tests · P3.3 REST API Tests · P3.4 Smoke Test.

The Phase 3 checkboxes carry the same staleness problem as Phase 2's.

## COMPLETED

Listed in the Summary above.

P1.8 is the only one with recorded verification: the application was booted against a fresh
SQLite database with `ddl-auto: validate` passing, confirming `document_copy`, `source_url`,
`area`, `end_date` and `copy_id` all exist and `document.path` is gone.

P1.3, P1.4 and P1.6 are marked complete as skeleton wiring, but each has known defects now
carried by a later story — P1.10, P1.11 and P1.13 respectively. They are not re-opened; the
follow-up story owns the fix.

## Changelog

- 2026-09-06: Created. Seeded from the 24 stories in `PROJECT_4thBrain.md`.
- 2026-09-06: Summary split into four tables, one per status. The COMPLETED section's own table
  was dropped as a duplicate of the Summary's.
- 2026-09-07: Added P2.8 (MarkItDown spike) to READY. P2.3 gains it as a second blocker. Counts now
  25 stories: 1 WIP, 3 READY, 13 NOT-READY, 8 COMPLETED.
