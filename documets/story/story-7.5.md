---
name: story-7.5
description: Working notes for Story 7.5 - Seed Constants & Enumerations
date: 2026-08-26
metadata:
  version: 1.0
  created-by: Claude Code
---

# Story 7.5: Seed Constants & Enumerations

Canonical story text lives in `documets/design/Project 4thBrain.md` (EP7). This file tracks the working context behind it.

## Abstract

Populate reference/enum tables with predefined constant values.

## Observations

- Depends on Story 7.4 (tables must exist first)
- Three reference tables to seed: `status`, `job_type`, `process`
- These are immutable lookup tables — values are fixed by design, not runtime-generated
- Seeds specified in `documets/design/schema.sql` (status enum in the original schema file)
- job_type and process enums are new (added when user expanded classes.md to 7 classes)

## Deliverable

**status table:**
- (1, 'New', 'Document captured but not yet processed.')
- (2, 'Processing', 'Document is being sanitized, transcoded, or classified.')
- (3, 'Indexed', 'Document has been filed into the vault and indexed for search.')
- (4, 'Failed', 'Processing failed and requires attention.')
- (5, 'Archived', 'Document processing complete and no longer active.')

**job_type table:**
- (UUID, 'ingest', 'Ingest raw file into $RAW_DIR')
- (UUID, 'transcode', 'Transcode binary to text/MD')
- (UUID, 'classify', 'Run LLM classification (tagging, topic/subtopic)')
- (UUID, 'batch-run', 'Overnight batch processing orchestration')
- (UUID, 'index', 'Update vector embeddings in .smart-env')

**process table:**
- (UUID, 'windows', 'Runs natively on Windows (not WSL)', 'windows')
- (UUID, 'wsl', 'Runs inside WSL2', 'wsl')
- (UUID, 'batch', 'Background batch process', 'batch')

All values queryable and validated via smoke test.

## Implementation Notes

**Execution:** Use `INSERT INTO` statements with hard-coded seed values. UUIDs for job_type and process can be fixed (deterministic) or generated; suggest fixed for simplicity (e.g., `00000000-0000-0000-0000-000000000001`).

**Idempotence:** Check if enums already exist before inserting (or use `INSERT OR IGNORE`). Allows re-running Story 7.5 without errors.

**Smoke test:** After seeding, query each table and verify row counts (5 for status, N for job_type, N for process) and spot-check a row.

## TODO

- Finalize job_type enum values (ingest, transcode, classify, batch-run, index — confirm this list with the full pipeline)
- Finalize process enum values (windows, wsl, batch — any others?)
- Decide: fixed UUIDs or generated? (suggest fixed for determinism)
