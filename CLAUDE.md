# CLAUDE.md — 4thBrain v04 (Java Spring Boot)

## Project Overview

**4thBrain v04** is a complete reimplementation of the v03 Node.js application in Java Spring Boot. Same system requirements (FR1–FR9, NFR1–NFR12), same database schema (SQLite), same high-level flow: Ingest → Sanitize → Classify → Index, plus Briefing synthesis. Different architecture: actuators are Spring Beans running in dedicated threads, communicating via a Coordinator instead of relying on periodic polling.

**Build approach:** Three phases — Skeleton (all architecture in place, actuators stubbed), Implementation (real actuator logic + OpenAI SDK integration), Testing (unit + integration).

## Repository Structure

```
v04/
├── build.gradle                          (Gradle build, Spring Boot + sqlite-jdbc)
├── src/main/java/com/fourthbrain/
│   ├── FourthBrainApplication.java       (Spring Boot @SpringBootApplication, @EnableScheduling)
│   ├── config/
│   │   └── ActuatorThreadConfig.java     (creates actuator bean instances from thread config)
│   ├── actuators/
│   │   ├── Actuator.java                 (interface: getGerund/Participle, process, message)
│   │   ├── AbstractActuator.java         (extends Thread, run loop, queue polling)
│   │   ├── IngestorActuator.java         (static queue, routes to TextExtractor)
│   │   ├── TextExtractorActuator.java    (static queue, routes to Classifier)
│   │   ├── ClassifierActuator.java       (static queue, routes to Indexer)
│   │   ├── IndexerActuator.java          (static queue, final stage)
│   │   └── BriefingActuator.java         (@Scheduled daily 6AM, static queue)
│   ├── messaging/
│   │   ├── ActuatorMessage.java          (Integer docId only, rest in database)
│   │   └── Coordinator.java              (@Component, startChain, getStatusCounts)
│   ├── persistence/
│   │   ├── entity/
│   │   │   ├── Document.java             (@Entity, status tracks pipeline)
│   │   │   ├── Tag.java                  (@Entity, soft-delete via endDate)
│   │   │   └── DocumentTag.java          (@Entity, links documents to tags)
│   │   ├── repository/
│   │   │   ├── DocumentRepository.java   (findByStatus, countByStatus)
│   │   │   ├── TagRepository.java        (findActive)
│   │   │   └── DocumentTagRepository.java (findActiveTagsByDocumentId, etc.)
│   │   └── DatabaseService.java          (synchronized writes, ADR17)
│   ├── web/
│   │   └── controller/
│   │       ├── IngestionController.java  (POST /api/ingest/file, /text, /url)
│   │       ├── SearchController.java     (GET /api/search)
│   │       ├── StatusController.java     (GET /api/status)
│   │       ├── ChatController.java       (POST /api/chat/llama)
│   │       ├── AdminController.java      (GET /admin/db, etc.)
│   │       └── UIController.java         (GET /, /chat)
│   └── (util, logging, etc.)
├── src/main/resources/
│   ├── application.yaml                  (Spring config: port, DB path, thread counts, Ollama URL)
│   ├── schema.sql                        (SQLite DDL: document, tag, document_tag tables only)
│   ├── templates/                        (server-rendered pages — see ADR25)
│   │   ├── index.html                    (main UI, 7 panels; self-contained, inline CSS + JS)
│   │   ├── admin.html                    (admin menu)
│   │   ├── admin-db.html                 (database browser)
│   │   └── api-docs.html                 (API documentation page)
│   └── static/                           (assets a page links to — no pages)
├── src/test/java/com/fourthbrain/
│   └── (unit + integration tests, Phase 3)
└── documents/
    ├── design/
    │   └── (design docs and system specs)
    └── story/
        └── (individual story files, P1.8–P3.5)
```

## Phase 1: Skeleton & Full Architecture (Wiring Only)

**Goal:** All components created, all REST endpoints stubbed, all actuators thread-ready. Document status drives the pipeline.

**Deliverables:**
- Spring Boot app boots on `gradle bootRun`, listens on localhost:8080.
- SQLite database created at startup (schema.sql), three tables: document, tag, document_tag.
- Each actuator type (Ingestor, TextExtractor, Classifier, Indexer, Briefing) instantiated per thread config in application.yaml (default 1 each).
- All instances of the same actuator class share one static queue (horizontal scaling).
- Coordinator.startChain(docId) updates Document status to "ingesting" and enqueues to first Ingestor.
- Each actuator loop: poll queue → update status to gerund → process() → update to participle → route to next actuator.
- REST endpoints (/api/ingest/file, /text, /url) accept input, create Document records, call Coordinator.
- StatusController returns Document counts per status stage.
- Web UI loads at localhost:8080/chat, forms wired to REST endpoints (no processing yet).

**No real business logic:** Actuators just log and update Document status; no file I/O, no Ollama calls, no indexing.

## Phase 2: Real Actuator Implementation

**Goal:** Replace stub logging with actual processing logic using OpenAI SDK for Ollama and libraries for file/text handling.

**Deliverables:**
- **Ingestor:** Reads files from `$RAW_DIR`, copies structured files to `$VAULT_DIR/incoming`, creates Document records.
- **TextExtractor:** Calls OpenAI SDK (configured for local Ollama) or uses libraries (Turndown for HTML, OpenDataLoader for PDF, etc.) to sanitize/transcode binary formats.
- **Classifier:** Calls OllamaClient.chat() with a prompt, parses LLM response for tags/topic, stores Classification and DocumentTag records.
- **Indexer:** Writes classified documents to vault, triggers Smart Connections MCP indexing.
- **Briefing:** Scheduled to run at 6 AM, queries recent documents, builds an Ollama prompt, writes briefing Markdown to vault.
- OllamaClient proven to reach Ollama and parse responses; concurrency gate blocks until prior Ollama call finishes.

## Phase 3: Testing

**Goal:** Unit tests for each actuator (mocking dependencies), integration tests for message flows, REST API tests (MockMvc), smoke test.

**Deliverables:**
- `gradle test` runs all unit tests, >80% coverage of actuator logic.
- `gradle integrationTest` runs end-to-end message flows (Ingestor → TextExtractor → Classifier → Indexer).
- MockMvc tests verify REST endpoints accept payloads and create Document records.
- Manual smoke test: browser loads UI, form submission triggers actuator chain, status dashboard updates.

## Design Principles

- **Document-status-driven:** Entire pipeline tracked via Document.status (gerund/participle pairs per stage).
- **Message-driven actuators:** No polling; each actuator polls its queue and routes directly to next via process() return value.
- **Horizontal scaling via static queues:** Multiple instances of the same actuator class share one static queue; thread count configured in application.yaml.
- **Synchronized writes:** DatabaseService uses method-level synchronization to enforce brief, serialized transactions (ADR17).
- **Phase 1 stubs everything:** Actuators log and update status; no real business logic until Phase 2.
- **Spring Boot idiomatic:** @Autowired dependencies, @Slf4j logging, @Component + @Scheduled, no constructors.
- **Adding a UI page (ADR25):** the page goes in `src/main/resources/templates/`, and its `@Controller` method returns the file's name without the extension. `static/` holds assets a page links to, not pages an endpoint serves. Thymeleaf renders plain HTML unchanged, so a new page needs no `th:` attributes to work. One trap: JavaScript template literals use `${...}`, the same delimiter as Thymeleaf expressions. They pass through safely because Thymeleaf only evaluates inside a `<script>` carrying `th:inline="javascript"` — so do not add that attribute to a script using template literals, and mark a block `th:inline="none"` if it ever needs protecting.

## Working in This Repository

- Build: `gradle build` or `./gradlew build`.
- Run: `gradle bootRun` (or PowerShell script if created).
- Test: `gradle test`.
- All code must trace to a Story in PROJECT_4thBrain.md (Phases 1–3 deliver specific stories).
- Commits include Story reference and Haiku co-author footer.

## Changelog

- 2026-09-03: Phase 1 skeleton complete. Removed Job class entirely (document status sufficient). Thread configuration via application.yaml (default 1 per actuator). Coordinator updates Document status, no Job records. StatusController returns actual Document counts. All logging via @Slf4j without class names. Created FourthBrainApplication main class, ActuatorThreadConfig, schema.sql (no job table).
- 2026-09-07: BUG-001 diagnosed — five endpoints returned view names with no template engine installed, so the UI had never rendered. ADR25 settles the view layer on Thymeleaf, with served pages in `templates/`; Story P1.14 carries it out. Repository structure corrected: `chat.html`, `styles.css` and `client.js` were listed here but have never existed, and `templates/` was missing.
- 2026-09-07: Governance trimmed. Removed `.claude/rules/merge-to-v03.md` (v03 is no longer the branch of record; v04 is), `.claude/rules/md-memory.md` and the `submit-batch` / `got-batch` skills, which drove off a `batch-tool.txt` and a `BATCH_TRACKER.md` that exist nowhere in the repository. Removed the leftover `documets/` directory, whose two design docs had been duplicated into `documents/` without the originals being deleted.

## Key Decisions

- **No Job table:** Document.status alone tracks pipeline (ingesting → extracting → classifying → indexing → indexed). Simpler, message-driven design.
- **Thread config in YAML:** `actuators.threads.ingestor: 1` etc. Allow horizontal scaling without code changes.
- **ObjectFactory for instances:** ActuatorThreadConfig uses ObjectFactory to create prototype actuators with Spring dependency injection.
- **Synchronized DatabaseService:** Single synchronized service enforces ADR17 (brief transactions, no holding locks).