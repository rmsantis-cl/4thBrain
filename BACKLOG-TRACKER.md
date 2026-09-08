---
name: BACKLOG-TRACKER
description: Delivery status of every Story and Bug in 4thBrain v04, grouped by WIP, READY, NOT-READY and COMPLETED
metadata:
  version: 3.0
  created-by: Claude Sonnet 5
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

33 stories: 1 WIP, 9 READY, 7 NOT-READY, 16 COMPLETED.
2 bugs: 1 READY, 1 COMPLETED.

### WIP

| ID       | Title                                          | Note                                                                                                                                                                                                                                                           |
| ------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [[P2.8]] | Spike: MarkItDown as the Extractor's converter | Decision taken — **ADR28**, MarkItDown as a subprocess. Analysis in `@batch/p2_8-analysis.md`, P2.3 rewritten, P2.9 created. Still open: the fixture corpus and every measurement. ADR28's triggers 1 and 2 can reverse the stack; run the format census first |

### READY

| ID        | Title                                   | Note                                                                                                                                                    |
| --------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [[P1.12]] | Status Endpoint Reports Document Counts | No dependency                                                                                                                                           |
| [[P1.15]] | Orderly Shutdown                        | Unblocked by [[P1.9]] and [[P1.10]]; `/api/shutdown` is what remains                                                                                    |
| [[P1.16]] | Crash Recovery                          | Unblocked by [[P1.9]]                                                                                                                                   |
| [[P2.1]]  | OllamaClient & ConcurrencyGate |                                                       |
| [[P2.4]]  | Classifier Real Logic          |                                                                    |
| [[P2.6]]  | Briefing Real Logic            |                                                                     |
| [[P2.2]]  | Ingestor Real Logic                     | Unblocked by [[P1.11]] — the pipeline now has a working entry point                                                                                     |
| [[P2.5]]  | Indexer Real Logic                      | Unblocked by [[P1.11]]                                                                                                                                  |
| [[P2.7]]  | File Watcher                            | Unblocked by [[P1.11]]                                                                                                                                  |
| [[P2.9]]  | MarkdownConverter Seam & Implementation | Stack settled by ADR28. Run [[P2.8]]'s format census before starting — it can still reverse the stack                                                   |
| [[P3.3]]  | REST API Tests                          | Unblocked by [[P1.13]]                                                                                                                                  |

### NOT-READY

| ID        | Title                          | Blocked by                                                                                        |
| --------- | ------------------------------ | ------------------------------------------------------------------------------------------------- |
| [[P2.3]]  | TextExtractor Real Logic       | [[P2.9]] — the converter it calls does not exist                                                  |
| [[P3.1]]  | Unit Tests                     | Phase 2                                                                                           |
| [[P3.2]]  | Integration Tests              | Phase 2                                                                                           |
| [[P3.4]]  | Smoke Test                     | Phase 2                                       |

### COMPLETED

| ID        | Title                                        | Completed        | Note                                                                                                                                                                                                                                                                                                                                                        |
| --------- | -------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1.1      | Spring Boot Skeleton                         | Phase 1 skeleton |                                                                                                                                                                                                                                                                                                                                                             |
| P1.2      | Database Setup                               | Phase 1 skeleton |                                                                                                                                                                                                                                                                                                                                                             |
| P1.3      | Actuator Framework                           | Phase 1 skeleton | Run loop superseded by [[P1.10]]                                                                                                                                                                                                                                                                                                                            |
| P1.4      | Coordinator & Messaging                      | Phase 1 skeleton | Defects tracked as [[P1.11]]                                                                                                                                                                                                                                                                                                                                |
| P1.5      | Monitor Component                            | Phase 1 skeleton |                                                                                                                                                                                                                                                                                                                                                             |
| P1.6      | REST API Skeleton                            | Phase 1 skeleton | text/url endpoints stubbed, see [[P1.13]]                                                                                                                                                                                                                                                                                                                   |
| P1.7      | Web UI Wiring                                | Phase 1 skeleton |                                                                                                                                                                                                                                                                                                                                                             |
| [[P1.8]]  | Document Copies                              | 2026-09-06       | Verified against a fresh database                                                                                                                                                                                                                                                                                                                           |
| [[P1.9]]  | Actuator Instantiation & Registration        | 2026-09-06       | Verified by boot log and `ActuatorManagerTest`; three defects found and fixed in the pass. Re-confirmed 2026-09-07 against a running app. Planned — [[P1.9-FIX-PLAN]]                                                                                                                                                                                       |
| [[P1.10]] | Actuator Run Loop                            | 2026-09-06       | Landed with [[P1.9]]; idle actuators cost no CPU                                                                                                                                                                                                                                                                                                            |
| [[P1.14]] | View Layer & Template Engine                 | 2026-09-07       | Closes [[BUG-001]]. All six endpoints return 200; the inline script's `${...}` literals survive rendering intact                                                                                                                                                                                                                                            |
| [[P1.11]] | Coordinator Entry Point & Message Addressing | 2026-09-07       | Implemented via `plan-11-13-17.md` per ADR26. `startChain` is the sole entry point, loads the Document once and passes it by reference through `Message`; registry is instance state. Verified: `gradle build`/`gradle test` green, new `CoordinatorTest`                                                                                                   |
| [[P1.13]] | Ingest-by-Value Endpoint (Text and URL)      | 2026-09-07       | Implemented via `plan-11-13-17.md`. `/text` and `/url` replaced by one `POST /api/ingest/capture`; `Ingestor`/`Clipper` read `source_url`. Landed ahead of [[P1.17]]'s spike on the plan's argument that ADR26 alone gated this story's contract. Verified: `gradle build`/`gradle test` green, `IngestionControllerTest` rewritten                         |
| [[P3.5]]  | Upgrade to JUnit 5                           | 2026-09-07       | Not the migration the story described — that had already happened. Removed the dangling `junit:junit` from the test classpath, which had no vintage engine behind it, so a JUnit 4 test compiled and then silently did not run. Test count identical before and after; the trap was verified closed with a throwaway probe. Planned — [[P3.5-UPGRADE-PLAN]] |
| [[P2.10]] | Deploy Ollama on Windows                | 2026-09-07 | Completed                                                                                                                                                                                                                                                                                                                                                   |
| [[P1.18]] | The Unified Composer                         | 2026-09-07       | Implemented from [[plan-P1.18]] v1.1, one file (`index.html`, +376/−189). Four panels and their JavaScript gone, nav down to four items, ADR25 held (no `th:inline`, every `${...}` literal intact). Verified on port 8081 against a running app: all four endpoints answer with the shapes the feed reads, a URL capture has `source_url` and no copy row, a text capture has neither. **Outstanding:** ADR27's own reopening question needs a person using the screen, and the optional `Ctrl+Enter` accelerator added past ADR27 is part of what gets evaluated |
| [[P1.17]] | Spike: A Unified Composer                    | 2026-09-07       | Closed as a decision, **not as a spike** — no prototype built, so its first acceptance criterion is waived rather than met. Decision is **ADR27**: one composer, buttons `[+]` `ASK` `URL` `SEND`, the user routes and detection only enables `URL`. Unblocks [[P1.18]]. Gaps found: DD-2 (no per-document status) and DD-3 (tags have no owner)             |

Bugs are listed in their own section below. A Bug row goes in the table matching its status, kept
in sync with the per-bug file.

## Story Detail Files

Detailed descriptions and acceptance criteria are kept in one file per story under
`documents/story/`. Every ID in the tables above links to its file where one exists:

- Phase 1: [[P1.8]], [[P1.9]], [[P1.10]], [[P1.11]], [[P1.12]], [[P1.13]], [[P1.14]], [[P1.15]], [[P1.16]], [[P1.17]], [[P1.18]]
- Phase 2: [[P2.1]], [[P2.2]], [[P2.3]], [[P2.4]], [[P2.5]], [[P2.6]], [[P2.7]], [[P2.8]], [[P2.9]], [[P2.10]]
- Phase 3: [[P3.1]], [[P3.2]], [[P3.3]], [[P3.4]], [[P3.5]]

P1.1–P1.7 have no story file. They were delivered as Phase 1 skeleton wiring before the
per-story files existed, and are described in `PROJECT_4thBrain.md` only.

Plans: [[P1.11-FIX-PLAN]] under `documents/` covers P1.11, P1.17, P1.13 and the follow-on P1.18
together, despite its P1.11-only name. [[plan-11-13-17]] is a second plan over the same three stories,
delivering them as one change instead of four stages; the two are alternatives and one has to be
chosen before work starts (see the note below). [[P1.9-FIX-PLAN]] and [[P3.5-UPGRADE-PLAN]] cover a
story each and have moved to `documents/done/`. [[plan-P1.18]], [[plan-P2.1]], [[plan-P2.2]],
[[plan-P2.4]] and [[plan-P2.5]] are a set of five written to run in parallel, one story each; see the
note below. [[simple-claude-plan]] is not a story plan — it audits
the `.claude/` governance layer and the tracking documents, and its first pass is already committed.
Design artifacts the story plans depend on are in `documents/design/` — [[ADRS]],
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

**Phase 2 blocking, resolved for P1.11's part.** P2.1–P2.7 were blocked by P1.11 — no working `startChain`. P1.11 is now COMPLETED, so P2.2, P2.5 and P2.7 (which had no other blocker) move to READY. P2.1, P2.4 and P2.6 stay NOT-READY on P2.10 alone (nothing answers on port 11434 yet). P2.3 stays NOT-READY on P2.9 alone (the converter it calls does not exist yet); its blocker had already changed once, from the v03 Node stack (struck by ADR28) to P2.9, which builds the replacement.

**ADR28 was taken without P2.8's measurements.** The decision rests on the argument that a hard timeout only exists across a process boundary, which is a property of this pipeline rather than of the converters. It does not rest on the corpus, because no corpus was assembled. The research arm's finding is that the choice actually hinges on format mix — on PDF the two candidates are the same flat text extractor, so a PDF-heavy inflow means the Python runtime is bought for nothing. That is a ten-minute count. Run it before P2.9 starts; ADR28 carries it as trigger 1, and trigger 2 (share of scanned PDFs) can turn the whole spike into an OCR decision instead.

**Nothing installs Ollama.** `application.yaml` has pointed at `localhost:11434` since the skeleton,
and no story owned getting a service to answer there. P2.10 does: a native Windows install, a pinned
model tag instead of the floating `mistral`, autostart, and a verification that exercises
`/v1/chat/completions` rather than `/api/tags`, since that is the surface the app actually calls. It
is READY now and blocks nothing that is not already blocked by P1.11, so it can run at any point
before P2.1. Its timing measurement also feeds ADR28's trigger 3, which wants an Ollama round trip as
its comparison point for conversion cost.

**Phase 3 blocking:** P3.1, P3.2, P3.4 blocked by Phase 2. P3.3 unblocked into READY now that P1.13 is
COMPLETED. P3.5 is done. P3.4 gains P2.10, because a smoke test of the full pipeline runs through the
Classifier.

**`plan-11-13-17.md` was the plan actually run**, not `P1.11-FIX-PLAN.md`. Both covered the same ground
and were recorded as alternatives; `plan-11-13-17.md`'s one-change approach was chosen, so
`IngestionControllerTest` was rewritten once against the final `/api/ingest/capture` contract rather
than staged behind `@Disabled` annotations that a later story would remove. `P1.11-FIX-PLAN.md` was
kept in sync with ADR26 as the changes were designed (see its own changelog) but was not the plan
executed.

**P1.11, P1.13, P1.17 and P1.18 are all done.** The entry point, the ingest-by-value endpoint and the
screen in front of them work end to end. `index.html` now holds one composer with `[+]` `ASK` `URL`
`SEND`; the Add File, Add Text, Add URL and Chat with Llama panels and their JavaScript are gone, and
the nav is four items. What ADR27 still owes is the evaluation it skipped by not building a
prototype — whether the four-control row feels dense, and whether `ASK` gets pressed by mistake —
which needs someone using the screen rather than another pass over the code.

**ADR27 was taken without a prototype.** P1.17 asked for options A and B built against stubs and
compared; neither was built, and the decision was made on argument plus a layout copied from a composer
already in daily use. Its first acceptance criterion is recorded as waived rather than met, in both the
story file and the ADR. The practical consequence: P1.18 is the first time anyone uses this design, so
its first run is the evaluation the spike skipped. ADR27 names what would reopen the choice — a control
row that feels too dense, or `ASK` pressed by mistake often enough to matter.

**`gradlew test` is green.** `BUILD SUCCESSFUL` — `ActuatorManagerTest`, the rewritten
`IngestionControllerTest`, the new `CoordinatorTest` and the new `IngestorRoutingTest` (real objects,
no mocks, assertions on captured Logback output) all pass. Getting there also fixed a live bug in the
test suite itself: `ActuatorManagerTest`'s `@SpringBootTest` context was left running by Spring's test
context cache after the class finished, so its live actuator threads kept consuming from the same
static, per-class queues later tests enqueued to — `@DirtiesContext(AFTER_CLASS)` now closes it. A
related, unrelated-cause hang (a test blocking forever on an uncontended `BlockingQueue.take()`) is why
`build.gradle`'s `test` task now carries a 15s-per-test / 3-minute-total timeout.

**Five plans written to run in parallel.** [[P1.18]], [[P2.1]], [[P2.2]], [[P2.4]] and [[P2.5]] each
have their own plan under `documents/`, written so five branches can run at once. Three things make
that safe and all three have to hold.

*File ownership.* Each plan names the files it owns and the files it must not open. `Actuator.java`
and `DatabaseService.java` are **frozen across all five** — every method the four Java plans need
already exists on `DatabaseService`, and `Actuator.java` holds both DD-1 and DD-4, so a branch editing
it would collide with three others at once. `application.yaml` is shared by four plans, each owning
one top-level block (`ollama:`, `ingestor:`, `classifier:`, `indexer:`/`smartconnections:`); nobody
reorders the file. Two small files are created byte-identically by two plans each —
`com.fourthbrain.llm.OllamaClient` (P2.1 authoritative, P2.4 copies) and
`com.fourthbrain.persistence.VaultNaming` (P2.2 authoritative, P2.5 copies) — which git merges without
a conflict as long as they stay identical.

*ADR numbers are reserved up front*, because two branches independently writing "ADR29" is the one
conflict that cannot be resolved textually: **ADR29** is P2.2's (the Ingestor's boundary and its
routing table), **ADR30** is P2.5's (how Java talks to MCP), **ADR31** is P2.4's (the classification
output contract, which closes DD-3). P1.18 and P2.1 claim no number.

*Two plans have a design gate and cannot start with code.* P2.2 waits on ADR29, which strikes the
story's `$RAW_DIR` scan — ADR26 makes `startChain` the only entry point and P2.7 already owns
directory watching — and changes the routing table so text reaches the Classifier, which is registered,
threaded and unreachable today. P2.5's Part B waits on ADR30; its Part A is unblocked and worth a merge
on its own. P2.4 needs P2.1's client and can be developed against the published interface before it
merges.

Suggested merge order where there is a choice: P2.1, then P1.18 and P2.2 and P2.5 Part A in any order,
then P2.4. **P1.18 is done**, so four remain.

**Two gaps the P1.18 implementation surfaced.** Neither is P1.18's and neither is new work invented
here. A captured text document has no file on disk and no `document_copy` row, so the Indexer has
nothing to move and the note never reaches the vault — `plan-P2.2.md` fixes it upstream by
materialising content, and `plan-P2.5.md` carries a fallback at the Indexer, deliberately in both so
neither waits on the other. Separately, `Clipper` leaves its child document at status `New` when it
hands it back to the Ingestor, so a clipped page can sit unprocessed; that one is owned by no story
yet.

**Completed stories.** P1.8, P1.9 and P1.10 have recorded verification.

P1.8: the application was booted against a fresh SQLite database with `ddl-auto: validate` passing, confirming `document_copy`, `source_url`, `area`, `end_date` and `copy_id` all exist and `document.path` is gone.

P1.9 and P1.10 were verified together on 2026-09-06, since P1.10's changes landed in the same pass. `gradlew bootRun` against a fresh database logs `Created 1 <Type> instance(s)` for all five types, `Registered 5 actuator instance(s)`, `Started 5 actuator thread(s)` and `Started FourthBrainApplication`, with no `IllegalThreadStateException` and no `Main loop error`. Actuator threads consume no measurable CPU while idle. `ActuatorManagerTest` asserts instance counts, injection and shared queues against the registry rather than the log, and its context close logs `Thread exiting.` exactly once per actuator followed by `Shut down N actuator thread(s)`.

P1.3, P1.4 and P1.6 are marked complete as skeleton wiring, but each had known defects carried by a later story — P1.10, P1.11 and P1.13 respectively, all three now closed. They are not re-opened; the follow-up story owned the fix.

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
- 2026-09-07: Story P2.10 (Deploy Ollama on Windows) added to READY — an environment story with no production code, standing up the service `application.yaml` has pointed at since the skeleton and pinning the model tag so classification behaviour cannot drift under a later pull. P2.1, P2.4, P2.6 and P3.4 gain it as a blocker. Also recorded `plan-11-13-17.md`, a second plan over P1.11, P1.13 and P1.17 that delivers them as one change rather than four stages; it and `P1.11-FIX-PLAN.md` are alternatives and one has to be chosen before work starts. `simple-claude-plan.md` listed alongside them as the governance audit, which is not a story plan. Counts: 32 stories — 1 WIP, 7 READY, 12 NOT-READY, 12 COMPLETED.
- 2026-09-07: ADR26 written (`documents/design/ADRS.md`), unblocking P1.11 and reshaping P1.13. Settles the entry contract: `startChain` is the sole entry point; a `Message` carries the fully-loaded `Document`, not an id, so no actuator re-fetches one it already holds; `Message.from` is null-safe; the Coordinator registry becomes instance state; a submitted URL lives in `source_url`; `DatabaseService` alone writes `Document.status`. Extends into P1.13: `/api/ingest/text` and `/api/ingest/url` collapse into one `POST /api/ingest/capture`, dispatching on whichever of a `url` or `text` body key is present, so the UI's own type-detection is not duplicated server-side; `/api/ingest/file` is unchanged. P1.13 gains P1.17 as a second dependency and P1.18 as something it now blocks. Added Story P1.18 (The Unified Composer) to NOT-READY, the follow-on P1.17's own acceptance criteria named but did not create; blocked by P1.13 and P1.17, and cannot start until ADR27 is written. Counts: 33 stories — 1 WIP, 7 READY, 13 NOT-READY, 12 COMPLETED.
- 2026-09-07: P1.17 closed and moved to COMPLETED, and P1.18 unblocked into READY. ADR27 written: one composer shaped like a chat box, with `[+]` `ASK` `URL` `SEND` inside the container; the user names the action and detection only enables the `URL` button, which lights only when the whole trimmed input is a single `http`/`https` URL. Pressing `SEND` on a bare URL stores it as text, which is the override. Text plus an attached file is two submissions and two Documents; several files are one Document each; Chat folds into the composer, so the nav drops from six items to four. It was closed as a decision rather than as a spike — no prototype was built, so the "build A and B against stubs" criterion is waived, not met, and both the story file and the ADR say so. Two gaps logged in `documents/DESIGN-DEBT.md`: DD-2, nothing reports per-document status so a receipt cannot show progress (P1.12 was left alone rather than silently widened); DD-3, tags have no owner once the panels are gone, and the question belongs with P2.4's classification design. Counts: 33 stories — 1 WIP, 10 READY, 7 NOT-READY, 15 COMPLETED.
- 2026-09-07: `plan-11-13-17.md`, the alternative one-change plan, updated to match ADR26 — its step 5/6 and acceptance-criteria mapping now describe the single `/api/ingest/capture` endpoint instead of separate `/text` and `/url`, and its own step-0 ADR26 draft is marked satisfied by the ADR now on file (only ADR27 remains open). Both plans over P1.11/P1.13/P1.17 are current; which one runs is still an open choice. No status or count changed.
- 2026-09-07: Five execution plans added under `documents/`, one each for P1.18, P2.1, P2.2, P2.4 and P2.5, written to run as five parallel branches — file ownership, frozen shared files, per-plan `application.yaml` blocks, reserved ADR numbers 29/30/31 and a suggested merge order are recorded in the note above. Three of the five re-map at least one acceptance criterion, and each re-mapping is gated behind an ADR rather than taken in a commit: P2.2 loses its `$RAW_DIR` scan to ADR26 and P2.7 and routes text to the Classifier instead of the Indexer (ADR29); P2.4 drops the `classification` table for `document.topic` plus `document_tag` rows and settles that the Classifier produces tags (ADR31, closing DD-3); P2.5 splits, with the vault write unblocked and Smart Connections held behind ADR30. P2.1 does not inject into `Classifier` or `Briefing` — the first belongs to P2.4's branch and the second does not exist. Two new design-debt items logged: DD-4, an actuator cannot record a failure because `Actuator.run()` stamps the participle unconditionally; DD-5, `/api/chat/llama` is still the echo stub and no story owns wiring it, so ADR27's `ASK` returns the stub even after P1.18 and P2.1 both land. Also noted: P2.10 is COMPLETED here and `status: READY` in its own story header, and the four Phase 2 story headers in this set all still read `NOT-READY` against a tracker that lists them READY. No status or count changed.
- 2026-09-07: `plan-P1.18.md` revised to v1.1 against `documents/review-plan-p1.18.md`. Six of the review's findings taken and one rejected. Three were real defects in the plan: it said attachments upload on attach and also that they stage, which contradict, and the version where `SEND` guards on text alone makes a file-only submission impossible; re-enabling the buttons in a request's `finally` would have lit `URL` while the box held plain text, breaking ADR27's rule in the one direction the ADR says must not happen; and blanket-clearing after a send destroyed the user's note when one of several uploads failed. Rejected: the claim that `/api/ingest/file` omits `status` — it returns it at `IngestionController.java:139`, and the review quoted a four-key map that does not match the file. The plan also gained an `ASK` prompt bubble, labelled receipts, `white-space: pre-wrap`, a drag counter, textarea auto-grow, and an optional `Ctrl+Enter` accelerator flagged as going past ADR27. No status or count changed.
- 2026-09-07: P1.18 implemented and moved to COMPLETED; counts 33 stories — 1 WIP, 9 READY, 7 NOT-READY, 16 COMPLETED. One file changed, `index.html`, +376/−189. Verified against a running app on port 8081, since a pre-existing instance held 8080 and was left alone: the page renders, the four superseded panels and every handler that only served them are gone, the nav is four items, no `th:inline` was added and every `${...}` template literal survives rendering. All four endpoints the composer calls answer with the shapes the feed reads, including the 400-with-`{message}`-and-no-`id` path. A URL capture produced `source_url` set with no `document_copy` row and the Clipper fetched it into a child document; a text capture produced `content` set with `source_url` null, so ADR27's `SEND`-on-a-bare-URL override behaves as specified; non-ASCII text round-tripped into the database unchanged. Two gaps surfaced and were recorded rather than fixed, both belonging elsewhere: a captured text document has no file and no copy row so it never reaches the vault (P2.2 and P2.5 both carry a fix), and `Clipper` leaves its child at status `New`, which no story owns. ADR27's reopening question stays open — it needs a person using the screen.
