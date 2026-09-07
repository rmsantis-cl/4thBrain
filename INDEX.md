---
name: INDEX
description: Master index of documentation and design artifacts in 4thBrain v04 Java/Spring Boot
metadata:
  version: 1.6
  created-by: Claude Haiku 4.5
  date: 2026-09-07
---

# INDEX — 4thBrain v04 Documentation & Artifacts

Catalog of project documentation, design documents and build configuration.

Source files under `src/` are not indexed. The compiler, the IDE and `git log` already track
them, and duplicating that here only produced rows that drifted from the code.

| File Name | History |
|-----------|----------|
| CLAUDE.md | [2026-09-03] Project overview, three-phase delivery plan (Skeleton → Real Logic → Testing), repository structure, design decisions inherited from v03 |
| PROJECT_4thBrain.md | [2026-09-03] Phase 1–3 deliverables and stories, key design decisions (Actuators, Coordinator, Monitor, database), mapping to v03 requirements (FR1–FR9, NFR1–NFR12)<br>[2026-09-06] Added Story P1.8 (Document Copies): remove `path` from document table/entity, add `document_copy` table keyed by vault area with created_at/end_date, add `source_url` to document; design decided, ready to implement<br>[2026-09-06] Story P1.8 implemented; added Story P1.9 (Actuator Instantiation & Registration): single owner for actuator creation, registration and start moved out of the constructor, Coordinator routing map keyed by class simple name<br>[2026-09-06] Added Stories P1.10 (actuator run loop), P1.11 (Coordinator entry point and message addressing), P1.12 (status endpoint reports document counts), P1.13 (text/URL ingestion endpoints and the stale controller tests)<br>[2026-09-06] P1.9 story updated to reference the detailed design in documents/design/STARTUP-SEQUENCE.md; added configuration notes about clipper and briefing thread counts<br>[2026-09-07] Added Story P2.8 (MarkItDown spike): evaluate microsoft/markitdown against Apache Tika as the Extractor's converter, and settle how Spring Boot calls an external Python process; P2.3 blocked on it because its stack is v03's JavaScript one<br>[2026-09-07] Added Story P3.5 (Upgrade to JUnit 5); renamed documets/ to documents/; created individual story files under documents/story/ |
| BACKLOG-TRACKER.md | [2026-09-06] Delivery status of all Stories grouped WIP / READY / NOT-READY / COMPLETED, plus a Summary table covering Stories and Bugs; seeded from PROJECT_4thBrain.md<br>[2026-09-06] Summary split into four tables, one per status, each carrying the blocker or completion date; the COMPLETED section's duplicate table dropped<br>[2026-09-07] P2.8 added to READY, P2.3 gains it as a second blocker, counts updated to 25 stories<br>[2026-09-07] Restructured: detailed story descriptions moved to individual files under documents/story/, BACKLOG-TRACKER references them; P3.5 added to READY; counts now 26 stories |
| build.gradle | [2026-09-03] Gradle build config, Spring Boot 3.2.0, JPA, SQLite JDBC 3.44.0.0, Hibernate SQLite dialect<br>[2026-09-06] `sourceCompatibility` moved inside a `java { }` block, which Gradle 9 requires; Gradle wrapper added |
| documents/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md | [2026-09-03] Functional Requirements FR1–FR9, Non-Functional Requirements NFR1–NFR12 (reference to v03, no changes) |
| documents/design/schema.sql | [2026-09-03] SQLite schema (copy of v03 schema.sql) |
| documents/design/ADRS.md | [2026-09-03] Architecture Decision Records (reference to v03: ADR14, ADR17, ADR24) |
| documents/design/SPIKE-MARKITDOWN.md | [2026-09-07] Story P2.8 brief: what MarkItDown is (MIT, Python ≥ 3.10, CLI / library / MCP server, formats and their underlying parsers), what it would and would not replace in the pipeline, six options for calling an external Python process from Spring Boot compared side by side, Apache Tika as the no-Python comparison arm, what the spike must measure, exit criteria, risks, one-day timebox |
| documents/design/STARTUP-SEQUENCE.md | [2026-09-06] Story P1.9 design: bean initialization order, ActuatorManager, three phases (create+inject+name, register all, start all), why the current sequence aborts, sequence diagram |
| documents/story/P1.8.md | [2026-09-07] Remove document.path, add document_copy table and source_url field; vault areas (tmp/incoming/indexing/raw) |
| documents/story/P1.9.md | [2026-09-07] Actuator instantiation and registration — single owner (ActuatorManager), ordered lifecycle, fixing double-instantiation NPE |
| documents/story/P1.10.md | [2026-09-07] Actuator run loop — blocking queue, ordered shutdown, bounded performance, fix busy-spin and core usage |
| documents/story/P1.11.md | [2026-09-07] Coordinator entry point and message addressing — settle on startChain(), fix message logging NPEs |
| documents/story/P1.12.md | [2026-09-07] Status endpoint reports document counts from database instead of actuator queue depths |
| documents/story/P1.13.md | [2026-09-07] Text and URL ingestion endpoints, rewrite 23 controller tests against current contract |
| documents/story/P2.1.md | [2026-09-07] OllamaClient and ConcurrencyGate for bounded LLM concurrency (Semaphore(1)) |
| documents/story/P2.2.md | [2026-09-07] Ingestor real logic — read files from RAW_DIR, create Document records, route to TextExtractor |
| documents/story/P2.3.md | [2026-09-07] TextExtractor real logic — document conversion to Markdown; extraction stack TBD by P2.8 spike |
| documents/story/P2.4.md | [2026-09-07] Classifier real logic — LLM tagging via OllamaClient, create Classification and DocumentTag records |
| documents/story/P2.5.md | [2026-09-07] Indexer real logic — vault storage and Smart Connections MCP indexing |
| documents/story/P2.6.md | [2026-09-07] Briefing real logic — scheduled synthesis of recent documents via OllamaClient |
| documents/story/P2.7.md | [2026-09-07] File watcher — monitor RAW_DIR for automatic ingestion via WatchService or polling |
| documents/story/P2.8.md | [2026-09-07] Spike: MarkItDown vs Apache Tika as document converter; six integration options analysis; results in ADR and P2.3 rewrite |
| documents/story/P3.1.md | [2026-09-07] Unit tests for actuators (JUnit 5, Mockito, >80% coverage of process() logic) |
| documents/story/P3.2.md | [2026-09-07] Integration tests for full message flows through actuator chain (multiple stages, concurrency) |
| documents/story/P3.3.md | [2026-09-07] REST API tests via MockMvc for all endpoints (file/text/URL ingestion, status, search, chat) |
| documents/story/P3.4.md | [2026-09-07] Manual smoke test — browser UI, file upload, watch pipeline progress through dashboard |
| documents/story/P3.5.md | [2026-09-07] Upgrade to JUnit 5 (Jupiter) — migrate all tests from JUnit 4, replace annotations and lifecycle |
| documents/bug/BUG-001.md | [2026-09-07] Web UI fails to load on localhost:8080 or localhost:8080/chat; UIController routing or static resources issue; blocks P1.13 and P3.4 |
