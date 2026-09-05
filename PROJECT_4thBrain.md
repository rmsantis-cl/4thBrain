# Project 4thBrain — v04 Java/Spring Boot (Phased Delivery)

## Document Header

| Property | Value |
| :---- | :---- |
| **Document Title** | Project 4thBrain v04 — Three-Phase Delivery Plan |
| **Version** | 1.0 |
| **Date** | 2026-09-03 |
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
