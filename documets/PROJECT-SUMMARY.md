---
name: PROJECT-SUMMARY
description: Single-page current-state summary of 4thBrain — read this first instead of rescanning the repo
date: 2026-09-01
metadata:
  version: 2.1
  created-by: Claude Code
---

# 4thBrain — Project Summary

Read this file first. It points to the live sources of truth instead of duplicating them — update it, don't let it drift.

## What 4thBrain is

A privacy-first, locally hosted "second brain": captures notes/transcripts/links/documents/email/calendar, sanitizes and classifies everything overnight via a local LLM (Ollama/WSL2, zero cloud calls), indexes into an Obsidian-compatible Markdown vault + local vector DB (Smart Connections), and proactively surfaces daily briefings and relevant notes.

## Lifecycle phase (per `documets/method/Software Documentation Summary and Framework.md`)

Phases 1–4 (Requirements → Formalization → Scope Lock → Epic Creation) are complete. Phase 5 (Story Creation / Dev / Release) is **in progress** — several stories are implemented despite `documets/PLAN.md` still saying "all Stories = To Do" (that file is stale; trust `documets/BACKLOG-TRACKER.md` instead).

## Current story status (source: `documets/BACKLOG-TRACKER.md`, 2026-09-01)

**COMPLETED**
- 3.2 — Smart Connections indexing-status spike
- 6.4 — Common UI Shell & Design System
- 6.1 — Web Ingestion Form & Submission Handler (see 2026-08-30 note below — its backend dependency, Bug 2, was only fixed this pass)
- 7.1 — WSL2 Runtime & Resource Bound Configuration (Ollama systemd service enabled and running; `.wslconfig` memory cap verified through restart cycle; port forwarding from Windows to WSL2 verified working; concurrency gate generalized across all Ollama callers)
- 7.3, 7.4, 7.5 — SQLite setup, schema DDL, seed data
- 12.1 — DB schema design (`documets/design/schema.sql`, `classes.md`)
- 13.1 — Database Inspector / Admin panel (`server/routes/admin-db.js`, `/admin/db`, dev-mode protected)
- 13.3 — Unified Data-Access API (`server/lib/repositories/`, `/api/tables`, `/api/docs`)
- 1.1 — Direct Structured Vault Ingestion (`server/lib/ingestion/{file-validator,path-resolver,vault-writer,ingest-executor,watcher}.js`; 105-test suite passes) — verified 2026-08-30 against the real native-Windows environment (real `params.json` paths, real dropped files, real `/api/ingest/file` submission, real `/api/tables/*` rows)
- 1.2 — Unstructured Text Parsing & Sanitization (HTML/web-clip via `html-sanitize-executor.js` using Playwright+Readability+jsdom+Turndown per spike-webclipping; PDF via OpenDataLoader PDF per ADR19; `.docx` via `mammoth`; all sanitization code implemented and wired into job executor dispatch)
- 2.1 — Local LLM Metadata & Tag Inference (`server/lib/ingestion/classification-executor.js` connects to Ollama, infers tags and topic/subtopic, files notes to final vault location, links tags via document_tag table; 8 passing tests)
- 6.5 — Chat with Llama — Local Ollama Chat Panel (real Ollama wiring via OpenAI SDK; error handling for unreachable service; mock-badge removed from UI)
- 9.1 — Local-Only Access Enforcement & Auth Guard (server binds to 127.0.0.1 instead of 0.0.0.0; IP-based access control middleware added to protect sensitive endpoints)
- 11.1 — Release Packaging & Versioning (VERSION file, CHANGELOG.md, RELEASE.md with SemVer versioning scheme, release workflow, and rollback procedures)
- 14.1 — Intel iGPU Acceleration via IPEX-LLM (IPEX-LLM Ollama binary at `/opt/ollama-ipex-llm/`, systemd auto-start verified, Windows→WSL2 port forwarding tested, GPU detection confirmed, service persists across WSL2 restart cycle)

**WIP**
- 4.1 — Background Sweep & Queue Execution Script (`batch/`, 18 tests; one-sweep-per-invocation, scheduling not exercised)

**READY (not started)** — 3.1, 5.1, 6.2, 6.3, 7.2, 8.1, 8.2, 10.1

*13.3 was code-complete since commit `67e7d64` but untracked here until 2026-08-30, when two bugs found in a fresh audit (`document_tag` leaking into the generic `/api/tables/:table` dispatcher; an unbound query parameter in `documentTag.js`) were fixed and it was formally closed out.*

## Epics (EP1–EP13, see `documets/design/Project 4thBrain.md`)

EP7 (Infrastructure/WSL2/Ollama) is the foundation gating almost everything. EP1 (Ingestion) → EP2 (Classification)/EP3 (Indexing) → EP4 (Batch) → EP5 (Briefing). EP6 (Web UI) depends on EP1/EP3/EP4. EP8–EP13 are cross-cutting additions (QA, Security, Backup, Release, DB schema, DB admin/inspector).

## Governing rules

- `.claude/rules/design-before-implementation.md` — no code without a traced Epic+Story and a design artifact (ADR/schema/class def) to implement from. Gaps get logged to `documets/DESIGN-DEBT.md`, not implemented around.
- `documets/DESIGN-DEBT.md` — currently empty (created 2026-08-27, no entries yet).

## Key design docs

- `documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md` — FR1–FR9, NFR1–NFR12
- `documets/design/Project 4thBrain.md` — canonical Epic/Story text
- `documets/design/ADRS.md` + `adr16-component-placement.md`, `adr18-persistence-tech.md` — architecture decisions (ADR17 = brief-transaction constraint on SQLite; ADR14 = vault directory layout referenced by Stories 1.1/1.2; ADR19 = OpenDataLoader PDF as the PDF extraction library, Story 1.2)
- `documets/design/classes.md`, `database-schema.md`, `schema.sql` — data model (7 tables: status, job_type, process, classification, document, job, job_document)
- `documets/design/Gantt Chart.md` — story schedule/dependencies

## Module map

| Module | Owns | Depends on |
| --- | --- | --- |
| `vault/` | EP3 (indexing/MCP), EP10 (backup) | `local-llm/` |
| `local-llm/` | EP7 (WSL2/Ollama/MCP host), EP11 (release) | none |
| `ui/` | EP6 (web UI/auth) | `ingestor-classification/`, `vault/`, `batch/`, `local-llm/` |
| `ingestor-classification/` | EP1 (ingestion), EP2 (tagging) | `local-llm/`, `vault/` |
| `batch/` | EP4 (batch), EP5 (briefing), EP8 (QA) | `ingestor-classification/`, `local-llm/`, `vault/` |

## Data & Infrastructure

**SQLite Metadata Database**
- **Location:** `server/4thbrain-metadata.db`
- **Type:** SQLite 3
- **Tables (9):** status, job_type, job_status, classification, document, tag, document_tag, job, job_file (see `documets/design/schema.sql`). Note: Story 12.2 redesigned the schema; `process` and `job_document` tables were removed.
- **Access:** Node.js via `node:sqlite`, Python via `sqlite3` stdlib
- **Critical constraint (ADR17):** Keep all transactions brief — long-running transactions serialize concurrent access and block Python/Node.js peers. Prefer many short transactions over one large one.
- **Development tools:** Admin panel at `http://localhost:3000/admin/db` (dev-mode protected, Story 13.1) for table browsing, filtering, editing, and schema inspection. Reset script: `scripts/reset-dev-db.ps1` (backs up to `../../.backup/` before dropping all tables).

**Smart Connections Vector Index**
- **Location:** `$VAULT_DIR/.smart-env` (Obsidian vault, not this repository)
- **Key finding (Spike 3.2):** Live diagnostics available via Obsidian "Smart Environment" panel; source-level indexing tracked in `smart_sources/smart_sources.ajson`; block-level indexing lower (test vault: 720/1045 blocks skipped vs. 1/31 sources). Status-check utility: `vault/check_smart_connections_status.py`.

## Open items / known gaps

- Proposed NFR13 (Auth & Local Access Control) and NFR14 (Backup & Recovery) not yet formally scope-locked — EP9/EP10 inherit acceptance criteria from these pending items.
- `documets/PLAN.md` is stale (dated 2026-08-24, predates the completed stories above) — don't treat it as current state; this file supersedes it for status purposes.
- Email/Calendar OAuth handling and onboarding/first-run config UX flagged as lower-confidence scope gaps, not yet epics.
- `documets/design/classes.mmd` and rendered `classes.png` still describe the pre-Story-12.2 schema shape with 7 tables (process, job_document removed; tag/document_tag/job_status added). Updated in Story 12.2 but backpropagation to diagram pending (Task-4, in progress 2026-09-01).
- Story 6.1's ingestion path (`server/lib/ingest-service.js`) was silently broken from 2026-08-28 (the Story 12.2 schema redesign) until 2026-08-30 — the repository layer referenced columns the redesign had removed. Fixed as Bug 2; see `documets/bugs/Bug-2-Repository-Layer-Schema-Mismatch.md`. Worth an actual smoke test against the live server next time a schema change lands, not just a doc backpropagation pass.

## Working preferences (from user feedback memory)

- Build one story at a time; stub/mock anything belonging to a not-yet-built story rather than building ahead.

## Changelog

- **2026-09-01 (backlog loop pass 5)** — Completed Story 14.1 (Intel iGPU Acceleration via IPEX-LLM). IPEX-LLM Ollama binary confirmed at `/opt/ollama-ipex-llm/`, systemd unit `ollama.service` configured to run `/opt/ollama-ipex-llm/start-ollama.sh` with GPU environment variables. Service auto-starts on WSL2 boot, reports "using Intel GPU" in logs. Verified: Windows→WSL2 port forwarding works (curl from PowerShell reached Ollama, model `llama3.2:3b` returned); service persists across `wsl --shutdown` + restart cycle (confirmed active 838ms post-reboot). All 5 AC met. Bumped version to 2.1.
- **2026-09-01 (backlog loop pass 4)** — Completed Story 11.1 (Release Packaging & Versioning). Created `VERSION` file, `CHANGELOG.md` (Keep a Changelog format documenting 13 shipped Stories + 1 spike), and `RELEASE.md` (SemVer versioning scheme, release workflow, rollback procedures via git tags + database restoration, backup strategy, checklists). Story 11.1 AC met: version tags track releases, changelog maps Stories/Bugs to versions, rollback documented. Created working notes. Bumped version to 2.0.
- **2026-09-01 (backlog loop passes 2–3)** — Completed Stories 6.5 (Chat with Llama — real Ollama wiring) and 9.1 (Local-Only Access Enforcement). Story 6.5: replaced mock canned-reply handler with real Ollama chat call via OpenAI SDK; error handling for unreachable service; removed mock-badge and mocked subtitle from UI. Story 9.1: changed `params.json` `server_bind_host` from `"0.0.0.0"` to `"127.0.0.1"`; created `server/middleware/local-only.js` IP-based access control; applied middleware to all sensitive routes (`/api/ingest/*`, `/api/status`, `/api/chat/llama`, `/admin/*`, `/api/tables/*`, `/api/docs`). Both stories have working notes. Updated BACKLOG-TRACKER summary table, detail sections, and this file. Created Story 6.5 and 9.1 working notes. Bumped version to 1.9.
- 2026-09-01: Story 7.1 moved WIP → COMPLETED. (1) Enabled Fedora's native `ollama.service` via systemd inside WSL2; service is active immediately after enable and persists across `wsl --shutdown` + restart cycles. (2) Verified `.wslconfig` memory cap (16GB) takes effect after restart. (3) Tested Windows→WSL2 port forwarding via `curl.exe http://localhost:11434/api/tags` from native PowerShell — Ollama API reachable with `llama3.2:3b` model available. (4) GPU acceleration (IPEX-LLM permanent install) deferred to Story 14.1 (Epic 14). Updated Story 7.1 working notes and moved 7.2 to actively READY (no longer blocked). Bumped version to 1.8.
- 2026-09-01: Backlog loop pass 3 — Story 1.2 detail section status corrected from WIP to COMPLETED (HTML/web-clip sanitization executor implemented and wired 2026-08-31). Task-4 (backpropagate Story 12.2) progressed: params.json directory keys added, tables description corrected (7→9 tables), open-gap note updated. Data & Infrastructure section now lists correct 9 tables (added tag, document_tag, job_status; removed process, job_document per Story 12.2 redesign). Bumped version to 1.7.
- 2026-08-31 (1812 UTC): Story 7.1 progress — `.wslconfig` written with 16GB memory cap; concurrency gate generalized (`server/lib/ollama-concurrency-gate.js`); IPEX-LLM permanent install blocked on architecture decision (`spike-ollama-permanent-install.md`). Bumped version to 1.6.
- 2026-08-31: Story 7.1 moved READY → WIP after a GPU-acceleration spike (`documets/story/spike-gpu-ollama.md`) confirmed real Intel iGPU offload works inside this host's actual WSL2 guest — previous sessions' "no WSL2 host available" caveat no longer holds; this session had live WSL2/Ollama access and used it. Fedora's natively-packaged `intel-compute-runtime`/`intel-level-zero` plus Intel's IPEX-LLM Ollama build achieved verified full offload (29/29 layers, live inference test). Not COMPLETED — the working build is a spike artifact, not yet a permanent systemd-managed install; `.wslconfig` and the generalized Ollama-call concurrency gate remain open. Next step defined in `documets/PLAN-31-08-2026-EP7-Completion.md`.
- 2026-08-31: Story 1.1 moved WIP → COMPLETED after a real-environment verification pass (server started natively against real `params.json` paths; watcher/executor/web-form/dedup/API checks all passed; UNC-timing risk did not materialize since `raw_dir` is a plain local NTFS path). Found and fixed a real wiring gap in the same pass: `server/index.js` never called `createWatcher()`, so the fully-tested watcher module was dead code in production — fixed with a 2-line addition.
- 2026-08-31: Story 1.2 moved READY → WIP (its 2026-08-30 implementation, `server/lib/ingestion/transcode-executor.js`/`url-relocator.js`, was never reflected here — this file and BACKLOG-TRACKER both still showed READY/no-code). Same pass swapped the PDF extraction library `pdf-parse` → OpenDataLoader PDF (`@opendataloader/pdf`) per new ADR19, verified live against a real Java 11 CLI invocation. Not COMPLETED: HTML/web-clip sanitization is unimplemented (`text/html` bypasses this story's code via Story 1.1's direct-copy path) — the `spike-webclipping` design work is done (recommends Playwright + Readability + Turndown), but the sanitization code itself hasn't been built.
- 2026-08-30: Stories 1.1 and 4.1 moved READY → WIP (implemented and tested, not run against the real WSL2/Windows target — this session had no WSL2 host available). Fixed Bug 2 (repository layer out of sync with the Story 12.2 schema redesign) as a prerequisite; noted as a new open gap above. Implemented both stories together in one pass at the user's explicit request, a deliberate exception to the "build one story at a time" working preference below — they share the same job-queue plumbing and the two are meant to be invoked together (4.1's worker calls 1.1's executor).
- 2026-08-27: Added "Data & Infrastructure" section documenting SQLite location, tables, constraints (ADR17), and Smart Connections findings from Spike 3.2.
- 2026-08-27: Created as the canonical quick-reference summary, sourced from PLAN.md, BACKLOG-TRACKER.md, DESIGN-DEBT.md, and recent commit history.
