---
name: INDEX
description: Master index of documentation and design artifacts in 4thBrain v04 Java/Spring Boot
metadata:
  version: 1.5
  created-by: Claude Code
  date: 2026-09-07
---

# INDEX — 4thBrain v04 Documentation & Artifacts

Catalog of project documentation, design documents and build configuration.

Source files under `src/` are not indexed. The compiler, the IDE and `git log` already track
them, and duplicating that here only produced rows that drifted from the code.

| File Name | History |
|-----------|---------|
| CLAUDE.md | [2026-09-03] Project overview, three-phase delivery plan (Skeleton → Real Logic → Testing), repository structure, design decisions inherited from v03 |
| PROJECT_4thBrain.md | [2026-09-03] Phase 1–3 deliverables and stories, key design decisions (Actuators, Coordinator, Monitor, database), mapping to v03 requirements (FR1–FR9, NFR1–NFR12)<br>[2026-09-06] Added Story P1.8 (Document Copies): remove `path` from document table/entity, add `document_copy` table keyed by vault area with created_at/end_date, add `source_url` to document; design decided, ready to implement<br>[2026-09-06] Story P1.8 implemented; added Story P1.9 (Actuator Instantiation & Registration): single owner for actuator creation, registration and start moved out of the constructor, Coordinator routing map keyed by class simple name<br>[2026-09-06] Added Stories P1.10 (actuator run loop), P1.11 (Coordinator entry point and message addressing), P1.12 (status endpoint reports document counts), P1.13 (text/URL ingestion endpoints and the stale controller tests)<br>[2026-09-06] P1.9 story updated to reference the detailed design in documets/design/STARTUP-SEQUENCE.md; added configuration notes about clipper and briefing thread counts<br>[2026-09-07] Added Story P2.8 (MarkItDown spike): evaluate microsoft/markitdown against Apache Tika as the Extractor's converter, and settle how Spring Boot calls an external Python process; P2.3 blocked on it because its stack is v03's JavaScript one |
| BACKLOG-TRACKER.md | [2026-09-06] Delivery status of all Stories grouped WIP / READY / NOT-READY / COMPLETED, plus a Summary table covering Stories and Bugs; seeded from PROJECT_4thBrain.md<br>[2026-09-06] Summary split into four tables, one per status, each carrying the blocker or completion date; the COMPLETED section's duplicate table dropped<br>[2026-09-07] P2.8 added to READY, P2.3 gains it as a second blocker, counts updated to 25 stories |
| build.gradle | [2026-09-03] Gradle build config, Spring Boot 3.2.0, JPA, SQLite JDBC 3.44.0.0, Hibernate SQLite dialect<br>[2026-09-06] `sourceCompatibility` moved inside a `java { }` block, which Gradle 9 requires; Gradle wrapper added |
| documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md | [2026-09-03] Functional Requirements FR1–FR9, Non-Functional Requirements NFR1–NFR12 (reference to v03, no changes) |
| documets/design/schema.sql | [2026-09-03] SQLite schema (copy of v03 schema.sql) |
| documets/design/ADRS.md | [2026-09-03] Architecture Decision Records (reference to v03: ADR14, ADR17, ADR24) |
| documets/design/SPIKE-MARKITDOWN.md | [2026-09-07] Story P2.8 brief: what MarkItDown is (MIT, Python ≥ 3.10, CLI / library / MCP server, formats and their underlying parsers), what it would and would not replace in the pipeline, six options for calling an external Python process from Spring Boot compared side by side, Apache Tika as the no-Python comparison arm, what the spike must measure, exit criteria, risks, one-day timebox |
| documets/design/STARTUP-SEQUENCE.md | [2026-09-06] Story P1.9 design: bean initialization order, ActuatorManager, three phases (create+inject+name, register all, start all), why the current sequence aborts, sequence diagram |
