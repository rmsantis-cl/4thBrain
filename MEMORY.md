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
- Lifecycle phase status (per `documets/PLAN.md`): Phases 1–4 complete. Phase 5 (Story Creation/Dev/Release/UAT) has now started: Story 6.4 (Common UI Shell) is the first story with real application code, under `server/` (Express) and `ui/design/`.
- Baseline Epics EP1–EP11 approved/added (`documets/design/Project 4thBrain.md`); ADR1–ADR15 logged (`documets/design/ADRS.md`) — ADR14 (ingestion directory layout: $RAW_DIR/$VAULT_DIR/incoming/clipping/raw), ADR15 (topic/subtopic vault-path + sibling attachment dirs) added 2026-08-25.
- Spike 3.2 (EP3) done 2026-08-25: Smart Connections indexing status is readable via `vault/check_smart_connections_status.py` (ported to `server/lib/smart-connections-status.js`, not wired into a route yet) — matches the plugin's own in-app "Smart Environment" panel exactly.
- Story 6.4 (`ui/plan.md`, `documets/story/story-6.4.md`) is in progress: 6-panel SPA shell (add file/text/url, ingest status, chat w/ Llama, chat w/ Claude-placeholder), `GET /chat` as the only GET route, everything else POST. All cross-module interactions (file writes, status, Ollama chat) are mocked in this pass — see "Decisions" below.
- Repo reorg into module dirs (`vault/`, `local-llm/`, `ui/`, `ingestor-classification/`, `batch/`), each with `CLAUDE.md`/`backlog.md`, done 2026-08-24. Canonical story text stays in `documets/design/Project 4thBrain.md`.

## Decisions
- (2026-08-25) **Build one story at a time; mock every cross-module interaction until that other module's own story is built.** An early attempt tried to deliver a full working server (real $RAW_DIR writes, real Smart Connections status, real Ollama chat) in the same pass as the Story 6.4 UI shell — corrected by the user: don't try to deliver the whole working app in one step. Scope narrowed to Story 6.4 only; see `ui/plan.md` for the real-vs-mocked breakdown per panel.
- (2026-08-25) "Chat with Claude" stays a UI-only placeholder indefinitely — a real call would violate ADR12 (zero cloud API calls). Only "Chat with Llama" (local, via Ollama) gets a real backend, and only once Story 6.5 exists.
- (2026-08-24) Single repository with per-module directories, not separate subprojects. See ADR13.
- (2026-08-23) Architecture baseline: WSL2 host, Ollama/llama3.2 for local inference, Obsidian + Smart Connections for vault/vector store, Node.js as orchestration server + Web UI host, concurrency=1 queueing. Full rationale in ADR1–ADR12.

## Constraints
- No cloud API calls at runtime — all LLM inference and processing must run locally (Ollama).
- Single-user, single-host system — no multi-tenant or distributed architecture.
- No auth on any endpoint yet (Story 9.1, EP9, still To Do) — `server/` binds to `127.0.0.1` only as a stopgap.
- Files carrying a YAML file header are governed by `.claude/rules/file-format.md`, `file-protection.md`, `file-versioning.md`, `file-indexing.md`: read-only files can't be modified; updates bump `metadata.version`/`date`; tracked in `INDEX.md`.

## Open Questions / Next Steps
- Story 6.1 (real $RAW_DIR writes), 6.3 (real ingest-status wiring), 6.5 (real Ollama chat — not yet a formal story) are the next slices once 6.4's mocked shell is verified.
- Proposed NFR13/NFR14 (auth, backup/recovery) still not formalized in the SRS — needs a Phase 3 scope-lock pass.
- Real dev/test loop for `server/` is running on native Windows (Node v22, Ollama both native), not inside WSL2 as ADR1 describes — flagged as a dev-environment fact, not a redesign; revisit if/when actually deploying inside WSL2.

## Changelog
- 2026-08-25: Story 6.4 in progress (mocked cross-module interactions per user correction); ADR14–15 logged; Spike 3.2 done.
- 2026-08-24: Created. Seeded from current project state — baseline epics, EP8–EP11 additions, module directory reorg, ADR log creation.
