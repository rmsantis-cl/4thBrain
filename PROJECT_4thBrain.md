# Project 4thBrain — v04 Java/Spring Boot (Phased Delivery)

## Document Header

| Property | Value |
| :---- | :---- |
| **Document Title** | Project 4thBrain v04 — Three-Phase Delivery Plan |
| **Version** | 1.2 |
| **Date** | 2026-09-07 |
| **Status** | Design Phase — Ready to Start Phase 1 |

---

## Overview

**v04** is a complete reimplementation of 4thBrain in Java Spring Boot, keeping the same system requirements (FR1–FR9, NFR1–NFR12) and database schema (SQLite), but with a corrected architecture: actuators are Spring Beans running in dedicated threads that communicate via a Coordinator (not periodic polling).

Delivered in three phases:
1. **Phase 1 — Skeleton & Full Architecture:** All Spring Beans created, all REST endpoints stubbed, all actuators stub-logging (no real logic). Wiring verified, database schema in place.
2. **Phase 2 — Real Actuator Implementation:** Replace stubs with actual file/text processing, Ollama calls, and vault operations.
3. **Phase 3 — Testing:** Unit, integration, and smoke tests.

---

## Phase 1: Skeleton & Full Architecture (Wiring Only)

### Deliverables

- [x] Spring Boot application boots and listens on localhost:8080
- [x] SQLite database initialized (schema.sql executed on startup)
- [x] All actuator beans created (Ingestor, TextExtractor, Classifier, Indexer, Briefing)
  - Each actuator implements Actuator interface: `process(ActuatorMessage) → void`
  - Each actuator has a dedicated thread running a BlockingQueue.take() loop
  - Each actuator, on receiving a message, logs it and enqueues next stage via Coordinator
- [x] Coordinator bean routes messages (synchronous dispatch to maintain Ollama concurrency=1)
- [x] Monitor component scheduled to check queue sizes and log every 30 seconds
- [x] REST endpoints wired (POST /api/ingest, GET /api/search, GET /api/status, POST /api/chat/llama)
- [x] Web UI loads at localhost:8080/chat, form inputs call REST endpoints
- [x] Actuators receive messages, log them, mark jobs Completed in database, route to next stage
- [ ] No real business logic (no file reads, no LLM calls, no indexing)
- [ ] Database records created but documents don't flow through pipeline (test with mock file)

### Stories (Phase 1)

- **P1.1 — Spring Boot Skeleton:** Create Spring Boot app, Gradle build, application.yaml, SQLite DataSource, JPA config. Boot on `gradle bootRun`.
- **P1.2 — Database Setup:** SQLite file created, schema.sql executed on startup. Tables: Document, Job, Classification, Tag, DocumentTag, Status, JobStatus, JobType. JPA entities and repositories wired.
- **P1.3 — Actuator Framework:** Base Actuator interface, ActuatorRegistry, BlockingQueue per actuator, thread lifecycle. All five actuators created as Spring Beans (stubs).
- **P1.4 — Coordinator & Messaging:** ActuatorMessage and DocumentMessage classes. Coordinator bean routes messages to next actuator's queue. Synchronous dispatch to preserve strict ordering.
- **P1.5 — Monitor Component:** Scheduled @Component checks queue sizes every 30 seconds, logs anomalies (long queues, stalled jobs).
- **P1.6 — REST API Skeleton:** IngestionController, SearchController, StatusController, ChatController, AdminController. All accept payloads, create database records, call Coordinator.startChain(), return Job IDs. No real processing.
- **P1.7 — Web UI Wiring:** Static HTML at /chat (from v03 or new minimal shell). Form inputs POST to /api/ingest. Dashboard polls /api/status. No actual job progress visible yet (all jobs marked Completed immediately).
- **P1.8 — Document Copies:** Remove `path` from the document table and the Document entity. Add a `document_copy` table recording each physical location a document occupies, keyed by vault area, with its own created and end dates. Add `source_url` to document for clipped pages. Detail below.
- **P1.9 — Actuator Instantiation & Registration:** Give actuator creation a single owner. Actuators are currently built twice, by component scan and by ActuatorThreadConfig, which crashes registration and aborts startup. Detail below.
- **P1.10 — Actuator Run Loop:** Make the polling loop block instead of busy-spinning on an NPE, and shut down cleanly. Detail below.
- **P1.11 — Coordinator Entry Point & Message Addressing:** Settle on one way to start a pipeline. `startChain()` throws, `sendMessage()` builds messages that cannot be logged, and the class mixes static state with instance methods. Detail below.
- **P1.12 — Status Endpoint Reports Document Counts:** `/api/status` reports actuator queue depths under document-status keys, so every count is permanently zero. Report counts from the database instead. Detail below.
- **P1.13 — Text and URL Ingestion Endpoints:** Finish `POST /api/ingest/text` and `/url`, which return `{"not":"implemented"}`, and reconcile the 23 controller tests still asserting the removed Job design. Detail below.

### Story P1.8 — Document Copies

**Problem.** `Document.path` holds one mutable location, overwritten in place by `DatabaseService.move()` (`DatabaseService.java:93,111`). A document that moves through the pipeline — tmp → vault incoming → vault target — leaves no record of where it has been, and the model cannot express a document existing in two places at once or having been removed from disk while its metadata survives.

**Change.** Move location out of `document` into a child table, so each copy has an independent lifespan and is identified by the vault area it occupies.

```sql
CREATE TABLE IF NOT EXISTS document_copy (
    copy_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id  INTEGER NOT NULL,
    path         VARCHAR(512) NOT NULL,
    area         VARCHAR(32)  NOT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date     TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES document(id)
);

CREATE INDEX IF NOT EXISTS idx_document_copy_document_id ON document_copy(document_id);
CREATE INDEX IF NOT EXISTS idx_document_copy_area ON document_copy(document_id, area);
```

`path VARCHAR(512)` is dropped from `document`, and `source_url VARCHAR(2048)` added to it.

`area` takes one of the four vault areas already configured in `application.yaml`: `tmp`, `incoming`, `indexing`, `raw`. Every path the code builds is rooted in one of them, so the column names something that already exists rather than introducing a parallel vocabulary.

A live copy is one with `end_date IS NULL`; a copy is retired by stamping `end_date`, never by deleting the row, matching how `tag` and `document_tag` already soft-delete.

**Invariant.** A document may hold several live copies at once — one per area — but at most one live copy in any single area. This is what makes a lookup by `(document_id, area)` single-valued, and it is the reason the actuators need no tie-breaking rule. A document mid-pipeline can legitimately be live in `raw` (archived original), `incoming` (sanitized) and `indexing` (published) simultaneously.

**Which copy a process acts on.** The relevant copy depends on the stage, so each actuator names the area it works on rather than asking for "the document's path":

| Actuator | Reads | Writes |
| :---- | :---- | :---- |
| Ingestor | `tmp` | — |
| Extractor | `tmp` (the archive) | `tmp` (one copy per extracted file) |
| Clipper | — (fetches `source_url`) | — |
| Classifier | — (uses `content`) | — |
| Indexer | see note | `indexing` |

Note: Indexer reads `tmp` today, because `IngestionController` deposits uploads there and Ingestor routes straight on. It becomes `incoming` once Phase 2's Extractor writes sanitized output to that area (P2.3). The story should implement the area as a value it is given, not a hard-coded literal, so this shift is a configuration change rather than a code change.

**Persistence API.** `DatabaseService.move(Document, String)` is not well-formed once a document has several copies — it cannot know which one is moving. It is replaced by:

- `DocumentCopy findLive(long documentId, String area)`
- `DocumentCopy addCopy(Document doc, String area, String path)`
- `void retire(DocumentCopy copy)` — stamps `end_date`
- `DocumentCopy move(DocumentCopy source, String toArea, String newPath)` — moves the file, retires `source`, adds the new copy

**Scope.**

- `schema.sql` — drop `document.path`, add `document.source_url`, add the table and indexes.
- `Document.java` — remove the `path` field, its builder use and accessors; add `sourceUrl`.
- `DocumentCopy.java`, `DocumentCopyRepository.java` — new entity and repository.
- `DatabaseService.java:85-123` — `move()` rewritten per the API above.
- `IngestionController.java:101` — build the Document without a path, then `addCopy(doc, "tmp", destPath)`.
- `Extractor.java:97` — open the archive via `findLive(doc.getId(), "tmp")`; `:147` — each extracted child gets `addCopy(child, "tmp", path)`.
- `Indexer.java:62` — resolve the source copy by area, then `move(copy, "indexing", destPath)`.
- `Clipper.java:74` — set `sourceUrl` on the child document; create no copy row, since nothing is on disk yet.
- `DocumentService.java:61` — `path` is currently patchable through the generic update; it stops being a document field, so this drops.
- Logging that prints a path (`Classifier.java:43`, `Indexer.java:58,91`, `DocumentService.java:24`) logs the copy it is acting on, or drops the path.

**Acceptance criteria.**

- `document` has no `path` column; nothing in `src/main/java` calls `getPath()`/`setPath()` on `Document`.
- Uploading a file creates exactly one live `document_copy` row in area `tmp`.
- Indexing retires the source-area copy and leaves a live copy in `indexing`; the retired row is still readable with its `end_date` set.
- A clipped URL produces a document with `source_url` set and no copy row until something writes it to disk.
- No document ever holds two live copies in the same area.

**Status: implemented 2026-09-06.** Verified by booting the application against a freshly created SQLite database: Hibernate `ddl-auto: validate` passes, which checks every mapped table and column, and `document_copy`, `source_url`, `area`, `end_date` and `copy_id` are all present in the database file. Startup does not complete, but for a defect outside this story — `Coordinator.register()` throws an NPE because each actuator is instantiated twice, once by component scan and once by `ActuatorThreadConfig`.

**Migration.** None. `data/fourthbrain.db` does not exist yet, so the schema is created fresh. The `data/` directory has to exist before first run; SQLite will not create it.

Worth recording, though: `schema.sql` is entirely `CREATE TABLE IF NOT EXISTS` under `sql.init.mode: always`, while JPA runs `ddl-auto: validate`. An existing database file therefore will not be upgraded — it will fail startup when validate finds `path` still present and `document_copy` missing. Anyone holding one deletes it rather than expecting an automatic migration.

### Story P1.9 — Actuator Instantiation & Registration

**Problem.** Every actuator is built twice, and startup dies on the second one.

`Ingestor`, `Extractor`, `Classifier`, `Indexer` and `Clipper` each carry `@Component`, so component scan builds one. `ActuatorThreadConfig` also declares `@Bean @Scope("prototype")` factories for four of them plus array beans that call `factory.getObject()`, so it builds another. Two instances of the same class then reach `Coordinator.register()`:

```java
if (!registry.containsKey(a.getClass())) {   // guard is keyed by CLASS
    registry.put(a.getClass(), new ArrayList<>());
    actuator.put(a.getName(), new ArrayList<>());   // but this map is keyed by NAME
}
registry.get(a.getClass()).add(a);
actuator.get(a.getName()).add(a);   // null on the second instance -> NPE
```

The second instance takes the guard's false branch, so no list is ever created under its name, and `actuator.get(...)` returns null. The NPE propagates out of the `ingestor` bean factory method, `ingestorActuators` fails, and the context aborts. That is what stops the application starting today.

Three further defects sit underneath, none fixable independently of the first:

- **Registration runs before naming.** `Actuator.java:32` calls `Coordinator.register(this)`; `:34` calls `setName(name)`. At registration the object still carries Thread's generated name, so the routing map is keyed `Thread-7` rather than `Ingestor`. `Actuator.run()` routes via `Coordinator.get(n)` where `n` is a class simple name returned by `doTheThing`, so every lookup would miss even without the NPE.
- **The thread is started twice.** `Actuator.java:40` calls `start()` in the constructor, and `ActuatorThreadConfig` calls `start()` again on the same object (`:62`, `:73`, `:84`, `:97`). The second call throws `IllegalThreadStateException`.
- **The thread runs before injection.** Starting inside the constructor puts the loop live before Spring has populated any `@Autowired` field. `Actuator.service` is worse than racy — it carries no annotation at all, so `DocumentService` is never injected and `service.setStatus(...)` NPEs on the first message regardless.

**Design.** See `documets/design/STARTUP-SEQUENCE.md` for the detailed initialization order and sequence diagram. Summary:

1. `ActuatorThreadConfig` becomes the sole creator. Drop `@Component` from all five actuator classes.
2. Create a new `ActuatorManager` bean:
   - `@PostConstruct` → create all instances via `ObjectFactory`, inject, name as `<Type>-<index>`, register all with Coordinator.
   - `ApplicationReadyEvent` listener → start every thread, exactly once, only after the context is fully refreshed.
   - `@PreDestroy` → `shutdown()` each actuator (clear `running`, interrupt, join).
3. `Actuator`'s constructor sets up name, logger and flags only: remove `Coordinator.register(this)` and `start()`.
4. `Coordinator.register()` keys the routing map on `a.getClass().getSimpleName()`, not `a.getName()`. Seed both maps with `computeIfAbsent`, so neither depends on the other's guard.
5. `Actuator.service` gains `@Autowired`, or moves to setter injection, which prototypes handle cleanly.
6. `Extractor` and `Clipper` autowire an `Ingestor` field. Once `Ingestor` is a prototype, injecting it mints a fresh unregistered actuator. Both should reach it through `Coordinator.get("Ingestor")`, the way `Actuator.run()` already routes.

Several instances of one class stay correct under this design because they share a static queue, so `Coordinator.get(name)` returning the first registered instance still enqueues work any of them can pick up.

**Configuration changes:**

- Add `actuators.threads.clipper: 1` to application.yaml. `Clipper` exists and is scanned, but has no thread-count entry, so it scales differently from its siblings for no stated reason.
- `actuators.threads.briefing: 1` is configured and nothing reads it — no Briefing class exists. Remove it, or keep it with a comment marking it reserved for Phase 2.

**Acceptance criteria.**

- `actuators.threads.<name>: N` produces exactly N instances of that class and no more — asserted on registry size, not on log lines.
- The application logs `Started FourthBrainApplication`.
- `Coordinator.get(...)` returns a registered instance for `Ingestor`, `Extractor`, `Classifier`, `Indexer` and `Clipper`.
- No `IllegalThreadStateException` anywhere in the startup log.
- Every actuator holds a non-null `DocumentService` before its thread processes a message.
- `shutdown()` stops an actuator's thread within a bounded time.

**Out of scope**, tracked as P1.10: the run loop's busy spin, and the `running` flag having no way to be cleared outside `@PreDestroy`.

### Story P1.10 — Actuator Run Loop

**Problem.** `Actuator.run()` burns a core per actuator and cannot stop.

`Actuator.java:68` polls with `getQueue().poll()`, which returns null on an empty queue, and `:69` dereferences it immediately. The NPE is swallowed by the loop's own `catch (Throwable)` at `:95`, and the loop restarts with no sleep or back-off. With five idle actuators that is five cores spinning on exceptions — visible in the boot log as an unbroken stream of `Main loop error`.

Two smaller faults in the same method:

- `Thread exiting.` is logged at `:99`, inside the `while` body rather than after it, so it prints every iteration and means nothing.
- `running` is private with no way to clear it, so `while (running)` never ends. Threads are daemons, so the JVM exits, but nothing can stop an actuator deliberately, and nothing waits for in-flight work.

**Change.**

1. Replace the queue with a `BlockingQueue` and poll with `take()`, or `poll(timeout)` if the loop needs to observe a stop flag. This is what P1.3 specified — "a dedicated thread running a BlockingQueue.take() loop" — so this is restoring the intended design, not inventing one. An idle actuator then costs nothing.
2. Guard the message anyway: a null or document-less message is logged and skipped, never dereferenced.
3. Move `Thread exiting.` after the loop.
4. Add a `shutdown()` that clears `running` and interrupts the thread, and have the loop treat `InterruptedException` as a stop signal rather than an error. Call it from a Spring lifecycle hook so shutdown is orderly.
5. Narrow `catch (Throwable)` to `catch (Exception)`, and let the loop continue only for a failure processing one message. A `Throwable` catch also swallows `Error`, which is how a genuine fault currently turns into an infinite log.

Note that `Actuator.map` and `Actuator.registry` (`:27-28`) are dead: every subclass overrides `getQueue()` with its own static queue, so the base map is never read. Remove them as part of this change rather than converting them.

**Acceptance criteria.**

- An idle application shows no `Main loop error` entries and no measurable CPU use from actuator threads.
- A message with a null document is logged once and skipped; the loop continues.
- `shutdown()` stops an actuator's thread within a bounded time.
- `Thread exiting.` appears exactly once per actuator, at shutdown.

### Story P1.11 — Coordinator Entry Point & Message Addressing

**Problem.** There are two ways to start a pipeline. One throws, and the tests use it.

`Coordinator.startChain(long)` (`Coordinator.java:48`) is an unimplemented stub that throws `UnsupportedOperationException`. Nothing in `src/main` calls it — `IngestionController.java:134` uses `sendMessage("Ingestor", doc)` instead — but eleven assertions across `IngestionControllerTest` verify `startChain` was called. So production and tests disagree about the entry point, and the one the tests chose does not work.

`sendMessage` has its own defect. `Coordinator.java:40` builds `new Message(null, get(actuator), doc)`, leaving `from` null. `Message.id()` calls `from.getName()` unguarded, and `Message.toString()` calls `id()`, so logging any message created this way throws an NPE — inside logging, where it is most confusing.

The class is also incoherent in shape: `registry` and `actuator` are static (`:20-21`) while `sendMessage`, `getStatusCounts` and `startChain` are instance methods on a `@Component`. State is shared process-wide but reached through an injected bean, so tests cannot isolate it and a second context would inherit the first one's actuators.

**Change.**

1. Pick one entry point. `startChain(long documentId)` is the name the plan (P1.6) and the tests both use, so implement it and express `sendMessage` in terms of it, or delete `sendMessage` and update the caller. Do not leave both.
2. `startChain` loads the document, sets its status to the first stage, and enqueues to `Ingestor`. It must fail loudly on an unknown id rather than throwing `UnsupportedOperationException` for every input.
3. Give `Message` a real sender, or make `from` legitimately optional and null-safe. If a message can originate outside an actuator, `id()` and `toString()` must handle it; `Message.toAddress()` already does exactly this for `document` and is the pattern to follow.
4. Make the state non-static, or make the whole class static and stop injecting it. Either is defensible; mixing them is what breaks test isolation.

Depends on P1.9, which changes how actuators land in the registry, and is a prerequisite for P1.13, which needs a working entry point before the ingestion tests can pass.

### Story P1.12 — Status Endpoint Reports Document Counts

**Problem.** `/api/status` always returns zeros.

`StatusController.java:20` calls `coordinator.getStatusCounts()` and reads keys `ingesting`, `extracting`, `classifying`, `indexing`, `indexed`. But `getStatusCounts()` returns queue depths keyed by **actuator name** — `Ingestor`, `Extractor`, `Classifier`, `Indexer`. The two key spaces never intersect, so every `getOrDefault(..., 0L)` falls through to its default. The dashboard cannot show progress, and would show queue depth rather than progress even if the keys did line up.

CLAUDE.md is explicit that this endpoint returns document counts per status, and the query already exists: `DocumentRepository.countByStatus`, wrapped by `DatabaseService.countDocumentsByStatus`.

**Change.**

1. Source the counts from the database, counting documents grouped by `status`, not from queue sizes.
2. Derive the reported stages from the actuators' own `getGerund()`/`getParticiple()` values rather than a hard-coded literal list, so a new actuator appears in the dashboard without editing the controller. The five literals in `StatusController` are already a second, drifting copy of that vocabulary.
3. Decide what happens to `Coordinator.getStatusCounts()`. Queue depth is genuinely useful, but it is a different measurement: either rename it to say so and expose it separately, or remove it. Leaving a method whose name promises status counts and whose body returns queue sizes is what caused this.

**Acceptance criteria.**

- With documents in known statuses, `/api/status` returns their actual counts.
- Adding an actuator adds its stage to the response without a controller change.
- A single `countByStatus` per stage, or one grouped query — not a full table scan per request.

### Story P1.13 — Text and URL Ingestion Endpoints

**Problem.** Two of the three ingestion endpoints do nothing, and their tests assert a design that was removed.

`IngestionController.submitText` and `submitUrl` (`:169`, `:189`) log `Not implemented` and return `{"not":"implemented"}`. The real body of `submitText` is present but commented out, and it calls `databaseService.createDocument("text", text)` — passing a literal as what was then the path column, which P1.8 has since removed.

Meanwhile all 23 tests in `IngestionControllerTest` fail. They assert `$.jobId`, mock `databaseService.createDocument(...)`, and verify `coordinator.startChain(1L)` — the Job-based design CLAUDE.md records as deliberately removed, against endpoints that are deliberately stubbed. The failures are not flaky or incidental; the tests describe a different application.

**Change.**

1. Implement `submitText`: create a Document from the posted text with `content` set and no copy row, since nothing is on disk, then start the chain. It is the one ingestion path with no file behind it, so P1.8's model already covers it.
2. Implement `submitUrl`: create a Document with `source_url` set, then start the chain so `Clipper` fetches it. `Clipper` already does the fetching and already writes `source_url` on the child document, so this endpoint only needs to create the parent.
3. Rewrite the tests against the current contract: `id` rather than `jobId`, `databaseService.create(...)` rather than `createDocument(...)`, and whichever entry point P1.11 settles on.
4. Decide the response shape once and apply it to all three endpoints. `/file` returns `message`, `id`, `fileName`, `mimeType` today; the other two should not invent a different envelope.

Depends on P1.11 for the entry point. Until that is settled, rewriting the tests would only move them onto another contract that is about to change.

**Acceptance criteria.**

- `POST /api/ingest/text` and `/url` create a Document, start the pipeline, and return the agreed shape.
- A URL submission produces a document with `source_url` set and no `document_copy` row.
- `gradle test` passes, with no test asserting `jobId` or any other part of the Job design.

---

## Phase 2: Real Actuator Implementation

### Deliverables

- [x] Ingestor reads files from `$RAW_DIR` and copies to `$VAULT_DIR/incoming`
- [x] TextExtractor calls OpenAI SDK (Ollama) or uses libraries (Turndown, OpenDataLoader, Mammoth) to sanitize binary formats
- [x] Classifier calls Ollama via OllamaClient, parses response, stores Classification and DocumentTag records
- [x] Indexer writes documents to vault, triggers Smart Connections MCP indexing
- [x] Briefing runs on schedule (6 AM), queries recent documents, synthesizes via Ollama, writes to vault
- [x] OllamaClient proven to reach Ollama, parse responses, handle errors
- [x] ConcurrencyGate enforces concurrency=1 for Ollama (Classifier/Briefing wait for prior call to finish)
- [x] File watcher monitors `$RAW_DIR` and calls Coordinator.startChain() on new files
- [ ] Real end-to-end pipeline: ingest file → sanitize → classify → index (all via Coordinator message dispatch)

### Stories (Phase 2)

- **P2.1 — OllamaClient & ConcurrencyGate:** RestTemplate wrapper calls http://localhost:11434/v1. Semaphore enforces concurrency=1. Classifier and Briefing use OllamaClient.
- **P2.2 — Ingestor Real Logic:** Reads files from `$RAW_DIR`, validates, copies structured files to `$VAULT_DIR/incoming`, creates Document records, enqueues TextExtractor messages.
- **P2.3 — TextExtractor Real Logic:** Calls appropriate extraction library (PDF → OpenDataLoader, HTML → Turndown, Word → Mammoth), sanitizes to Markdown, writes to `$VAULT_DIR/incoming`, archives originals to `$VAULT_DIR/raw`, enqueues Classifier messages.
- **P2.4 — Classifier Real Logic:** Calls OllamaClient with document content, parses tags/topic response, creates Classification and DocumentTag records, updates Document.topic, enqueues Indexer messages.
- **P2.5 — Indexer Real Logic:** Writes classified document to vault target subfolder, calls Smart Connections MCP to trigger indexing, marks Document as Indexed in database.
- **P2.6 — Briefing Real Logic:** Scheduled bean (6 AM) queries recent documents, builds Ollama prompt, calls OllamaClient, writes briefing Markdown to vault.
- **P2.7 — File Watcher:** Monitors `$RAW_DIR` for new files, creates Document record, calls Coordinator.startChain() to begin pipeline.
- **P2.8 — Spike: MarkItDown as the Extractor's converter:** Timeboxed evaluation of `microsoft/markitdown` against Apache Tika, and of the ways a Spring Boot process can call an external Python tool. Blocks P2.3, which currently names a stack v04 cannot run. Detail below.

### Story P2.8 — Spike: MarkItDown as the Extractor's converter

**Problem.** P2.3 specifies "PDF → OpenDataLoader, HTML → Turndown, Word → Mammoth". That list came
from v03, which ran on Node.js. Turndown and Mammoth are JavaScript libraries and v04 has no Node
runtime, so P2.3 as written cannot be implemented. The extraction stack has never actually been
chosen. `Extractor.java` converts nothing today — it only expands ZIP archives into child Documents.

**Spike.** [MarkItDown](https://github.com/microsoft/markitdown) (MIT, Python ≥ 3.10) covers PDF,
DOCX, PPTX, XLSX, HTML, EPub and more through one CLI, and targets Markdown for LLM consumption
rather than visual fidelity, which is what the Classifier needs. It is Python, so adopting it means
deciding how the JVM calls it. Six integration options are laid out and compared in
`documets/design/SPIKE-MARKITDOWN.md`: CLI subprocess per document, a persistent Python worker, a
local HTTP sidecar, the upstream `markitdown-mcp` server over MCP, embedding Python in the JVM, and
dropping Python entirely for Apache Tika plus a Markdown step.

Going-in position, to be confirmed or overturned by measurement: subprocess per document behind a
`MarkdownConverter` interface, with Tika implemented behind the same interface as the comparison arm.
ZIP handling stays in Java either way — MarkItDown returns one concatenated document per archive,
which would collapse the one-Document-per-member model from P1.8.

**Acceptance criteria.**

- A fixture corpus of 15–20 documents matching the real inflow, including a scanned PDF and a
  deliberately corrupt file, with converter output committed next to it.
- Per-format results for both candidates: output quality against what the Classifier needs, wall time
  per document, fixed process-start cost, failure behaviour (exit code, stderr, hangs), non-ASCII
  handling on Windows, install footprint.
- A written recommendation naming one stack and one integration option, backed by those numbers.
- The decision recorded as an ADR in `documets/design/ADRS.md`.
- P2.3 rewritten to name the chosen stack instead of the v03 Node libraries.

**Scope.** Timebox one day. Spike code lives in `spikes/markitdown/` and is throwaway; nothing lands
in `src/main` under this story. Image description and audio transcription are out of scope, as are
Azure Document Intelligence and any other paid external call.

**Not blocked by Phase 1.** The spike runs against files on disk and needs neither a booting
application nor the actuator chain.

---

## Phase 3: Testing & Verification

### Deliverables

- [x] Unit tests for each actuator (mocking Coordinator, OllamaClient, database)
- [x] Integration tests for message flows (Coordinator + multiple actuators)
- [x] REST API tests (MockMvc: endpoints accept payloads, return Job IDs, create database records)
- [x] Smoke test (browser loads UI, form submission triggers pipeline, dashboard shows progress)
- [x] >80% code coverage of actuator logic
- [x] All `gradle test` and `gradle integrationTest` pass

### Stories (Phase 3)

- **P3.1 — Unit Tests:** JUnit 5 tests for each actuator (Ingestor, TextExtractor, Classifier, Indexer, Briefing). Mock dependencies, verify process() logic, queue handling.
- **P3.2 — Integration Tests:** Multiple actuators communicating via Coordinator. Mock Ollama and vault I/O. Verify end-to-end message flow.
- **P3.3 — REST API Tests:** MockMvc tests for all endpoints (IngestionController, SearchController, StatusController). Verify payloads accepted, Job IDs returned, database records created.
- **P3.4 — Smoke Test:** Manual test: browser loads localhost:8080/chat, submit form with test file, watch dashboard as job progresses through pipeline stages, job marked Complete.

---

## Mapping to v03 Requirements

The three phases implement the same FR1–FR9, NFR1–NFR12 from v03, structured as:
- **Phase 1** → All wiring in place; actuators exist but don't do anything
- **Phase 2** → Actuators implement FR1–FR6, NFR1–NFR12 (Ingest, Sanitize, Classify, Index, Briefing, Ollama, Concurrency, etc.)
- **Phase 3** → Verify all requirements met via tests

No separate epics for each feature; just three phases of increasing logic complexity.

---

## Key Inherited Design Decisions

From v03 Analysis & .v03/documets/design/:
- **FR1–FR9:** Functional requirements unchanged (ingest, sanitize, classify, index, briefing, UI, search, status dashboard, chat)
- **NFR1–NFR12:** Non-functional requirements: Windows/WSL2, Ollama local LLM, Obsidian + Smart Connections, SQLite metadata DB, Node.js → Java (same role), JSON logging, concurrency=1 for Ollama
- **ADR17:** Keep database transactions brief (no long-running locks)
- **ADR24:** Actuators hand off via Coordinator (direct dispatch), not polling
- **Schema:** 9 tables (Document, Job, Classification, Tag, DocumentTag, Status, JobStatus, JobType, JobFile) — inherited from v03 Story 12.2
- **Vault Layout:** Per ADR14 (v03) — `$VAULT_DIR/incoming` (processed docs), `$VAULT_DIR/raw` (archived originals)

---

## Changelog

- 2026-09-03: Created three-phase delivery plan (Skeleton → Real Logic → Testing). Removed detailed Epic/Story breakdown in favor of pragmatic phasing. Reframed to avoid overengineering.
- 2026-09-06: Added Story P1.8 (Document Copies) — drop `path` from the document table and entity, add a `document_copy` child table keyed by vault area (`tmp`/`incoming`/`indexing`/`raw`), add `source_url` to document. Decided: several live copies allowed, at most one per area, so each actuator resolves the copy for the area it works on; `DatabaseService.move(Document, String)` replaced by a copy-scoped API. No open decisions remain; ready to implement.
- 2026-09-06: P1.8 implemented. Schema validated against a real SQLite database. Two pre-existing defects fixed in passing because they blocked verification: a duplicate orphan `com.fourthbrain.repo.DocumentRepository` that broke bean registration, and `Long` id columns that failed Hibernate validation (SQLite needs `INTEGER` for a rowid alias, not `BIGINT`). `Coordinator` annotated `@Component` so it can be injected. Still open, outside this story: actuators are instantiated twice (component scan and `ActuatorThreadConfig`), so `Coordinator.register()` NPEs and startup does not complete. Now tracked as P1.9.
- 2026-09-06: Added Story P1.9 (Actuator Instantiation & Registration) — `ActuatorThreadConfig` becomes the sole creator, `@Component` dropped from the five actuator classes, registration and thread start move out of the constructor, and the Coordinator routing map is keyed by class simple name rather than thread name. The run loop's busy-spin NPE is recorded as out of scope and still needs a story of its own.
- 2026-09-07: Added Story P2.8, a timeboxed spike on MarkItDown as the Extractor's converter, with the integration options written up in `documets/design/SPIKE-MARKITDOWN.md`. Reason it exists: P2.3's stack (Turndown, Mammoth) is JavaScript inherited from v03, so the extraction library choice for v04 was never made. Apache Tika is carried as the comparison arm, since it removes the Python runtime question entirely. P2.3 is now blocked by P2.8.
- 2026-09-06: Added Stories P1.10–P1.13 from a survey of what still blocks a working Phase 1. P1.10 run loop (busy-spin NPE, no shutdown). P1.11 Coordinator entry point (`startChain` throws and is what the tests call, while production uses `sendMessage`, which builds messages that NPE when logged). P1.12 status endpoint (reads document-status keys from a map of actuator queue depths, so it always returns zeros). P1.13 text and URL ingestion endpoints plus the 23 stale controller tests. Order: P1.9 → P1.10 → P1.11 → P1.12/P1.13. Deliberately not storied: the Search, Chat, Admin and UI controllers are intended Phase 1 stubs and are covered by Phase 2; `SmartConnectionsMonitor` is an empty class, which is the existing P1.5 left unimplemented, not a new gap.
