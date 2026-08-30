---
name: story-7.3
description: Working notes for Story 7.3 - SQLite Database Setup for Processing-State Persistence
date: 2026-08-26
metadata:
  version: 1.0
  created-by: Claude Code
---

# Story 7.3: SQLite Database Setup for Processing-State Persistence

Canonical story text lives in `documets/design/Project 4thBrain.md` (EP7). This file tracks the working context behind it.

## Abstract

Install SQLite drivers and create the metadata database file.

## Observations

- Part of EP7 (System Infrastructure & Host Runtime) — foundation work that unblocks EP1 (ingestion), EP2 (classification), and EP4 (batch processing).
- SQLite chosen per ADR17 for simplicity and zero-ops overhead. Critical constraint: **keep transactions brief** — long-running transactions holding database-level locks will serialize concurrent access.
- Cross-language access requirement (Node.js + Python) — both have excellent SQLite libraries (`better-sqlite3` for npm, `sqlite3` stdlib for Python).
- This story is *just* driver install + file creation. Schema creation (Story 7.4) and constants seeding (Story 7.5) are separate, allowing QA to verify each step independently.

## Deliverable

- SQLite drivers installed (better-sqlite3 for npm, sqlite3 for Python)
- Database file created at configured path (server/4thbrain-metadata.db)
- Cross-language smoke test: Node.js connects and queries, Python connects and queries

## Implementation Notes

**Database location:** Should be a sibling to `vault_dir` and `raw_dir` (outside both the git repo and the Obsidian vault), e.g. `C:\Users\rsant\desar\Local Vault\4thbrain-metadata.db`. Add `metadata_db_path` to `params.json` to configure this.

**Transaction safety:** All reads/writes should be in short transactions. Avoid patterns like "open transaction, spawn a background task, close transaction later" — that will hold locks. Use immediate finalize for prepared statements to release locks promptly.

**Initialization:** The database file should be created and seeded (status enum) on first app start if it doesn't exist — defensive check in server/index.js.

## ADRs Referenced

- [ADR17](../design/ADRS.md#adr17-sqlite-as-the-local-structured-metadata--job-queue-store) — SQLite chosen; transaction brief-ness constraint.

## TODO

- Finalize `metadata_db_path` configuration location in `params.json`
- Test concurrent Node.js + Python access under the smoke test scenario
- Document transaction timeout/retry behavior (e.g., if a write fails due to lock timeout, how should it backoff?)
