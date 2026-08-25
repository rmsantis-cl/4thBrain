---
name: spike-3.2
description: Working notes for Spike 3.2 - Smart Connections Indexing Status Retrieval
date: 2026-08-25
metadata:
  version: 1.1
  created-by: Claude Code
---

# Spike 3.2: Smart Connections Indexing Status Retrieval

Canonical story text lives in `documets/design/Project 4thBrain.md` (EP3). This file tracks the working context behind it.

## Abstract

Investigate how to determine Smart Connections indexing status (totals, failures, per-note lookup) from `$VAULT_DIR/.smart-env` or `$VAULT_DIR/.obsidian`.

## Observations

- The user's guess was right about the folder, half right about the file: the status data lives entirely under `.smart-env`, not `.obsidian` (`.obsidian` is just Obsidian app/plugin config, no indexing state).
- Smart Connections has its own in-app diagnostics: a **Smart Environment** health panel (Obsidian command palette → search "Smart Environment") — command name to confirm exactly, panel shows Indexed items / Eligible / Current embeddings / Needs embedding, vector memory usage, and per-collection (Smart Sources, Smart Blocks) breakdowns of Total / Eligible / Current / Missing / Skipped / Unexpected. A "Skipped items" diagnostic modal lists each skipped item's path and a human-readable reason (e.g. "Below minimum size. Recorded size does not exceed the 200-character source minimum."). This panel is the authoritative live source and was used to validate the script below.
- Per user direction, **"Skipped" is what this project counts as "failed to index"** — items that don't meet the current embedding policy (size, exclusion patterns), as opposed to a runtime error.
- `.smart-env/smart_sources/smart_sources.ajson` is the key file — one entry per note, keyed `smart_sources:<vault-relative path>`, and each source's `blocks_data` holds one entry per block. Despite the `.ajson` extension suggesting JSON, it's an append-only sequence of `"key": {...},` fragments, not a single parseable JSON document — has to be read line by line.
- No reason string is persisted anywhere in `.smart-env` — the in-app panel computes it live by comparing stored size against `smart_env.json`'s `min_chars` (separate thresholds for sources and blocks) and its `file_exclusions`/`folder_exclusions` patterns. Replicating that same comparison client-side reproduces the panel's numbers and reason text exactly.
- Four-way status, matching Smart Connections' own terms:
  - **current** — embedded and up to date (`embedding.default` has a model entry with an `at` timestamp, and the item is still eligible).
  - **missing** — eligible but not yet embedded ("pending").
  - **skipped** — ineligible under current policy — too small, or matches an exclusion pattern ("failed", per the mapping above).
  - **unexpected** — a vector exists for an item that's no longer eligible (e.g. content shrank below `min_chars` after being embedded). None observed in this vault, but the script detects it.
- Block-level coverage is much lower than source-level in this vault: **720 of 1,045 blocks skipped** (mostly sub-200-character blocks) vs. only **1 of 31 sources** skipped — worth knowing before relying on block-level (as opposed to whole-note) semantic search granularity.
- The `smart-connections` MCP server (registered per `vault/Instructions.md`) wasn't connected during this spike, so whether it exposes this same diagnostic as a callable tool (vs. only the in-app panel) is still open — worth checking before building more automation on top of raw `.smart-env` parsing.
- Verified live against the actual vault (`params.json` → `vault_dir`), cross-checked against the in-app panel — numbers match exactly: Sources 31 total / 30 current / 0 missing / 1 skipped / 0 unexpected; Blocks 1045 total / 325 current / 0 missing / 720 skipped / 0 unexpected. Same skip reason text too ("Below minimum size...").

## Deliverable

`vault/check_smart_connections_status.py` — reads `params.json` and `smart_env.json`, parses `smart_sources.ajson` (including each source's `blocks_data`):

- No arguments: prints Sources and Blocks totals by status (current/missing/skipped/unexpected), plus a list of skipped/unexpected sources with their reasons.
- One argument (vault-relative note path): prints that note's status and reason (if any), or "not found" if it's never been scanned.

## ADRs Created

None. This spike is investigation only — no architectural decision was made. Whether Story 3.1 needs to actively surface "unexpected" (orphaned) embeddings, or trigger Smart Connections' "Optimize" cleanup, is a design choice for that story, not this spike.

## TODO

- Confirm the exact Smart Environment command-palette entry name (or menu path) so `vault/Instructions.md` / this doc can give precise reproduction steps.
- Check whether the `smart-connections` MCP server exposes this status/diagnostic as a tool once connected — would let batch jobs (EP4) query status without parsing `.smart-env` directly.
- Decide whether Story 3.1 needs to handle "unexpected" (orphaned) embeddings, or whether surfacing them via this script is enough for MVP.
- Re-run this spike's findings against a larger vault (31 notes is a small sample) to confirm the classification holds at scale.
