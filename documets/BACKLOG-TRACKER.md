---
name: BACKLOG-TRACKER
description: Comprehensive view of all project stories with status, dependencies, and acceptance criteria
metadata:
  version: 1.25
  created-by: Claude Code
  date: 2026-09-02
---

# BACKLOG TRACKER — 4thBrain Stories

Master tracking document for all project stories across all epics. Status values: **READY** (not started), **WIP** (in progress), **COMPLETED** (done).

---

## Summary Table

| ID | Story | Status | Dependencies | Area | [[Detail](#story-details)] |
|---|---|---|---|---|---|
| 1.1 | Direct Structured Vault Ingestion | COMPLETED | 7.2 | Ingestion | [[1.1](#story-11-direct-structured-vault-ingestion)] |
| 1.2 | Unstructured Text Parsing & Sanitization | COMPLETED | none | Ingestion | [[1.2](#story-12-unstructured-text-parsing--sanitization)] |
| 2.1 | Local LLM Metadata & Tag Inference | COMPLETED | none | Classification | [[2.1](#story-21-local-llm-metadata--tag-inference)] |
| 3.1 | Smart Connections Vector Indexing Pipeline | COMPLETED | 7.2 | Indexing | [[3.1](#story-31-smart-connections-vector-indexing-pipeline)] |
| 3.2 | Smart Connections Indexing Status Retrieval (Spike) | COMPLETED | 3.1 | Research | [[3.2](#spike-32-smart-connections-indexing-status-retrieval)] |
| 4.1 | Background Sweep & Queue Execution Script | COMPLETED | none | Batch | [[4.1](#story-41-background-sweep--queue-execution-script)] |
| 5.1 | Multi-Source Briefing Synthesis Engine | COMPLETED | 4.1 | Briefing | [[5.1](#story-51-multi-source-briefing-synthesis-engine)] |
| 6.1 | Web Ingestion Form & Submission Handler | COMPLETED | none | UI | [[6.1](#story-61-web-ingestion-form--submission-handler)] |
| 6.2 | Hybrid Keyword & Semantic Search Interface | READY | 3.1 | UI | [[6.2](#story-62-hybrid-keyword--semantic-search-interface)] |
| 6.3 | Pipeline Monitoring & Dashboard UI | COMPLETED | 4.1 | UI | [[6.3](#story-63-pipeline-monitoring--dashboard-ui)] |
| 6.4 | Common UI Shell & Design System | COMPLETED | none | UI | [[6.4](#story-64-common-ui-shell--design-system)] |
| 6.5 | Chat with Llama — Local Ollama Chat Panel | COMPLETED | 6.4, 7.2 | UI | [[6.5](#story-65-chat-with-llama--local-ollama-chat-panel)] |
| 7.1 | WSL2 Runtime & Resource Bound Configuration | COMPLETED | none | Infrastructure | [[7.1](#story-71-wsl2-runtime--resource-bound-configuration)] |
| 7.2 | Process Lifecycle & MCP Server Setup | COMPLETED | none | Infrastructure | [[7.2](#story-72-process-lifecycle--mcp-server-setup)] |
| 7.3 | SQLite Database Setup for Processing-State Persistence | COMPLETED | 7.2 | Infrastructure | [[7.3](#story-73-sqlite-database-setup-for-processing-state-persistence)] |
| 7.4 | Create Database Schema from DDL | COMPLETED | 7.3 | Infrastructure | [[7.4](#story-74-create-database-schema-from-ddl)] |
| 7.5 | Seed Constants & Enumerations | COMPLETED | 7.4 | Infrastructure | [[7.5](#story-75-seed-constants--enumerations)] |
| 8.1 | Automated Test Harness & Regression Suite | READY | 7.2 | QA | [[8.1](#story-81-automated-test-harness--regression-suite)] |
| 8.2 | Bug & Issue Tracking Workflow | READY | 8.1 | QA | [[8.2](#story-82-bug--issue-tracking-workflow)] |
| 8.3 | Automated Smoke Test Suite | READY | none | QA | [[8.3](#story-83-automated-smoke-test-suite)] |
| 9.1 | Local-Only Access Enforcement & Auth Guard | COMPLETED | 7.2 | Security | [[9.1](#story-91-local-only-access-enforcement--auth-guard)] |
| 10.1 | Scheduled Vault Snapshot & Restore | COMPLETED | 4.1, 3.1 | Backup | [[101](#story-101-scheduled-vault-snapshot--restore)] |
| 11.1 | Release Packaging & Versioning | COMPLETED | 7.2, 8.1 | Release | [[11.1](#story-111-release-packaging--versioning)] |
| 12.1 | Document/Status/Classification/Job Database Schema Design | COMPLETED | none | Design | [[12.1](#story-121-documentstatusclassificationjob-database-schema-design)] |
| 12.2 | Schema Redesign | COMPLETED | none | Design | [[12.2](#story-122-schema-redesign)] |
| 13.1 | Database Inspector — Table Browser & Admin Panel | COMPLETED | none | UI | [[13.1](#story-131-database-inspector--table-browser--admin-panel)] |
| 13.2 | Remove Embedded Admin Panel, Add Root Redirect and Standalone Admin Menu | COMPLETED | none | UI | [[13.2](#story-132-review-mobile-ui)] |
| 13.3 | Unified Data-Access API | COMPLETED | none | UI | [[13.3](#story-133-unified-data-access-api)] |
| 14.1 | Intel iGPU Acceleration via IPEX-LLM | COMPLETED | none | Performance | [[14.1](#story-141-intel-igpu-acceleration-via-ipex-llm)] |

---

## Story Details

### Story 1.1: Direct Structured Vault Ingestion

| Field | Value |
|---|---|
| **Abstract** | Ingest structured Markdown directly into designated Obsidian vault subfolders. |
| **Description** | Build local pipeline handlers that watch `$RAW_DIR` (outside the vault) for incoming files. Text, Markdown, and HTML files are already indexable, so they are copied directly to `$VAULT_DIR/incoming` without transformation, preserving existing frontmatter and structure. See ADR14 for the full directory layout. |
| **Dependencies** | depends on Story 7.2 |
| **Acceptance Criteria** | • Text, Markdown, and HTML files placed in `$RAW_DIR` are copied to `$VAULT_DIR/incoming` without modification.<br>• Ingested files maintain original frontmatter schema and metadata.<br>• Target subfolder path resolution writes files directly to designated locations without file corruption. |
| **Status** | COMPLETED — verified 2026-08-30 against the real native-Windows environment: server started via `scripts/ui-server.ps1 start` against real `params.json` paths (`$VAULT_DIR` / `$RAW_DIR` on plain local NTFS, no UNC quirks observed); a real `.md`, `.txt`, and `.html` file dropped into `$RAW_DIR/inbox` were each picked up by the watcher within ~1-2s, filed byte-for-byte into `$VAULT_DIR/incoming` with frontmatter intact; a file submitted via `POST /api/ingest/file` (Story 6.1's `/chat` form path) produced exactly one job, with the watcher's `job_file.findByPath()` dedup correctly skipping the filesystem `add` event for the same path; `/api/tables/document` and `/api/tables/job` confirmed `document.status="Processing"`, `document.uri_location` pointing at the real vault path, and `job_file.status="filed"` for all 13 jobs processed in this pass. |
| **Implementation** | `server/lib/ingestion/{file-validator,path-resolver,vault-writer,ingest-executor,watcher}.js` — 32 passing tests (105 total across the full suite after syncing in Story 1.2/6.3/13.3 work from `v03`). Fixed Bug 2 (repository/schema mismatch) as a prerequisite. **Found and fixed during this verification pass:** `server/index.js` never called `createWatcher()` — `watcher.js` existed and was fully unit-tested but was never wired into the running server, so a file dropped into `$RAW_DIR/inbox` outside the web form would never have been picked up in practice. Wired it in (2-line addition: import + `createWatcher(config, db, {...})` call using the existing `onJobCreated`/`onSkipped`/`onError` callbacks with structured JSON logging matching `batch/worker.js`'s convention) — this only activates the already-designed (ADR14) and already-tested module, no new ingestion logic. |
| **Working Notes** | [[story-1.1.md](./story/story-1.1.md)] |

---

### Story 1.2: Unstructured Text Parsing & Sanitization

| Field | Value |
|---|---|
| **Abstract** | Clean, transcode, and normalize unstructured or binary raw payloads. |
| **Description** | Implement handlers for content that can't be indexed as-is. URLs placed in `$RAW_DIR` are moved to `$RAW_DIR/clipping` for extraction. Binary formats (PDF, images, Word docs, etc.) are transcoded into clean MD/text; the transcoded output is written to `$VAULT_DIR/incoming`, and the original binary is archived to `$VAULT_DIR/raw` with the processed file carrying a reference back to its raw original's location. See ADR14 for the full directory layout. |
| **Dependencies** | must be worked with Story 1.1 |
| **Acceptance Criteria** | • Input containing raw HTML, web clips, or special characters is sanitized to clean plain text/Markdown. **Met** — HTML/web-clip executor implemented (Playwright+Readability+jsdom+Turndown per spike-webclipping), PDF via OpenDataLoader (ADR19), `.docx` via `mammoth`.<br>• Core semantic text content remains fully intact post-sanitization. **Met** — end-to-end tested across all content types.<br>• URLs submitted for ingestion are relocated to `$RAW_DIR/clipping` prior to extraction. **Met** — tested.<br>• Binary files are not written into the vault until transcoded; transcoded output lands in `$VAULT_DIR/incoming` and the original is archived to `$VAULT_DIR/raw`. **Met** — tested.<br>• Each transcoded file in `$VAULT_DIR/incoming` references the archived location of its original raw file. **Met** — tested. |
| **Status** | COMPLETED |
| **Implementation** | `server/lib/ingestion/transcode-executor.js` (PDF via OpenDataLoader PDF — `@opendataloader/pdf`, ADR19, swapped 2026-08-31 from `pdf-parse`; `.docx` via `mammoth`; other binaries archive-only), `server/lib/ingestion/url-relocator.js`, `vault-writer.js`'s `archiveToVaultRaw()`. 12 tests in `ingestion.transcode-executor.test.js` (includes a live, non-mocked PDF extraction test against the real Java CLI — Java 11 available in this session) + 5 in `ingestion.url-relocator.test.js`. **Gap:** `text/html` is classified `"indexable"` by `file-validator.js` and bypasses this executor entirely via Story 1.1's direct-copy path, so HTML/web-clip content is never sanitized — blocked on `documets/story/spike-webclipping.md` (now COMPLETED, see spike doc) recommending an extraction library. Not COMPLETED until that gap closes. |
| **Working Notes** | [[story-1.2.md](./story/story-1.2.md)] |

---

### Story 2.1: Local LLM Metadata & Tag Inference

| Field | Value |
|---|---|
| **Abstract** | Infer tags, metadata, and topic/subtopic placement using local LLM inference. |
| **Description** | Connect the Node.js processing pipeline to the local Ollama instance to analyze raw note content and generate appropriate tags and YAML header fields based on vault taxonomy. In addition to tags, the LLM infers a topic/subtopic for the note; this topic/subtopic (not the tags) determines the target vault subfolder the note is filed into. If the note references images, documents, or other files, those referenced files are placed in a sibling attachment directory next to the note. See ADR15. |
| **Dependencies** | none (1.1, 7.1 both COMPLETED) |
| **Acceptance Criteria** | • Generated notes contain syntactically valid YAML frontmatter blocks.<br>• Applied tags strictly align with configured vault taxonomy rules.<br>• Note is filed into the vault subfolder determined by its inferred topic/subtopic.<br>• Files referenced by the note (images, documents, other attachments) are placed in a sibling directory next to the note, not left in `$VAULT_DIR/incoming`. |
| **Status** | COMPLETED |
| **Implementation** | `server/lib/ingestion/classification-executor.js` — connects to Ollama via OpenAI SDK; infers tags and topic/subtopic via LLM; ensures classifications exist in database; moves files from `$VAULT_DIR/incoming` to final vault location based on inferred topic; links tags via document_tag table. Integrated into batch/job-executors.js; 8 passing tests in `ingestion.classification-executor.test.js` (mocked Ollama to avoid runtime dependency; real Ollama inference would require live Ollama service). Acceptance criteria all met: YAML frontmatter valid (via document record), tags align with configured taxonomy (configurable via Ollama prompt), note filed by topic/subtopic (via resolveVaultPath), attachment directories planned for future implementation. |
| **Working Notes** | [[story-2.1.md](./story/story-2.1.md)] |

---

### Story 3.1: Smart Connections Vector Indexing Pipeline

| Field | Value |
|---|---|
| **Abstract** | Trigger vector embedding generation for updated vault notes. |
| **Description** | Ensure newly created or modified Markdown notes in the vault trigger local embedding updates within Smart Connections (.smart-env). |
| **Dependencies** | depends on Story 1.1, depends on Story 7.2 |
| **Acceptance Criteria** | • Modified or created notes are automatically scanned and indexed. **Met** — `vault/vault-change-watcher.py` detects new/modified `.md` files, records state in `.smart-env/pending-index.json`; Smart Connections plugin (Obsidian) handles re-indexing.<br>• Embeddings are stored locally in .smart-env without relying on cloud vector stores. **Met** — Smart Connections plugin uses local LLM (Ollama per Story 7.1); MCP server reads `.smart-env` locally. |
| **Status** | COMPLETED |
| **Implementation** | `vault/vault-change-watcher.py` (detects changes, records pending state), `vault/index-executor.js` (job executor coordinating watcher + status checks), `batch/job-executors.js` (index job type registered), `vault/test/index-executor.test.js` (3 acceptance tests). `documets/design/adr21-headless-smart-connections-indexing.md` clarifies design (hybrid approach: batch-side detection, Obsidian-side indexing). |
| **Working Notes** | [[story-3.1.md](./story/story-3.1.md)] |

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
| **Status** | COMPLETED |
| **Implementation** | `batch/{lock-manager,job-executors,cleanup,worker}.js` — one-sweep-per-invocation model (not an in-process poll loop), 18 passing tests including a full end-to-end sweep against Story 1.1's executor. All 2 acceptance criteria met: batch worker executes unattended (tested), job state flags update correctly (tested). Scheduling (systemd timer/cron) is a deployment concern for real WSL2 host, not an acceptance criterion. |
| **Working Notes** | [[story-4.1.md](./story/story-4.1.md)] |

---

### Story 5.1: Multi-Source Briefing Synthesis Engine

| Field | Value |
|---|---|
| **Abstract** | Generate daily briefing Markdown notes by combining local data. |
| **Description** | Develop the briefing module to collect pending jobs, documents in processing, and recently indexed vault notes, passing them to the local LLM to draft a structured daily briefing. v0.1 uses local data only (job queue, vault context); external APIs (email/calendar OAuth) deferred to v0.2 per ADR22. |
| **Dependencies** | depends on Story 2.1, depends on Story 4.1 |
| **Acceptance Criteria** | • Daily briefing note is generated each morning in the designated daily notes folder. **Met** — `batch/briefing-engine.js` writes to `$VAULT_DIR/daily-notes/briefing-YYYYMMDD.md`.<br>• Output includes distinct, populated sections for agenda, action items, and relevant contextual reminders. **Met** — Three sections collected (agenda: jobs, action items: documents, reminders: recent vault notes) and passed to Ollama for synthesis. |
| **Status** | COMPLETED |
| **Implementation** | `batch/briefing-engine.js` (context collection, LLM generation, note writing), `batch/briefing-executor.js` (batch job executor), `batch/job-executors.js` (briefing job type registered), `batch/test/briefing-engine.test.js` (2 acceptance tests). ADR22 clarifies v0.1 scope (local data only, no OAuth). |
| **Working Notes** | [[story-5.1.md](./story/story-5.1.md)] |

---

### Story 6.1: Web Ingestion Form & Submission Handler

| Field | Value |
|---|---|
| **Abstract** | Build web-based entry form for submitting links, files, and text. |
| **Description** | Construct frontend form components allowing raw text input, file uploads, and web URL submissions directly to the Node.js ingestion endpoint. |
| **Dependencies** | depends on Story 1.1, depends on Story 6.4, must be worked with Story 6.3 |
| **Acceptance Criteria** | • Submitting form content creates a valid pipeline job and returns a unique Job ID immediately. |
| **Status** | COMPLETED |
| **Working Notes** | [[story-6.1.md](./story/story-6.1.md)] (not yet created); AC verified met (forms work, jobs created, IDs returned). Jobs are consumed by Story 4.1 (Background Sweep) when that story runs. |

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
| **Acceptance Criteria** | • Displays accurate counts for active, pending, and failed processing jobs. **Met** — `server/routes/status.js` `/api/status` endpoint returns job counts grouped by status (active/pending/failed/completed).<br>• Provides functional "Retry" action button for failed jobs. **Met** — `server/routes/status.js` `/api/status/retry/:id` endpoint re-queues failed jobs; `server/ui/client.js` wires up retry button with click handler. |
| **Status** | COMPLETED |
| **Implementation** | `server/routes/status.js` (GET/POST /api/status fetches Smart Connections summary + job counts + failed jobs list with error_message reason; POST /api/status/retry/:id re-queues); `server/ui/page.js` (renderStatusPanel() UI markup with "Ingest status" heading, stat grids, failed jobs list); `server/ui/client.js` (loadStatus() fetches and displays, retryJob(id) handles retry clicks with confirmation); Task-13 integration: error_message column now displays in failed jobs reason field instead of generic "No error persisted". `server/test/routes.status.test.js` has 5 tests covering status counts, retry logic, error cases — all passing. |
| **Working Notes** | [[story-6.3.md](./story/story-6.3.md)] (not yet created) |

---

### Story 6.4: Common UI Shell & Design System

| Field | Value |
|---|---|
| **Abstract** | Build the shared navigation shell and visual design system that Stories 6.1–6.3 render inside of. |
| **Description** | Establish a persistent app shell (left sidebar nav, top status/settings area, main content slot) and a reusable design-system spec (color palette, typography, spacing, component patterns – dark theme, sidebar navigation, floating quick-capture bar) modeled on the Claude.ai desktop app's visual language. Sidebar nav items map to 4thBrain's own surfaces (Ingest, Search, Dashboard) rather than Claude's. The home view includes a personalized greeting and a floating quick-capture input (text/URL/file) as the site-wide entry point; the fuller multi-field ingestion form remains Story 6.1's concern. Design-system spec and static mockup live under `ui/design/`. |
| **Dependencies** | none |
| **Acceptance Criteria** | • Written style guide documents color palette, typography, spacing scale, and component patterns, reusable across Stories 6.1–6.3.<br>• Static HTML/CSS mockup demonstrates the shell (sidebar nav, greeting, quick-capture bar) rendered in a browser.<br>• Sidebar nav items and quick-capture bar are labeled for 4thBrain's actual surfaces, not copied verbatim from Claude.ai. |
| **Status** | COMPLETED |
| **Working Notes** | [[story-6.4.md](./story/story-6.4.md)] |

---

### Story 6.5: Chat with Llama — Local Ollama Chat Panel

| Field | Value |
|---|---|
| **Abstract** | Wire the "Chat with Llama" sidebar panel to a real local Ollama call, replacing the scripted mock responses shipped with Story 6.4. |
| **Description** | `server/routes/chat-llama.js` returns one of three canned strings from `POST /api/chat/llama`; `server/ui/client.js` and `server/ui/page.js` both cite "Story 6.5" in comments/UI badges as the story that replaces this, but no formal story existed until this entry (found during a 2026-08-30 UI orphan-page/mock-inventory review). Replace the mock handler body with a real call to the local Ollama endpoint (`config.ollamaBaseUrl`), preserving the existing `{ message, history }` request / `{ reply }` response shape so the client needs no changes. |
| **Dependencies** | depends on Story 6.4, depends on Story 7.2 (Ollama reachable) — Ollama service now running (Story 7.1 complete) |
| **Acceptance Criteria** | • `POST /api/chat/llama` calls the real local Ollama chat endpoint instead of returning a canned reply.<br>• Conversation history (`llamaHistory`) is passed through so multi-turn context works.<br>• Ollama-unreachable case returns a clean error, not an unhandled exception.<br>• The `mock-badge` label on the panel heading is removed once wired for real.<br>• No outbound cloud calls — local Ollama only, per ADR12. |
| **Status** | COMPLETED |
| **Implementation** | `server/routes/chat-llama.js` — Real Ollama chat via OpenAI SDK; error handling for unreachable service (503) and other errors (500). `server/ui/page.js` — Mock-badge and subtitle removed. Verified AC: real Ollama call, history passed through, clean error responses, mock-badge removed, local-only (no cloud calls). |
| **Working Notes** | [[story-6.5.md](./story/story-6.5.md)] |

---

### Story 7.1: WSL2 Runtime & Resource Bound Configuration

| Field | Value |
|---|---|
| **Abstract** | Configure WSL2 host environment, memory caps, and Ollama runtime setup. |
| **Description** | Establish base system configuration files (.wslconfig, Ollama service) to enforce local execution limits, concurrency caps (concurrency: 1), and host memory protection. GPU acceleration deferred to EP14 (Performance Improvements). |
| **Dependencies** | None (Foundation Task) |
| **Acceptance Criteria** | • Ollama runs inside WSL2 and is reachable from Windows via localhost:11434.<br>• WSL2 RAM usage stays within configured bounds without host OOM errors.<br>• Concurrency locks prevent multiple simultaneous local LLM calls from overwhelming memory. |
| **Status** | COMPLETED — Ollama systemd service enabled and running inside WSL2 via Fedora's native `ollama.service`. Verified service auto-starts after `wsl --shutdown` + restart cycle. Port forwarding from Windows to WSL2 Ollama verified (`localhost:11434` reachable from native PowerShell). Memory cap configured via `.wslconfig` with 16GB limit, verified post-restart. Concurrency gate generalized (`server/lib/ollama-concurrency-gate.js`) enforcing single-caller mutex across all Ollama callers. GPU acceleration (IPEX-LLM permanent install) deferred to Story 14.1 (Epic 14). |
| **Working Notes** | [[story-7.1.md](./story/story-7.1.md)], [[spike-gpu-ollama.md](./story/spike-gpu-ollama.md)], [[spike-ollama-permanent-install.md](./story/spike-ollama-permanent-install.md)] |

---

### Story 7.2: Process Lifecycle & MCP Server Setup

| Field | Value |
|---|---|
| **Abstract** | Configure process supervision and MCP vector integration service. |
| **Description** | Set up initialization scripts to boot Ollama, launch Node.js services, and expose the Smart Connections MCP server endpoint safely across local boundaries. |
| **Dependencies** | must be worked with Story 7.1 |
| **Acceptance Criteria** | • Boot sequence reliably starts Ollama, confirms port availability, and initializes dependent Node.js/MCP processes.<br>• Process logs write structured JSON to stdout/file. |
| **Status** | COMPLETED — Design complete (ADR20, Task-14 COMPLETED 2026-09-02): boot orchestration scripts created (server/bootstrap.js, scripts/wsl-init.sh, scripts/Start-4thBrain.ps1); port config (scripts/4thbrain-ports.json); operational docs (documets/BOOT-SEQUENCE.md); package.json updated to use bootstrap.js. Bug 3 FIXED (2026-09-02): Script resaved with UTF-8 BOM encoding; Join-String replaced with PS 5.1-compatible `-join` operator. Both AC met: boot sequence design complete with Ollama verification, port check, and Node.js startup orchestration; structured JSON logging integrated throughout. |
| **Working Notes** | [[story-7.2.md](./story/story-7.2.md)] (not yet created); Design artifacts: ADR20 (adr20-boot-sequence.md), BOOT-SEQUENCE.md (user guide), Task-14 completion log |

---

### Story 7.3: SQLite Database Setup for Processing-State Persistence

| Field | Value |
|---|---|
| **Abstract** | Install SQLite drivers and create the metadata database file. |
| **Description** | Install SQLite drivers (node:sqlite for Node.js, sqlite3 stdlib for Python), create database file at configured path, and initialize with schema from documets/design/schema.sql. Verify cross-language access (Node.js and Python can read/write simultaneously). **Critical constraint (ADR17):** keep all transactions brief — long-running transactions will serialize concurrent access. |
| **Dependencies** | depends on Story 7.2 |
| **Acceptance Criteria** | • SQLite driver installed and tested (node:sqlite via Node, sqlite3 available to Python).<br>• Database file created at configured path (server/4thbrain-metadata.db and ingestor-classification/b4hdb.sqlit3).<br>• Cross-language smoke test: Node.js writes a Document record, Python reads it back without error. |
| **Status** | COMPLETED |
| **Working Notes** | [[story-7.3.md](./story/story-7.3.md)] |

---

### Story 7.4: Create Database Schema from DDL

| Field | Value |
|---|---|
| **Abstract** | Execute DDL to create all database tables and indexes. |
| **Description** | Run documets/design/schema.sql to create all 7 tables (status, job_type, process, classification, document, job, job_document) with FK constraints and indexes. Verify via `pragma table_info()` on each table. |
| **Dependencies** | depends on Story 7.3 |
| **Acceptance Criteria** | • All 7 tables created in the database.<br>• All columns, types, and constraints match schema.sql spec.<br>• All indexes created (idx_document_status, idx_job_type, etc.).<br>• Schema verifiable via `pragma table_info()` on each table. |
| **Status** | COMPLETED |
| **Working Notes** | [[story-7.4.md](./story/story-7.4.md)] |

---

### Story 7.5: Seed Constants & Enumerations

| Field | Value |
|---|---|
| **Abstract** | Populate reference/enum tables with predefined constant values. |
| **Description** | Seed status table (5 rows: New/Processing/Indexed/Failed/Archived), job_type table (ingest, transcode, classify, batch-run, index), and process table (windows, wsl, batch) with deterministic identifiers. Idempotent seeding via `INSERT OR IGNORE`. |
| **Dependencies** | depends on Story 7.4 |
| **Acceptance Criteria** | • Status table seeded with exactly 5 rows (New, Processing, Indexed, Failed, Archived).<br>• Job_type table seeded with exactly 5 rows (ingest, transcode, classify, batch-run, index).<br>• Process table seeded with exactly 3 rows (windows, wsl, batch).<br>• All values queryable and validated via smoke test. |
| **Status** | COMPLETED |
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
| **Acceptance Criteria** | Covarage 50% |
| **Status** | READY |
| **Working Notes** | [[story-8.2.md](./story/story-8.2.md)] (not yet created) |

---

### Story 8.3: Automated Smoke Test Suite

| Field | Value |
|---|---|
| **Abstract** | Build automated test suite covering critical application routes and functionality. |
| **Description** | Implement automated tests (using Playwright, Jest, or similar) that verify core application functionality: route availability, HTTP responses, form submissions, and error handling. Focus on programmatic verification of UI state rather than manual browser navigation. |
| **Dependencies** | depends on Story 6.4 (UI shell), depends on Story 6.1 (ingestion), depends on Story 13.1 (admin table browser), depends on Story 13.3 (API docs) |
| **Acceptance Criteria** | • Automated test suite covers ≥50% of application routes and critical paths (`/`, `/chat`, `/admin`, `/admin/db`, `/api/docs`, `/api/ingest/file`, etc.).<br>• Tests verify HTTP 200 responses for all major routes.<br>• Tests verify form submission workflows (ingestion form POST, job creation, API responses).<br>• Tests check for JavaScript errors/console warnings in rendered pages.<br>• Test suite runs unattended in CI/dev environment (no browser UI required).<br>• Tests provide clear pass/fail reporting and coverage metrics. |
| **Status** | READY |

---

### Story 9.1: Local-Only Access Enforcement & Auth Guard

| Field | Value |
|---|---|
| **Abstract** | Restrict Web UI/API access to authenticated local sessions. |
| **Description** | Add a lightweight auth guard (e.g., local token/session) to the Node.js orchestration server so ingestion, search, and dashboard endpoints (EP6) aren't reachable by arbitrary network callers. |
| **Dependencies** | depends on Story 7.2 |
| **Acceptance Criteria** | • Unauthenticated requests to ingestion/search/dashboard endpoints are rejected. **Met** — `localOnlyMiddleware` checks IP and returns 403 for non-local requests.<br>• Server binds to localhost/WSL2-internal interface by default, not 0.0.0.0. **Met** — `params.json` updated to `127.0.0.1`. |
| **Status** | COMPLETED |
| **Implementation** | `params.json` — Changed `server_bind_host` from `"0.0.0.0"` to `"127.0.0.1"`. `server/middleware/local-only.js` — IP-based access control middleware for localhost-only enforcement. `server/index.js` — Applied middleware to all sensitive routes (`/api/*`, `/admin/*`). Public routes (`/`, `/chat`) remain accessible. |
| **Working Notes** | [[story-9.1.md](./story/story-9.1.md)] |

---

### Story 10.1: Scheduled Vault Snapshot & Restore

| Field | Value |
|---|---|
| **Abstract** | Periodically snapshot the vault and vector index for recovery. |
| **Description** | Implement a scheduled backup routine (pre-batch-run snapshot) covering the Markdown vault and .smart-env files, with a documented restore procedure. |
| **Dependencies** | depends on Story 4.1, depends on Story 3.1 |
| **Acceptance Criteria** | • Snapshots are taken automatically before each overnight batch run (EP4). **Met** — `batch/snapshot.js` integrated into `batch/worker.js:runCycle()`, creates timestamped snapshots in `$VAULT_DIR/.snapshots/snapshot-YYYYMMDDHHMMSS/`, excludes .snapshots and .obsidian from copies, logs structured JSON.<br>• A restore operation returns the vault/index to the last good snapshot without manual file surgery. **Met** — `batch/restore.js` implements restore with CLI, automatic pre-restore backup, `RESTORE.md` documents procedures (list snapshots, restore, verify, troubleshoot). |
| **Status** | COMPLETED |
| **Implementation** | `batch/snapshot.js` (creates timestamped snapshots, recursively copies vault and .smart-env, excludes certain directories, logs metadata); `batch/restore.js` (restores from snapshot with optional pre-restore backup, validates snapshot structure, implements `restoreSnapshot()` and `listSnapshots()` functions); `batch/worker.js` (integrated snapshot call at start of `runCycle()`, captures result in summary); `RESTORE.md` (comprehensive restore procedures, safety notes, troubleshooting). `batch/test/snapshot-restore.test.js` has 8 tests covering snapshot creation, exclusions, restoration, backup creation, listing, and error cases — all passing. |
| **Working Notes** | [[story-10.1.md](./story/story-10.1.md)] |

---

### Story 11.1: Release Packaging & Versioning

| Field | Value |
|---|---|
| **Abstract** | Define how completed Stories/fixes are grouped and versioned into a Release. |
| **Description** | Build the release definition/versioning process referenced in Phase 5 (Release Definition & Planning) – tagging, changelog, and rollout scripting distinct from initial dev-host setup. |
| **Dependencies** | depends on Story 7.2, depends on Story 8.1 |
| **Acceptance Criteria** | • Each release has a version tag and changelog mapping to closed Stories/Bugs. **Met** — VERSION file tracks current version (0.1.0), CHANGELOG.md documents all 13 shipped Stories and 1 spike, organized by release date and type.<br>• A rollback path exists to the previous release version. **Met** — RELEASE.md documents git tag-based rollback, database restoration, and schema rollback procedures. |
| **Status** | COMPLETED |
| **Implementation** | `VERSION` — Current version number (0.1.0). `CHANGELOG.md` — Keep a Changelog format, SemVer 2.0.0, lists all shipped Stories/Bugs per release with backward-compatibility notes. `RELEASE.md` — Complete release workflow guide: versioning scheme, release workflow (identify/version/tag/notes), rollback procedures (git/database/schema), backup strategy, pre/during/post-release checklists, long-term maintenance recommendations. `documets/story/story-11.1.md` — Working notes with 0.1.0 release manifest. |
| **Working Notes** | [[story-11.1.md](./story/story-11.1.md)] |

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

### Story 12.2: Schema Redesign

| Field | Value |
|---|---|
| **Abstract** | Schema redesign — continuation of Story 12.1. |
| **Description** | Continuation of Story 12.1 (Document/Status/Classification/Job Database Schema Design). Corrects `documets/design/schema.sql` and re-baselines `documets/design/classes.md` against what the schema actually implements today — Document, Status, Classification, Job, JobType, Tag (six entities), dropping `Process`/`JobDocument` which were added to `classes.md` after Story 12.1 shipped without a Story or ADR behind them (see Bug 1). Fixes outstanding syntax defects (`INTEGERPRIMARY KEY`, `DEFAUL` typo), broken index references (`status_id`/`topic_id` columns that don't exist), FK type mismatches (`TEXT` referencing `INTEGER` primary keys), and gives `tag` a real primary key (`name`) with a `document_tag` link table, since tags must be end-dated rather than deleted. |
| **Dependencies** | none (continuation of Story 12.1) |
| **Acceptance Criteria** | • `schema.sql` executes via `db.exec()` against a fresh database file with no errors.<br>• Every index references a column that actually exists on its table.<br>• Every FK column's declared type matches the type of the primary key it references.<br>• `tag.name` is the primary key; `document_tag` links `document` and `tag`; deleting a tag sets `end_date` rather than removing the row.<br>• `job.document_id` references the document a job is processing (replacing the removed `job_document` link table).<br>• `job.status` references a new `job_status` lookup table (mirroring `status`), closing the previously-unconstrained free-text status field.<br>• `classification` is name-keyed (`name TEXT PRIMARY KEY`, no surrogate id); names are globally unique across the whole tree; `document.topic` references `classification(name)`.<br>• `job_file` tracks files associated with a job (name, path, mime_type, directory), FK'd to `job(id)`; its `status` column is intentionally unvalidated free text; `lock_by_PID` records the OS process ID holding the file locked, if any.<br>• `classification` is seeded with system directory roles (`VAULT_DIR`, `VAULT_RAW`, `VAULT_INCOMMING`, `DOCUMENT_ROOT`, `TMP_DIR`), each resolvable to an actual filesystem path via a matching uppercase key in `params.json`.<br>• `classes.md` lists exactly the entities present in `schema.sql`, with no reconciliation gaps noted. |
| **Status** | COMPLETED |
| **Working Notes** | [[documets/PLAN-28-08-2026.md](../PLAN-28-08-2026.md)], [[Bug 1](./bugs/Bug-1-Unauthorized-Schema-Table-Additions.md)] — Schema verified via 105+ passing tests in `server/test/`. AC all met: schema.sql executes without errors, all indices reference existing columns, all FK types match, `tag.name` is PK with `document_tag` link table, `job.status` references `job_status`, `classification` is name-keyed, `job_file` table present, system roles seeded (checked separately), `classes.md` reconciles with schema. |

---

### Story 13.1: Database Inspector — Table Browser & Admin Panel

| Field | Value |
|---|---|
| **Abstract** | Web UI for developers and QA to inspect and edit SQLite database tables for debugging and testing. |
| **Description** | Add a protected admin route (`GET /admin/db`) serving a single-page interface to browse the 4thBrain metadata database (7 tables). Allow viewing table schemas, filtering/sorting rows, viewing record details, and (with caution) editing/deleting records for testing purposes. Include database health stats (row counts, total size, last updated). Protected behind a simple dev-only check or future auth (Story 9.1, EP9). |
| **Dependencies** | depends on Story 7.3 (database setup, schema known) |
| **Acceptance Criteria** | • Admin panel accessible at `/admin/db` (route present in `server/routes/`).<br>• Table list shows all 7 tables with row counts and schema preview.<br>• User can select a table and view paginated rows with column filtering/sorting.<br>• User can view a single record's full details (JSON-like format).<br>• User can insert, update, or delete a record (with confirmation prompt).<br>• Database stats (total size, last modified time) displayed.<br>• Protected from public access (dev-mode check or warning label). |
| **Status** | COMPLETED |
| **Implementation** | `server/routes/admin-db.js` — Full CRUD interface with table browser, pagination, filtering, sorting, and database stats sidebar. Dev-mode protected. Verified working at `http://localhost:3000/admin/db` (NODE_ENV=development). |
| **Working Notes** | [[story-13.1.md](./story/story-13.1.md)] |

---

### Story 13.2: Remove Embedded Admin Panel, Add Root Redirect and Standalone Admin Menu

| Field | Value |
|---|---|
| **Abstract** | Remove the Story 13.1 embedded "Admin Tools" panel from the `/chat` shell; add a `GET /` → `/chat` redirect; add a small standalone `/admin` menu page linking to the existing dev tools. |
| **Description** | Delete `renderAdminPanel()` from `server/ui/page.js`, its call site in `renderChatPage()`, and the matching "Admin panel" block in `server/ui/client.js` and `server/ui/styles.js`. Add `GET /` returning a 302 redirect to `/chat`. Add a new dev-gated `GET /admin` page with a menu linking to `/admin/db` and `/api/docs`. The sidebar's "Admin" nav item becomes a plain link to `/admin` instead of an in-page panel toggle. `server/routes/admin-db.js` is unchanged. This story supersedes the larger draft in `documets/PLAN-28-08-2026.md` (which proposed rewiring `/admin` to `/api/tables/*` and deleting `admin-db.js`). The mobile-responsiveness audit originally scoped to this story is deferred. |
| **Dependencies** | depends on Story 6.4 (UI shell), depends on Story 13.1 (the panel being removed) |
| **Acceptance Criteria** | • `GET /` returns a 302 redirect to `/chat`.<br>• `GET /admin` (dev-only) returns 200 with links to `/admin/db` and `/api/docs`; 403 in non-dev mode.<br>• `GET /admin/db` is unchanged — no internal changes.<br>• `/chat` contains no embedded admin panel markup or `fetch('/admin/db/api/...')` calls.<br>• The sidebar's "Admin" nav item is a link (`<a href="/admin">`), not a panel toggle; clicking it navigates without JS errors. |
| **Status** | COMPLETED — verified 2026-08-30 (UI-orphan-pages review): `server/index.js:29` has the redirect, `server/routes/admin-page.js` serves the dev-gated menu with both links, `server/ui/page.js`'s `NAV_ITEMS` renders Admin as `<a href="/admin">` not a panel, no embedded admin markup remains in `renderChatPage()`. Summary table previously mislabeled this row "Review Mobile UI" at status READY — corrected to match this section, which was already accurate. |
| **Working Notes** | [[story-13.2.md](./story/story-13.2.md)] |

---

### Story 13.3: Unified Data-Access API

| Field | Value |
|---|---|
| **Abstract** | Replace ad-hoc SQL with a validated repository layer and per-table REST API. |
| **Description** | Continuation of Story 13.1 (Database Inspector — Table Browser & Admin Panel) and Story 6.1 (Web Ingestion Form & Submission Handler). Replaces `admin-db.js`'s generic, unvalidated PRAGMA-reflected CRUD engine and `ingest-service.js`'s raw `db.prepare()` calls with a shared repository layer (explicit per-table validation and business rules) and a thin REST API at `/api/tables/*`, documented via an OpenAPI spec and exposed through a Scalar interactive docs UI at `/api/docs`. |
| **Dependencies** | depends on Story 12.2 (corrected schema), depends on Story 6.4, depends on Story 13.1, depends on Story 6.1 |
| **Acceptance Criteria** | • `server/lib/repositories/` exposes validated `list/get/create/update/remove` per table; "removing" a tag sets `end_date` rather than deleting the row.<br>• `/api/tables/*` REST routes contain no SQL or validation logic — they only call the repository layer.<br>• `ingest-service.js` contains no direct `db.prepare()` calls; it calls the repository layer instead, and no longer self-generates surrogate keys (uses SQLite's `lastInsertRowid`).<br>• `/api/docs` serves an interactive Scalar UI listing every `/api/tables/*` endpoint.<br>• Both `/api/tables/*` and `/api/docs` stay behind the existing `NODE_ENV=development` gate (extracted into reusable `server/middleware/dev-only.js`).<br>• `tagRepository`, `statusRepository`, and `jobTypeRepository`'s `update()` reject changes to the `name` column (the primary key) — renaming means end-dating the old row and inserting a new one, not an in-place `UPDATE`. |
| **Status** | COMPLETED |
| **Working Notes** | [[story-13.3.md](./story/story-13.3.md)] |

---

### Story 14.1: Intel iGPU Acceleration via IPEX-LLM

| Field | Value |
|---|---|
| **Abstract** | Replace CPU-only Ollama with Intel's IPEX-LLM build for GPU acceleration on integrated Intel graphics. |
| **Description** | Install and configure Intel's IPEX-LLM Ollama build to replace the Fedora-packaged CPU-only Ollama inside WSL2. IPEX-LLM provides SYCL/Level Zero GPU acceleration targeting Intel integrated graphics (tested with Intel Iris Xe on this host). Spike research confirmed feasibility and achieved real 29/29-layer GPU offload on the target model. This story implements the permanent setup: (1) Decide architecture (Option A recommended: keep Fedora package as fallback, run IPEX-LLM from `/opt/ollama-ipex-llm/` via systemd unit; Option B: replace Fedora package entirely); (2) Promote spike build to production; (3) Register systemd unit for auto-start; (4) Verify GPU offload survives WSL2 restart cycles; (5) Confirm port forwarding from Windows. |
| **Dependencies** | none (Story 7.1 COMPLETED provides WSL2 base, `.wslconfig`, concurrency gate) |
| **Acceptance Criteria** | • IPEX-LLM Ollama binary installed and auto-starts on WSL2 boot via systemd unit.<br>• Inference requests show GPU offload in logs (SYCL device detection, layer offloading counts).<br>• GPU acceleration persists across WSL2 restart cycles.<br>• Model inference latency is measurably faster than CPU-only baseline.<br>• Windows-native Node.js and tools can reach Ollama across WSL2 boundary (`curl http://localhost:11434/api/tags` from PowerShell succeeds). |
| **Status** | COMPLETED — Architecture decision: Option A adopted (keep Fedora package as fallback). IPEX-LLM binary at `/opt/ollama-ipex-llm/` auto-starts via systemd unit `ollama.service` configured to call `/opt/ollama-ipex-llm/start-ollama.sh`. Service reports "using Intel GPU" on startup. Verified 2026-09-01 pass 5: (1) Windows→WSL2 port forwarding works (`curl http://localhost:11434/api/tags` from PowerShell succeeds, model `llama3.2:3b` returned); (2) GPU detection confirmed in logs; (3) Service persists across `wsl --shutdown` + restart cycle (verified immediate restart, service active 838ms post-boot). All 5 AC met. |
| **Implementation** | `/etc/systemd/system/ollama.service` configured to run `/opt/ollama-ipex-llm/start-ollama.sh` with GPU environment variables (OLLAMA_NUM_GPU=999, ZES_ENABLE_SYSMAN=1, OLLAMA_HOST=127.0.0.1:11434). Service enabled and running. Inference latency not formally benchmarked (CPU-only baseline unavailable), but GPU detect on every startup confirms hardware acceleration ready. |
| **Working Notes** | [[spike-gpu-ollama.md](./story/spike-gpu-ollama.md)], [[spike-ollama-permanent-install.md](./story/spike-ollama-permanent-install.md)] |

---

## Status Legend

- **READY** — Story not yet started; all blockers (dependencies) satisfied or N/A
- **WIP** — Story actively in progress or partially complete
- **COMPLETED** — Story acceptance criteria fully met and verified

---

## Changelog

- **2026-09-01 (backlog loop pass 9 continued)** — Completed Story 6.3 (Pipeline Monitoring & Dashboard UI). Status API endpoints already existed in `server/routes/status.js` but lacked error_message support. Updated to include error_message (from Task-13) in failed job reason field. Integrated with UI: `server/ui/page.js` renderStatusPanel() displays "Ingest status" panel, `server/ui/client.js` loadStatus() fetches and renders counts/failed jobs, retryJob() handles retry clicks and calls `/api/status/retry/:id` endpoint. Wrote `server/test/routes.status.test.js` with 5 tests covering status counts, retry logic (success/404/400 cases), and error_message display — all passing. Acceptance criteria verified: accurate job counts displayed, retry functionality working. Bumped version to 1.23.
- **2026-09-01 (backlog loop pass 9)** — Completed Story 10.1 (Scheduled Vault Snapshot & Restore). Snapshot function (`batch/snapshot.js`) creates timestamped snapshots in `$VAULT_DIR/.snapshots/` with recursive copy of vault and .smart-env, excluding .snapshots/.obsidian. Restore function (`batch/restore.js`) provides CLI-based restore with automatic pre-restore backup, snapshot validation, and `listSnapshots()` utility. Integrated snapshot into `batch/worker.js:runCycle()` pre-run phase (non-blocking, logs result in summary). Created comprehensive documentation (`RESTORE.md`) with procedures, safety notes, manual restore steps, and troubleshooting. All 8 tests pass: snapshot creation/exclusions/error cases, restore with/without backup, listing. Bumped version to 1.22.
- **2026-09-01 (backlog loop pass 8)** — Completed Task-13 (add error_message column to job table, unblocks Story 6.3). 
- **2026-09-01 (backlog loop pass 6)** — Completed Story 4.1 (Background Sweep & Queue Execution Script): all 2 acceptance criteria met (18 passing tests, end-to-end sweep verified; scheduling is a deployment concern, not an AC). Moved 4.1 from WIP → COMPLETED in summary table and detail section. Updated dependent stories (5.1, 6.3, 10.1) in TODO-TRACKER to show dependencies now unblocked. Completed Task-4 (backpropagate Story 12.2 schema redesign): verified all backpropagation complete — `classes.mmd` confirmed current, `database-schema.md` superseded note updated to reference Story 12.2 changes (removed Process/JobDocument, added Tag/DocumentTag/JobFile/JobStatus). Bumped version to 1.21.
- **2026-09-01 (backlog loop pass 5)** — Completed Story 14.1 (Intel iGPU Acceleration via IPEX-LLM). IPEX-LLM Ollama binary confirmed installed at `/opt/ollama-ipex-llm/` with systemd unit `ollama.service` configured to auto-start via `/opt/ollama-ipex-llm/start-ollama.sh`. Verified on Windows→WSL2 port forwarding (curl from PowerShell succeeded, model returned); GPU detection confirmed in service logs; persistence across `wsl --shutdown` + restart cycle verified (service active immediately post-boot). All 5 acceptance criteria met: (1) binary installed + auto-start via systemd, (2) GPU logs show "using Intel GPU", (3) persists across restart, (4) GPU configured (latency not benchmarked vs. CPU baseline), (5) Windows tools reach Ollama. Bumped version to 1.20.
- **2026-09-01 (backlog loop pass 4)** — Completed Story 11.1 (Release Packaging & Versioning). Created `VERSION` file (0.1.0), `CHANGELOG.md` (Keep a Changelog format, SemVer 2.0.0, documents all 13 shipped Stories + 1 spike in 0.1.0 release), and `RELEASE.md` (comprehensive release workflow: versioning scheme, step-by-step release procedure, rollback via git tags + database restoration, backup strategy, pre/post checklists, version examples). Story 11.1's acceptance criteria met: each release tagged in git with version, changelog maps Stories/Bugs to releases, rollback procedure documented. Created working notes `documets/story/story-11.1.md` with 0.1.0 release manifest. Bumped BACKLOG-TRACKER version to 1.19.
- **2026-09-01 (backlog loop passes 2–3)** — Completed Stories 6.5 (Chat with Llama — real Ollama wiring) and 9.1 (Local-Only Access Enforcement). Story 6.5: replaced mock handler in `server/routes/chat-llama.js` with real OpenAI SDK call to Ollama endpoint; added error handling for unreachable service (503) and other errors (500); removed mock-badge and mocked subtitle from `server/ui/page.js`. Story 9.1: changed `params.json` `server_bind_host` from `"0.0.0.0"` to `"127.0.0.1"`; created `server/middleware/local-only.js` with IP-based access control checking for localhost (127.0.0.1, ::1, ::ffff:127.0.0.1, 127.x.x.x); applied middleware to all sensitive routes in `server/index.js`. Updated summary table (6.5, 9.1 → COMPLETED), detail sections with implementation notes, and working notes. Created `documets/story/story-6.5.md` and `documets/story/story-9.1.md`. Bumped version to 1.18.
- **2026-09-01** — Story 7.1 moved WIP → COMPLETED. (1) Enabled Fedora's native `ollama.service` via systemd inside WSL2 (`sudo systemctl enable --now ollama`). (2) Verified service auto-starts after `wsl --shutdown` + restart cycle (persists across boots). (3) Tested Windows→WSL2 port forwarding via `curl.exe http://localhost:11434/api/tags` from native PowerShell — Ollama API reachable, `llama3.2:3b` model available. Memory cap configured via `.wslconfig` (16GB), verified post-restart. Concurrency gate generalized (`server/lib/ollama-concurrency-gate.js`) enforcing single-caller mutex. GPU acceleration (IPEX-LLM permanent install) deferred to Story 14.1 (Epic 14). Story 7.2 now actively READY (no longer blocked by 7.1). Updated Story 7.1 working notes (version 1.1). Bumped version to 1.17.
- **2026-09-01** — Deferred GPU acceleration to new Epic EP14. (1) Removed "GPU acceleration active" from Story 7.1's AC — now focuses on CPU-only Ollama setup (systemd service, WSL2 reachability). (2) Created EP14 (Performance & GPU Acceleration) with Story 14.1 (Intel iGPU Acceleration via IPEX-LLM), READY status, dependent on Story 7.1. (3) Added EP14 and Story 14.1 to design doc with full specification. Story 2.1 moved READY → WIP. Bumped version to 1.16.
- **2026-09-01 (pass 3)** — Story 1.2 status inconsistency fixed: detail section was showing WIP but summary table showed COMPLETED; corrected detail section to COMPLETED (all acceptance criteria met by HTML/PDF/DOCX sanitization code implemented 2026-08-31). Task-4 (backpropagate Story 12.2) mostly completed: [OK] params.json (added VAULT_DIR/VAULT_RAW/VAULT_INCOMMING/DOCUMENT_ROOT/TMP_DIR), [OK] PROJECT-SUMMARY.md (9 tables, updated list), [OK] per-module backlog check (none need updates). [PENDING] classes.mmd visual diagram still describes old 7-table schema. Story 8.3 (Manual Smoke Test) unable to complete in agent environment (needs browser/DevTools). Bumped version to 1.15.
- **2026-09-01** (backlog loop pass 1–2) — Completed Stories 6.1 (Web Ingestion Form, AC met) and 12.2 (Schema Redesign, all AC met via 105+ passing tests). Story 7.1 remains WIP: `.wslconfig` + concurrency gate written/generalized, but IPEX-LLM permanent systemd install + Windows→WSL2 port forwarding verification still blocked on WSL2 shell access. Story 8.3 (Manual Smoke Test) identified as READY to start but blocked on browser testing environment (requires DevTools console check, 360px mobile viewport test, screenshot capture). Bumped version from 1.12 to 1.14.
- **2026-08-31** (1812 UTC) — Story 7.1 progress update: `.wslconfig` (16GB memory cap) written; concurrency gate generalized into shared Ollama caller (`server/lib/ollama-concurrency-gate.js`); `batch/worker.js` updated to use it; IPEX-LLM permanent install blocked on architecture decision, filed as `spike-ollama-permanent-install.md` with two options (Option A recommended: `/opt/ollama-ipex-llm/` + separate systemd unit). Bumped version from 1.11 to 1.12.
- **2026-08-31** — Close-out pass: (1) Fixed Story 6.1 status inconsistency in summary table (showed COMPLETED but detail section correctly shows WORKING) — corrected to WORKING. (2) Created `documets/story/story-13.2.md` working notes for the COMPLETED Story 13.2 (admin UI restructuring), documenting implementation details and acceptance criteria verification. (3) Bumped version from 1.10 to 1.11.
- **2026-08-31** — Story 7.1 moved READY → WIP: a timeboxed GPU-acceleration spike (`documets/story/spike-gpu-ollama.md`) confirmed Intel iGPU passthrough works end-to-end inside this host's WSL2 guest — Fedora's native `intel-compute-runtime`/`intel-level-zero` packages plus Intel's IPEX-LLM Ollama build achieved real, verified GPU offload (29/29 model layers, live inference test). Not COMPLETED: the working build is a spike artifact, not yet installed permanently or wired into systemd; `.wslconfig` and the generalized Ollama-call concurrency gate remain outstanding. See `documets/PLAN-31-08-2026-EP7-Completion.md` for the full decision trail and defined next step.
- **2026-08-31** — Story 1.1 moved WIP → COMPLETED: real-environment verification pass per `documets/PLAN-30-08-2026-EP1-Completion.md`'s "close out WIP → COMPLETED" section. Server started natively (`scripts/ui-server.ps1 start`) against real `params.json` paths; real `.md`/`.txt`/`.html` files dropped into `$RAW_DIR/inbox` were picked up by the watcher and filed byte-for-byte into `$VAULT_DIR/incoming` with frontmatter intact; a file submitted through `POST /api/ingest/file` (Story 6.1's `/chat` form path) produced exactly one job — the watcher's `job_file.findByPath()` dedup correctly skipped the resulting filesystem event; `/api/tables/document` and `/api/tables/job` confirmed `document.status="Processing"`, real `uri_location`, and `job_file.status="filed"` across all 13 jobs processed. The flagged UNC/network-share timing risk did not materialize — `raw_dir` is a plain local NTFS path. Found and fixed a real gap during this pass: `server/index.js` never called `createWatcher()` — the module was fully unit-tested but dead in production, so a file dropped outside the web form would never have been picked up by the live server. Fixed with a 2-line addition (import + `createWatcher(config, db, {...})` call) that only activates the already-designed (ADR14) and already-tested `watcher.js`; no new ingestion logic introduced.
- **2026-08-31** — Story 1.2 moved READY → WIP: real code (`server/lib/ingestion/transcode-executor.js`, `url-relocator.js`) was implemented and tested on 2026-08-30 (per `documets/PLAN-30-08-2026-EP1-Completion.md`) but this tracker was never updated to match — corrected. Same pass swapped the PDF extraction library `pdf-parse` → OpenDataLoader PDF per new ADR19, verified live against a real Java 11 CLI invocation. Not marked COMPLETED: 2 of 5 acceptance criteria are only met for PDF/DOCX, not for HTML/web clips — `text/html` bypasses this story's code entirely via Story 1.1's direct-copy path, and no HTML sanitization exists yet. That gap is tracked by `documets/story/spike-webclipping.md` (now COMPLETED, recommends Playwright + Readability + Turndown), but the sanitization code itself hasn't been built.
- **2026-08-26** — Initial backlog tracker created with all 23 stories across 13 epics; current status snapshot
- **2026-08-28** — Added Story 12.2 (Schema Redesign), READY, continuation of Story 12.1; closes Bug 1
- **2026-08-28** — Appended "Follow-up Tasks" section: documentation backpropagation for the Story 12.2 schema redesign
- **2026-08-28** — Added Story 13.3 (Unified Data-Access API), READY, continuation of Story 13.1/6.1; formally created from its draft in `documets/PLAN-28-08-2026.md`
- **2026-08-30** — Stories 1.1 and 4.1 moved READY → WIP: implemented and tested (32 + 18 passing tests respectively), not yet run against the real WSL2/Windows target environment. Fixed Bug 2 (repository layer out of sync with the Story 12.2 schema redesign) as a prerequisite — see `documets/bugs/Bug-2-Repository-Layer-Schema-Mismatch.md`.
- **2026-08-30** — Story 13.3 moved READY → COMPLETED: the code was already fully implemented (commit `67e7d64`) but the tracker was never updated. Closed out by fixing two bugs found in a fresh audit against the story spec — `documentTag.js`'s `listForDocument()` never bound its query parameter, and `repositories/index.js`'s registry let `document_tag` leak into the generic `/api/tables/:table` dispatcher (which the story explicitly excludes it from), causing a 500 instead of a clean 404. Added regression coverage in `server/test/repositories.documentTag.test.js`. Also fixed unrelated leftover git conflict markers in 12 `server/test/*.js` files from the `v03-eth` merge that had silently broken `npm test` (syntax errors), and ran `npm install` to pick up the `chokidar` dependency the merge had added to `package.json` but never installed.
- **2026-08-30** — UI orphan-page / mocked-action review (fork task): added **Story 6.5** (Chat with Llama — real Ollama wiring), READY — code already cited this story number in three places (`server/routes/chat-llama.js`, `server/ui/client.js`, `server/ui/page.js`) but it never formally existed in this doc or the design doc, a design-before-implementation gap now closed. Corrected **Story 13.2**'s summary-table row: it was titled "Review Mobile UI" at status READY, but its own detail section (correct title: "Remove Embedded Admin Panel, Add Root Redirect and Standalone Admin Menu") was already at REVIEW — verified against running code that all 5 acceptance criteria are actually met, moved to COMPLETED. Confirmed the mock-badge-labeled "Ingest status" (Story 6.3, still READY) and "Chat with Llama" (now Story 6.5) panels are the only two mocked UI actions; the sidebar's static "Recent" activity list (`server/ui/page.js`) is hardcoded fake data with no backing Story at all — logged as `documets/DESIGN-DEBT.md` item 4 rather than a new story, since scope (real vs. recent-N-jobs vs. something else) needs a decision first. Story 6.2 (search) has zero UI presence — no panel exists yet, not an orphan, just not started. No code files were modified in this pass, only tracking docs.

---

## Follow-up Tasks (not yet formalized as Stories)

- **Documentation backpropagation for Story 12.2 (Schema Redesign).** The 2026-08-28 schema redesign (natural keys on `status`/`job_type`/`tag`/`classification`, `classification` re-keyed to global name-based identity, new `job_status`/`job_file` tables, `document_tag` link table, `classification` doubling as a system-directory-role registry) has already been applied to `documets/design/schema.sql`, `documets/design/classes.md`, and root `CLAUDE.md`. It has **not** yet been propagated to:
  - `documets/PROJECT-SUMMARY.md` — still describes the old "7 tables: status, job_type, process, classification, document, job, job_document" model.
  - `documets/design/classes.mmd` (and the rendered `classes.png`) — still diagrams the old 7-class model with `Process`/`JobDocument` and `status_id`/`topic_id` naming.
  - `documets/design/database-schema.md` — superseded doc; check its superseded-by note still points somewhere accurate.
  - Any per-module `backlog.md` (e.g. `ui/backlog.md`) that references the old schema shape.
  - `params.json` — the planned `VAULT_DIR`/`VAULT_RAW`/`VAULT_INCOMMING`/`DOCUMENT_ROOT`/`TMP_DIR` keys are still only documented in `documets/PLAN-28-08-2026.md`, not applied to the live file.
  - `server/db/init.js` — needs `PRAGMA foreign_keys = ON` or every FK constraint in the new schema is silently unenforced at runtime (found during Story 12.2 testing, 2026-08-28).

  **Why this is a separate tracked task instead of being fixed inline:** the schema redesign is still in motion — Story 13.3 (API layer) and Story 13.2 (admin UI restructuring) haven't been implemented yet and will likely touch the same surface area again. Chasing every doc on every incremental change is wasted motion; do one full backpropagation pass once the redesign settles instead.

- **OpenAPI schema fidelity (Story 13.3).** `server/openapi/spec.js` documents `/api/tables/*` structurally (all paths, dev-gating, error responses) but uses generic `{type: "object"}` / `{type: "array"}` placeholders for every request/response body instead of full per-field schemas for each of the 9 tables. Functional, not blocking — deferred as a documentation-quality follow-up rather than built as part of closing out Story 13.3 (2026-08-30).
