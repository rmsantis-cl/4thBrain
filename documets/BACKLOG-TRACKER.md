---
name: BACKLOG-TRACKER
description: Comprehensive view of all project stories with status, dependencies, and acceptance criteria
metadata:
  version: 1.0
  created-by: Claude Code
  date: 2026-08-26
---

# BACKLOG TRACKER — 4thBrain Stories

Master tracking document for all project stories across all epics. Status values: **READY** (not started), **WIP** (in progress), **COMPLETED** (done).

---

## Summary Table

| ID | Story | Status | [[Detail](#story-details)] |
|---|---|---|---|
| 1.1 | Direct Structured Vault Ingestion | READY | [[1.1](#story-11-direct-structured-vault-ingestion)] |
| 1.2 | Unstructured Text Parsing & Sanitization | READY | [[1.2](#story-12-unstructured-text-parsing--sanitization)] |
| 2.1 | Local LLM Metadata & Tag Inference | READY | [[2.1](#story-21-local-llm-metadata--tag-inference)] |
| 3.1 | Smart Connections Vector Indexing Pipeline | READY | [[3.1](#story-31-smart-connections-vector-indexing-pipeline)] |
| 3.2 | Smart Connections Indexing Status Retrieval (Spike) | COMPLETED | [[3.2](#spike-32-smart-connections-indexing-status-retrieval)] |
| 4.1 | Background Sweep & Queue Execution Script | READY | [[4.1](#story-41-background-sweep--queue-execution-script)] |
| 5.1 | Multi-Source Briefing Synthesis Engine | READY | [[5.1](#story-51-multi-source-briefing-synthesis-engine)] |
| 6.1 | Web Ingestion Form & Submission Handler | READY | [[6.1](#story-61-web-ingestion-form--submission-handler)] |
| 6.2 | Hybrid Keyword & Semantic Search Interface | READY | [[6.2](#story-62-hybrid-keyword--semantic-search-interface)] |
| 6.3 | Pipeline Monitoring & Dashboard UI | READY | [[6.3](#story-63-pipeline-monitoring--dashboard-ui)] |
| 6.4 | Common UI Shell & Design System | WIP | [[6.4](#story-64-common-ui-shell--design-system)] |
| 7.1 | WSL2 Runtime & Resource Bound Configuration | READY | [[7.1](#story-71-wsl2-runtime--resource-bound-configuration)] |
| 7.2 | Process Lifecycle & MCP Server Setup | READY | [[7.2](#story-72-process-lifecycle--mcp-server-setup)] |
| 7.3 | SQLite Database Setup for Processing-State Persistence | WIP | [[7.3](#story-73-sqlite-database-setup-for-processing-state-persistence)] |
| 7.4 | Create Database Schema from DDL | WIP | [[7.4](#story-74-create-database-schema-from-ddl)] |
| 7.5 | Seed Constants & Enumerations | WIP | [[7.5](#story-75-seed-constants--enumerations)] |
| 8.1 | Automated Test Harness & Regression Suite | READY | [[8.1](#story-81-automated-test-harness--regression-suite)] |
| 8.2 | Bug & Issue Tracking Workflow | READY | [[8.2](#story-82-bug--issue-tracking-workflow)] |
| 9.1 | Local-Only Access Enforcement & Auth Guard | READY | [[9.1](#story-91-local-only-access-enforcement--auth-guard)] |
| 10.1 | Scheduled Vault Snapshot & Restore | READY | [[101](#story-101-scheduled-vault-snapshot--restore)] |
| 11.1 | Release Packaging & Versioning | READY | [[11.1](#story-111-release-packaging--versioning)] |
| 12.1 | Document/Status/Classification/Job Database Schema Design | COMPLETED | [[12.1](#story-121-documentstatusclassificationjob-database-schema-design)] |
| 13.1 | Database Inspector — Table Browser & Admin Panel | READY | [[13.1](#story-131-database-inspector--table-browser--admin-panel)] |

---

## Story Details

### Story 1.1: Direct Structured Vault Ingestion

| Field | Value |
|---|---|
| **Abstract** | Ingest structured Markdown directly into designated Obsidian vault subfolders. |
| **Description** | Build local pipeline handlers that watch `$RAW_DIR` (outside the vault) for incoming files. Text, Markdown, and HTML files are already indexable, so they are copied directly to `$VAULT_DIR/incoming` without transformation, preserving existing frontmatter and structure. See ADR14 for the full directory layout. |
| **Dependencies** | depends on Story 7.1, depends on Story 7.2 |
| **Acceptance Criteria** | • Text, Markdown, and HTML files placed in `$RAW_DIR` are copied to `$VAULT_DIR/incoming` without modification.<br>• Ingested files maintain original frontmatter schema and metadata.<br>• Target subfolder path resolution writes files directly to designated locations without file corruption. |
| **Status** | READY |
| **Working Notes** | [[story-1.1.md](./story/story-1.1.md)] |

---

### Story 1.2: Unstructured Text Parsing & Sanitization

| Field | Value |
|---|---|
| **Abstract** | Clean, transcode, and normalize unstructured or binary raw payloads. |
| **Description** | Implement handlers for content that can't be indexed as-is. URLs placed in `$RAW_DIR` are moved to `$RAW_DIR/clipping` for extraction. Binary formats (PDF, images, Word docs, etc.) are transcoded into clean MD/text; the transcoded output is written to `$VAULT_DIR/incoming`, and the original binary is archived to `$VAULT_DIR/raw` with the processed file carrying a reference back to its raw original's location. See ADR14 for the full directory layout. |
| **Dependencies** | must be worked with Story 1.1 |
| **Acceptance Criteria** | • Input containing raw HTML, web clips, or special characters is sanitized to clean plain text/Markdown.<br>• Core semantic text content remains fully intact post-sanitization.<br>• URLs submitted for ingestion are relocated to `$RAW_DIR/clipping` prior to extraction.<br>• Binary files are not written into the vault until transcoded; transcoded output lands in `$VAULT_DIR/incoming` and the original is archived to `$VAULT_DIR/raw`.<br>• Each transcoded file in `$VAULT_DIR/incoming` references the archived location of its original raw file. |
| **Status** | READY |
| **Working Notes** | [[story-1.2.md](./story/story-1.2.md)] |

---

### Story 2.1: Local LLM Metadata & Tag Inference

| Field | Value |
|---|---|
| **Abstract** | Infer tags, metadata, and topic/subtopic placement using local LLM inference. |
| **Description** | Connect the Node.js processing pipeline to the local Ollama instance to analyze raw note content and generate appropriate tags and YAML header fields based on vault taxonomy. In addition to tags, the LLM infers a topic/subtopic for the note; this topic/subtopic (not the tags) determines the target vault subfolder the note is filed into. If the note references images, documents, or other files, those referenced files are placed in a sibling attachment directory next to the note. See ADR15. |
| **Dependencies** | depends on Story 1.1, depends on Story 7.1 |
| **Acceptance Criteria** | • Generated notes contain syntactically valid YAML frontmatter blocks.<br>• Applied tags strictly align with configured vault taxonomy rules.<br>• Note is filed into the vault subfolder determined by its inferred topic/subtopic.<br>• Files referenced by the note (images, documents, other attachments) are placed in a sibling directory next to the note, not left in `$VAULT_DIR/incoming`. |
| **Status** | READY |
| **Working Notes** | [[story-2.1.md](./story/story-2.1.md)] |

---

### Story 3.1: Smart Connections Vector Indexing Pipeline

| Field | Value |
|---|---|
| **Abstract** | Trigger vector embedding generation for updated vault notes. |
| **Description** | Ensure newly created or modified Markdown notes in the vault trigger local embedding updates within Smart Connections (.smart-env). |
| **Dependencies** | depends on Story 1.1, depends on Story 7.2 |
| **Acceptance Criteria** | • Modified or created notes are automatically scanned and indexed.<br>• Embeddings are stored locally in .smart-env without relying on cloud vector stores. |
| **Status** | READY |
| **Working Notes** | [[story-3.1.md](./story/story-3.1.md)] (not yet created) |

---

### Spike 3.2: Smart Connections Indexing Status Retrieval

| Field | Value |
|---|---|
| **Abstract** | Investigate how to determine Smart Connections indexing status (totals, failures, per-note lookup) from `$VAULT_DIR/.smart-env` or `$VAULT_DIR/.obsidian`. |
| **Description** | Timeboxed research spike to find a reliable source for: (1) totals of indexed/pending/failed notes, (2) a list of failed notes with causes, (3) a way to check a single note's status by path. |
| **Dependencies** | depends on Story 3.1 |
| **Key Findings** | • Smart Connections data lives in `$VAULT_DIR/.smart-env`, not `.obsidian`.<br>• Live diagnostics available via Obsidian "Smart Environment" panel (command palette).<br>• `smart_sources/smart_sources.ajson` holds one entry per note; status inferred by comparing stored size vs. `smart_env.json` thresholds.<br>• Block-level coverage is lower than source-level (720/1045 blocks skipped vs. 1/31 sources in test vault). |
| **Deliverable** | `vault/check_smart_connections_status.py` — reports indexed/pending/failed counts and per-note status; verified against live vault. |
| **Acceptance Criteria** | • Script reports total current/missing/skipped/unexpected counts for both Sources and Blocks (matches native panel exactly).<br>• Script reports list of skipped/unexpected notes with causes.<br>• Script can report status for a single note via command-line argument. |
| **Status** | COMPLETED |
| **Working Notes** | [[spike-3.2.md](./story/spike-3.2.md)] |

---

### Story 4.1: Background Sweep & Queue Execution Script

| Field | Value |
|---|---|
| **Abstract** | Implement automated overnight queue processing and link verification. |
| **Description** | Build a scheduled background execution worker that processes queued ingestion items, executes batch classification, cleans up orphaned data, and validates local links. |
| **Dependencies** | depends on Story 1.1, depends on Story 2.1 |
| **Acceptance Criteria** | • Batch worker executes unattended against pending queue items.<br>• Job state flags (pending, completed, failed) update correctly upon processing completion. |
| **Status** | READY |
| **Working Notes** | [[story-4.1.md](./story/story-4.1.md)] (not yet created) |

---

### Story 5.1: Multi-Source Briefing Synthesis Engine

| Field | Value |
|---|---|
| **Abstract** | Generate daily briefing Markdown notes by combining external and local data. |
| **Description** | Develop the briefing module to collect pending calendar events, unread priority emails, and contextually relevant vault notes, passing them to the local LLM to draft a structured daily briefing. |
| **Dependencies** | depends on Story 2.1, depends on Story 4.1 |
| **Acceptance Criteria** | • Daily briefing note is generated each morning in the designated daily notes folder.<br>• Output includes distinct, populated sections for agenda, action items, and relevant contextual reminders. |
| **Status** | READY |
| **Working Notes** | [[story-5.1.md](./story/story-5.1.md)] (not yet created) |

---

### Story 6.1: Web Ingestion Form & Submission Handler

| Field | Value |
|---|---|
| **Abstract** | Build web-based entry form for submitting links, files, and text. |
| **Description** | Construct frontend form components allowing raw text input, file uploads, and web URL submissions directly to the Node.js ingestion endpoint. |
| **Dependencies** | depends on Story 1.1, depends on Story 6.4, must be worked with Story 6.3 |
| **Acceptance Criteria** | • Submitting form content creates a valid pipeline job and returns a unique Job ID immediately. |
| **Status** | READY |
| **Working Notes** | [[story-6.1.md](./story/story-6.1.md)] (not yet created) |

---

### Story 6.2: Hybrid Keyword & Semantic Search Interface

| Field | Value |
|---|---|
| **Abstract** | Implement UI search bar connecting to vault and vector indexes. |
| **Description** | Build a search component that queries local files and vector embeddings via MCP/Node endpoints, displaying ranked results with direct file links. |
| **Dependencies** | depends on Story 3.1, depends on Story 6.4 |
| **Acceptance Criteria** | • Search queries display ranked result cards containing snippets and file paths with sub-second response times. |
| **Status** | READY |
| **Working Notes** | [[story-6.2.md](./story/story-6.2.md)] (not yet created) |

---

### Story 6.3: Pipeline Monitoring & Dashboard UI

| Field | Value |
|---|---|
| **Abstract** | Provide real-time status view of active, pending, and failed jobs. |
| **Description** | Build a status panel showing background execution state, error logs, and controls to re-run failed jobs. |
| **Dependencies** | depends on Story 4.1, depends on Story 6.4, must be worked with Story 6.1 |
| **Acceptance Criteria** | • Displays accurate counts for active, pending, and failed processing jobs.<br>• Provides functional "Retry" action button for failed jobs. |
| **Status** | READY |
| **Working Notes** | [[story-6.3.md](./story/story-6.3.md)] (not yet created) |

---

### Story 6.4: Common UI Shell & Design System

| Field | Value |
|---|---|
| **Abstract** | Build the shared navigation shell and visual design system that Stories 6.1–6.3 render inside of. |
| **Description** | Establish a persistent app shell (left sidebar nav, top status/settings area, main content slot) and a reusable design-system spec (color palette, typography, spacing, component patterns – dark theme, sidebar navigation, floating quick-capture bar) modeled on the Claude.ai desktop app's visual language. Sidebar nav items map to 4thBrain's own surfaces (Ingest, Search, Dashboard) rather than Claude's. The home view includes a personalized greeting and a floating quick-capture input (text/URL/file) as the site-wide entry point; the fuller multi-field ingestion form remains Story 6.1's concern. Design-system spec and static mockup live under `ui/design/`. |
| **Dependencies** | none |
| **Acceptance Criteria** | • Written style guide documents color palette, typography, spacing scale, and component patterns, reusable across Stories 6.1–6.3.<br>• Static HTML/CSS mockup demonstrates the shell (sidebar nav, greeting, quick-capture bar) rendered in a browser.<br>• Sidebar nav items and quick-capture bar are labeled for 4thBrain's actual surfaces, not copied verbatim from Claude.ai. |
| **Status** | WIP |
| **Working Notes** | [[story-6.4.md](./story/story-6.4.md)] |

---

### Story 7.1: WSL2 Runtime & Resource Bound Configuration

| Field | Value |
|---|---|
| **Abstract** | Configure WSL2 host environment, memory caps, and Ollama GPU passthrough. |
| **Description** | Establish base system configuration files (.wslconfig, systemd/PM2 supervisor, Ollama service) to enforce local execution limits, concurrency caps (concurrency: 1), and host memory protection. |
| **Dependencies** | None (Foundation Task) |
| **Acceptance Criteria** | • Node.js and Ollama run inside WSL2 with GPU acceleration active.<br>• WSL2 RAM usage stays within configured bounds without host OOM errors.<br>• Concurrency locks prevent multiple simultaneous local LLM calls from overwhelming memory. |
| **Status** | READY |
| **Working Notes** | [[story-7.1.md](./story/story-7.1.md)] (not yet created) |

---

### Story 7.2: Process Lifecycle & MCP Server Setup

| Field | Value |
|---|---|
| **Abstract** | Configure process supervision and MCP vector integration service. |
| **Description** | Set up initialization scripts to boot Ollama, launch Node.js services, and expose the Smart Connections MCP server endpoint safely across local boundaries. |
| **Dependencies** | must be worked with Story 7.1 |
| **Acceptance Criteria** | • Boot sequence reliably starts Ollama, confirms port availability, and initializes dependent Node.js/MCP processes.<br>• Process logs write structured JSON to stdout/file. |
| **Status** | READY |
| **Working Notes** | [[story-7.2.md](./story/story-7.2.md)] (not yet created) |

---

### Story 7.3: SQLite Database Setup for Processing-State Persistence

| Field | Value |
|---|---|
| **Abstract** | Install SQLite drivers and create the metadata database file. |
| **Description** | Install SQLite drivers (node:sqlite for Node.js, sqlite3 stdlib for Python), create database file at configured path, and initialize with schema from documets/design/schema.sql. Verify cross-language access (Node.js and Python can read/write simultaneously). **Critical constraint (ADR17):** keep all transactions brief — long-running transactions will serialize concurrent access. |
| **Dependencies** | depends on Story 7.1, depends on Story 7.2 |
| **Acceptance Criteria** | • SQLite driver installed and tested (node:sqlite via Node, sqlite3 available to Python).<br>• Database file created at configured path (server/4thbrain-metadata.db and ingestor-classification/b4hdb.sqlit3).<br>• Cross-language smoke test: Node.js writes a Document record, Python reads it back without error. |
| **Status** | WIP |
| **Working Notes** | [[story-7.3.md](./story/story-7.3.md)] |

---

### Story 7.4: Create Database Schema from DDL

| Field | Value |
|---|---|
| **Abstract** | Execute DDL to create all database tables and indexes. |
| **Description** | Run documets/design/schema.sql to create all 7 tables (status, job_type, process, classification, document, job, job_document) with FK constraints and indexes. Verify via `pragma table_info()` on each table. |
| **Dependencies** | depends on Story 7.3 |
| **Acceptance Criteria** | • All 7 tables created in the database.<br>• All columns, types, and constraints match schema.sql spec.<br>• All indexes created (idx_document_status, idx_job_type, etc.).<br>• Schema verifiable via `pragma table_info()` on each table. |
| **Status** | WIP |
| **Working Notes** | [[story-7.4.md](./story/story-7.4.md)] |

---

### Story 7.5: Seed Constants & Enumerations

| Field | Value |
|---|---|
| **Abstract** | Populate reference/enum tables with predefined constant values. |
| **Description** | Seed status table (5 rows: New/Processing/Indexed/Failed/Archived), job_type table (ingest, transcode, classify, batch-run, index), and process table (windows, wsl, batch) with deterministic identifiers. Idempotent seeding via `INSERT OR IGNORE`. |
| **Dependencies** | depends on Story 7.4 |
| **Acceptance Criteria** | • Status table seeded with exactly 5 rows (New, Processing, Indexed, Failed, Archived).<br>• Job_type table seeded with exactly 5 rows (ingest, transcode, classify, batch-run, index).<br>• Process table seeded with exactly 3 rows (windows, wsl, batch).<br>• All values queryable and validated via smoke test. |
| **Status** | WIP |
| **Working Notes** | [[story-7.5.md](./story/story-7.5.md)] |

---

### Story 8.1: Automated Test Harness & Regression Suite

| Field | Value |
|---|---|
| **Abstract** | Build the testing harness used to verify Story acceptance criteria. |
| **Description** | Establish unit, integration, and regression test scaffolding covering the ingestion pipeline, tagging engine, indexing, batch jobs, and Web UI endpoints. |
| **Dependencies** | depends on Story 7.1, depends on Story 7.2 |
| **Acceptance Criteria** | • Automated tests exist for each Epic's core acceptance criteria and run without manual setup.<br>• Regression suite flags breaking changes before merge/release. |
| **Status** | READY |
| **Working Notes** | [[story-8.1.md](./story/story-8.1.md)] (not yet created) |

---

### Story 8.2: Bug & Issue Tracking Workflow

| Field | Value |
|---|---|
| **Abstract** | Formalize Bug/Issue capture, triage, and resolution tracking. |
| **Description** | Implement (or adopt) a tracking mechanism where Bugs (linked to a Story) and Issues (anomalies resolved by no-action, doc update, or bug conversion) are logged per the framework's Document Type 7. |
| **Dependencies** | must be worked with Story 8.1 |
| **Acceptance Criteria** | • Every reported bug is linked to an associated Story for fix tracking.<br>• Issues are resolvable via one of the three defined dispositions (no action / doc update / bug report). |
| **Status** | READY |
| **Working Notes** | [[story-8.2.md](./story/story-8.2.md)] (not yet created) |

---

### Story 9.1: Local-Only Access Enforcement & Auth Guard

| Field | Value |
|---|---|
| **Abstract** | Restrict Web UI/API access to authenticated local sessions. |
| **Description** | Add a lightweight auth guard (e.g., local token/session) to the Node.js orchestration server so ingestion, search, and dashboard endpoints (EP6) aren't reachable by arbitrary network callers. |
| **Dependencies** | depends on Story 7.2, depends on Story 6.1 |
| **Acceptance Criteria** | • Unauthenticated requests to ingestion/search/dashboard endpoints are rejected.<br>• Server binds to localhost/WSL2-internal interface by default, not 0.0.0.0. |
| **Status** | READY |
| **Working Notes** | [[story-9.1.md](./story/story-9.1.md)] (not yet created) |

---

### Story 10.1: Scheduled Vault Snapshot & Restore

| Field | Value |
|---|---|
| **Abstract** | Periodically snapshot the vault and vector index for recovery. |
| **Description** | Implement a scheduled backup routine (pre-batch-run snapshot) covering the Markdown vault and .smart-env files, with a documented restore procedure. |
| **Dependencies** | depends on Story 4.1, depends on Story 3.1 |
| **Acceptance Criteria** | • Snapshots are taken automatically before each overnight batch run (EP4).<br>• A restore operation returns the vault/index to the last good snapshot without manual file surgery. |
| **Status** | READY |
| **Working Notes** | [[story-10.1.md](./story/story-10.1.md)] (not yet created) |

---

### Story 11.1: Release Packaging & Versioning

| Field | Value |
|---|---|
| **Abstract** | Define how completed Stories/fixes are grouped and versioned into a Release. |
| **Description** | Build the release definition/versioning process referenced in Phase 5 (Release Definition & Planning) – tagging, changelog, and rollout scripting distinct from initial dev-host setup. |
| **Dependencies** | depends on Story 7.1, depends on Story 7.2, depends on Story 8.1 |
| **Acceptance Criteria** | • Each release has a version tag and changelog mapping to closed Stories/Bugs.<br>• A rollback path exists to the previous release version. |
| **Status** | READY |
| **Working Notes** | [[story-11.1.md](./story/story-11.1.md)] (not yet created) |

---

### Story 12.1: Document/Status/Classification/Job Database Schema Design

| Field | Value |
|---|---|
| **Abstract** | Design the SQLite schema for the Document/Status/Classification/Job data model. |
| **Description** | Translate the domain model in `documets/design/classes.md` into a physical SQLite schema – table definitions, primary/foreign keys, seed data for the fixed Status enumeration, and an ERD. Design only; no implementation or wiring into `server/` in this pass. Expanded to 7 classes (added JobType, JobDocument, Process). Full schema: `documets/design/schema.sql`. See ADR17. |
| **Dependencies** | none |
| **Acceptance Criteria** | • Schema covers all entities in `classes.md` with types/keys matching that spec.<br>• ERD (`documets/design/classes.mmd`, rendered PNG) visualizes tables and relationships.<br>• Storage location and access pattern (SQLite file location, Node.js driver) documented. |
| **Status** | COMPLETED |
| **Working Notes** | [[story-12.1.md](./story/story-12.1.md)] |

---

### Story 13.1: Database Inspector — Table Browser & Admin Panel

| Field | Value |
|---|---|
| **Abstract** | Web UI for developers and QA to inspect and edit SQLite database tables for debugging and testing. |
| **Description** | Add a protected admin route (`GET /admin/db`) serving a single-page interface to browse the 4thBrain metadata database (7 tables). Allow viewing table schemas, filtering/sorting rows, viewing record details, and (with caution) editing/deleting records for testing purposes. Include database health stats (row counts, total size, last updated). Protected behind a simple dev-only check or future auth (Story 9.1, EP9). |
| **Dependencies** | depends on Story 7.3 (database setup, schema known) |
| **Acceptance Criteria** | • Admin panel accessible at `/admin/db` (route present in `server/routes/`).<br>• Table list shows all 7 tables with row counts and schema preview.<br>• User can select a table and view paginated rows with column filtering/sorting.<br>• User can view a single record's full details (JSON-like format).<br>• User can insert, update, or delete a record (with confirmation prompt).<br>• Database stats (total size, last modified time) displayed.<br>• Protected from public access (dev-mode check or warning label). |
| **Status** | READY |
| **Working Notes** | [[story-13.1.md](./story/story-13.1.md)] |

---

## Status Legend

- **READY** — Story not yet started; all blockers (dependencies) satisfied or N/A
- **WIP** — Story actively in progress or partially complete
- **COMPLETED** — Story acceptance criteria fully met and verified

---

## Changelog

- **2026-08-26** — Initial backlog tracker created with all 23 stories across 13 epics; current status snapshot
