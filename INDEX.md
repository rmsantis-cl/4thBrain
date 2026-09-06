---
name: INDEX
description: Master index of all artifacts, specs, and foundational documents in 4thBrain v04 Java/Spring Boot
metadata:
  version: 1.1
  created-by: Claude Code
  date: 2026-09-06
---

# INDEX — 4thBrain v04 Documentation & Artifacts

Master catalog of all project files, design documents, and source code organized by phase and purpose.

| File Name | History |
|-----------|---------|
| CLAUDE.md | [2026-09-03] Project overview, three-phase delivery plan (Skeleton → Real Logic → Testing), repository structure, design decisions inherited from v03 |
| PROJECT_4thBrain.md | [2026-09-03] Phase 1–3 deliverables and stories, key design decisions (Actuators, Coordinator, Monitor, database), mapping to v03 requirements (FR1–FR9, NFR1–NFR12)<br>[2026-09-06] Added Story P1.8 (Document Copies): remove `path` from document table/entity, add `document_copy` table keyed by vault area with created_at/end_date, add `source_url` to document; design decided, ready to implement<br>[2026-09-06] Story P1.8 implemented; added Story P1.9 (Actuator Instantiation & Registration): single owner for actuator creation, registration and start moved out of the constructor, Coordinator routing map keyed by class simple name<br>[2026-09-06] Added Stories P1.10 (actuator run loop), P1.11 (Coordinator entry point and message addressing), P1.12 (status endpoint reports document counts), P1.13 (text/URL ingestion endpoints and the stale controller tests) |
| build.gradle | [2026-09-03] Gradle build config, Spring Boot 3.2.0, JPA, SQLite JDBC 3.44.0.0, Hibernate SQLite dialect |
| src/main/resources/application.yaml | [2026-09-03] Spring Boot config: port 8080, Ollama URL, vault paths, database location, dev/prod profiles |
| src/main/resources/schema.sql | [2026-09-03] SQLite DDL schema, 9 tables (inherited from v03)<br>[2026-09-06] Story P1.8: dropped `document.path`, added `document.source_url`, added `document_copy` table and its two indexes |
| src/main/java/com/fourthbrain/persistence/VaultArea.java | [2026-09-06] Story P1.8: vault area constants (tmp, incoming, indexing, raw) matching the paths configured under `vault:` in application.yaml |
| src/main/java/com/fourthbrain/persistence/entity/DocumentCopy.java | [2026-09-06] Story P1.8: JPA entity for document_copy, one row per physical location a document occupies, soft-deleted via endDate |
| src/main/java/com/fourthbrain/persistence/repository/DocumentCopyRepository.java | [2026-09-06] Story P1.8: JpaRepository<DocumentCopy, Long>, queries findLive(docId, area), findLive(docId), findHistory(docId) |
| src/main/java/com/fourthbrain/actuators/Actuator.java | [2026-09-03] Base Actuator interface, phase 1 skeleton |
| src/main/java/com/fourthbrain/actuators/ActuatorRegistry.java | [2026-09-03] ActuatorRegistry bean, map actuator names to bean instances for Coordinator |
| src/main/java/com/fourthbrain/actuators/IngestorActuator.java | [2026-09-03] Ingestor actuator bean, phase 1 stub |
| src/main/java/com/fourthbrain/actuators/TextExtractorActuator.java | [2026-09-03] TextExtractor actuator bean, phase 1 stub |
| src/main/java/com/fourthbrain/actuators/ClassifierActuator.java | [2026-09-03] Classifier actuator bean, phase 1 stub |
| src/main/java/com/fourthbrain/actuators/IndexerActuator.java | [2026-09-03] Indexer actuator bean, phase 1 stub |
| src/main/java/com/fourthbrain/actuators/BriefingActuator.java | [2026-09-03] Briefing actuator bean, phase 1 stub |
| src/main/java/com/fourthbrain/messaging/ActuatorMessage.java | [2026-09-03] Base message class for inter-actuator communication |
| src/main/java/com/fourthbrain/messaging/DocumentMessage.java | [2026-09-03] DocumentMessage subclass, carries document payloads between actuators |
| src/main/java/com/fourthbrain/messaging/Coordinator.java | [2026-09-03] Coordinator bean, routes messages from actuators to next stage |
| src/main/java/com/fourthbrain/messaging/MessageQueue.java | [2026-09-03] BlockingQueue wrapper for actuator work queues |
| src/main/java/com/fourthbrain/monitor/HealthMonitor.java | [2026-09-03] HealthMonitor bean, scheduled to check actuator queue sizes and log every 30s |
| src/main/java/com/fourthbrain/config/DatabaseConfig.java | [2026-09-03] SQLite DataSource, JPA configuration, schema initialization |
| src/main/java/com/fourthbrain/config/AppConfig.java | [2026-09-03] Spring beans: Coordinator, Monitor, OllamaClient, ActuatorRegistry |
| src/main/java/com/fourthbrain/persistence/entity/Document.java | [2026-09-03] Document JPA entity, maps to Document table |
| src/main/java/com/fourthbrain/persistence/entity/Job.java | [2026-09-03] Job JPA entity, maps to Job table |
| src/main/java/com/fourthbrain/persistence/entity/Classification.java | [2026-09-03] Classification JPA entity, maps to Classification table |
| src/main/java/com/fourthbrain/persistence/entity/Tag.java | [2026-09-03] Tag JPA entity, maps to Tag table |
| src/main/java/com/fourthbrain/persistence/entity/DocumentTag.java | [2026-09-03] DocumentTag JPA entity, link table |
| src/main/java/com/fourthbrain/persistence/repository/DocumentRepository.java | [2026-09-03] JpaRepository for Document entity |
| src/main/java/com/fourthbrain/persistence/repository/JobRepository.java | [2026-09-03] JpaRepository for Job entity |
| src/main/java/com/fourthbrain/ollama/OllamaClient.java | [2026-09-03] Ollama HTTP client, RestTemplate wrapper for http://localhost:11434/v1 |
| src/main/java/com/fourthbrain/ollama/ConcurrencyGate.java | [2026-09-03] ConcurrencyGate (Semaphore), enforces concurrency=1 for Ollama calls |
| src/main/java/com/fourthbrain/web/controller/IngestionController.java | [2026-09-03] REST controller, POST /api/ingest (phase 1 stub) |
| src/main/java/com/fourthbrain/web/controller/SearchController.java | [2026-09-03] REST controller, GET /api/search (phase 1 stub) |
| src/main/java/com/fourthbrain/web/controller/StatusController.java | [2026-09-03] REST controller, GET /api/status (phase 1 stub) |
| src/main/java/com/fourthbrain/web/controller/ChatController.java | [2026-09-03] REST controller, POST /api/chat/llama (phase 1 stub) |
| src/main/java/com/fourthbrain/web/controller/AdminController.java | [2026-09-03] REST controller, GET /admin, /admin/db, /api/docs (phase 1 stub) |
| src/main/java/com/fourthbrain/web/ui/UIController.java | [2026-09-03] UI controller, GET / → /chat, serves static assets |
| src/main/resources/static/index.html | [2026-09-03] UI shell, redirects to /chat |
| src/main/resources/static/chat.html | [2026-09-03] Main UI page, forms for ingestion, search, dashboard, chat |
| src/main/resources/static/styles.css | [2026-09-03] CSS design system (inherited from v03 or new minimal) |
| src/main/resources/static/client.js | [2026-09-03] Frontend JS, calls REST API endpoints |
| src/test/java/com/fourthbrain/actuators/ActuatorTests.java | [2026-09-03] Unit tests for actuator beans |
| src/test/java/com/fourthbrain/messaging/CoordinatorTests.java | [2026-09-03] Integration tests for Coordinator message routing |
| src/test/java/com/fourthbrain/web/ControllerTests.java | [2026-09-03] MockMvc tests for REST endpoints |
| documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md | [2026-09-03] Functional Requirements FR1–FR9, Non-Functional Requirements NFR1–NFR12 (reference to v03, no changes) |
| documets/design/schema.sql | [2026-09-03] SQLite schema (copy of v03 schema.sql) |
| documets/design/ADRS.md | [2026-09-03] Architecture Decision Records (reference to v03: ADR14, ADR17, ADR24) |
| src/main/resources/static/index.html | [2026-09-03] Main UI shell, all 7 panels (Add file, Add text, Add URL, Search, Status, Chat Llama, Admin), wired to stub REST endpoints |
| src/main/resources/templates/admin.html | [2026-09-03] Admin menu page, links to database browser and API docs |
| src/main/resources/templates/admin-db.html | [2026-09-03] Database browser stub page |
| src/main/resources/templates/api-docs.html | [2026-09-03] API documentation page, lists all endpoints |
| src/main/java/com/fourthbrain/web/controller/IngestionController.java | [2026-09-03] REST controller for POST /api/ingest/file, /text, /url (phase 1 stubs) |
| src/main/java/com/fourthbrain/web/controller/StatusController.java | [2026-09-03] REST controller for GET /api/status (phase 1 stub) |
| src/main/java/com/fourthbrain/web/controller/SearchController.java | [2026-09-03] REST controller for GET /api/search (phase 1 stub) |
| src/main/java/com/fourthbrain/web/controller/ChatController.java | [2026-09-03] REST controller for POST /api/chat/llama (phase 1 stub) |
| src/main/java/com/fourthbrain/web/controller/AdminController.java | [2026-09-03] REST controller for GET /admin, /admin/db, /admin/api/docs (phase 1 stubs) |
| src/main/java/com/fourthbrain/web/controller/UIController.java | [2026-09-03] GET /, /chat routing, serves static UI |
| src/main/java/com/fourthbrain/actuators/Actuator.java | [2026-09-03] Base interface: process(ActuatorMessage), getName(), start(), stop() |
| src/main/java/com/fourthbrain/persistence/entity/Document.java | [2026-09-03] JPA entity, maps to document table: path, content, topic, status, timestamps |
| src/main/java/com/fourthbrain/persistence/entity/Job.java | [2026-09-03] JPA entity, maps to job table: documentId, stage, status, errorMessage, timestamps |
| src/main/java/com/fourthbrain/persistence/entity/Tag.java | [2026-09-03] JPA entity, maps to tag table: name (PK), createdAt, endDate (soft delete) |
| src/main/java/com/fourthbrain/persistence/entity/DocumentTag.java | [2026-09-03] JPA entity, maps to document_tag link table: documentId, tagName, timestamps, endDate |
| src/main/java/com/fourthbrain/persistence/repository/DocumentRepository.java | [2026-09-03] JpaRepository<Document, Long>, custom queries: findByStatus(), countByStatus() |
| src/main/java/com/fourthbrain/persistence/repository/JobRepository.java | [2026-09-03] JpaRepository<Job, Long>, custom queries: findByStatus(), findByDocumentId(), countByStatus() |
| src/main/java/com/fourthbrain/persistence/repository/TagRepository.java | [2026-09-03] JpaRepository<Tag, String> (tagName as PK), custom query: findActive() |
| src/main/java/com/fourthbrain/persistence/repository/DocumentTagRepository.java | [2026-09-03] JpaRepository<DocumentTag, Long>, custom queries for active tags by document/tag |
| src/main/java/com/fourthbrain/persistence/DatabaseService.java | [2026-09-03] Single synchronized @Service for all database writes, enforces concurrency=1, keeps transactions brief per ADR17 |

