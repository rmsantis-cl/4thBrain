---
name: PLAN-30-08-2026-EP3-Completion
description: Detailed plan to close out EP3 (Local Vector Indexing & MCP Integration) — Story 3.1, and a dependency correction against EP2/EP7
date: 2026-08-30
metadata:
  version: 1.1
  created-by: Claude Sonnet 5
---

# Plan: Complete EP3 (Local Vector Indexing & MCP Integration)

## Context

EP3 covers FR4 (Local Vault & RAG Indexing): notes get indexed in local vector storage (`.smart-env`, via the Smart Connections Obsidian plugin) and return relevant matches for semantic-context queries. It has two stories:

- **Spike 3.2** (Smart Connections Indexing Status Retrieval) — **COMPLETED**. Delivered `vault/check_smart_connections_status.py`, a read-only reporter classifying vault sources/blocks as current/missing/skipped/unexpected.
- **Story 3.1** (Smart Connections Vector Indexing Pipeline) — **READY**, no code, no working-notes file yet.

This plan exists because the user asked for a detailed EP3-completion plan, noting the epic "runs in a hybrid environment" (native Windows + WSL2, per ADR16).

## Dependency correction

The request framed this as "assume EP2 is completed, just list the dependency." That premise needs correcting on two counts:

1. **EP2 is not actually a dependency of EP3.** Per the Epic-level dependency chain in root `CLAUDE.md`, EP2 (Tagging/Classification) and EP3 (Vector Indexing/MCP) are **siblings** — both depend on EP1, neither depends on the other. Story 3.1's own formal dependencies (`documets/design/Project 4thBrain.md`) are Story 1.1 and Story 7.2, not Story 2.1.
2. **EP2 is not complete anyway** — Story 2.1 (its only story) is READY, not started. Moot given point 1, but worth flagging since the assumption was wrong on its own terms.

**Story 1.1** is WIP, core logic done (see `documets/PLAN-30-08-2026-EP1-Completion.md`) — not a blocker in practice.

**Story 7.2** (MCP Server Setup) is formally listed as a dependency and genuinely has zero code (`local-llm/` contains only `CLAUDE.md`/`backlog.md`). Unlike EP1's stale EP7 dependency, this one needed real investigation rather than a quick ADR check — see below.

## Story 3.1: the core design question

Smart Connections is an Obsidian plugin; this repo's Node server has no way to directly invoke its embedding logic, and per ADR16 isn't meant to (Obsidian/Smart Connections stay native Windows; only Ollama runs in WSL2). "Trigger vector embedding generation" can't mean calling into Smart Connections directly.

**Resolution:** Smart Connections already auto-embeds ambiently on file change:
- `vault/Instructions.md`: "Embeddings are generated once by the plugin and re-generated incrementally as notes change... The MCP server only *reads* this store — it does not generate embeddings itself."
- The live `.smart-env/smart_env.json` has `re_import_wait_time: 13` — a debounced file-watcher re-embed cycle already covering `incoming/`, where Story 1.1 lands files.
- No documented external forcing mechanism exists; Instructions.md's own troubleshooting section says a stale index requires manually re-running indexing from the plugin's settings pane.

**So Story 1.1 (writing files into the vault) already is the trigger, for free.** Story 3.1's actual job is queue-and-confirm: enqueue a confirmation job after ingest, poll `.smart-env` via the existing status reporter, and settle the job Completed/Failed. This matches Spike 3.2's own convention (its docstring already treats "skipped" as "failed to index").

**Is Story 7.2 (MCP server) a hard prerequisite?** No — recommend shipping 3.1 without it. ADR4 describes the MCP server as a *query*-side interface over an already-generated index; Story 7.2's own description is "expose the Smart Connections MCP server endpoint" (read access), not write/trigger access. The confirm-loop needs nothing from WSL2/MCP — it only needs `smart-connections-status.js`, which already reads `cfg.vaultDir`/`cfg.smartEnvDir` from `server/config.js`. Story 7.2 does gate the *query* side (Story 6.2's search UI actually reading the index), just not this story.

## File-level plan

Reuses the established `canHandle`/`execute` executor contract (`server/lib/ingestion/ingest-executor.js`) and the existing `job_type='index'` schema seed (no schema change needed) — same pattern Story 1.2 uses for `job_type='convert'`.

1. **New file `server/lib/vault-indexing/index-executor.js`**:
   - `canHandle(db, job)`: resolve `document.uri_location` → vault-relative path, call `smartConnectionsStatus.lookup(cfg, relPath)` (`server/lib/smart-connections-status.js`, already on disk, currently only used — unwired — for Story 6.3's status dashboard). Return `false` (leave job `New`, retry next sweep) while status is `missing`. Return `true` once `current`, `skipped`, or `unexpected` (all terminal).
   - `execute(db, job, cfg)`: re-run `lookup()`. On `current`: set `document.status = 'Indexed'`, return embedding metadata. On `skipped`/`unexpected`: `throw` (worker marks job `Failed`, per Spike 3.2's skipped=failed convention).
2. **Register in `batch/job-executors.js`**: `executors.index = indexExecutor;` — same one-line pattern already used for `ingest`, about to be used for `convert`.
3. **Job creation/chaining**: after an `ingest` job completes, enqueue `{ job_type: 'index', document_id, status: 'New' }`. Keep this in `batch/` (matches `vault/CLAUDE.md`'s existing framing that batch triggers re-indexing) — either inline in `batch/worker.js`'s `runCycle`, or a small `batch/job-chain.js` mapping `{ ingest: 'index' }`. See Open Questions for which.
4. **Tests**: new `server/test/vault-indexing.index-executor.test.js`, mirroring `server/test/ingestion.*.test.js`'s style — `createTestCfg`/`createTestDb`, a fixture `.smart-env/smart_sources/smart_sources.ajson` exercising the `canHandle` false→true transition and each terminal `execute` outcome.

**Known limitation, not fixed by this plan:** nothing supervises the native Windows Obsidian process (ADR16 keeps it outside WSL2's reach). If Obsidian isn't running, `index` jobs stay `New` forever — `batch/cleanup.js` only reaps stale `Running` jobs, not stale `New` ones, so there's no automatic detection of this stall today.

## Sequencing

1. Story 3.1 implementation (moderate — the mechanism is resolved, this is mostly plumbing following an established pattern).
2. EP3 is then fully COMPLETED. Story 6.2 (Hybrid Search) becomes meaningfully implementable once both 3.1 and 7.2 (query-side MCP) exist — 7.2 is a real prerequisite there, unlike here.

## Design Debt callouts

- **`3.1 depends on 7.2` listing is only half-stale.** True for the query side (Story 6.2), not for this story's confirm-only scope. Recommend correcting `documets/design/Project 4thBrain.md`'s Story 3.1 dependency note to distinguish "needed to build" from "needed to be useful downstream," rather than dropping the dependency line outright.
- **New-candidate: no timeout/detection for a stalled `New` index job.** `batch/cleanup.js`'s stale-job reaping only covers `Running`, not `New`. Low-severity today (single-user, Obsidian is normally open), but worth a DESIGN-DEBT entry so it isn't silently forgotten.

## Resolved: is Story 7.2 required?

**Decision (2026-08-30): no, not for Story 3.1 as scoped in this plan.** Confirmed against ADR4 (MCP server is read/query-side only over an already-generated index) and `vault/Instructions.md` (Smart Connections auto-embeds without any external trigger — the confirm-loop only needs `smart-connections-status.js`, which needs no WSL2/MCP). `Project 4thBrain.md`'s literal `3.1 depends on 7.2` listing is stale for this scope, same pattern as EP1's stale EP7 dependency. **No Story 7.2 sub-plan is added as an EP3 prerequisite.**

This does not make Story 7.2 unnecessary overall — it remains a real, unavoidable prerequisite for **Story 6.2** (Hybrid Search), which genuinely needs to *query* the vector index from the WSL2/LLM side. That belongs in a Story 6.2 completion plan when that story is scoped, not here.

## Open questions for the user

1. **Stalled `New` job handling:** does a job that never resolves (Obsidian closed, or genuinely excluded content) need a max-retry/timeout mechanism now, or is it an acceptable known gap for v1 — surfaced via the dashboard rather than auto-failed?
2. **Chaining location:** should `ingest → index` job chaining live inline in `batch/worker.js`, or in a new `batch/job-chain.js`? And should that module be designed now for future `classify → index` chaining (Story 2.1, not yet built), or deferred per the incremental-delivery preference already established this session?
