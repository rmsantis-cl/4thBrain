# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**4thBrain** (a.k.a. the Personal Knowledge & Executive Assistant System) has moved past the pure design/requirements phase — Phase 5 (Story Creation / Dev / Release) is underway, and the repository now holds real application code (`server/`, an Express + `node:sqlite` app implementing the Web UI and ingestion API), alongside the requirements/design artifacts that govern it and the Claude Code automation framework (skills, rules) used to drive the process.

**Read `documets/PROJECT-SUMMARY.md` first, every session.** It's the single current-state source of truth (phase status, story completion, epics, key docs, open gaps) — this file intentionally does not duplicate that status, since duplicated status is exactly what goes stale. `documets/design/CLAUDE.md` already enforces this for the design directory; treat it as true for the whole repo.

The target system being designed: a privacy-first, locally hosted "second brain" that captures unstructured ideas, voice-to-text transcripts, links, documents, and email/calendar feeds; sanitizes, classifies, and indexes everything overnight via a local LLM into a human-readable Obsidian-compatible Markdown vault plus a local RAG vector database; and proactively surfaces relevant notes, daily briefings, and prioritized email summaries — with all inference running locally (Ollama/WSL2) and zero cloud API cost or outbound calls.

## Repository Structure

- **`server/`** — the Express + `node:sqlite` application: Web UI (`/chat`), ingestion API, admin/table-browser (`/admin/db`), chat-with-Llama endpoint. See `documets/PROJECT-SUMMARY.md` for which Stories shipped what.
- **`documets/design/`** — baseline specs: `SYSTEM-REQUIREMENTS-SPECIFICATION.md` (FR1–FR9, NFR1–NFR12), `Project 4thBrain.md` (Epics EP1–EP13 and Stories — canonical story text), `Gantt Chart.md` (story schedule/dependencies), `ADRS.md` (ADR1–ADR18 plus split-out `adr16-component-placement.md`, `adr18-persistence-tech.md`), `schema.sql`/`classes.md`/`classes.mmd` (SQLite data model).
- **`documets/PROJECT-SUMMARY.md`** — current-state summary; read this first (see above).
- **`documets/BACKLOG-TRACKER.md`** — per-story status (READY/WIP/COMPLETED) with dependencies and acceptance criteria; more current than `documets/PLAN.md`.
- **`documets/PLAN.md`** — original master plan (lifecycle phase status, EP1–EP11 summary). Superseded for status purposes by `PROJECT-SUMMARY.md`/`BACKLOG-TRACKER.md`; kept for historical scope-lock context.
- **`documets/PLAN-*.md`** (e.g. `PLAN-28-08-2026.md`) — dated planning-session outputs for specific multi-story efforts; each tracks its own implementation-status checklist.
- **`documets/DESIGN-DEBT.md`** — gaps found mid-plan (missing Epic/Story or design decision), per `.claude/rules/design-before-implementation.md`.
- **`documets/bugs/`** — one file per Bug (`Bug-N-<slug>.md`), per the `Bug n` document type below.
- **`vault/`, `local-llm/`, `ui/`, `ingestor-classification/`, `batch/`, `server/`** — the six functional modules, each with its own `CLAUDE.md` (purpose/scope/dependencies) and `backlog.md` (story status). See the Module Map below. Full story text stays canonical in `documets/design/Project 4thBrain.md`; the per-module files are thin views onto it. `server/` is the first module with real shipped code rather than design-only artifacts, and owns EP12 (Structured Data & Job Queue Persistence) and EP13 (Admin & Monitoring Tools), resolving what was previously an open "no module owner" item.
- **`documets/Interviews/`** — phase interview transcripts capturing requirements discovery.
- **`documets/method/`** — the process framework itself: `BOOT.md` (file-header/versioning protocol, now split into `.claude/rules/file-format.md`/`file-protection.md`/`file-versioning.md`/`file-indexing.md`), `MD-MEMORY-INSTRUCTIONS.md` (`/MEMORY.md` maintenance rules), `Software Documentation Summary and Framework.md` (the document-type taxonomy and phase-by-phase software lifecycle this project follows — Requirement Collection → Formalization → Scope Lock → Epics → Stories/Dev/Release → Post-Release Gap Analysis → Buy-off → Maintenance), `Driving Dictation Prompt and Guidelines.md` (source for the `dictation` skill).
- **`scripts/`** — dev-environment helpers (`ui-server.ps1` start/stop/status for the `server/` app, `reset-dev-db.ps1` for the SQLite dev database).
- **`.claude/skills/`** — `b4-research` (cited web research into the Obsidian vault), `dictation` (hands-free dictation interaction protocol), `install-smart-connection`, `roast`, `surprise-me`.
- **`.claude/rules/`** — `design-before-implementation.md` (no code without a traced Epic+Story and a design artifact — see below), `file-format.md`, `file-protection.md`, `file-versioning.md`, `file-indexing.md` (split out of the former `boot.md`), `md-memory.md`, `scrapper.md`, `shell.md`, `write-properly.md`.
- **`.backup/v2/`** — prior repository contents (an earlier, code-oriented iteration of this project: `Generated/`, `styles/`, prior `CLAUDE.md`/`README.md`/`TODO.md`/`HANDOUT.md`, batch-queue plans, `.mcp.json`) preserved during a cleanup; not part of the active tree.

## Document Framework Conventions

Per `documets/method/Software Documentation Summary and Framework.md`, project artifacts follow a fixed taxonomy and coding scheme — use these codes/prefixes when creating or referencing requirements docs:

- **FRn** — Functional Requirements (Code, Name, Abstract, Description, Priority [MVP/Good-to-Have/Desired], Acceptance Criteria)
- **NFRn** — Non-Functional Requirements (runtime/environment constraints)
- **ADRn** — Architectural Decisions (Description, Why, Date Created, Date Cancelled)
- **EPn** — Epics (group FRs/NFRs, inherit their acceptance criteria)
- **Story n** — Stories under an Epic (Abstract, Description, Acceptance Criteria, Status)
- **Bug n / Issue n** — Testing & bug tracking. Live in `documets/bugs/`, one file per Bug, per `.claude/rules/file-format.md`.

Any file carrying a YAML file header (`---`-delimited block at the top with `name`/`description` required fields) is governed by `.claude/rules/file-format.md`/`file-protection.md`/`file-versioning.md`/`file-indexing.md`: read-only files (`read-only: true`) must never be modified/deleted; new files without a header get one inserted; updates bump `metadata.version` and the `date` field; every tracked file gets an `INDEX.md` entry.

**Design-before-implementation (`.claude/rules/design-before-implementation.md`):** no code lands without tracing to an existing Epic+Story *and* a design artifact (ADR, schema, class definition) sufficient to implement from. Gaps found mid-plan are logged to `documets/DESIGN-DEBT.md` rather than implemented around.

## Current Baseline

Thirteen epics exist (EP1–EP11 baseline + gap analysis, EP12/EP13 added later during schema/admin-tooling work). Story status varies per-story (Completed/Ready/WIP) — **do not hardcode a status snapshot here; read `documets/PROJECT-SUMMARY.md` and `documets/BACKLOG-TRACKER.md` for current state.** Dependency shape (stable, unlike status):

- **EP7** (System Infrastructure & Host Runtime) is the foundation — WSL2 + Ollama + MCP server setup — and gates nearly everything else.
- **EP1** (Ingestion & Sanitization) depends on EP7.
- **EP2** (Tagging/Classification) and **EP3** (Vector Indexing/MCP) depend on EP1.
- **EP4** (Overnight Batch Processing) depends on EP1 + EP2.
- **EP5** (Daily Briefing) depends on EP2 + EP4.
- **EP6** (Web UI — ingestion form, search, dashboard) depends on EP1, EP3, EP4.
- **EP8** (QA/Testing & Bug Tracking), **EP9** (Security & Access Control), **EP10** (Vault Backup & Recovery), **EP11** (Release Management) — cross-cutting additions; EP9 and EP10 reference proposed NFR13/NFR14, pending a Phase 3 scope-lock pass.
- **EP12** (Structured Data & Job Queue Persistence) — the SQLite metadata schema (`documets/design/schema.sql`); depends on nothing, consumed by EP1/EP2/EP4/EP6.
- **EP13** (Admin & Monitoring Tools) — cross-cutting dev/QA tooling (table browser, mobile UI review); depends on EP7 (database setup).

See `documets/design/Gantt Chart.md` for exact story-level day scheduling and dependency types (Depends on / Must be worked with).

## Module Map

| Module | Owns | Depends on |
| --- | --- | --- |
| `vault/` | EP3 (vector indexing/MCP), EP10 (backup/recovery) | `local-llm/` |
| `local-llm/` | EP7 (WSL2/Ollama/MCP host), EP11 (release mgmt) | none — foundation |
| `ui/` | EP6 (web ingestion/search/dashboard), EP9 (auth) | `ingestor-classification/`, `vault/`, `batch/`, `local-llm/` |
| `ingestor-classification/` | EP1 (ingestion/sanitization), EP2 (tagging) | `local-llm/`, `vault/` |
| `batch/` | EP4 (overnight processing), EP5 (daily briefing), EP8 (QA/testing — cross-cutting) | `ingestor-classification/`, `local-llm/`, `vault/` |
| `server/` | EP6 (Web UI/ingestion API), EP9 (auth), EP12 (SQLite metadata DB runtime), EP13 (admin tools/data-access API) | `local-llm/` (Ollama HTTP endpoint) |

## Working in This Repository

- Real application code exists under `server/` — start it via `scripts/ui-server.ps1 start` (sets `NODE_ENV=development` for the admin panel) or `cd server && npm start` directly. No automated test suite exists yet (Story 8.1, To Do).
- Before writing or editing any code, it must trace to an existing Epic+Story and a design artifact — see `.claude/rules/design-before-implementation.md`. If either is missing, stop and log a Design Debt entry rather than implementing around the gap.
- Use the `dictation` skill's persona/interview/pause protocol when the user is dictating requirements or specs hands-free.
