# Changelog

All notable changes to 4thBrain are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-09-01

### Added

- **Story 1.1** — Direct Structured Vault Ingestion: Watch `$RAW_DIR/inbox` for incoming Markdown/text/HTML files and copy to `$VAULT_DIR/incoming` without transformation. Watcher module tested and wired into server runtime.
- **Story 1.2** — Unstructured Text Parsing & Sanitization: Parse and transcode PDF (via OpenDataLoader), DOCX (via mammoth), and HTML/web-clips (via Playwright+Readability+jsdom+Turndown) into clean Markdown. Archive originals to `$VAULT_DIR/raw`.
- **Story 6.1** — Web Ingestion Form & Submission Handler: Node.js `/chat` UI with forms for file upload, text entry, and URL submission. All submissions create pipeline jobs via the ingestion API.
- **Story 6.4** — Common UI Shell & Design System: Persistent app shell (sidebar nav, status bar, main content area) with light/dark theme support, Claude.ai-inspired visual language.
- **Story 6.5** — Chat with Llama — Local Ollama Chat Panel: Real-time chat with local Ollama instance via OpenAI SDK. Conversation history preserved across turns. Error handling for unreachable Ollama.
- **Story 7.1** — WSL2 Runtime & Resource Bound Configuration: Ollama systemd service enabled and running inside WSL2. Memory cap configured via `.wslconfig` (16GB). Concurrency gate generalized across all Ollama callers to prevent memory overload.
- **Story 7.3** — SQLite Database Setup for Processing-State Persistence: Node.js `node:sqlite` driver installed and database initialized at `server/4thbrain-metadata.db`. Cross-language smoke test (Node.js/Python) passed.
- **Story 7.4** — Create Database Schema from DDL: All tables created from `documets/design/schema.sql` with correct types, constraints, and indexes. PRAGMA validation passed.
- **Story 7.5** — Seed Constants & Enumerations: status, job_type, and job_status reference tables seeded with deterministic values. All rows queryable and validated.
- **Story 9.1** — Local-Only Access Enforcement & Auth Guard: Server binds to 127.0.0.1 (localhost) by default. IP-based middleware (`server/middleware/local-only.js`) protects all sensitive API endpoints (`/api/*`, `/admin/*`) from non-local access.
- **Story 12.1** — Document/Status/Classification/Job Database Schema Design: Schema designed and documented in `documets/design/schema.sql` and `classes.md`. 9 tables covering document metadata, job lifecycle, and classification hierarchy.
- **Story 12.2** — Schema Redesign: Schema corrected and re-baselined with natural keys on status/job_type/tag, classification as global name-keyed identity, new job_status lookup table, and document_tag link table. All FK types and indices validated.
- **Story 13.1** — Database Inspector — Table Browser & Admin Panel: Dev-only `/admin/db` UI for table browsing, filtering, sorting, pagination, CRUD operations, and database health stats.
- **Story 13.2** — Remove Embedded Admin Panel, Add Root Redirect and Standalone Admin Menu: Root path redirects to `/chat`. Embedded admin panel removed from `/chat`. Standalone `/admin` dev-only menu links to database inspector and API docs.
- **Story 13.3** — Unified Data-Access API: Repository layer with per-table validation (`server/lib/repositories/*`). REST API at `/api/tables/*` with OpenAPI spec. Interactive docs at `/api/docs` via Scalar.
- **Spike 3.2** — Smart Connections Indexing Status Retrieval: Python utility script (`vault/check_smart_connections_status.py`) reports indexed/pending/failed counts and per-note status. Verified against live vault.

### Infrastructure & Testing

- 105+ automated tests across server ingestion, repositories, watcher, and admin routes
- 18 tests for background batch processing (job queue, job executor, cleanup)
- Structured JSON logging throughout (server, batch worker)

### Known Limitations

- Story 2.1 (Classification) — WIP, not yet shipping (awaiting LLM prompt design and implementation)
- Story 3.1 (Vector Indexing) — READY, blocked on Story 7.2 (MCP server setup not yet implemented)
- Story 4.1 (Background Sweep) — WIP, tested but not exercised against real WSL2/Ollama environment
- Story 6.2 (Search) — not yet started (depends on Story 3.1)
- Story 6.3 (Monitoring Dashboard) — READY but contains placeholder "No error detail persisted" message for failed jobs (missing job.error_message schema column; logged as Design Debt #5)
- Story 7.2 (Process Lifecycle & MCP Server Setup) — not yet started (depends on WSL2 shell access for systemd/PM2 configuration)
- Story 8.1 (Test Harness) — READY but needs formal specification (105+ tests exist but no consolidated regression suite)

### Security & Privacy

- All operations are local only — zero cloud API calls (no outbound HTTPS to external services)
- WSL2 process lifecycle and memory boundaries enforced
- SQLite metadata database is local-only, accessible via localhost-bound Node.js server
- IP-based access control restricts API endpoints to 127.0.0.1

---

## Release Process

See `RELEASE.md` for detailed versioning and rollback procedures.

### Versioning Scheme

Follows [Semantic Versioning 2.0.0](https://semver.org/):
- **MAJOR** — Breaking changes to vault directory structure, database schema, or API
- **MINOR** — New features (completed Stories), non-breaking changes
- **PATCH** — Bug fixes, documentation updates

### Tagging & Rollback

- Each release is tagged as `v{MAJOR}.{MINOR}.{PATCH}` in git
- Previous release version is always accessible via git checkout
- Database schema migrations (if any) are documented in release notes and must be applied before rolling back
