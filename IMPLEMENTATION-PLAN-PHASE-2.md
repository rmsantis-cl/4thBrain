---
name: IMPLEMENTATION-PLAN-PHASE-2
description: Phase 2 Implementation Plan - Un-mock monitoring (6.3), API layer (13.3), web clipping (1.2); defer auth
metadata:
  version: 1.0
  created-by: Claude Code
  date: 2026-08-29
---

# Phase 2 Implementation Plan

**Scope:** Replace mocked UI monitoring with real Smart Connections status; complete API layer; implement web clipping for URLs; defer auth work.

**Current State:** 12 tests passing, 22 failing. Core infrastructure built (DB, forms, shell); missing: monitoring display, API validation layer, URL extraction.

---

## Priority Order

### 1️⃣ Story 6.3: Pipeline Monitoring & Dashboard UI (REAL Smart Connections Status)

**Status:** READY (no blockers)  
**Epic:** EP6 (Web UI)  
**Dependencies:** Story 4.1 ⏳, Story 6.4 ✅

**What to replace:**
- `server/routes/status.js` (canned MOCK_STATUS) → real call to `server/lib/smart-connections-status.js`
- `POST /api/status` returns hardcoded mock data → queries actual vault/.smart-env

**Acceptance Criteria:**
- [ ] `POST /api/status` returns live Smart Connections indexing status (sources/blocks totals, skipped list)
- [ ] Status panel displays accurate job counts (active, pending, failed) from SQLite jobs table
- [ ] "Refresh" button fetches latest status and updates panel without reload
- [ ] Failed jobs show error reason; "Retry" button re-queues failed job
- [ ] Tests pass: `mocked-panels.spec.js:5` (status panel), `core.spec.js:37` (panel nav)

**Implementation:**
1. Create `server/lib/smart-connections-status.js` — query Smart Connections status
   - Read `$VAULT_DIR/.smart-env/smart_sources/smart_sources.ajson`
   - Count sources: total, current, missing, skipped, unexpected
   - Return list of skipped sources with skip reason
   
2. Update `server/routes/status.js` to call the real status function

3. Update client-side panel (`server/ui/client.js`) to display real job queue counts from SQLite
   - Query `SELECT status, COUNT(*) FROM job GROUP BY status`
   - Display active/pending/failed counts

4. Ensure tests pass

**Effort:** ~2–3 hours

---

### 2️⃣ Story 13.3: Unified Data-Access API (Repository Layer + REST API)

**Status:** READY (no blockers)  
**Epic:** EP13 (Admin & Monitoring)  
**Dependencies:** Story 12.2 ✅, Story 6.4 ✅, Story 13.1 ✅, Story 6.1 ✅

**What to replace:**
- `admin-db.js`'s generic PRAGMA-reflected CRUD → explicit per-table validated repositories
- `ingest-service.js`'s raw `db.prepare()` calls → repository layer calls
- No OpenAPI/Scalar UI yet — endpoint definitions only

**Acceptance Criteria:**
- [ ] `server/lib/repositories/` exposes validated `list/get/create/update/remove` per table
  - `documentRepository`
  - `jobRepository`
  - `statusRepository`
  - `jobTypeRepository`
  - `classificationRepository`
  - `tagRepository`
  - `jobFileRepository`
- [ ] `/api/tables/{table}/{id}` REST routes call repository layer; no SQL in routes
- [ ] `ingest-service.js` contains no direct `db.prepare()` — uses repositories instead
- [ ] Tag updates set `end_date` instead of deleting
- [ ] `admin-db.js` refactored to use repository layer instead of raw PRAGMA queries
- [ ] Tests pass: `admin.spec.js:91` (admin DB CRUD), `api-docs.spec.js:31` (openapi.json serves valid schema)

**Implementation:**
1. Design repository layer (validation rules, per-table concerns)
   - Each repository has `list(filter), get(id), create(data), update(id, data), remove(id)`
   - Business rules: tag soft-delete (set end_date), no pk renames, etc.

2. Implement `server/lib/repositories/` directory
   - `documentRepository.js` — queries document table
   - `jobRepository.js` — queries job table, handles job_file linked data
   - `statusRepository.js` — reference lookup, read-only
   - `jobTypeRepository.js` — reference lookup, read-only
   - `classificationRepository.js` — topic/subtopic lookup
   - `tagRepository.js` — handle soft-delete via end_date
   - `jobFileRepository.js` — file tracking for jobs

3. Create `/api/tables/*` routes
   - `GET /api/tables/{table}` — list with filters
   - `GET /api/tables/{table}/{id}` — single record
   - `POST /api/tables/{table}` — create
   - `PUT /api/tables/{table}/{id}` — update
   - `DELETE /api/tables/{table}/{id}` — delete

4. Refactor `admin-db.js` to use repositories

5. Refactor `ingest-service.js` to use repositories

6. Create `/api/docs` endpoint serving a basic OpenAPI spec (static for now)
   - List all `/api/tables/*` endpoints
   - Scalar UI to render it

7. Ensure tests pass

**Effort:** ~4–5 hours

---

### 3️⃣ Story 1.2: Unstructured Text Parsing & Sanitization (Web Clipping)

**Status:** READY (design deferred, shipping Phase 2 mock anyway)  
**Epic:** EP1 (Ingestion)  
**Dependencies:** Story 1.1 ✅ (direct ingestion)

**What to replace:**
- `handleMockClipper()` in `server/lib/job-queue/handlers/ingest.js` → real web clipper
- MOCK_HTML_WITH_IMAGES, MOCK_PDF_URL_TEXT → actual extracted content

**Design Decision Required (Deferred):**
- Which library for URL fetching (jsdom, cheerio, puppeteer)?
- Spike spike-webclipping.md not yet started; shipping mock now

**Acceptance Criteria:**
- [ ] URLs submitted via form land in `$RAW_DIR/clipping` (not vault yet)
- [ ] Ingest handler detects URL origin and extracts content
- [ ] Extracted HTML is sanitized to clean text/Markdown
- [ ] Extracted content preserves semantic structure (headers, paragraphs, links)
- [ ] Tests pass: `ingestion.spec.js:74` (URL ingestion creates job)
- [ ] Job queue processes URL → extracted text lands in `$VAULT_DIR/incoming`

**Implementation:**
1. Keep mock Clipper for now (fixture-based testing)
2. Document spike: spike-webclipping.md
   - Evaluate: jsdom vs. cheerio vs. puppeteer
   - Decision criteria: simplicity, CPU overhead, feature completeness
3. Prepare real Clipper stub (no-op for Phase 2)
4. Ensure ingest handler routing works for URLs
5. Verify test passes

**Effort:** ~1–2 hours (mock only; real clipper blocked on spike decision)

---

## Open Stories by Area

### Ingestion (EP1)

| ID | Story | Status | Dependencies | Effort |
|---|---|---|---|---|
| 1.1 | Direct Structured Vault Ingestion | **READY** | 7.1 ✅, 7.2 ✅ | Medium |
| 1.2 | Unstructured Text Parsing & Sanitization | **READY** | 1.1 ✅ | Medium (clipper spike deferred) |

**Gap:** Clipper library choice (spike spike-webclipping.md) not yet made. Shipping Phase 2 with mock.

---

### Indexing (EP3)

| ID | Story | Status | Dependencies | Effort |
|---|---|---|---|---|
| 3.1 | Smart Connections Vector Indexing Pipeline | **READY** | 1.1 ✅, 7.2 ✅ | Medium |
| 3.2 | Smart Connections Indexing Status Retrieval (Spike) | **COMPLETED** | 3.1 ✅ | — |

**Deliverable from 3.2:** `vault/check_smart_connections_status.py` (already exists; used by Story 6.3 in Phase 2).

---

### UI (EP6)

| ID | Story | Status | Dependencies | Effort | Phase 2? |
|---|---|---|---|---|---|
| 6.1 | Web Ingestion Form & Submission Handler | **WORKING** | 1.1 ✅, 6.4 ✅ | — | ✅ in this phase (API layer wires it) |
| 6.2 | Hybrid Keyword & Semantic Search Interface | **READY** | 3.1 ⏳, 6.4 ✅ | Medium | Next phase |
| 6.3 | Pipeline Monitoring & Dashboard UI | **READY** | 4.1 ⏳, 6.4 ✅ | Medium | **✅ This phase (replace mock)** |
| 6.4 | Common UI Shell & Design System | **COMPLETED** | none | — | — |

**Note:** Story 6.3 unblocks Stories 6.2 (search), 4.1 (batch processing), 5.1 (briefing) when implemented.

---

## Blockers & Deferred Work

### Deferred: Story 9.1 (Auth Guard)
- **Reason:** Not required for Phase 2 scope (monitoring, API, clipping)
- **When to add:** Before release (Story 11.1)
- **Current state:** Dev-only checks via `NODE_ENV === 'development'` sufficient for dev

### Blocked: Story 4.1 (Background Batch Processing)
- **Why:** Required by Story 6.3 to display real job counts
- **Action:** Implement Story 6.3 to display jobs, then Story 4.1 to consume them
- **Next phase:** Stories 4.1, 5.1 (briefing synthesis) can follow once 6.3 ships

### Blocked: Story 3.1 (Vector Indexing)
- **Why:** Required to make Smart Connections status meaningful
- **Note:** Spike 3.2 (status retrieval) completed; 3.1 implementation separate

---

## Testing Strategy

**Phase 2 target:** Get 22+ of 34 tests passing (up from 12).

### Expected Pass After Story 6.3
- ✅ `mocked-panels.spec.js:5` (status panel displays real data)
- ✅ `core.spec.js:37` (panel navigation)

### Expected Pass After Story 13.3
- ✅ `admin.spec.js:91` (admin DB CRUD via API layer)
- ✅ `api-docs.spec.js:31` (OpenAPI schema valid)

### Expected Pass After Story 1.2
- ✅ `ingestion.spec.js:74` (URL ingestion creates job)

### Still Failing (Correct — Not in Phase 2 Scope)
- ❌ Dev-gating tests (Story 9.1 — auth, deferred)
- ❌ Mobile responsiveness (Story 13.2 — deferred)
- ❌ LLM chat (Story 6.5 — not in backlog yet)

---

## Effort & Timeline

| Story | Effort | Blocker For | Sequence |
|---|---|---|---|
| 6.3 | 2–3 hrs | 4.1, 5.1, 6.2 | Start immediately |
| 13.3 | 4–5 hrs | Production use | Start after 6.3 passes tests |
| 1.2 | 1–2 hrs | Phase 3 (real clipper) | Start in parallel with 6.3 |

**Total Phase 2:** ~8–10 hours (can run 6.3 + 1.2 in parallel, then 13.3 sequentially).

---

## Changelog

- 2026-08-29: Created Phase 2 plan — un-mock 6.3, ship 13.3, defer 1.2 real clipper, defer auth.
