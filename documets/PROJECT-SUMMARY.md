---
name: PROJECT-SUMMARY
description: Single-page current-state summary of 4thBrain — read this first instead of rescanning the repo
date: 2026-08-30
metadata:
  version: 1.2
  created-by: Claude Code
---

# 4thBrain — Project Summary

Read this file first. It points to the live sources of truth instead of duplicating them — update it, don't let it drift.

## What 4thBrain is

A privacy-first, locally hosted "second brain": captures notes/transcripts/links/documents/email/calendar, sanitizes and classifies everything overnight via a local LLM (Ollama/WSL2, zero cloud calls), indexes into an Obsidian-compatible Markdown vault + local vector DB (Smart Connections), and proactively surfaces daily briefings and relevant notes.

## Lifecycle phase (per `documets/method/Software Documentation Summary and Framework.md`)

Phases 1–4 (Requirements → Formalization → Scope Lock → Epic Creation) are complete. Phase 5 (Story Creation / Dev / Release) is **in progress** — several stories are implemented despite `documets/PLAN.md` still saying "all Stories = To Do" (that file is stale; trust `documets/BACKLOG-TRACKER.md` instead).

## Current story status (source: `documets/BACKLOG-TRACKER.md`, 2026-08-30)

**COMPLETED**
- 3.2 — Smart Connections indexing-status spike
- 6.4 — Common UI Shell & Design System
- 6.1 — Web Ingestion Form & Submission Handler (see 2026-08-30 note below — its backend dependency, Bug 2, was only fixed this pass)
- 7.3, 7.4, 7.5 — SQLite setup, schema DDL, seed data
- 12.1 — DB schema design (`documets/design/schema.sql`, `classes.md`)
- 13.1 — Database Inspector / Admin panel (`server/routes/admin-db.js`, `/admin/db`, dev-mode protected)

**WIP**
- 1.1 — Direct Structured Vault Ingestion (`server/lib/ingestion/`, 32 tests; not run against the real WSL2/Windows target)
- 4.1 — Background Sweep & Queue Execution Script (`batch/`, 18 tests; one-sweep-per-invocation, scheduling not exercised)

**READY (not started)** — 1.2, 2.1, 3.1, 5.1, 6.2, 6.3, 7.1, 7.2, 8.1, 8.2, 9.1, 10.1, 11.1, 13.2 (mobile UI review)

## Epics (EP1–EP13, see `documets/design/Project 4thBrain.md`)

EP7 (Infrastructure/WSL2/Ollama) is the foundation gating almost everything. EP1 (Ingestion) → EP2 (Classification)/EP3 (Indexing) → EP4 (Batch) → EP5 (Briefing). EP6 (Web UI) depends on EP1/EP3/EP4. EP8–EP13 are cross-cutting additions (QA, Security, Backup, Release, DB schema, DB admin/inspector).

## Governing rules

- `.claude/rules/design-before-implementation.md` — no code without a traced Epic+Story and a design artifact (ADR/schema/class def) to implement from. Gaps get logged to `documets/DESIGN-DEBT.md`, not implemented around.
- `documets/DESIGN-DEBT.md` — currently empty (created 2026-08-27, no entries yet).

## Key design docs

- `documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md` — FR1–FR9, NFR1–NFR12
- `documets/design/Project 4thBrain.md` — canonical Epic/Story text
- `documets/design/ADRS.md` + `adr16-component-placement.md`, `adr18-persistence-tech.md` — architecture decisions (ADR17 = brief-transaction constraint on SQLite; ADR14 = vault directory layout referenced by Stories 1.1/1.2)
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
- **Tables (7):** status, job_type, process, classification, document, job, job_document (see `documets/design/schema.sql`)
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
- `documets/design/classes.mmd`/`classes.png` and `documets/design/database-schema.md` still describe the pre-Story-12.2 schema shape (documented gap from 2026-08-28, still open as of 2026-08-30 — see BACKLOG-TRACKER's "Follow-up Tasks").
- Story 6.1's ingestion path (`server/lib/ingest-service.js`) was silently broken from 2026-08-28 (the Story 12.2 schema redesign) until 2026-08-30 — the repository layer referenced columns the redesign had removed. Fixed as Bug 2; see `documets/bugs/Bug-2-Repository-Layer-Schema-Mismatch.md`. Worth an actual smoke test against the live server next time a schema change lands, not just a doc backpropagation pass.

## Working preferences (from user feedback memory)

- Build one story at a time; stub/mock anything belonging to a not-yet-built story rather than building ahead.

## Changelog

- 2026-08-30: Stories 1.1 and 4.1 moved READY → WIP (implemented and tested, not run against the real WSL2/Windows target — this session had no WSL2 host available). Fixed Bug 2 (repository layer out of sync with the Story 12.2 schema redesign) as a prerequisite; noted as a new open gap above. Implemented both stories together in one pass at the user's explicit request, a deliberate exception to the "build one story at a time" working preference below — they share the same job-queue plumbing and the two are meant to be invoked together (4.1's worker calls 1.1's executor).
- 2026-08-27: Added "Data & Infrastructure" section documenting SQLite location, tables, constraints (ADR17), and Smart Connections findings from Spike 3.2.
- 2026-08-27: Created as the canonical quick-reference summary, sourced from PLAN.md, BACKLOG-TRACKER.md, DESIGN-DEBT.md, and recent commit history.
