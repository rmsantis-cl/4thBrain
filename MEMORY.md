---
name: MEMORY
description: make context persistent to be preloaded in other sessions
metadata:
  node_type: memory
  type: log
---

# MEMORY.md

[Load MEMORY-instructions.md before making any update to this file.]

## Project
- 4thBrain (Personal Knowledge & Executive Assistant System): privacy-first, locally hosted "second brain." Captures unstructured ideas, transcripts, links, docs, email/calendar; sanitizes/classifies/indexes overnight via a local LLM into an Obsidian-compatible Markdown vault plus a local RAG vector database; proactively surfaces notes, daily briefings, and email summaries. All inference local (Ollama/WSL2), zero cloud API cost or outbound calls.

## Current State
- Lifecycle phase status (per `documets/PLAN.md`): Phases 1â€“4 complete. Phase 5 (Story Creation/Dev/Release/UAT) is underway: Story 6.4 (Common UI Shell) is the first story with real application code, under `server/` (Express) and `ui/design/`.
- Baseline Epics EP1â€“EP11 approved/added (`documets/design/Project 4thBrain.md`); ADR1â€“ADR18 logged (`documets/design/ADRS.md`) â€” ADR14 (ingestion directory layout), ADR15 (topic/subtopic vault-path + sibling attachment dirs), ADR16 (closed: component placement / WSL2, tested, no benefit, keep current setup), ADR17 (closed 2026-08-26: SQLite metadata store â€” brief transactions required; if long concurrent txns needed during impl, must revisit), ADR18 (open: relational database technology â€” SQLite vs. PostgreSQL â€” for processing state; separate vector database consideration).
- Spike 3.2 (EP3) done 2026-08-25: Smart Connections indexing status readable via `vault/check_smart_connections_status.py` (ported to `server/lib/smart-connections-status.js`, not wired into a route yet).
- **Story 6.4 shell built, verified, and shipped 2026-08-25**: 6-panel SPA (add file/text/url, ingest status, chat w/ Llama, chat w/ Claude-placeholder), `GET /chat` the only GET route, everything else POST, styled per `ui/design/STYLE-GUIDE.md`. All cross-module interactions are mocked (`ui/plan.md` has the real-vs-mocked table) â€” see "Decisions" below. User-tested in browser on desktop and on mobile over LAN; committed and pushed at `7c0d709` (branch `v03`).
- Repo reorg into module dirs (`vault/`, `local-llm/`, `ui/`, `ingestor-classification/`, `batch/`), each with `CLAUDE.md`/`backlog.md`, done 2026-08-24. Canonical story text stays in `documets/design/Project 4thBrain.md`.
- **New EP12 (Structured Data & Job Queue Persistence), Story 12.1 done 2026-08-26**: SQLite schema designed. Initial 4-class design (Document/Status/Classification/Job, `documets/design/database-schema.md`) expanded post-scope when user manually edited `classes.md` to add JobType, JobDocument, Process classes. Final deliverable: `documets/design/schema.sql` (7-table DDL), `documets/design/classes.mmd`/`classes.png` (updated ERD), ADR17 logged, NFR15 added. Design only â€” no `server/db/` code yet, no module owns EP12 in the Module Map yet (open question).

## Decisions
- (2026-08-25) **Build one story at a time; mock every cross-module interaction until that other module's own story is built.** An early attempt tried to deliver a full working server (real $RAW_DIR writes, real Smart Connections status, real Ollama chat) in the same pass as the Story 6.4 UI shell â€” corrected by the user: don't try to deliver the whole working app in one step. Scope narrowed to Story 6.4 only; see `ui/plan.md` for the real-vs-mocked breakdown per panel.
- (2026-08-25) "Chat with Claude" stays a UI-only placeholder indefinitely â€” a real call would violate ADR12 (zero cloud API calls). Only "Chat with Llama" (local, via Ollama) gets a real backend, and only once Story 6.5 exists.
- (2026-08-24) Single repository with per-module directories, not separate subprojects. See ADR13.
- (2026-08-23) Architecture baseline: WSL2 host, Ollama/llama3.2 for local inference, Obsidian + Smart Connections for vault/vector store, Node.js as orchestration server + Web UI host, concurrency=1 queueing. Full rationale in ADR1â€“ADR12.

## Constraints
- No cloud API calls at runtime â€” all LLM inference and processing must run locally (Ollama).
- Single-user, single-host system â€” no multi-tenant or distributed architecture.
- No auth on any endpoint yet (Story 9.1, EP9, still To Do). `server/` currently binds `0.0.0.0` (changed from `127.0.0.1`) so it's reachable from a phone over LAN for manual testing â€” anyone on the same network can reach it while it's running. Revisit the default bind host once Story 9.1 exists; not safe to leave running unattended on an untrusted network.
- **SQLite transaction constraint (ADR17):** Keep database transactions brief. SQLite uses database-level locking; long transactions holding locks will serialize concurrent access. If implementation reveals a need for long concurrent transactions, ADR17 must be revisited and migrated to PostgreSQL.
- Files carrying a YAML file header are governed by `.claude/rules/file-format.md`, `file-protection.md`, `file-versioning.md`, `file-indexing.md`: read-only files can't be modified; updates bump `metadata.version`/`date`; tracked in `INDEX.md`.

## Open Questions / Next Steps
- Story 7.3 (SQLite database setup, EP7) is the foundation for Stories 1.1/1.2 (ingestion, EP1), 2.1 (classification, EP2), and 4.X (batch, EP4) â€” should be built early in Phase 5.
- Story 6.1 (real $RAW_DIR writes), 6.3 (real ingest-status wiring, would consume the new SQLite `job`/`document` tables), 6.5 (real Ollama chat â€” not yet a formal story) are the next slices once 6.4's mocked shell is verified.
- Story 12.1's schema is design-only â€” next implementation step is a story to actually create the SQLite file and wire `better-sqlite3`/`node:sqlite` into `server/`, plus deciding which module owns EP12.
- Tag/Topic-vs-Classification gap (`classes.md`'s "Open question") still unresolved â€” explicitly deferred again during Story 12.1.
- Proposed NFR13/NFR14 (auth, backup/recovery) still not formalized in the SRS â€” needs a Phase 3 scope-lock pass.
- Real dev/test loop for `server/` is running on native Windows (Node v22, Ollama both native), not inside WSL2 as ADR1 describes â€” flagged as a dev-environment fact, not a redesign; revisit if/when actually deploying inside WSL2.

## Changelog
- 2026-08-26: Story 7.3 initiated: SQLite database setup. Database file created at server/4thbrain-metadata.db, schema initialized from documets/design/schema.sql. Using Node.js built-in node:sqlite module. Database attached to Express app.locals.db. Acceptance criteria: drivers, schema, file init, enum seed, cross-lang smoke test. Status: In Progress.
- 2026-08-26: Story 7.3 added (EP7) — SQLite Database Setup for Processing-State Persistence. Acceptance criteria: SQLite drivers installed, schema created, database file initialized, status enum seeded, cross-language smoke test. Status: To Do.
- 2026-08-26: ADR17 closed â€” SQLite chosen for simplicity and sequential processing. Critical implementation constraint: keep transactions brief; if long concurrent transactions needed during dev, decision must be revisited (migrate to PostgreSQL).
- 2026-08-26: ADR18 opened (open) â€” relational database technology choice (SQLite vs. PostgreSQL) for processing-state persistence; separate vector database evaluation for pre-vault classification hints.
- 2026-08-26: ADR16 closed â€” tested Obsidian/Zed in WSL via flatpak; UI degradation and no functional benefit; keep current setup (Windows Obsidian, WSL Ollama); re-evaluate at EP11.
- 2026-08-26: Database design session. Initial 4-class SQLite schema designed; then user-expanded classes.md to 7 classes (added JobType, JobDocument, Process). Final deliverables: `schema.sql` (standalone DDL), updated `classes.mmd`/`classes.png` ERD. EP12/Story 12.1, ADR17, NFR15. Design only, not implemented.
- 2026-08-25: Story 6.4 UI shell built, verified (desktop + mobile/LAN), committed and pushed (`7c0d709`). Server bind host changed 127.0.0.1 â†’ 0.0.0.0 for LAN testing. ADR16 added (component placement/WSL2).
- 2026-08-25: Story 6.4 in progress (mocked cross-module interactions per user correction); ADR14â€“15 logged; Spike 3.2 done.
- 2026-08-24: Created. Seeded from current project state â€” baseline epics, EP8â€“EP11 additions, module directory reorg, ADR log creation.
