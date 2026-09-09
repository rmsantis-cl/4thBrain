---
name: BACKLOG-TRACKER
description: Delivery status of every Story and Bug in 4thBrain v04, grouped by WIP, READY, NOT-READY and COMPLETED
metadata:
  version: 2.3
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

31 stories: 1 WIP, 6 READY, 12 NOT-READY, 12 COMPLETED.
2 bugs: 1 READY, 1 COMPLETED.

### WIP

| ID       | Title                                          | Note                                                                                                                                                                                                                                                           |
| ------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [[P2.8]] | Spike: MarkItDown as the Extractor's converter | Decision taken — **ADR28**, MarkItDown as a subprocess. Analysis in `@batch/p2_8-analysis.md`, P2.3 rewritten, P2.9 created. Still open: the fixture corpus and every measurement. ADR28's triggers 1 and 2 can reverse the stack; run the format census first |

### READY

| ID        | Title                                        | Note                                                                                                  |
| --------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [[P1.11]] | Coordinator Entry Point & Message Addressing | Unblocked by [[P1.9]]. Stage 1 of [[P1.11-FIX-PLAN]]                                            |
| [[P1.12]] | Status Endpoint Reports Document Counts      | No dependency                                                                                         |
| [[P1.15]] | Orderly Shutdown                             | Unblocked by [[P1.9]] and [[P1.10]]; `/api/shutdown` is what remains                                  |
| [[P1.16]] | Crash Recovery                               | Unblocked by [[P1.9]]                                                                                 |
| [[P1.17]] | Spike: A Unified Composer                    | Stage 2 of [[P1.11-FIX-PLAN]]; runs alongside [[P1.11]], lands before [[P1.13]]                 |
| [[P2.9]]  | MarkdownConverter Seam & Implementation      | Stack settled by ADR28. Run [[P2.8]]'s format census before starting — it can still reverse the stack |

### NOT-READY

| ID | Title | Blocked by |
|----|-------|------------|
| [[P1.13]] | Text and URL Ingestion Endpoints | [[P1.11]], [[P1.17]] — stage 3 of [[P1.11-FIX-PLAN]] |
| [[P2.1]] | OllamaClient & ConcurrencyGate | [[P1.11]] — no working pipeline entry point |
| [[P2.2]] | Ingestor Real Logic | [[P1.11]] — no working pipeline entry point |
| [[P2.3]] | TextExtractor Real Logic | [[P1.11]] — no working pipeline entry point; [[P2.9]] — the converter it calls does not exist |
| [[P2.4]] | Classifier Real Logic | [[P1.11]] — no working pipeline entry point |
| [[P2.5]] | Indexer Real Logic | [[P1.11]] — no working pipeline entry point |
| [[P2.6]] | Briefing Real Logic | [[P1.11]] — no working pipeline entry point |
| [[P2.7]] | File Watcher | [[P1.11]] — no working pipeline entry point |
| [[P3.1]] | Unit Tests | Phase 2 |
| [[P3.2]] | Integration Tests | Phase 2 |
| [[P3.3]] | REST API Tests | [[P1.13]] |
| [[P3.4]] | Smoke Test | Phase 2 |

### COMPLETED

| ID | Title | Completed | Note |
|----|-------|-----------|------|
| P1.1 | Spring Boot Skeleton | Phase 1 skeleton | |
| P1.2 | Database Setup | Phase 1 skeleton | |
| P1.3 | Actuator Framework | Phase 1 skeleton | Run loop superseded by [[P1.10]] |
| P1.4 | Coordinator & Messaging | Phase 1 skeleton | Defects tracked as [[P1.11]] |
| P1.5 | Monitor Component | Phase 1 skeleton | |
| P1.6 | REST API Skeleton | Phase 1 skeleton | text/url endpoints stubbed, see [[P1.13]] |
| P1.7 | Web UI Wiring | Phase 1 skeleton | |
| [[P1.8]] | Document Copies | 2026-09-06 | Verified against a fresh database |
| [[P1.9]] | Actuator Instantiation & Registration | 2026-09-06 | Verified by boot log and `ActuatorManagerTest`; three defects found and fixed in the pass. Re-confirmed 2026-09-07 against a running app. Planned — [[P1.9-FIX-PLAN]] |
| [[P1.10]] | Actuator Run Loop | 2026-09-06 | Landed with [[P1.9]]; idle actuators cost no CPU |
| [[P1.14]] | View Layer & Template Engine | 2026-09-07 | Closes [[BUG-001]]. All six endpoints return 200; the inline script's `${...}` literals survive rendering intact |
| [[P3.5]] | Upgrade to JUnit 5 | 2026-09-07 | Not the migration the story described — that had already happened. Removed the dangling `junit:junit` from the test classpath, which had no vintage engine behind it, so a JUnit 4 test compiled and then silently did not run. Test count identical before and after; the trap was verified closed with a throwaway probe. Planned — [[P3.5-UPGRADE-PLAN]] |

Bugs are listed in their own section below. A Bug row goes in the table matching its status, kept
in sync with the per-bug file.

## Story Detail Files

Detailed descriptions and acceptance criteria are kept in one file per story under
`documents/story/`. Every ID in the tables above links to its file where one exists:

- Phase 1: [[P1.8]], [[P1.9]], [[P1.10]], [[P1.11]], [[P1.12]], [[P1.13]], [[P1.14]], [[P1.15]], [[P1.16]], [[P1.17]]
- Phase 2: [[P2.1]], [[P2.2]], [[P2.3]], [[P2.4]], [[P2.5]], [[P2.6]], [[P2.7]], [[P2.8]], [[P2.9]]
- Phase 3: [[P3.1]], [[P3.2]], [[P3.3]], [[P3.4]], [[P3.5]]

P1.1–P1.7 have no story file. They were delivered as Phase 1 skeleton wiring before the
per-story files existed, and are described in `PROJECT_4thBrain.md` only.

Plans: [[P1.11-FIX-PLAN]] under `documents/` covers P1.11, P1.17, P1.13 and the follow-on P1.18
together, despite its P1.11-only name. [[P1.9-FIX-PLAN]] and [[P3.5-UPGRADE-PLAN]] cover a story each
and have moved to `documents/done/`. Design artifacts they depend on are
in `documents/design/` — [[ADRS]],
[[SPIKE-MARKITDOWN]] (P2.8), [[SPIKE-UNIFIED-COMPOSER]] (P1.17) and [[STARTUP-SEQUENCE]] (P1.9).

## Bugs

Bug tracking follows the same process as stories. Detailed descriptions for each bug are maintained in individual files under `documents/bug/`.

### READY

| ID | Title | Note |
|----|-------|------|
| [[BUG-002]] | A fresh clone will not start | SQLite will not create the `data/` directory holding its database file, and `data/` is untracked. Every clone fails on first run. Found during P1.14 verification |

### COMPLETED

| ID | Title | Resolved | Fixed by |
|----|-------|----------|----------|
| [[BUG-001]] | UI Is Not Showing Up | 2026-09-07 | [[P1.14]] |

Full details: [[BUG-001]], [[BUG-002]] — one file per bug under `documents/bug/`.

## Notes

**Phase 2 blocking.** P2.1–P2.7 were recorded as blocked by "Phase 1 does not boot". That is no longer true — the application boots as of P1.9 and serves every endpoint — so their blocker is restated as P1.11: nothing yet starts a chain, `startChain()` is a stub that throws, and `IngestionController` calls `sendMessage()` instead, which builds messages that NPE when logged. The seven stories stay in NOT-READY. P2.3's second blocker has changed rather than cleared: its v03 Node stack was replaced by ADR28 (MarkItDown as a subprocess) and the story rewritten, so it is no longer blocked on a decision — it is blocked on P2.9, which builds the converter it calls.

**ADR28 was taken without P2.8's measurements.** The decision rests on the argument that a hard timeout only exists across a process boundary, which is a property of this pipeline rather than of the converters. It does not rest on the corpus, because no corpus was assembled. The research arm's finding is that the choice actually hinges on format mix — on PDF the two candidates are the same flat text extractor, so a PDF-heavy inflow means the Python runtime is bought for nothing. That is a ten-minute count. Run it before P2.9 starts; ADR28 carries it as trigger 1, and trigger 2 (share of scanned PDFs) can turn the whole spike into an OCR decision instead.

**Phase 3 blocking:** P3.1, P3.2, P3.4 blocked by Phase 2. P3.3 blocked by P1.13. P3.5 is done.

**The three UI entry-point stories are planned as one run** — [[P1.11-FIX-PLAN]], which now carries all of them despite its P1.11-only name; the separate `UI-ENTRY-POINTS-PLAN.md` was merged into it. P1.11 is stage 1, the P1.17 spike runs alongside it, P1.13 is stage 3. None of them can start before ADR26 is written: P1.11's story leaves two choices open (keep or delete `sendMessage`; static or instance state), and the cheap answer to the second does not work, because Spring caches test contexts so a static registry is never cleared between them. The plan also found that P1.13 cannot meet its own acceptance criteria as written — `Ingestor` and `Clipper` both read a submitted URL from `content`, not `source_url`, so a document built the way P1.13 describes stops at the first hop with no error.

**P1.11, P1.13 and P1.17 do not finish the UI on their own.** They deliver three working endpoints behind the existing three panels. The single composer is the spike's follow-on story, P1.18, which does not exist yet — P1.17's scope forbids production code. The plan carries it as stage 4.

**`gradlew test` exits non-zero, and that is expected.** 28 tests execute; the 23 failures are all `IngestionControllerTest` asserting P1.13's endpoint contract — `jobId` where the controller returns `id`, and `/text` and `/url` still stubbed. P1.11's plan marks those methods `@Disabled("Story P1.13")` so the suite goes green with the gap still visible, and P1.13 removes the annotations. `ActuatorManagerTest` passes 5 for 5.

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
- 2026-09-07: P1.11 and P3.5 planned; plans recorded under `documents/`. P2.8 moved to WIP — its research went to the Anthropic Batch API as three requests (analysis, ADR, implementation story) under batch `msgbatch_01DPrdauF54ZbbpLzMruGeQb` (a first submission at a 16k output cap truncated two of the three answers and was rerun at 64k); the local corpus measurements it also needs are not covered by that and still have to be run. Counts: 29 stories — 1 WIP, 5 READY, 12 NOT-READY, 11 COMPLETED. P1.9 needed no change: it was already recorded as COMPLETED and verified on 2026-09-06, re-confirmed 2026-09-07.
- 2026-09-07: P3.5 implemented and verified; moved to COMPLETED. It was not the migration its story described — the test code had been Jupiter all along, and what remained was `junit:junit:4.13.2` sitting on the test classpath with no vintage engine, so a JUnit 4 test would compile and then silently not run. Deprecated `@MockBean` replaced with `@MockitoBean` in the same pass. Test counts identical before and after (28 executed, 23 failing on P1.13's contract, 0 skipped). Counts: 29 stories — 1 WIP, 4 READY, 12 NOT-READY, 12 COMPLETED.
- 2026-09-07: Added Story P1.17 (Spike: A Unified Composer) to READY, with its brief in `documents/design/SPIKE-UNIFIED-COMPOSER.md`. It collapses the Add File, Add Text, Add URL and Chat panels into one composer, and exists mainly to settle how one input tells capture from conversation — auto-detection can spot a URL but cannot tell a note from a question. Sequenced before P1.13 deliberately: what the text and URL endpoints should accept depends on what the composer sends. The spike's ADR is numbered 27, since P1.11's plan already claims ADR26. Counts: 30 stories — 1 WIP, 5 READY, 12 NOT-READY, 12 COMPLETED.
- 2026-09-07: P2.8's decision taken — ADR28, MarkItDown invoked as a subprocess behind a `MarkdownConverter` interface. Numbered 28 because ADR26 is reserved by P1.11's plan and ADR27 by P1.17's spike. P2.3 rewritten against it and reblocked on P2.9 rather than P2.8. Story P2.9 (MarkdownConverter Seam & Implementation) added to READY. P2.8 stays WIP: three of its five acceptance criteria are met and the fixture corpus and every measurement are still outstanding. Counts: 31 stories — 1 WIP, 6 READY, 12 NOT-READY, 12 COMPLETED.
- 2026-09-07: Every Story and Bug ID in the tables now links to its file, the way P1.11 already did — `[[P2.3]]`, `[[BUG-001]]` and so on, in the ID columns and in the blocked-by and note columns. The Story Detail Files section lists the files instead of describing ranges, and records that P1.1–P1.7 have none. Plans and design artifacts (`P1.9-FIX-PLAN`, `P1.11-FIX-PLAN`, `P3.5-UPGRADE-PLAN`, `ADRS`, the two spike briefs, `STARTUP-SEQUENCE`) are linked from the same place. No status or count changed.
- 2026-09-07: `P1.11-FIX-PLAN.md` rewritten to plan P1.11, P1.17 and P1.13 as one run to working file, text and URL entry points; the short-lived `UI-ENTRY-POINTS-PLAN.md` is merged into it and gone, so there is one plan file rather than two covering the same stories. The spike is sequenced in parallel with P1.11 rather than after it — it touches nothing under `src/main` — and has to land before P1.13, which it constrains. Two findings changed the shape of the work: P1.13 cannot meet its own acceptance criteria as written, because `Ingestor` and `Clipper` read a submitted URL from `content` while the story specifies `source_url`; and the three stories together stop short of the goal, since P1.17 forbids production code, so the composer needs a fourth story (P1.18) that the spike is to create. Correction to the note this replaces: the earlier plan's Coordinator sketch was said not to compile because it called a `DocumentService` that does not exist. `DocumentService` does exist, with both `getDocumentById` and `setStatus`. The sketch still moves to `DatabaseService`, for the reason that actually holds — it is the synchronized service under ADR17 and the one `IngestionController` already injects — which exposes a genuine inconsistency the plan now logs: two services write `Document.status`, and only one of them is synchronized. No status or count changed.
