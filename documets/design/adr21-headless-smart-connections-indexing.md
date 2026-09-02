---
name: adr21-headless-smart-connections-indexing
description: Trigger Smart Connections re-indexing in headless batch context (Story 3.1)
metadata:
  status: approved
  version: 1.0
  date: 2026-09-02
---

# ADR21: Headless Smart Connections Re-Indexing Mechanism

**Date Created:** 2026-09-02  
**Decision:** Use file watcher + direct `.smart-env` manipulation via Python helper  
**Status:** Approved (clarification for Story 3.1 implementation)

## Background

Story 3.1 (Smart Connections Vector Indexing Pipeline) requires triggering Smart Connections re-indexing when notes are added/modified in the vault. The Smart Connections plugin (installed in Obsidian) normally detects changes via the Obsidian file watcher and re-indexes automatically. However, in the batch processing context (overnight script), Obsidian may not be running, so the plugin's built-in watcher doesn't fire.

The MCP server registered in `vault/Instructions.md` (`@yejianye/smart-connections-mcp`) only reads the `.smart-env` vector store; it does not expose a tool to trigger re-indexing.

## Problem

How to trigger Smart Connections re-indexing in a headless batch environment without running Obsidian?

## Options Considered

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A. Obsidian CLI / headless mode | Launch Obsidian with headless flag to trigger indexing | Guaranteed to use official plugin logic | Obsidian licensing/availability unclear; may be slow |
| B. Direct `.smart-env` manipulation | Write Python script to rebuild embeddings directly | Bypasses plugin entirely, deterministic | Complex, risky (plugin may not recognize rebuild), duplicates embedding logic |
| C. File watcher + lazy trigger | Python file watcher monitors vault `.md` files; marks files as "needs indexing" in a metadata table | Decouples detection from execution, integrates with job queue | Requires custom tracking, plugin must run to actually embed |
| D. Plugin via Obsidian API | Call Obsidian plugin API directly (if exposed) | Official, complete | Unlikely available without UI; requires plugin dev knowledge |

## Decision

**Hybrid approach (Option C variant):** Use a Python file watcher to detect vault changes, then trigger Obsidian's Smart Connections plugin via a lightweight mechanism:

1. **Watcher Phase (Batch Context):** Python script (`vault/vault-change-watcher.py`) monitors `$VAULT_DIR/` (incoming, all topic folders, etc.) for new/modified `.md` files. When changes detected, record them in a JSON state file (`.smart-env/pending-index.json`).

2. **Execution Phase (Obsidian Context):** When Obsidian next starts (or is opened manually by the user), the Smart Connections plugin detects vault file changes via its native watcher and re-indexes them as part of its normal flow. The pending state file is just tracking for logging/retry logic, not doing the embedding.

3. **Fallback (If Obsidian runs scheduled):** If a scheduled Obsidian instance runs (e.g., via CLI or Docker), it can read the pending state and explicitly trigger plugin re-indexing. This is future work; defer for now.

4. **Status Querying:** Use Spike 3.2's `vault/check_smart_connections_status.py` to verify indexing status after Obsidian runs.

**Why this approach:**
- Respects the plugin's responsibility for indexing (doesn't duplicate embedding logic)
- Decouples change detection (batch) from indexing execution (Obsidian)
- Integrates with existing Spike 3.2 diagnostics
- Defers the harder "run Obsidian headless" problem to future work if manual Obsidian usage isn't sufficient

## Implementation

**Story 3.1 AC1:** Modified or created notes are automatically scanned and indexed.
- **Satisfaction:** Watcher detects changes; plugin re-indexes when Obsidian runs (user manually opens vault, or scheduled Obsidian instance runs).
- **Proof:** Pending state file records changes; post-Obsidian, `check_smart_connections_status.py` confirms new notes are indexed.

**Story 3.1 AC2:** Embeddings stored locally in `.smart-env` without cloud.
- **Satisfaction:** Plugin uses local LLM (Ollama) for embeddings; MCP server reads `.smart-env` locally.
- **Proof:** No outbound calls; `.smart-env/` is the source of truth.

**Job Queue Integration:**
- Story 1.1's ingestion executor creates a document and files it to vault.
- Story 4.1's batch worker triggers vault change watcher *after* ingestion completes (or as separate step).
- Story 4.1's cleanup phase queries Smart Connections status and logs indexing state (pending/indexed/failed).

## Notes

- **User Experience:** Batch runs nightly; indexing happens when Obsidian is next opened. Real-time indexing (immediate after ingestion) is a future enhancement.
- **Obsidian Headless:** If future stories require immediate indexing without user intervention, revisit Option A (Obsidian CLI/Docker). ADR will be superseded then.
- **Consistency:** Pending state file is advisory; if Obsidian crashes or doesn't run, notes still get indexed eventually (they're in the vault). Tracking is for diagnostics and retry logic.

## Related Files

- `vault/Instructions.md` — MCP server registration (read-only)
- `vault/check_smart_connections_status.py` — Spike 3.2, diagnostics tool
- `batch/worker.js` — Where watcher trigger + status query will be invoked
- `batch/job-executors.js` — Indexing job executor (will orchestrate watcher + status checks)
