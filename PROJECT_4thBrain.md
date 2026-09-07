# Project 4thBrain — v04 Java/Spring Boot (Phased Delivery)

## Document Header

| Property | Value |
| :---- | :---- |
| **Document Title** | Project 4thBrain v04 — Three-Phase Delivery Plan |
| **Version** | 1.5 |
| **Date** | 2026-09-07 |
| **Status** | Phase 1 in progress — the application boots as of P1.9 |

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
- **P1.8 — Document Copies:** See `documents/story/P1.8.md`.
- **P1.9 — Actuator Instantiation & Registration:** See `documents/story/P1.9.md`.
- **P1.10 — Actuator Run Loop:** See `documents/story/P1.10.md`.
- **P1.11 — Coordinator Entry Point & Message Addressing:** See `documents/story/P1.11.md`.
- **P1.12 — Status Endpoint Reports Document Counts:** See `documents/story/P1.12.md`.
- **P1.13 — Text and URL Ingestion Endpoints:** See `documents/story/P1.13.md`.
- **P1.14 — View Layer & Template Engine:** See `documents/story/P1.14.md`. Closes BUG-001; design in ADR25.
- **P1.15 — Orderly Shutdown:** See `documents/story/P1.15.md`.
- **P1.16 — Crash Recovery:** See `documents/story/P1.16.md`.
- **P1.17 — Spike: A Unified Composer:** See `documents/story/P1.17.md`. Timeboxed investigation of collapsing Add File, Add Text, Add URL and Chat into one composer screen; brief in `documents/design/SPIKE-UNIFIED-COMPOSER.md`. Runs before P1.13, which its outcome constrains.

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

- **P2.1 — OllamaClient & ConcurrencyGate:** See `documents/story/P2.1.md`.
- **P2.2 — Ingestor Real Logic:** See `documents/story/P2.2.md`.
- **P2.3 — TextExtractor Real Logic:** See `documents/story/P2.3.md`.
- **P2.4 — Classifier Real Logic:** See `documents/story/P2.4.md`.
- **P2.5 — Indexer Real Logic:** See `documents/story/P2.5.md`.
- **P2.6 — Briefing Real Logic:** See `documents/story/P2.6.md`.
- **P2.7 — File Watcher:** See `documents/story/P2.7.md`.
- **P2.8 — Spike: MarkItDown as the Extractor's converter:** See `documents/story/P2.8.md`. Timeboxed evaluation of `microsoft/markitdown` against Apache Tika. Blocks P2.3, which currently names a stack v04 cannot run.

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

- **P3.1 — Unit Tests:** See `documents/story/P3.1.md`.
- **P3.2 — Integration Tests:** See `documents/story/P3.2.md`.
- **P3.3 — REST API Tests:** See `documents/story/P3.3.md`.
- **P3.4 — Smoke Test:** See `documents/story/P3.4.md`.
- **P3.5 — Upgrade to JUnit 5:** Migrate all test code from JUnit 4 to JUnit 5 (Jupiter). Spring Boot 3.2.0 includes Jupiter; replace `@RunWith` with `@ExtendWith`, `@Rule` with lifecycle annotations, etc.

---

## Mapping to v03 Requirements

The three phases implement the same FR1–FR9, NFR1–NFR12 from v03, structured as:
- **Phase 1** → All wiring in place; actuators exist but don't do anything
- **Phase 2** → Actuators implement FR1–FR6, NFR1–NFR12 (Ingest, Sanitize, Classify, Index, Briefing, Ollama, Concurrency, etc.)
- **Phase 3** → Verify all requirements met via tests

No separate epics for each feature; just three phases of increasing logic complexity.

---

## Key Inherited Design Decisions

From v03 Analysis & .v03/documents/design/:
- **FR1–FR9:** Functional requirements unchanged (ingest, sanitize, classify, index, briefing, UI, search, status dashboard, chat)
- **NFR1–NFR12:** Non-functional requirements: Windows/WSL2, Ollama local LLM, Obsidian + Smart Connections, SQLite metadata DB, Node.js → Java (same role), JSON logging, concurrency=1 for Ollama
- **ADR17:** Keep database transactions brief (no long-running locks)
- **ADR24:** Actuators hand off via Coordinator (direct dispatch), not polling
- **Schema:** 9 tables (Document, Job, Classification, Tag, DocumentTag, Status, JobStatus, JobType, JobFile) — inherited from v03 Story 12.2
- **Vault Layout:** Per ADR14 (v03) — `$VAULT_DIR/incoming` (processed docs), `$VAULT_DIR/raw` (archived originals)

---

## Changelog

- 2026-09-03: Created three-phase delivery plan (Skeleton → Real Logic → Testing). Removed detailed Epic/Story breakdown in favor of pragmatic phasing. Reframed to avoid overengineering.
- 2026-09-06: Added Story P1.8 (Document Copies); P1.8 implemented and verified against SQLite database.
- 2026-09-06: Added Story P1.9 (Actuator Instantiation & Registration); added Stories P1.10–P1.13.
- 2026-09-07: Added Story P2.8 (MarkItDown spike) with options detailed in `documents/design/SPIKE-MARKITDOWN.md`.
- 2026-09-07: Added Story P3.5 (Upgrade to JUnit 5) to Phase 3. Renamed `documets/` directory to `documents/`. Created individual story files (P1.8–P3.5) under `documents/story/`.
- 2026-09-07: Added Story P1.14 (View Layer & Template Engine), closing BUG-001. Created `documents/design/ADRS.md`, which had been referenced but never written, and recorded ADR25: Thymeleaf is the view layer and served pages live in `templates/`.
- 2026-09-07: P1.14 implemented and verified against a running application; BUG-001 closed. P1.9 moved to COMPLETED — its code had already landed, and the boot confirmed it registers all five actuators. Logged BUG-002: a fresh clone cannot start because nothing creates the `data/` directory SQLite needs.
- 2026-09-07: P1.9 and P1.10 verified together, since P1.10's changes had landed in the same pass. Three defects found while verifying and fixed — the Coordinator registry was published unsafely, `Actuator.run()` dereferenced a null next-actuator, and the `InterruptedException` handler could busy-spin on an interrupt that did not come from `shutdown()`. `build.gradle`'s `sourceCompatibility` corrected from 17 to 21, which the code had already been relying on. New `ActuatorManagerTest` asserts instance counts, registration, injection and shared queues against the registry. Added Stories P1.15 (Orderly Shutdown) and P1.16 (Crash Recovery); these were drafted as P1.14 and P1.15 on the branch that carried the verification work, and are renumbered here because P1.14 was already taken by View Layer & Template Engine.
- 2026-09-07: Added Story P1.17 (Spike: A Unified Composer) to Phase 1, with its brief in `documents/design/SPIKE-UNIFIED-COMPOSER.md`. One composer screen replaces the three separate ingest panels and the chat panel; the question it exists to answer is how a single input distinguishes capturing a note from asking a question, since URL syntax can be detected and intent cannot. Version 1.5.