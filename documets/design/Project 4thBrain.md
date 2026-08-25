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
> * **Description:** Build local pipeline handlers to accept pre-formatted Markdown files or key-value content and write them directly to target subfolders without altering existing frontmatter or structure.  
> * **Acceptance Criteria:**  
  * Ingested files maintain original frontmatter schema and metadata.  
  * Target subfolder path resolution writes files directly to designated locations without file corruption.  
> * **Dependencies:** depends on Story 7.1, depends on Story 7.2  
> * **Status:** To Do

### **Story 1.2: Unstructured Text Parsing & Sanitization**

> * **Abstract:** Clean and normalize unstructured raw text payloads.  
> * **Description:** Implement an input parser that strips unsafe scripts, HTML bloat, and invalid formatting from web clips or freeform text submissions prior to vault insertion.  
> * **Acceptance Criteria:**  
  * Input containing raw HTML, web clips, or special characters is sanitized to clean plain text/Markdown.  
  * Core semantic text content remains fully intact post-sanitization.  
> * **Dependencies:** must be worked with Story 1.1  
> * **Status:** To Do

## **EP2: Automated Tagging & Classification Engine**

**Associated Requirements:** FR3 (Tagging & Classification)  
**Inherited Acceptance Criteria:** Generated Markdown notes contain valid YAML frontmatter with tags matching predefined vault taxonomy.

### **Story 2.1: Local LLM Metadata & Tag Inference**

> * **Abstract:** Infer tags and YAML metadata using local LLM inference.  
> * **Description:** Connect the Node.js processing pipeline to the local Ollama instance to analyze raw note content and generate appropriate tags and YAML header fields based on vault taxonomy.  
> * **Acceptance Criteria:**  
  * Generated notes contain syntactically valid YAML frontmatter blocks.  
  * Applied tags strictly align with configured vault taxonomy rules.  
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

### **Story 6.1: Web Ingestion Form & Submission Handler**

> * **Abstract:** Build web-based entry form for submitting links, files, and text.  
> * **Description:** Construct frontend form components allowing raw text input, file uploads, and web URL submissions directly to the Node.js ingestion endpoint.  
> * **Acceptance Criteria:**  
> * Submitting form content creates a valid pipeline job and returns a unique Job ID immediately.  
> * **Dependencies:** depends on Story 1.1, must be worked with Story 6.3  
> * **Status:** To Do

### **Story 6.2: Hybrid Keyword & Semantic Search Interface**

> * **Abstract:** Implement UI search bar connecting to vault and vector indexes.  
> * **Description:** Build a search component that queries local files and vector embeddings via MCP/Node endpoints, displaying ranked results with direct file links.  
> * **Acceptance Criteria:**  
> * Search queries display ranked result cards containing snippets and file paths with sub-second response times.  
> * **Dependencies:** depends on Story 3.1  
> * **Status:** To Do

### **Story 6.3: Pipeline Monitoring & Dashboard UI**

> * **Abstract:** Provide real-time status view of active, pending, and failed jobs.  
> * **Description:** Build a status panel showing background execution state, error logs, and controls to re-run failed jobs.  
> * **Acceptance Criteria:**  
  * Displays accurate counts for active, pending, and failed processing jobs.  
  * Provides functional "Retry" action button for failed jobs.  
> * **Dependencies:** depends on Story 4.1, must be worked with Story 6.1  
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

## **EP8: QA, Testing Harness & Bug/Issue Tracking**

**Associated Requirements:** Cross-cutting — validates acceptance criteria across FR1–FR9, NFR1–NFR12  
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

**Associated Requirements:** Gap — no existing NFR covers this; proposed NFR13 (Authentication & Local Access Control) pending Phase 3 scope lock  
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
> * **Description:** Build the release definition/versioning process referenced in Phase 5 (Release Definition & Planning) — tagging, changelog, and rollout scripting distinct from initial dev-host setup.  
> * **Acceptance Criteria:**  
  * Each release has a version tag and changelog mapping to closed Stories/Bugs.  
  * A rollback path exists to the previous release version.  
> * **Dependencies:** depends on Story 7.1, depends on Story 7.2, depends on Story 8.1  
> * **Status:** To Do