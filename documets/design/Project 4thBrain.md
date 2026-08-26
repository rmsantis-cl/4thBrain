# **Project 4thBrain \- Epics and Stories Breakdown**

## **Document Header**

| Property | Value |
| :---- | :---- |
| **Document Title** | Project 4thBrain \- Epics & Stories Specification |
| **Author** | Project Management |
| **Date** | August 23, 2026 |
| **Status** | Approved / Baseline |

## **EP1: Core Ingestion & Sanitization Pipeline**

**Associated Requirements:** FR1 (Direct Structured Ingestion), FR2 (Unstructured Extraction & Sanitization)  
**Inherited Acceptance Criteria:** Data is written directly to designated vault subfolders preserving existing frontmatter and structure; raw input is converted into clean Markdown text without losing core semantic content.

### **Story 1.1: Direct Structured Vault Ingestion**

> * **Abstract:** Ingest structured Markdown directly into designated Obsidian vault subfolders.  
> * **Description:** Build local pipeline handlers that watch `$RAW_DIR` (outside the vault) for incoming files. Text, Markdown, and HTML files are already indexable, so they are copied directly to `$VAULT_DIR/incoming` without transformation, preserving existing frontmatter and structure. See ADR14 for the full directory layout.  
> * **Acceptance Criteria:**  
  * Text, Markdown, and HTML files placed in `$RAW_DIR` are copied to `$VAULT_DIR/incoming` without modification.  
  * Ingested files maintain original frontmatter schema and metadata.  
  * Target subfolder path resolution writes files directly to designated locations without file corruption.  
> * **Dependencies:** depends on Story 7.1, depends on Story 7.2  
> * **Status:** To Do

### **Story 1.2: Unstructured Text Parsing & Sanitization**

> * **Abstract:** Clean, transcode, and normalize unstructured or binary raw payloads.  
> * **Description:** Implement handlers for content that can't be indexed as-is. URLs placed in `$RAW_DIR` are moved to `$RAW_DIR/clipping` for extraction. Binary formats (PDF, images, Word docs, etc.) are transcoded into clean MD/text; the transcoded output is written to `$VAULT_DIR/incoming`, and the original binary is archived to `$VAULT_DIR/raw` with the processed file carrying a reference back to its raw original's location. See ADR14 for the full directory layout.  
> * **Acceptance Criteria:**  
  * Input containing raw HTML, web clips, or special characters is sanitized to clean plain text/Markdown.  
  * Core semantic text content remains fully intact post-sanitization.  
  * URLs submitted for ingestion are relocated to `$RAW_DIR/clipping` prior to extraction.  
  * Binary files are not written into the vault until transcoded; transcoded output lands in `$VAULT_DIR/incoming` and the original is archived to `$VAULT_DIR/raw`.  
  * Each transcoded file in `$VAULT_DIR/incoming` references the archived location of its original raw file.  
> * **Dependencies:** must be worked with Story 1.1  
> * **Status:** To Do

## **EP2: Automated Tagging & Classification Engine**

**Associated Requirements:** FR3 (Tagging & Classification)  
**Inherited Acceptance Criteria:** Generated Markdown notes contain valid YAML frontmatter with tags matching predefined vault taxonomy.

### **Story 2.1: Local LLM Metadata & Tag Inference**

> * **Abstract:** Infer tags, metadata, and topic/subtopic placement using local LLM inference.  
> * **Description:** Connect the Node.js processing pipeline to the local Ollama instance to analyze raw note content and generate appropriate tags and YAML header fields based on vault taxonomy. In addition to tags, the LLM infers a topic/subtopic for the note; this topic/subtopic (not the tags) determines the target vault subfolder the note is filed into. If the note references images, documents, or other files, those referenced files are placed in a sibling attachment directory next to the note. See ADR15.  
> * **Acceptance Criteria:**  
  * Generated notes contain syntactically valid YAML frontmatter blocks.  
  * Applied tags strictly align with configured vault taxonomy rules.  
  * Note is filed into the vault subfolder determined by its inferred topic/subtopic.  
  * Files referenced by the note (images, documents, other attachments) are placed in a sibling directory next to the note, not left in `$VAULT_DIR/incoming`.  
> * **Dependencies:** depends on Story 1.1, depends on Story 7.1  
> * **Status:** To Do

## **EP3: Local Vector Indexing & MCP Integration**

**Associated Requirements:** FR4 (Local Vault & RAG Indexing)  
**Inherited Acceptance Criteria:** Notes are indexed in local vector storage (.smart-env) and return relevant matches for semantic context queries.

### **Story 3.1: Smart Connections Vector Indexing Pipeline**

> * **Abstract:** Trigger vector embedding generation for updated vault notes.  
> * **Description:** Ensure newly created or modified Markdown notes in the vault trigger local embedding updates within Smart Connections (.smart-env).  
> * **Acceptance Criteria:**  
  * Modified or created notes are automatically scanned and indexed.  
  * Embeddings are stored locally in .smart-env without relying on cloud vector stores.  
> * **Dependencies:** depends on Story 1.1, depends on Story 7.2  
> * **Status:** To Do

### **Spike 3.2: Smart Connections Indexing Status Retrieval**

> * **Abstract:** Investigate how to determine Smart Connections indexing status (totals, failures, per-note lookup) from `$VAULT_DIR/.smart-env` or `$VAULT_DIR/.obsidian`.  
> * **Description:** Timeboxed research spike to find a reliable source for: (1) totals of indexed/pending/failed notes, (2) a list of failed notes with causes, (3) a way to check a single note's status by path. Findings recorded in `documets/story/spike-3.2.md`.  
> * **Findings:**  
  * The data lives in `$VAULT_DIR/.smart-env`, not `.obsidian` â€” `.obsidian` only holds Obsidian app/plugin settings, no indexing state.  
  * Smart Connections ships its own in-app diagnostics: a **Smart Environment** health panel (Obsidian command palette â†’ search "Smart Environment") shows live totals â€” Indexed items, Eligible, Current embeddings, Needs embedding, and a per-collection breakdown (Smart Sources, Smart Blocks) of Total / Eligible / Current / Missing / Skipped / Unexpected â€” plus a "Skipped items" diagnostic listing each skipped item's path and a human-readable reason (e.g. "Below minimum size"). This is the authoritative live source; per user direction, **Skipped counts as failed to index** for this project's reporting.  
  * `smart_sources/smart_sources.ajson` holds one entry per note, keyed `smart_sources:<vault-relative path>`, and each source's `blocks_data` holds one entry per block. Status per item is inferred by comparing stored size against `smart_env.json`'s `min_chars` threshold (separate values for sources and blocks) and its `file_exclusions`/`folder_exclusions` patterns â€” the same comparison the in-app panel performs live, since no reason string is persisted anywhere: **current** (embedded and eligible), **missing** (eligible, not yet embedded â€” "pending"), **skipped** (ineligible under current policy â€” "failed", with a derivable reason), **unexpected** (a vector exists for an item no longer eligible, e.g. content shrank after being embedded).  
  * The `.ajson` files are not plain JSON â€” each is a sequence of `"key": {...},` fragments (an append-only log), not one JSON document; they must be parsed line-by-line.  
  * Block-level coverage is much lower than source-level in this vault: 720 of 1,045 blocks are skipped (mostly sub-200-character blocks), vs. only 1 of 31 sources â€” worth knowing before relying on block-level (as opposed to whole-note) semantic search.  
  * The registered `smart-connections` MCP server (see `vault/Instructions.md`) was not connected during this spike, so whether it exposes this same diagnostic as a callable tool (vs. only the in-app panel) is still unverified â€” open follow-up.  
> * **Deliverable:** `vault/check_smart_connections_status.py` â€” reads `params.json` and `smart_env.json`, parses `smart_sources.ajson`, and reports (a) Sources and Blocks totals by status (current/missing/skipped/unexpected) with a summary run, including skipped/unexpected items and their reasons, and (b) a single note's status + reason via `python vault/check_smart_connections_status.py "<vault-relative path>"`. Verified against the live vault and cross-checked against the in-app Smart Environment panel â€” numbers match exactly: 31/30/0/1/0 sources (total/current/missing/skipped/unexpected), 1045/325/0/720/0 blocks, and identical skip-reason text.  
> * **Acceptance Criteria:**  
  * Script reports total current (indexed) / missing (pending) / skipped (failed) / unexpected counts against the real vault, for both Sources and Blocks â€” done, matches the native panel exactly.  
  * Script reports a list of skipped/unexpected notes with causes â€” done, reason text matches the native panel's diagnostic modal.  
  * Given a vault-relative note path, the script reports current / missing / skipped / unexpected / not-found, with a reason where applicable â€” done.  
> * **Dependencies:** depends on Story 3.1  
> * **Status:** Done. Open follow-up: confirm the exact Smart Environment command-palette entry name for documentation, and whether Story 3.1 needs to handle "unexpected" (orphaned) embeddings separately.

## **EP4: Overnight Batch Processing Engine**

**Associated Requirements:** FR5 (Overnight Batch Processing)  
**Inherited Acceptance Criteria:** Batch script iterates over pending queue items without manual intervention and updates file status flags upon completion.

### **Story 4.1: Background Sweep & Queue Execution Script**

> * **Abstract:** Implement automated overnight queue processing and link verification.  
> * **Description:** Build a scheduled background execution worker that processes queued ingestion items, executes batch classification, cleans up orphaned data, and validates local links.  
> * **Acceptance Criteria:**  
  * Batch worker executes unattended against pending queue items.  
  * Job state flags (pending, completed, failed) update correctly upon processing completion.  
> * **Dependencies:** depends on Story 1.1, depends on Story 2.1  
> * **Status:** To Do

## **EP5: Proactive Daily Briefing Pipeline**

**Associated Requirements:** FR6 (Proactive Daily Briefing)  
**Inherited Acceptance Criteria:** Daily briefing note is generated each morning with structured summary blocks for agenda, open tasks, and contextual reminders.

### **Story 5.1: Multi-Source Briefing Synthesis Engine**

> * **Abstract:** Generate daily briefing Markdown notes by combining external and local data.  
> * **Description:** Develop the briefing module to collect pending calendar events, unread priority emails, and contextually relevant vault notes, passing them to the local LLM to draft a structured daily briefing.  
> * **Acceptance Criteria:**  
  * Daily briefing note is generated each morning in the designated daily notes folder.  
  * Output includes distinct, populated sections for agenda, action items, and relevant contextual reminders.  
> * **Dependencies:** depends on Story 2.1, depends on Story 4.1  
> * **Status:** To Do

## **EP6: Unified Web Management & Search Interface**

**Associated Requirements:** FR7 (Ingestion UI), FR8 (Search UI), FR9 (Ingestion Status UI)  
**Inherited Acceptance Criteria:** User submits text or files via UI form and receives immediate queue confirmation and job submission ID; search query returns ranked note snippets with direct local note links within sub-second latency; dashboard renders active, pending, and failed job counts with options to retry failed items.

### **Story 6.4: Common UI Shell & Design System**

> * **Abstract:** Build the shared navigation shell and visual design system that Stories 6.1â€“6.3 render inside of.  
> * **Description:** Establish a persistent app shell (left sidebar nav, top status/settings area, main content slot) and a reusable design-system spec (color palette, typography, spacing, component patterns â€” dark theme, sidebar navigation, floating quick-capture bar) modeled on the Claude.ai desktop app's visual language. Sidebar nav items map to 4thBrain's own surfaces (Ingest, Search, Dashboard) rather than Claude's. The home view includes a personalized greeting and a floating quick-capture input (text/URL/file) as the site-wide entry point; the fuller multi-field ingestion form remains Story 6.1's concern. Design-system spec and static mockup live under `ui/design/`.  
> * **Acceptance Criteria:**  
  * Written style guide documents color palette, typography, spacing scale, and component patterns, reusable across Stories 6.1â€“6.3.  
  * Static HTML/CSS mockup demonstrates the shell (sidebar nav, greeting, quick-capture bar) rendered in a browser.  
  * Sidebar nav items and quick-capture bar are labeled for 4thBrain's actual surfaces, not copied verbatim from Claude.ai.  
> * **Dependencies:** none  
> * **Status:** To Do

### **Story 6.1: Web Ingestion Form & Submission Handler**

> * **Abstract:** Build web-based entry form for submitting links, files, and text.  
> * **Description:** Construct frontend form components allowing raw text input, file uploads, and web URL submissions directly to the Node.js ingestion endpoint.  
> * **Acceptance Criteria:**  
> * Submitting form content creates a valid pipeline job and returns a unique Job ID immediately.  
> * **Dependencies:** depends on Story 1.1, depends on Story 6.4, must be worked with Story 6.3  
> * **Status:** To Do

### **Story 6.2: Hybrid Keyword & Semantic Search Interface**

> * **Abstract:** Implement UI search bar connecting to vault and vector indexes.  
> * **Description:** Build a search component that queries local files and vector embeddings via MCP/Node endpoints, displaying ranked results with direct file links.  
> * **Acceptance Criteria:**  
> * Search queries display ranked result cards containing snippets and file paths with sub-second response times.  
> * **Dependencies:** depends on Story 3.1, depends on Story 6.4  
> * **Status:** To Do

### **Story 6.3: Pipeline Monitoring & Dashboard UI**

> * **Abstract:** Provide real-time status view of active, pending, and failed jobs.  
> * **Description:** Build a status panel showing background execution state, error logs, and controls to re-run failed jobs.  
> * **Acceptance Criteria:**  
  * Displays accurate counts for active, pending, and failed processing jobs.  
  * Provides functional "Retry" action button for failed jobs.  
> * **Dependencies:** depends on Story 4.1, depends on Story 6.4, must be worked with Story 6.1  
> * **Status:** To Do

## **EP7: System Infrastructure & Host Runtime**

**Associated Requirements:** NFR1 through NFR12

### **Story 7.1: WSL2 Runtime & Resource Bound Configuration**

> * **Abstract:** Configure WSL2 host environment, memory caps, and Ollama GPU passthrough.  
> * **Description:** Establish base system configuration files (.wslconfig, systemd/PM2 supervisor, Ollama service) to enforce local execution limits, concurrency caps (concurrency: 1), and host memory protection.  
> * **Acceptance Criteria:**  
  * Node.js and Ollama run inside WSL2 with GPU acceleration active.  
  * WSL2 RAM usage stays within configured bounds without host OOM errors.  
  * Concurrency locks prevent multiple simultaneous local LLM calls from overwhelming memory.  
> * **Dependencies:** None (Foundation Task)  
> * **Status:** To Do

### **Story 7.2: Process Lifecycle & MCP Server Setup**

> * **Abstract:** Configure process supervision and MCP vector integration service.  
> * **Description:** Set up initialization scripts to boot Ollama, launch Node.js services, and expose the Smart Connections MCP server endpoint safely across local boundaries.  
> * **Acceptance Criteria:**  
  * Boot sequence reliably starts Ollama, confirms port availability, and initializes dependent Node.js/MCP processes.  
  * Process logs write structured JSON to stdout/file.  
> * **Dependencies:** must be worked with Story 7.1  
> * **Status:** To Do

### **Story 7.3: SQLite Database Setup for Processing-State Persistence**

> * **Abstract:** Set up SQLite database for Document/Status/Classification/Job metadata storage.  
> * **Description:** Install SQLite drivers (better-sqlite3 for Node.js, sqlite3 for Python scripts), create the schema from documets/design/schema.sql, and initialize the database file at the configured metadata storage location. Verify cross-language access (Node.js and Python can read/write simultaneously without corruption). **Critical implementation note (ADR17):** keep all database transactions brief — long-running transactions holding locks will serialize concurrent access. If implementation reveals a need for long concurrent transactions, this decision must be revisited and migrated to PostgreSQL.  
> * **Acceptance Criteria:**  
  * SQLite driver installed and tested (better-sqlite3 via npm, sqlite3 available to Python).  
  * Database schema created from documets/design/schema.sql (7 tables: status, job_type, process, classification, document, job, job_document).  
  * Database file initialized at the configured path (params.json: metadata_db_path).  
  * Status enumeration seeded (New, Processing, Indexed, Failed, Archived).  
  * Cross-language smoke test: Node.js writes a Document record, Python reads it back without error.  
> * **Dependencies:** depends on Story 7.1, depends on Story 7.2  
> * **Status:** To Do

## **EP8: QA, Testing Harness & Bug/Issue Tracking**

**Associated Requirements:** Cross-cutting â€” validates acceptance criteria across FR1â€“FR9, NFR1â€“NFR12  
**Inherited Acceptance Criteria:** All Stories are verified against their acceptance criteria via automated/manual tests prior to closure; Bugs and Issues are logged, tracked to resolution, and linked back to originating Stories.

### **Story 8.1: Automated Test Harness & Regression Suite**

> * **Abstract:** Build the testing harness used to verify Story acceptance criteria.  
> * **Description:** Establish unit, integration, and regression test scaffolding covering the ingestion pipeline, tagging engine, indexing, batch jobs, and Web UI endpoints.  
> * **Acceptance Criteria:**  
  * Automated tests exist for each Epic's core acceptance criteria and run without manual setup.  
  * Regression suite flags breaking changes before merge/release.  
> * **Dependencies:** depends on Story 7.1, depends on Story 7.2  
> * **Status:** To Do

### **Story 8.2: Bug & Issue Tracking Workflow**

> * **Abstract:** Formalize Bug/Issue capture, triage, and resolution tracking.  
> * **Description:** Implement (or adopt) a tracking mechanism where Bugs (linked to a Story) and Issues (anomalies resolved by no-action, doc update, or bug conversion) are logged per the framework's Document Type 7.  
> * **Acceptance Criteria:**  
  * Every reported bug is linked to an associated Story for fix tracking.  
  * Issues are resolvable via one of the three defined dispositions (no action / doc update / bug report).  
> * **Dependencies:** must be worked with Story 8.1  
> * **Status:** To Do

## **EP9: Security & Access Control**

**Associated Requirements:** Gap â€” no existing NFR covers this; proposed NFR13 (Authentication & Local Access Control) pending Phase 3 scope lock  
**Inherited Acceptance Criteria:** Web UI and API endpoints reject unauthenticated/unauthorized requests; sensitive vault content is not exposed beyond the local host boundary without explicit user action.

### **Story 9.1: Local-Only Access Enforcement & Auth Guard**

> * **Abstract:** Restrict Web UI/API access to authenticated local sessions.  
> * **Description:** Add a lightweight auth guard (e.g., local token/session) to the Node.js orchestration server so ingestion, search, and dashboard endpoints (EP6) aren't reachable by arbitrary network callers.  
> * **Acceptance Criteria:**  
  * Unauthenticated requests to ingestion/search/dashboard endpoints are rejected.  
  * Server binds to localhost/WSL2-internal interface by default, not 0.0.0.0.  
> * **Dependencies:** depends on Story 7.2, depends on Story 6.1  
> * **Status:** To Do

## **EP10: Vault Backup, Integrity & Recovery**

**Associated Requirements:** Extends NFR10 (Storage Synchronization); proposed NFR14 (Backup & Recovery) pending Phase 3 scope lock  
**Inherited Acceptance Criteria:** The Obsidian vault and .smart-env vector store can be restored to a known-good prior state after corruption or a failed batch run.

### **Story 10.1: Scheduled Vault Snapshot & Restore**

> * **Abstract:** Periodically snapshot the vault and vector index for recovery.  
> * **Description:** Implement a scheduled backup routine (pre-batch-run snapshot) covering the Markdown vault and .smart-env files, with a documented restore procedure.  
> * **Acceptance Criteria:**  
  * Snapshots are taken automatically before each overnight batch run (EP4).  
  * A restore operation returns the vault/index to the last good snapshot without manual file surgery.  
> * **Dependencies:** depends on Story 4.1, depends on Story 3.1  
> * **Status:** To Do

## **EP11: Production Deployment & Release Management**

**Associated Requirements:** Extends EP7 into Phase 6/7 concerns (Post-Release Gap Analysis, Buy-off & Production Deployment)  
**Inherited Acceptance Criteria:** Releases are versioned, deployable via a repeatable procedure, and rollback-capable without data loss.

### **Story 11.1: Release Packaging & Versioning**

> * **Abstract:** Define how completed Stories/fixes are grouped and versioned into a Release.  
> * **Description:** Build the release definition/versioning process referenced in Phase 5 (Release Definition & Planning) â€” tagging, changelog, and rollout scripting distinct from initial dev-host setup.  
> * **Acceptance Criteria:**  
  * Each release has a version tag and changelog mapping to closed Stories/Bugs.  
  * A rollback path exists to the previous release version.  
> * **Dependencies:** depends on Story 7.1, depends on Story 7.2, depends on Story 8.1  
> * **Status:** To Do

## **EP12: Structured Data & Job Queue Persistence**

**Associated Requirements:** NFR15 (Structured Metadata & Job Queue Storage)  
**Inherited Acceptance Criteria:** Document lifecycle status, hierarchical classification, and job queue/history are stored in a queryable local SQLite database, separate from the Markdown vault and the vector store.

### **Story 12.1: Document/Status/Classification/Job Database Schema Design**

> * **Abstract:** Design the SQLite schema for the Document/Status/Classification/Job data model.  
> * **Description:** Translate the domain model in `documets/design/classes.md` into a physical SQLite schema â€” table definitions, primary/foreign keys, seed data for the fixed Status enumeration, and an ERD. Design only; no implementation or wiring into `server/` in this pass. Full schema: `documets/design/database-schema.md`. See ADR17.  
> * **Acceptance Criteria:**  
  * Schema covers exactly the four entities in `classes.md` (Document, Status, Classification, Job) with types/keys matching that spec.  
  * ERD (`documets/design/database-schema.mmd`, rendered PNG) visualizes tables and relationships.  
  * Storage location and access pattern (SQLite file location, Node.js driver) documented.  
> * **Dependencies:** none  
> * **Status:** Done

## **EP13: Admin & Monitoring Tools**

**Associated Requirements:** Cross-cutting — development and operational observability tools; no direct user-facing FR/NFR.  
**Inherited Acceptance Criteria:** Developers and QA can inspect system state (database tables, process health, logs) for debugging and testing without modifying core application behavior.

### **Story 13.1: Database Inspector — Table Browser & Admin Panel**

> * **Abstract:** Web UI for developers and QA to inspect and edit SQLite database tables for debugging and testing.  
> * **Description:** Add a protected admin route (`GET /admin/db`) serving a single-page interface to browse the 4thBrain metadata database (7 tables: status, job_type, process, classification, document, job, job_document). Allow viewing table schemas, filtering/sorting rows, viewing record details, and (with caution) editing/deleting records for testing purposes. Include database health stats (row counts, total size, last updated). Protected behind a simple dev-only check or future auth (Story 9.1, EP9).  
> * **Acceptance Criteria:**  
  * Admin panel accessible at `/admin/db` (route present in `server/routes/`).  
  * Table list shows all 7 tables with row counts and schema preview.  
  * User can select a table and view paginated rows with column filtering/sorting.  
  * User can view a single record's full details (JSON-like format).  
  * User can insert, update, or delete a record (with confirmation prompt).  
  * Database stats (total size, last modified time) displayed.  
  * Protected from public access (dev-mode check or warning label).  
> * **Dependencies:** depends on Story 7.3 (database setup, schema known)  
> * **Status:** To Do
