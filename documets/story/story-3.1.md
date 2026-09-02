---
name: story-3.1
description: Working notes for Story 3.1 - Smart Connections Vector Indexing Pipeline
date: 2026-08-31
metadata:
  version: 1.0
  created-by: Claude Haiku 4.5
---

# Story 3.1: Smart Connections Vector Indexing Pipeline

Canonical story text lives in `documets/design/Project 4thBrain.md` (EP3). This file tracks the working context behind it.

## Abstract

Trigger vector embedding generation for updated vault notes.

## Current Status

**READY (not yet started)**

Depends on:
- Story 1.1 (Direct Structured Vault Ingestion) — **COMPLETED**
- Story 7.2 (Process Lifecycle & MCP Server Setup) — **READY** (not yet started)

The spike 3.2 (Smart Connections Indexing Status Retrieval) is COMPLETED and provides diagnostic tooling (`vault/check_smart_connections_status.py`).

## What Needs to Be Built

Story 3.1 has two acceptance criteria:
1. **Modified or created notes are automatically scanned and indexed** — Currently missing the detection mechanism
2. **Embeddings are stored locally in .smart-env without relying on cloud vector stores** — Smart Connections already handles this natively, but the trigger/orchestration is missing

## Implementation Gaps Identified

### Gap 1: Vault File Watcher for Change Detection
**Problem:** No component currently watches the vault directory (`$VAULT_DIR/incoming` and subdirectories) to detect newly ingested or modified Markdown notes.

**What's Needed:**
- A file watcher (similar to Story 1.1's `watcher.js` pattern) that monitors vault directory
- Detects file creation/modification events on `.md` files
- Triggers Smart Connections re-indexing when changes are detected
- Should run as part of the batch worker (Story 4.1) or as a separate scheduled background task

**Location:** Proposed `vault/vault-watcher.js` or integration into `batch/job-executors.js` as an `index` job type handler

### Gap 2: Smart Connections Orchestration / MCP Integration
**Problem:** No code currently triggers Smart Connections to re-index notes after they land in the vault.

**What's Needed:**
- Mechanism to trigger Smart Connections indexing:
  - **Option A:** Call the Smart Connections MCP server (documented in `vault/Instructions.md`) to trigger a re-index
  - **Option B:** Direct API call to Smart Connections plugin (requires plugin to expose HTTP or CLI endpoint)
  - **Option C:** Filesystem event-based: Smart Connections may auto-detect vault changes via Obsidian's file watcher (needs verification)
- Error handling if Smart Connections is unreachable or fails
- Status tracking in the database (job.status tracking per Spike 3.2 diagnostics)

**Location:** Proposed `vault/smart-connections-client.js` or integration into an `index` executor

### Gap 3: Job Type Routing for Indexing
**Problem:** The database schema has an `index` job_type enum value, but no executor is registered to handle these jobs.

**What's Needed:**
- Register an indexing executor in `batch/job-executors.js` under the `index` job type
- The executor should:
  - Accept a `job` with type `index` and an associated document
  - Call the Smart Connections orchestration code (Gap 2)
  - Update job.status (New → Running → Completed/Failed)
  - Return a result indicating success/failure

**Location:** `batch/job-executors.js` and a new `vault/index-executor.js` module

### Gap 4: Acceptance Criteria Verification
**Problem:** No end-to-end test verifies that notes land in the vault and get indexed in .smart-env.

**What's Needed:**
- Integration test workflow:
  1. Create a document in Story 1.1's ingestion path
  2. Verify it lands in `$VAULT_DIR/incoming`
  3. Trigger Story 3.1's indexing logic
  4. Verify `.smart-env` was updated (use Spike 3.2's `check_smart_connections_status.py` to verify)
  5. Verify the job.status transitioned correctly

**Location:** `vault/test/` or `batch/test/` as part of integration tests

## Blocking Dependencies

Story 3.1 cannot proceed to COMPLETED without Story 7.2 because:
- Story 7.2 (Process Lifecycle & MCP Server Setup) is responsible for starting and managing the Smart Connections MCP server
- Story 3.1 needs that MCP server running to trigger indexing
- The exact interface/API for triggering Smart Connections through MCP is documented in Story 7.2's deliverables

**Current Status of Story 7.2:** READY (not yet started, depends on Story 7.1 which is WIP)

## Recommended Implementation Order

1. **Verify Story 7.2 deliverables exist** — Get the exact MCP endpoint/API for triggering Smart Connections
2. **Implement Gap 2 (Smart Connections Orchestration)** — Build the client that can trigger indexing
3. **Implement Gap 1 (Vault File Watcher)** — Add change detection in the vault directory
4. **Implement Gap 3 (Job Executor Registration)** — Wire the indexing logic into the batch worker
5. **Implement Gap 4 (Acceptance Criteria Testing)** — E2E test to verify indexing actually happens

## Design Clarification (ADR21)

**Resolved:** `documets/design/adr21-headless-smart-connections-indexing.md` (2026-09-02) clarifies that:
- MCP server is read-only (semantic-search/similar-notes only); does not expose re-indexing trigger
- Headless indexing in batch context: Use Python file watcher to detect vault changes, recorded in `.smart-env/pending-index.json` for tracking
- Actual indexing happens when Obsidian runs (user opens vault, or scheduled Obsidian instance)
- Story 4.1's batch worker queries Smart Connections status post-indexing via Spike 3.2's `check_smart_connections_status.py`
- Real-time vs. batch: Batch model adopted; Obsidian is responsible for embedding execution

**Outstanding design questions:**
- **Index Job Queueing:** Should Story 1.1's ingestion executor automatically create an `index` job when it files a note, or should Story 4.1's batch worker be responsible? (Lower priority — defer to implementation pass)

## Related Files

- `vault/check_smart_connections_status.py` — Diagnostic tool (Spike 3.2, COMPLETED)
- `vault/Instructions.md` — Smart Connections MCP server setup (referenced in Spike 3.2)
- `batch/job-executors.js` — Where indexing executor will be registered
- `documets/design/schema.sql` — Defines `index` job_type enum

## Acceptance Criteria

From the design doc (unchanged):
- [ ] Modified or created notes are automatically scanned and indexed
- [ ] Embeddings are stored locally in .smart-env without relying on cloud vector stores

Status: **NOT MET** (implementation not started)
