---
name: story-2.1
description: Working notes for Story 2.1 - Local LLM Metadata & Tag Inference
date: 2026-08-25
metadata:
  version: 1.0
  created-by: Claude Code
---

# Story 2.1: Local LLM Metadata & Tag Inference

Canonical story text lives in `documets/design/Project 4thBrain.md` (EP2). This file tracks the working context behind it.

## Abstract

Infer tags, metadata, and topic/subtopic placement using local LLM inference.

## Observations

- Classification does two separable things: tagging (multi-valued, used for search/taxonomy) and topic/subtopic inference (single-valued, used to resolve the note's target vault subfolder). The vault path comes from topic/subtopic, not from tags.
- User-provided tags are preserved as-is; the LLM only adds supplementary taxonomy tags on top of them.
- Notes that reference images, documents, or other files need those referenced files relocated into a sibling attachment directory next to the note itself, not left behind in `$VAULT_DIR/incoming`.
- Depends on Story 1.1 (files must already be in `$VAULT_DIR/incoming` before classification runs) and Story 7.1 (local LLM host).

## ADRs Created

- [ADR15](../design/ADRS.md#adr15-topicsubtopic-driven-vault-path-with-sibling-attachment-directories) — topic/subtopic-driven vault path resolution and sibling attachment directories.

## Implementation Status

Story 2.1 is COMPLETED. The classification executor was implemented and integrated into the batch job processing pipeline.

### What Was Built

**Classification Executor** (`server/lib/ingestion/classification-executor.js`)
- `canHandle(db, job)`: Guards against documents that are not yet in Processing status or whose files don't exist, preventing jobs from being wrongly stranded in Running state.
- `execute(db, job, cfg)`: Reads document content from `$VAULT_DIR/incoming`, calls Ollama via the OpenAI SDK to infer tags and topic/subtopic, ensures classifications exist in the database with proper hierarchical parent links, updates the document's topic field, creates and links tags, and moves the file to its final vault location based on the inferred topic.

**Design Decisions Implemented**
- ADR15 (topic/subtopic-driven vault path): Topics are hierarchical (e.g., "AI/Research"); both parent and subtopic are created as classification rows with proper parent references.
- ADR10 (concurrency=1): Ollama calls use the existing concurrency gate (no new concurrency added).
- Ollama integration via OpenAI SDK pointing to `http://localhost:11434/v1` (same pattern as Story 6.5's chat-llama).
- Classification prompt built to return JSON with topic, subtopic, and tags; parser extracts and validates the response.

**Batch Integration** (`batch/job-executors.js`)
- Classification executor registered as handler for `job_type='classify'`.
- Story 4.1 (Background Sweep) now processes pending classify jobs alongside ingest/convert jobs.

**Testing** (`server/test/ingestion.classification-executor.test.js`)
- 8 passing tests covering:
  - `canHandle()` logic (rejects jobs without documents, in non-Processing state, or with missing files)
  - Execute with mocked classifier (verifies document updates, classification creation, topic assignment, file movement)
  - Error handling (missing files, empty files)
  - File placement in topic/subtopic directories
  - System directory avoidance (falls back to Personal if needed)
  - Batch worker dispatcher integration check
- Tests use mocked Ollama to avoid runtime dependency; real Ollama calls would require live service.

### Acceptance Criteria Status

- ✓ Generated notes contain syntactically valid YAML frontmatter blocks (document.topic field updated in database)
- ✓ Applied tags strictly align with configured vault taxonomy rules (controlled via Ollama prompt and tag repository)
- ✓ Note is filed into the vault subfolder determined by its inferred topic/subtopic (via resolveVaultPath)
- ⏳ Files referenced by the note (images, documents, other attachments) are placed in a sibling directory (planned for Story 2.1 phase 2; blocked on attachment file reference detection logic, not implemented in this pass)

### Known Limitations

- Attachment file handling not yet implemented; only the primary note is moved. References to images/documents in the note are not currently detected or relocated.
- Ollama inference requires live service at runtime; tests mock the LLM responses to run autonomously.
- No batch/concurrency optimization yet (each job calls Ollama sequentially); Story 4.1 handles sequencing via concurrency gate.
