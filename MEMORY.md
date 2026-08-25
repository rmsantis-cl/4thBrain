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
- Repository is in the design/requirements phase — no application code yet.
- Lifecycle phase status (per `documets/PLAN.md`): Phases 1–4 complete, Phase 5 (Story Creation/Dev/Release/UAT) not started, all Stories `To Do`.
- Baseline Epics EP1–EP7 (`documets/design/Project 4thBrain.md`) approved 2026-08-23.
- 2026-08-24: added EP8 (QA/Testing & Bug Tracking), EP9 (Security & Access Control), EP10 (Vault Backup & Recovery), EP11 (Release Management) via gap analysis against the framework's document taxonomy.
- 2026-08-24: repo reorganized into five module directories — `vault/`, `local-llm/`, `ui/`, `ingestor-classification/`, `batch/` — each with its own `CLAUDE.md` (purpose/scope/dependencies) and `backlog.md` (story status view). Canonical story text stays in `documets/design/Project 4thBrain.md`.
- 2026-08-24: `documets/design/ADRS.md` created — ADR1–ADR12 backfilled from the NFR baseline, ADR13 logged for the module-split decision.

## Decisions
- (2026-08-24) Single repository with per-module directories, not separate subprojects — modules are runtime-coupled (shared WSL2/Ollama host and vault) and there's no team boundary to enforce via repo separation. See ADR13 in `documets/design/ADRS.md`.
- (2026-08-23) Architecture baseline: WSL2 host, Ollama/llama3.2 for local inference, Obsidian + Smart Connections for vault/vector store, Smart Connections MCP server for tool access, Node.js as orchestration server + Web UI host, concurrency=1 queueing for local inference. Full rationale in `documets/design/ADRS.md` (ADR1–ADR12).

## Constraints
- No cloud API calls at runtime — all LLM inference and processing must run locally (Ollama/WSL2).
- Single-user, single-host system — no multi-tenant or distributed architecture.
- Files carrying a YAML file header are governed by `.claude/rules/file-format.md`, `file-protection.md`, `file-versioning.md`, `file-indexing.md`: read-only files can't be modified; updates bump `metadata.version` and `date`; all such files must be tracked in `INDEX.md`.

## Open Questions / Next Steps
- Proposed NFR13 (Authentication & Local Access Control) and NFR14 (Backup & Recovery) referenced by EP9/EP10 don't yet exist in the SRS — need a Phase 3 scope-lock pass to formalize them.
- No ADR log existed before 2026-08-24; ADR13 backfill process should continue as new architectural decisions are made going forward (log them as they happen, not retroactively).
- Two lower-confidence gap epics were flagged but not created: Email/Calendar Integration (OAuth/credential handling, currently assumed as an input to EP5) and Onboarding/Configuration UX (first-run vault path, taxonomy setup) — TBD whether these become epics.

## Changelog
- 2026-08-24: Created. Seeded from current project state — baseline epics, EP8–EP11 additions, module directory reorg, ADR log creation.
