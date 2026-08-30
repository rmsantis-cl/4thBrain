---
name: Process
description: Formal technical specification of the 4thBrain document ingestion and indexing pipeline
metadata:
  version: 1.0
  created-by: Claude Code
  date: 2026-08-29
---

# 4thBrain Document Ingestion & Indexing Pipeline

## Overview

The 4thBrain ingestion pipeline processes unstructured documents, links, and web content into a knowledge vault and vector database suitable for semantic search and retrieval. Input streams are classified by type (native text, binary documents, URLs) and routed through parallel extraction and sanitization stages. Successfully processed documents are embedded as vectors and tagged with semantic metadata, then stored in the Obsidian-compatible vault and RAG vector index. Failed documents are preserved in archive storage for manual recovery or later processing.

## Pipeline Architecture

### Stage 1: Input Routing & Ingestion

The Ingestion Handler receives documents from all sources (Web UI uploads, API submissions, clipboard feeds, etc.) and performs initial triage.

**Epic:** [EP1: Ingestion & Sanitization](documets/design/Project%204thBrain.md) | **Stories:** [Story 1.1](documets/design/Project%204thBrain.md), [Story 1.2](documets/design/Project%204thBrain.md), [Story 6.1: Web Ingestion Form](documets/design/Project%204thBrain.md) (✓ COMPLETED)

- **Text payloads** (notes, transcripts, plain text) are forwarded directly to the Vector Embedding Service. See [FR2: Accept Text Input](documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md).
- **Binary documents** (PDFs, images, Word docs, etc.) are sent to the Content Extraction Service for optical character recognition and text recovery.
- **URLs** are forwarded to the Web Content Clipper for remote retrieval and local caching.

This parallel fan-out enables concurrent processing of mixed-type ingestion batches, reducing latency for multi-format submissions.

### Stage 2: Web Content Retrieval — Clipper Branch

The Web Content Clipper fetches remote URLs and retrieves their content for local processing:

1. Upon receiving a URL reference, the Clipper establishes a network connection to the remote resource.
2. The fetched document (HTML, text, or structured content) is downloaded and cached locally.
3. The retrieved content is returned to the Ingestion Handler for re-entry into the main pipeline.

The Clipper abstracts remote fetching from the core pipeline, presenting all content (native or remote) identically to downstream processors.

### Stage 3: Content Extraction & Sanitization — Extraction Branch

The Content Extraction Service processes binary documents and unstructured input.

**Epic:** [EP1: Ingestion & Sanitization](documets/design/Project%204thBrain.md) | **Stories:** [Story 1.1](documets/design/Project%204thBrain.md), [Story 1.2](documets/design/Project%204thBrain.md) | **Requirements:** [FR3: Accept Binary Documents](documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md), [FR4: Accept URLs](documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md)

**Success Path:**
- Binary content is scanned for embedded text (OCR on images, text extraction from PDFs, etc.).
- Extracted text is sanitized (removal of metadata, normalization of encoding) and returned to the Ingestion Handler.
- Sanitized text is forwarded to the Vector Embedding Service.

**Failure Path:**
- If extraction fails (unsupported format, corruption, or unrecoverable binary), the raw document is persisted to the Raw Binary Archive.
- The document is flagged for manual inspection and exits the automated pipeline.

### Stage 4: Vector Embedding & Indexing

The Vector Embedding Service generates semantic embeddings for all text content.

**Epic:** [EP3: Vector Indexing / MCP](documets/design/Project%204thBrain.md) | **Spike:** [Spike 3.2: Smart Connections Indexing-Status](documets/design/Project%204thBrain.md) (✓ COMPLETED) | **Infrastructure:** [ADR18: Persistence Technology](documets/design/adr18-persistence-tech.md) (Smart Connections vector index)

1. Text input (sanitized or native) is passed to the local LLM (Ollama) running on the host WSL2 instance.
2. The LLM generates dense vector embeddings for semantic search.
3. Document metadata (title, source, ingestion timestamp, source type) is preserved alongside embeddings.

**Success Path:**
- Embeddings and metadata are forwarded to the Semantic Classifier.
- The document remains in the active pipeline for tagging and final storage.

**Failure Path:**
- If embedding generation fails (LLM unavailable, insufficient content, timeout), the document is routed to the Unindexed Notes Archive.
- The document is preserved but marked as non-searchable via vector retrieval; full-text and metadata-based search remain available.

### Stage 5: Semantic Classification & Tagging

The Semantic Classifier analyzes indexed content and assigns topic metadata.

**Epic:** [EP2: Tagging / Classification](documets/design/Project%204thBrain.md) | **Stories:** [Story 2.1](documets/design/Project%204thBrain.md) (Ready) | **Requirements:** [FR5: Classify & Tag Documents](documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md)

1. The Classifier evaluates the document's embeddings, text content, and stored metadata.
2. Semantic tags are extracted from the content (e.g., "work", "personal", "meeting notes", "research", etc.).
3. The classifier may invoke the local LLM to suggest or refine topic assignments.
4. The fully processed document (with embeddings, tags, and metadata) is prepared for vault storage.

### Stage 6: Vault & Index Persistence

The Indexed Knowledge Vault is the final destination for successfully processed documents.

**Epics:** [EP3: Vector Indexing / MCP](documets/design/Project%204thBrain.md), [EP12: Structured Data & Job Queue Persistence](documets/design/Project%204thBrain.md) | **Design:** [schema.sql](documets/design/schema.sql), [classes.md](documets/design/classes.md) | **Architecture:** [ADR14: Vault Directory Layout](documets/design/ADRS.md), [ADR18: Persistence Technology](documets/design/adr18-persistence-tech.md)

1. Processed documents are written to the Obsidian-compatible Markdown vault.
2. Vector embeddings and semantic tags are persisted to the local RAG vector database.
3. The document becomes immediately searchable via semantic (vector) query, full-text search, and tag-based filtering.
4. The vault serves as the authoritative knowledge base for the 4thBrain assistant and daily briefing system.

## Actuator Specifications

This section details each actuator (pipeline stage) with its input/output contract, database state transitions, and routing logic. The schema is defined in [schema.sql](documets/design/schema.sql); status/job enumerations are seeded in that file.

### Actuator 1: Input Handler (Ingestion Entry Point)

**Name:** Input Handler / Ingestion Router

**Description:** Receives documents from Web UI, API, or external feeds (clipboard, email, etc.). Classifies payload by content type (text, binary, URL) and creates initial document record. Enqueues appropriate downstream jobs.

**Input Contract:**
- Payload: Document body (text, binary file, or URL string)
- Metadata: Name, source type, optional tags, optional topic classification
- Origin: Web UI form (Story 6.1), REST API, or ingestion feed

**Expected Database State (Pre-Processing):**
- `status` table: Populated with seed values (New, Processing, Indexed, Failed, Archived)
- `job_type` table: Populated with seed values (ingest, convert, classify, index)
- `document` table: May be empty or contain prior documents
- No job record yet for this document

**Final Database State (Post-Processing):**

| Input Type | Document Record | Job Record | Next Actuator |
|---|---|---|---|
| **TEXT** | `INSERT INTO document (name, uri_location, mime_type, status, created, updated) VALUES (?, 'text-stream://', 'text/plain', 'Processing', now, now);` | `INSERT INTO job (job_type, document_id, status, start_date) VALUES ('ingest', <doc_id>, 'Running', now);` | → **Actuator 4: Vector Embedding Service** |
| **URL** | `INSERT INTO document (name, uri_location, mime_type, status, created, updated) VALUES (?, 'url://<url>', 'text/html', 'Processing', now, now);` | `INSERT INTO job (job_type, document_id, status, start_date) VALUES ('ingest', <doc_id>, 'Running', now); INSERT INTO job (...) VALUES ('convert', <doc_id>, 'New', null);` | → **Actuator 2: Web Clipper** |
| **BINARY** | `INSERT INTO document (name, uri_location, mime_type, status, created, updated) VALUES (?, 'file://<path>', '<mime>', 'Processing', now, now);` | `INSERT INTO job (job_type, document_id, status, start_date) VALUES ('ingest', <doc_id>, 'Running', now); INSERT INTO job (...) VALUES ('convert', <doc_id>, 'New', null);` | → **Actuator 3: Content Extraction Service** |

**Status Transition:** `New` → `Processing`

**Idempotency:** Document name + source URI should be unique (no duplicates within a processing window).

---

### Actuator 2: Web Clipper (URL Content Fetcher)

**Name:** Web Clipper / URL Fetcher

**Description:** Fetches remote content from a URL, downloads and caches locally. Converts remote content to text or binary intermediate, then re-injects into pipeline at the appropriate next stage.

**Input Contract:**
- Document ID: Reference to a `document` record with `uri_location` = `url://...`
- Job: A `job` record with `job_type = 'convert'` and `status = 'New'`
- Expected: Document references a remote URL; no local content yet

**Expected Database State (Pre-Processing):**
```sql
SELECT * FROM document WHERE id = ? AND uri_location LIKE 'url://%' AND status = 'Processing';
SELECT * FROM job WHERE document_id = ? AND job_type = 'convert' AND status = 'New';
```

**Final Database State (Post-Processing):**
- Update job: `UPDATE job SET status = 'Running', start_date = now WHERE id = <job_id>;`
- If fetch succeeds:
  - Create `job_file` entry: `INSERT INTO job_file (name, path, mime_type, job_id, status) VALUES (?, ?, 'text/html', ?, 'Downloaded');`
  - Update job: `UPDATE job SET status = 'Completed', end_date = now WHERE id = <job_id>;`
  - Route to next stage (Actuator 3 or 4 depending on fetched content type)
- If fetch fails:
  - Update job: `UPDATE job SET status = 'Failed', end_date = now WHERE id = <job_id>;`
  - Update document: `UPDATE document SET status = 'Failed' WHERE id = ?;`
  - Route to **Raw Binary Archive** (document remains in `Failed` state; no further processing)

**Next Actuator (on success):**
- If fetched content is text (HTML, JSON, plain text) → **Actuator 4: Vector Embedding Service**
- If fetched content is binary (PDF, image) → **Actuator 3: Content Extraction Service**

---

### Actuator 3: Content Extraction Service (Text Extractor)

**Name:** Content Extraction Service / Text Extractor

**Description:** Processes binary payloads (PDFs, images, Word docs, etc.) and extracts machine-readable text via OCR, PDF text parsing, or format-specific extraction. Sanitizes extracted text (encoding normalization, metadata removal). Returns extracted text to pipeline or archives raw binary on failure.

**Input Contract:**
- Document ID: Reference to a `document` record with binary `mime_type` (application/pdf, image/*, etc.)
- Job: A `job` record with `job_type = 'convert'` and `status = 'New'`
- Binary payload: File or binary blob stored in `job_file` table

**Expected Database State (Pre-Processing):**
```sql
SELECT * FROM document WHERE id = ? AND status = 'Processing' AND mime_type NOT IN ('text/plain', 'text/html');
SELECT * FROM job WHERE document_id = ? AND job_type = 'convert' AND status = 'New';
SELECT * FROM job_file WHERE job_id = ? AND status IN ('Downloaded', 'Queued');
```

**Final Database State (Post-Processing):**

| Outcome | Database Changes | Next Actuator |
|---|---|---|
| **Extraction Success** | `UPDATE job SET status = 'Completed', end_date = now WHERE id = <job_id>;`<br/>`INSERT INTO job_file (name, path, mime_type, job_id, status) VALUES (?, ?, 'text/plain', ?, 'Extracted');`<br/>Extracted text content is passed (not stored in DB) to next stage. | → **Actuator 4: Vector Embedding Service** |
| **Extraction Failure** | `UPDATE job SET status = 'Failed', end_date = now WHERE id = <job_id>;`<br/>`UPDATE document SET status = 'Failed' WHERE id = ?;`<br/>Binary remains in `job_file` table as evidence. | → **Raw Binary Archive** (document status = Failed) |

**Status Transition:** `Processing` → `Indexed` (on success) or `Failed` (on failure)

**Error Handling:** Raw binary is preserved in `job_file` for manual inspection; document is marked `Failed` but not deleted.

---

### Actuator 4: Vector Embedding Service

**Name:** Vector Embedding Service / Embedding Generator

**Description:** Generates dense vector embeddings for text content via local LLM (Ollama). Stores embeddings in vector database (Smart Connections). Operates on text from Actuator 1 (native text), Actuator 2 (fetched text), or Actuator 3 (extracted text). Routes output to Actuator 5 (Classifier) for tagging.

**Input Contract:**
- Document ID: Reference to a `document` record with `status = 'Processing'`
- Job: A `job` record with `job_type = 'index'` and `status = 'New'` (enqueued by prior actuator)
- Text content: Plain text (from Stage 1, 2, or 3)

**Expected Database State (Pre-Processing):**
```sql
SELECT * FROM document WHERE id = ? AND status = 'Processing';
SELECT * FROM job WHERE document_id = ? AND job_type = 'index' AND status = 'New';
```
- Ollama HTTP endpoint must be available (no DB dependency; external service)

**Final Database State (Post-Processing):**

| Outcome | Database Changes | Next Actuator |
|---|---|---|
| **Embedding Success** | `UPDATE job SET status = 'Completed', end_date = now WHERE id = <job_id>;`<br/>Embeddings stored in Smart Connections vector DB (external to SQLite; stored at `.vault/.smart-env`)<br/>`INSERT INTO job (...) VALUES ('classify', <doc_id>, 'New', null);` (enqueue classifier) | → **Actuator 5: Semantic Classifier** |
| **Embedding Failure** | `UPDATE job SET status = 'Failed', end_date = now WHERE id = <job_id>;`<br/>`UPDATE document SET status = 'Failed' WHERE id = ?;`<br/>Document marked as unindexable; no embeddings stored. | → **Unindexed Notes Archive** (document status = Failed) |

**Status Transition:** `Processing` → `Indexed` (on success) or `Failed` (on failure)

**Ollama Integration:** Call `POST http://localhost:11434/api/embed` with text; receive embedding vector. Embedding result is stored in Smart Connections, not SQLite (Smart Connections tracks its own state in `.smart-env`).

---

### Actuator 5: Semantic Classifier (Tagging Service)

**Name:** Semantic Classifier / Tagging Service

**Description:** Analyzes indexed documents and assigns semantic tags and topic classifications. Uses embeddings from Actuator 4 and optional LLM-based reasoning via Ollama to extract topic metadata. Updates document classification and tag assignments. Routes successful documents to Actuator 6 (Vault Persistence).

**Input Contract:**
- Document ID: Reference to a `document` record with `status = 'Processing'` and valid embeddings in Smart Connections
- Job: A `job` record with `job_type = 'classify'` and `status = 'New'`
- Embeddings: Computed in Actuator 4 and stored in Smart Connections (external reference)

**Expected Database State (Pre-Processing):**
```sql
SELECT * FROM document WHERE id = ? AND status = 'Processing';
SELECT * FROM job WHERE document_id = ? AND job_type = 'classify' AND status = 'New';
SELECT * FROM classification; -- Lookup available topic classifications
SELECT * FROM tag; -- Lookup available tags
```

**Final Database State (Post-Processing):**

| Outcome | Database Changes | Next Actuator |
|---|---|---|
| **Classification Success** | `UPDATE job SET status = 'Completed', end_date = now WHERE id = <job_id>;`<br/>`UPDATE document SET status = 'Indexed', topic = <classification>, updated = now WHERE id = ?;`<br/>`INSERT INTO document_tag (document_id, tag_name) VALUES (?, ?);` (one+ tags)<br/>`UPDATE tag SET active = TRUE WHERE name IN (...);` | → **Actuator 6: Vault Persistence** |
| **Classification Failure** | `UPDATE job SET status = 'Failed', end_date = now WHERE id = <job_id>;`<br/>`UPDATE document SET status = 'Failed' WHERE id = ?;` | → **Unindexed Notes Archive** (document status = Failed) |

**Status Transition:** `Processing` → `Indexed` (on success) or `Failed` (on failure)

**Tagging Logic:** Tags can be system-defined (work, personal, meeting notes, research, etc.) or user-defined. Tag lifecycle tracked via `start_date`, `end_date`, and `active` boolean.

---

### Actuator 6: Vault Persistence (Writer)

**Name:** Vault Persistence / Vault Writer

**Description:** Writes finalized documents to the Obsidian-compatible vault. Converts document metadata and embeddings into Markdown front-matter and vault file structure. Updates Smart Connections index with file location. Marks document as complete and archived.

**Input Contract:**
- Document ID: Reference to a `document` record with `status = 'Indexed'` and valid topic/tags
- Embeddings: Indexed in Smart Connections from Actuator 4
- Tags & Topic: Assigned in Actuator 5
- Vault directory: `$VAULT_DIR` (configured externally; mounted or mapped to vault location)

**Expected Database State (Pre-Processing):**
```sql
SELECT * FROM document WHERE id = ? AND status = 'Indexed' AND topic IS NOT NULL;
SELECT * FROM document_tag WHERE document_id = ?;
SELECT * FROM job WHERE document_id = ? AND job_type IN ('index', 'classify') AND status = 'Completed';
```

**Final Database State (Post-Processing):**

| Outcome | Database Changes | Next Actuator |
|---|---|---|
| **Vault Write Success** | `UPDATE job SET status = 'Completed', end_date = now WHERE id = <job_id>;`<br/>`UPDATE document SET status = 'Archived', uri_location = 'file://<vault_path>', updated = now WHERE id = ?;`<br/>Document is now in final state; no further pipeline processing. | → **None** (Pipeline Complete) |
| **Vault Write Failure** | `UPDATE job SET status = 'Failed', end_date = now WHERE id = <job_id>;`<br/>`UPDATE document SET status = 'Failed' WHERE id = ?;` | → **Requires Manual Intervention** |

**Status Transition:** `Indexed` → `Archived` (on success) or `Failed` (on failure)

**Vault Artifact:**
- Markdown file: `$VAULT_DIR/<topic>/<document-name>.md`
- Front-matter: Includes metadata (title, tags, creation date, source URL, embeddings reference)
- Smart Connections index updated: Document is now discoverable via vector search

---

## Processing Flow by Input Type

### Flow A: TEXT Input
```
Input Handler (TEXT payload)
  ↓ (INSERT document status=Processing, uri=text-stream://)
  ↓ (INSERT job type=ingest)
Actuator 4: Vector Embedding
  ↓ (Call Ollama, store in Smart Connections)
Actuator 5: Semantic Classifier
  ↓ (Assign tags, topic)
Actuator 6: Vault Persistence
  ↓ (Write markdown, update status=Archived)
[Complete]
```

### Flow B: URL Input
```
Input Handler (URL payload)
  ↓ (INSERT document status=Processing, uri=url://...)
  ↓ (INSERT job type=ingest; enqueue job type=convert)
Actuator 2: Web Clipper
  ↓ (Fetch remote content, INSERT job_file)
  ↓ (If HTML/text → continue; if binary → re-route)
Actuator 4: Vector Embedding
  ↓ (Call Ollama, store in Smart Connections)
Actuator 5: Semantic Classifier
  ↓ (Assign tags, topic)
Actuator 6: Vault Persistence
  ↓ (Write markdown, update status=Archived)
[Complete]
```

### Flow C: BINARY Input
```
Input Handler (BINARY payload)
  ↓ (INSERT document status=Processing, uri=file://...)
  ↓ (INSERT job type=ingest; enqueue job type=convert)
Actuator 3: Content Extraction
  ↓ (OCR/PDF extract, sanitize text, INSERT job_file)
  ↓ (If success → continue; if fail → archive as Failed)
Actuator 4: Vector Embedding
  ↓ (Call Ollama, store in Smart Connections)
Actuator 5: Semantic Classifier
  ↓ (Assign tags, topic)
Actuator 6: Vault Persistence
  ↓ (Write markdown, update status=Archived)
[Complete]
```

---

## Storage Archives

Persistent storage is defined by the [SQLite metadata schema](documets/design/schema.sql) and managed via [Story 13.1: Admin Database Inspector](documets/design/Project%204thBrain.md) (✓ COMPLETED, accessible at `/admin/db` in development mode).

| Archive | Purpose | Trigger | Retrieval |
|---|---|---|---|
| **Knowledge Vault** | Primary indexed knowledge base; all documents with valid embeddings and semantic tags. Obsidian-compatible Markdown + vector index (Smart Connections). See [Vault directory layout (ADR14)](documets/design/ADRS.md). | Successful embedding and classification. | Vector search, full-text search, tag filtering, manual vault browsing via Obsidian. |
| **Unindexed Notes Archive** | Secondary archive for documents that failed embedding generation but retain value as structured notes. Excludes vector embeddings. Tracked in `document` table with `classification_status = NULL`. | Embedding or LLM failure; insufficient content for embedding. | Full-text search, metadata search, manual review via admin panel; NOT available for semantic/vector retrieval. |
| **Raw Binary Archive** | Unprocessed binary documents that could not be extracted or decoded. Preserved in original format. Tracked in `document` table with failed extraction status. | Content extraction failure; unsupported or corrupted format. | Manual extraction by user via admin panel; flagged for format-specific recovery tools. |

## Error Handling & Resilience

The pipeline implements staged failure recovery:

1. **Extraction Failure** → Raw Binary Archive: Preserves original binary for later format-specific processing (e.g., manual OCR, specialized codec recovery).
2. **Embedding Failure** → Unindexed Notes Archive: Preserves text content for manual inspection and metadata-based search, excluding it from semantic retrieval until re-indexed.

Both failure modes preserve document integrity and prevent data loss, while maintaining visibility into which stage failed and why.

## Processing Flow & Latency

- **Immediate (synchronous):** Ingestion, routing, extraction, embedding (if LLM available), classification — typically seconds to minutes depending on document size and LLM load. Managed by [EP1 (Ingestion)](documets/design/Project%204thBrain.md) and [EP3 (Vector Indexing)](documets/design/Project%204thBrain.md).
- **Batch (overnight/background):** Daily briefing generation ([EP5](documets/design/Project%204thBrain.md)), bulk re-tagging, vault backups, and any re-indexing or sanitization of archived documents — scheduled via [EP4: Overnight Batch Processing](documets/design/Project%204thBrain.md). See [Story 4.1](documets/design/Project%204thBrain.md).

## Integration Points

- **Local LLM (Ollama):** Used for vector embedding generation and optional semantic tag refinement. Managed by [EP7: System Infrastructure & Host Runtime](documets/design/Project%204thBrain.md) (WSL2 + Ollama + MCP server). See [ADR18: Persistence Technology](documets/design/adr18-persistence-tech.md) for embedding architecture.
- **Web Clipper:** Integrates with system clipboard and browser extensions for rapid URL capture. Part of [FR4: Accept URLs](documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md).
- **Obsidian Vault:** The vault is a standard Obsidian installation; users can browse, edit, and augment documents directly within Obsidian without requiring 4thBrain intermediation. Directory layout specified in [ADR14: Vault Directory Layout](documets/design/ADRS.md).
- **Web UI:** The ingestion form ([Story 6.1](documets/design/Project%204thBrain.md) — ✓ COMPLETED) presents a simplified upload interface. The admin panel ([Story 13.1](documets/design/Project%204thBrain.md) — ✓ COMPLETED, at `/admin/db`) provides table-level inspection of pipeline state and archive contents. See [EP6: Web UI — Ingestion Form, Search, Dashboard](documets/design/Project%204thBrain.md) and [EP13: Admin & Monitoring Tools](documets/design/Project%204thBrain.md).
- **SQLite Metadata Database:** Tracks document status, classification metadata, and job queue state. See [schema.sql](documets/design/schema.sql), [classes.md](documets/design/classes.md), and [ADR17: Brief Transaction Constraint](documets/design/ADRS.md).

## Design Principles

1. **Local-First & Offline-Capable:** All processing runs locally; no cloud APIs or remote dependencies except for explicit URL fetching. See [NFR1–NFR6: Runtime & Infrastructure](documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md) and [ADR18: Persistence Technology](documets/design/adr18-persistence-tech.md).
2. **Privacy by Architecture:** Vector embeddings and document content never leave the local machine; only user-generated briefings and queries leave the system. See [NFR7: Privacy & Data Handling](documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md) and [EP9: Security & Access Control](documets/design/Project%204thBrain.md).
3. **Resilient Failure Handling:** No content is lost; failed documents are archived and flagged for remediation. See error-path coverage in [FR1–FR6](documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md) Acceptance Criteria.
4. **Transparent Processing:** Users can inspect vault contents, archive contents, and tag assignments without requiring administrative access. Enabled by [Story 13.1: Admin Database Inspector](documets/design/Project%204thBrain.md).
5. **Integration with Obsidian:** The vault is a standard Obsidian installation, enabling direct editing and custom workflows alongside 4thBrain's automated processing. See [ADR14: Vault Directory Layout](documets/design/ADRS.md) and [FR8: Integrate with Obsidian](documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md).

## Related Documentation

**System Requirements & Scope**
- [SYSTEM-REQUIREMENTS-SPECIFICATION.md](documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md) — Functional (FR1–FR9) and non-functional requirements (NFR1–NFR12) with acceptance criteria.
- [PROJECT-SUMMARY.md](documets/PROJECT-SUMMARY.md) — Current project phase, completed/ready/WIP stories, key design docs.

**Epic & Story Definitions**
- [Project 4thBrain.md](documets/design/Project%204thBrain.md) — Canonical Epic (EP1–EP13) and Story text with acceptance criteria. See especially [EP1 (Ingestion & Sanitization)](documets/design/Project%204thBrain.md), [EP2 (Classification)](documets/design/Project%204thBrain.md), [EP3 (Vector Indexing)](documets/design/Project%204thBrain.md), [EP4 (Overnight Batch)](documets/design/Project%204thBrain.md), [EP6 (Web UI)](documets/design/Project%204thBrain.md), [EP12 (Structured Data)](documets/design/Project%204thBrain.md), [EP13 (Admin Tools)](documets/design/Project%204thBrain.md).
- [BACKLOG-TRACKER.md](documets/BACKLOG-TRACKER.md) — Per-story status (READY / WIP / COMPLETED) with dependencies and acceptance criteria.
- [Gantt Chart.md](documets/design/Gantt%20Chart.md) — Story-level day scheduling and dependency types.

**Architecture & Design**
- [ADRS.md](documets/design/ADRS.md) — Architectural decisions ADR1–ADR18, including [ADR14 (Vault Directory Layout)](documets/design/ADRS.md) and [ADR17 (Brief Transaction Constraint)](documets/design/ADRS.md).
- [adr18-persistence-tech.md](documets/design/adr18-persistence-tech.md) — Local-first persistence strategy (Smart Connections vector index, SQLite metadata DB).
- [adr16-component-placement.md](documets/design/adr16-component-placement.md) — Module ownership and cross-module dependencies.

**Data Model**
- [schema.sql](documets/design/schema.sql) — SQLite table definitions (7 tables: status, job_type, process, classification, document, job, job_document).
- [classes.md](documets/design/classes.md) — Data model documentation with entity relationships and field descriptions.

**Governance & Process**
- [DESIGN-DEBT.md](documets/DESIGN-DEBT.md) — Open design gaps and scope-lock decisions that require resolution before implementation.
- [.claude/rules/design-before-implementation.md](.claude/rules/design-before-implementation.md) — Policy requiring all code to trace to an Epic+Story and design artifact.
