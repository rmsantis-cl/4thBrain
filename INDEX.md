---
name: INDEX
description: none
date: 2026-08-30
metadata:
  version: 1.36
  created-by: Claude Code
---

# INDEX

Tracks all artifacts, specification documents, interview logs, and foundational instruction files created or used during the development of the Personal Knowledge & Executive Assistant System. Per `.claude/rules/file-indexing.md`.

History cells are a list of `[date] comment` entries, most recent last.

| File Name | History |
| --- | --- |
| `CLAUDE.md` | [2026-08-24] Created via /init from documets/design and documets/Interviews<br>[2026-08-24] Updated — added module directories to Repository Structure, EP8–EP11 to baseline, and Module Map table<br>[2026-08-28] Rewritten — corrected stale "no application code yet" claim, added server/ and documets/bugs/PLAN-*/DESIGN-DEBT/BACKLOG-TRACKER/PROJECT-SUMMARY to structure, updated ADR count to 18 and epic count to 13, pointed to PROJECT-SUMMARY.md for volatile status instead of duplicating it<br>[2026-08-28] Added server/ as sixth module in Module Map (owns EP6/EP9/EP12/EP13), resolving the "EP12/EP13 no module owner" open item |
| `documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md` | [2026-08-24] Present at INDEX creation (pre-existing, no header)<br>[2026-08-26] Added NFR15 — Structured Metadata & Job Queue Storage |
| `documets/design/Project 4thBrain.md` | [2026-08-24] Present at INDEX creation (pre-existing, no header)<br>[2026-08-24] Added EP8–EP11 (QA/Testing, Security, Backup/Recovery, Release Management) per Phase 4 gap analysis<br>[2026-08-25] Updated Story 1.1/1.2 with dictated ingestion directory layout ($RAW_DIR, $VAULT_DIR/incoming, $RAW_DIR/clipping, $VAULT_DIR/raw), cross-referencing new ADR14<br>[2026-08-25] Updated Story 2.1 with topic/subtopic-driven vault path and sibling attachment directory behavior, cross-referencing new ADR15<br>[2026-08-25] Added Spike 3.2 under EP3 — Smart Connections indexing status retrieval, Status: Done<br>[2026-08-25] Revised Spike 3.2 findings after user supplied the in-app "Smart Environment" panel screenshots — corrected terminology to current/missing/skipped/unexpected, added block-level stats<br>[2026-08-25] Added Story 6.4 (Common UI Shell & Design System) under EP6; added it as a dependency of Story 6.1/6.2/6.3<br>[2026-08-26] Added EP12/Story 12.1 — Document/Status/Classification/Job database schema design, Status: Done<br>[2026-08-26] Added Story 7.3 (EP7) — SQLite Database Setup for Processing-State Persistence, Status: To Do<br>[2026-08-26] Added EP13 (Admin & Monitoring Tools) and Story 13.1 — Database Inspector, Status: To Do<br>[2026-08-26] Split Story 7.3 into three focused stories: 7.3 (driver install + file create), 7.4 (schema DDL), 7.5 (enum seeding)<br>[2026-08-28] Added Story 12.2 — Schema Redesign, continuation of Story 12.1, closes Bug 1, Status: Approved for implementation planning<br>[2026-08-28] Added Story 13.3 — Unified Data-Access API, continuation of Story 13.1/6.1, Status: Approved for implementation planning |
| `documets/design/Gantt Chart.md` | [2026-08-24] Present at INDEX creation (pre-existing, no header) |
| `documets/Interviews/PHASE-1.1-INTERVIEW.md` | [2026-08-24] Present at INDEX creation (pre-existing, no header) |
| `documets/Interviews/PHASE-4.1-TRANSCRIPT.md` | [2026-08-24] Present at INDEX creation (pre-existing, no header) |
| `documets/method/Software Documentation Summary and Framework.md` | [2026-08-24] Header inserted, version 14 |
| `documets/method/BOOT.tar` | [2026-08-24] Found archived (tar) in place of BOOT.md, MD-MEMORY-INSTRUCTIONS.md, and the dictation guidelines file; origin unconfirmed, indexed as opaque archive |
| `.claude/rules/file-format.md` | [2026-08-24] Split out of former boot.md |
| `.claude/rules/file-protection.md` | [2026-08-24] Split out of former boot.md |
| `.claude/rules/file-versioning.md` | [2026-08-24] Split out of former boot.md |
| `.claude/rules/file-indexing.md` | [2026-08-24] Split out of former boot.md |
| `.claude/skills/dictation/SKILL.md` | [2026-08-24] Created from documets/method dictation guidelines |
| `documets/PLAN.md` | [2026-08-24] Created — Phase 4 status, EP1–EP11 summary, open scope-lock items |
| `documets/BACKLOG-TRACKER.md` | [2026-08-26] Created — comprehensive view of all 23 stories with status (READY/WIP/COMPLETED), dependencies, acceptance criteria, and working-notes links<br>[2026-08-28] Added Story 12.2 (Schema Redesign), READY, continuation of Story 12.1<br>[2026-08-28] Appended "Follow-up Tasks" section — documentation backpropagation for the Story 12.2 schema redesign, tracked separately since 13.3/13.2 will likely touch the same surface again<br>[2026-08-28] Added Story 13.3 (Unified Data-Access API), READY, continuation of Story 13.1/6.1 |
| `vault/CLAUDE.md` | [2026-08-24] Created — module purpose/scope (EP3, EP10) |
| `vault/backlog.md` | [2026-08-24] Created — story backlog for vault module<br>[2026-08-25] Added Spike 3.2 row (Done) |
| `vault/check_smart_connections_status.py` | [2026-08-25] Created — Spike 3.2 deliverable: reports Smart Connections indexed/pending/excluded totals and per-note status from smart_sources.ajson<br>[2026-08-25] Rewritten to match native Smart Environment panel terminology (current/missing/skipped/unexpected) with skip-reason detection and Sources+Blocks totals; verified numbers match the panel exactly |
| `local-llm/CLAUDE.md` | [2026-08-24] Created — module purpose/scope (EP7, EP11) |
| `local-llm/backlog.md` | [2026-08-24] Created — story backlog for local-llm module |
| `ui/CLAUDE.md` | [2026-08-24] Created — module purpose/scope (EP6, EP9) |
| `ui/backlog.md` | [2026-08-24] Created — story backlog for ui module<br>[2026-08-25] Added Story 6.4 row; added Story 6.4 as a dependency of 6.1/6.2/6.3 |
| `ui/design/STYLE-GUIDE.md` | [2026-08-25] Created — Claude-style design system for Story 6.4 (color tokens, typography, layout pattern) |
| `ui/design/common-shell-mockup.html`, `ui/design/common-shell-mockup-preview.png` | [2026-08-25] Created — static HTML/CSS mockup of the common UI shell and its rendered preview |
| `ingestor-classification/CLAUDE.md` | [2026-08-24] Created — module purpose/scope (EP1, EP2) |
| `ingestor-classification/backlog.md` | [2026-08-24] Created — story backlog for ingestor-classification module |
| `batch/CLAUDE.md` | [2026-08-24] Created — module purpose/scope (EP4, EP5, EP8) |
| `batch/backlog.md` | [2026-08-24] Created — story backlog for batch module |
| `server/CLAUDE.md` | [2026-08-28] Created — module purpose/scope (EP6, EP9, EP12, EP13); first module CLAUDE.md documenting real shipped code rather than design-only status |
| `server/backlog.md` | [2026-08-28] Created — story backlog for server module (6.1, 6.4, 12.1, 12.2, 13.1, 13.2, 13.3, 9.1) |
| `documets/design/ADRS.md` | [2026-08-24] Created — ADR1–ADR12 backfilled from NFR baseline, ADR13 logged for module-split decision<br>[2026-08-25] Added ADR14 — ingestion directory layout ($RAW_DIR / $VAULT_DIR/incoming / $RAW_DIR/clipping / $VAULT_DIR/raw)<br>[2026-08-25] Added ADR15 — topic/subtopic-driven vault path resolution and sibling attachment directories<br>[2026-08-25] Added ADR16 (open) — WSL2 vs. any-environment component placement, open question on running Obsidian in WSL2 for future Docker packaging<br>[2026-08-25] Split ADR16 full record out to `adr16-component-placement.md`; this file now holds only its abstract and a reference<br>[2026-08-26] Closed ADR16 — tested Obsidian in WSL via flatpak; no benefit due to UI degradation; keep current setup (Windows Obsidian, WSL Ollama); re-evaluate at EP11<br>[2026-08-26] Added ADR17 — SQLite as the structured metadata/job-queue store<br>[2026-08-26] Closed ADR17 — SQLite chosen; critical constraint: keep transactions brief; if long concurrent txns needed during impl, must revisit (migrate to PostgreSQL) |
| `documets/design/adr16-component-placement.md` | [2026-08-25] Created — full ADR16 record split out of ADRS.md, with research confirming Obsidian can run natively in WSL2 via WSLg<br>[2026-08-26] ADR closed: tested Obsidian/Zed in WSL via flatpak; no benefit due to UI degradation; keep current setup; re-evaluate at EP11 |
| `documets/design/adr18-persistence-tech.md` | [2026-08-26] Created — full ADR18 record (open): relational database technology choice (SQLite vs. PostgreSQL) for processing-state persistence; analysis of separate vector database for pre-vault classification |
| `MEMORY.md` | [2026-08-24] Created — seeded from current project state per md-memory.md<br>[2026-08-25] Updated — Story 6.4 in progress, ADR14/15, Spike 3.2, incremental-delivery decision |
| `params.json` | [2026-08-25] Created at vault/params.json — vault_dir and Smart Connections params<br>[2026-08-25] Moved to project root<br>[2026-08-25] Added raw_dir, server_port, server_bind_host, ollama_base_url, ollama_chat_model |
| `vault/Instructions.md` | [2026-08-25] Created — Smart Connections install/config guide<br>[2026-08-25] Updated — params.json path reference |
| `documets/design/classes.md` | [2026-08-25] Created — Document/Status/Classification/Job class definitions transcribed from user-supplied Class_Definitions_Specification.rtf<br>[2026-08-26] Added "Physical schema" section cross-referencing database-schema.md<br>[2026-08-26] Manually expanded to 7 classes (added JobType, JobDocument, Process; renamed topicId)<br>[2026-08-28] Re-baselined by Story 12.2 (Schema Redesign, closes Bug 1) — removed Process/JobDocument, added JobStatus/JobFile/Tag, Classification re-keyed to global name-based identity |
| `documets/design/schema.sql` | [2026-08-26] Created — standalone SQLite DDL for all 7 classes (status, job_type, process, classification, document, job, job_document) with FKs, indexes, and seed data<br>[2026-08-28] Rewritten by Story 12.2 (Schema Redesign, closes Bug 1) — natural keys on status/job_type/tag/classification, classification re-keyed to name (no surrogate id, seeded with system directory roles), new job_status/job_file/document_tag tables; tested against a scratch SQLite DB with no errors |
| `documets/design/database-schema.md` | [2026-08-26] Created — SQLite table definitions, DDL, seed data, storage location decision for Story 12.1<br>[2026-08-26] Marked superseded — full schema moved to schema.sql |
| `documets/design/classes.mmd` | [2026-08-26] Created — Mermaid class diagram for 4-entity model<br>[2026-08-26] Updated for 7-class schema with new relationships<br>[2026-08-26] Reformatted field notation (bold name: type, explicit FK references, not null markers) |
| `documets/design/classes.png` | [2026-08-26] Created — rendered class diagram (4-entity)<br>[2026-08-26] Updated — re-rendered from updated classes.mmd (7-class)<br>[2026-08-26] Re-rendered with improved field format |
| `documets/img/database-schema.mmd`, `documets/img/database-schema.png` | [2026-08-26] Created — Mermaid ERD source and rendered PNG for the 4-entity database schema (superseded) |
| `documets/story/story-7.3.md` | [2026-08-26] Created — abstract, observations, deliverable (SQLite setup), ADR17 reference, implementation notes, TODO follow-ups<br>[2026-08-26] Revised — narrowed scope to driver installation + file creation only (schema and seeding split to 7.4/7.5) |
| `documets/story/story-7.4.md` | [2026-08-26] Created — abstract, observations, deliverable (schema DDL creation), implementation notes, TODO follow-ups |
| `documets/story/story-7.5.md` | [2026-08-26] Created — abstract, observations, deliverable (enum seeding), implementation notes, TODO follow-ups |
| `documets/story/story-13.1.md` | [2026-08-26] Created — abstract, observations, deliverable (database inspector UI), implementation notes, TODO follow-ups |
| `documets/story/story-12.1.md` | [2026-08-26] Created — abstract, observations, deliverable, ADR17 reference, TODO follow-ups<br>[2026-08-26] Updated — noted post-scope expansion to 7-class schema |
| `documets/story/story-13.3.md` | [2026-08-28] Created — abstract, observations (ingest-service.js schema mismatch, DatabaseSync transaction gap, schema-drift bug), deliverable (repository layer/REST API/Scalar docs file list + build sequence), TODO follow-ups |
| `vault/validate_smart_connections.py` | [2026-08-25] Created — install validation script |
| `vault/Obsidian-refs/Obsidian-MCP-Capabilities-Summary.md` | [2026-08-25] Created — summary of Obsidian REST API/MCP and Smart Connections capabilities, framed for EP3/EP10 |
| `documets/INGESTION-FLOW.md` | [2026-08-25] Created — ingestion/classification flow narrative referencing img/ingestion-flow.png and img/classification-flow.png |
| `documets/img/ingestion-flow.mmd`, `documets/img/ingestion-flow.png` | [2026-08-25] Created — Mermaid source and rendered PNG for the ingestion flow diagram |
| `documets/img/classification-flow.mmd`, `documets/img/classification-flow.png` | [2026-08-25] Created — Mermaid source and rendered PNG for the classification flow diagram |
| `documets/story/story-1.1.md` | [2026-08-25] Created — abstract, observations, ADR14 reference, TODO placeholder |
| `documets/story/story-1.2.md` | [2026-08-25] Created — abstract, observations, ADR14 reference, TODO placeholder |
| `documets/story/story-2.1.md` | [2026-08-25] Created — abstract, observations, ADR15 reference, TODO placeholder |
| `documets/story/spike-3.2.md` | [2026-08-25] Created — abstract, investigation findings, deliverable, TODO follow-ups<br>[2026-08-25] Updated with native Smart Environment panel findings and revised current/missing/skipped/unexpected terminology |
| `documets/story/story-6.4.md` | [2026-08-25] Created — abstract, observations, deliverable (style guide + mockup), TODO follow-ups<br>[2026-08-25] Updated — logged incremental-delivery correction, added ui/plan.md to Deliverable |
| `ui/plan.md` | [2026-08-25] Created — scoped Story 6.4 implementation plan, real-vs-mocked breakdown per panel |
| `server/package.json`, `server/config.js` | [2026-08-25] Created — server scaffold (express/multer/openai deps), params.json-backed config with $RAW_DIR setup and non-fatal Ollama reachability check |
| `server/lib/smart-connections-status.js` | [2026-08-25] Created — JS port of vault/check_smart_connections_status.py, not yet wired into a route (reserved for Story 6.3) |
| `server/ui/styles.js`, `server/ui/client.js`, `server/ui/page.js` | [2026-08-25] Created — 6-panel UI shell: CSS ported from common-shell-mockup.html, client-side panel switching/mobile toggle/mocked fetch calls, single inlined HTML page assembly |
| `server/routes/chat-page.js` | [2026-08-25] Created — GET /chat, the only GET route in the app |
| `server/routes/ingest.js`, `server/routes/status.js`, `server/routes/chat-llama.js` | [2026-08-25] Created — mocked POST stub endpoints (add file/text/url, ingest status, Llama chat), canned responses, no real I/O or Ollama calls |
| `server/index.js` | [2026-08-25] Created — wires config + routes, binds to 127.0.0.1, non-fatal Ollama reachability check on boot |
| `server/.gitignore` | [2026-08-25] Created — excludes node_modules |
| `ingestor-classification/db/init.js` | [2026-08-26] Created — database initialization module (mirrors server/db/init.js), targets ingestor-classification/b4hdb.sqlit3 |
| `ingestor-classification/.gitignore` | [2026-08-26] Created — excludes b4hdb.sqlit3 from version control |
| `ingestor-classification/b4hdb.sqlit3` | [2026-08-26] Created — SQLite database with all 7 tables from schema.sql and seeded status enum |
| `server/routes/admin-db.js` | [2026-08-26] Created — Story 13.1 implementation: Database Inspector route with full CRUD UI, 700+ lines inlined HTML/CSS/JS, 7 API endpoints, table browser with pagination/filtering/sorting |
| `.claude/rules/design-before-implementation.md` | [2026-08-27] Created — no implementation without design + Epic/Story; gaps logged as Design Debt; code commits require explicit per-change user authorization, documentation doesn't |
| `documets/DESIGN-DEBT.md` | [2026-08-27] Created, empty — companion log for the new design-before-implementation rule |
| `documets/PLAN-28-08-2026.md` | [2026-08-28] Created — Schema Redesign (Story 12.2) → API Layer (Story 13.3) → Admin UI Restructuring (Story 13.2 extension) planning session output; tracks implementation status per step |
| `documets/HANDOUT-28-08-2026.md` | [2026-08-28] Created — session handoff for continuing from a different machine: git state, chronological summary of Story 12.2 (implemented) and Story 13.3 (planned), next steps, working notes |
| `documets/bugs/Bug-1-Unauthorized-Schema-Table-Additions.md` | [2026-08-28] Created, filed and closed — unauthorized process/job_document/document_tag tables and UUID keys added to schema.sql/classes.md without Story/design authorization; addressed by Story 12.2 |
| `documets/PLAN-29-08-2026.md` | [2026-08-29] Created — ingestion pipeline implementation plan (Stories 1.1/1.2/2.1/3.1/4.1): job queue processor design, Clipper/Extractor/RAG Indexing/Classification actuators, `document.parent`/`author` schema addition, leveled (INFO/WARNING/ERROR) logging with centralized start/end audit trail, real ZIP/TAR/`.Z` archive extraction scoped for this pass; tracks its own implementation-status checklist<br>[2026-08-29] Corrected `created-by` metadata to Claude Sonnet 5 |
| `documets/bugs/Bug-2-Repository-Layer-Schema-Mismatch.md` | [2026-08-30] Created, filed and closed inline — `document`/`job`/`tag`/`classification` repositories referenced columns removed by the Story 12.2 schema redesign (confirmed empirically: `createIngestJob` threw `no such column: description`), breaking Story 6.1's web ingestion path end-to-end since 2026-08-28; fixed as a prerequisite to implementing Stories 1.1/4.1 |
| `server/lib/repositories/document.js`, `job.js`, `tag.js`, `classification.js`, `jobFile.js` | [2026-08-30] Rewritten to match `documets/design/schema.sql` (Bug 2 fix); `job.js` gained `markRunning`/`markCompleted`/`markFailed`/`listPending`/`listByStatus`, `jobFile.js` gained `listForJob`/`findByPath`/`listLocked`/`clearLock`, `document.js` gained `setStatus` |
| `server/lib/ingest-service.js` | [2026-08-30] Fixed `document.create()` call to the corrected signature and status casing (`"New"`); added a `job_file` record so a job has a queryable link to the file it should process |
| `server/config.js` | [2026-08-30] Added `vaultDirIncoming` ($VAULT_DIR/incoming) for Story 1.1 |
| `server/lib/ingestion/file-validator.js`, `path-resolver.js`, `vault-writer.js`, `ingest-executor.js`, `watcher.js` | [2026-08-30] Created — Story 1.1 (Direct Structured Vault Ingestion): MIME/extension classification, collision-safe path resolution, byte-for-byte vault copy, the `job_type='ingest'` executor, and a chokidar watcher on `$RAW_DIR/inbox` deduped against the web-form path |
| `batch/lock-manager.js`, `job-executors.js`, `cleanup.js`, `worker.js` | [2026-08-30] Created — Story 4.1 (Background Sweep & Queue Execution): file-based PID lock (ADR10 concurrency=1), job-type dispatch table, orphan cleanup, one-sweep-per-invocation worker (`runCycle()`) |
| `server/test/`, `batch/test/` | [2026-08-30] Created — 73 tests (`node:test`) covering the Bug 2 regression and every Story 1.1/4.1 module, including a full end-to-end sweep test |
| `documets/story/story-1.1.md` | [2026-08-25] Created — abstract, observations, ADR14 reference, TODO placeholder<br>[2026-08-30] Implemented; documents design decisions (scope boundary vs. topic routing, watcher/web-form dedup, `canHandle()`/`execute()` split) and known limitations |
| `documets/story/story-4.1.md` | [2026-08-30] Created — implemented; reconciles `story-4.1-plan.md` against the live schema (job_type enum drift, no `created_at` column) and against ADR5 (Node.js, not PowerShell) and ADR10 (concurrency=1, not `THREAD_COUNT>1`) |
| `documets/BACKLOG-TRACKER.md`, `documets/PROJECT-SUMMARY.md`, `documets/DESIGN-DEBT.md`, `documets/INDEX.md` | [2026-08-30] Updated — Stories 1.1/4.1 READY → WIP with implementation notes; Design Debt item 3 logged (Story 1.1 vs. 3.1 ownership conflict in `story-6.1.md`'s actuator table, found while implementing 1.1); `documets/INDEX.md` also updated in parallel with this file — see `ctx-research/context-usage-report.md` "Findings" for the resulting duplicate-index gap this surfaced |
| `ctx-research/context-usage-report.md`, `ctx-research/proposed-context-loading-rules.md` | [2026-08-30] Created — audit of every markdown file loaded into context during the Story 1.1/4.1 session (auto-injected vs. explicitly read, useful vs. inert), and six concrete proposed rules for right-sizing what auto-loads, each traced to a specific finding |
