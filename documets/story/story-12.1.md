---
name: story-12.1
description: Working notes for Story 12.1 - Document/Status/Classification/Job Database Schema Design
date: 2026-08-26
metadata:
  version: 1.0
  created-by: Claude Code
---

# Story 12.1: Document/Status/Classification/Job Database Schema Design

Canonical story text lives in `documets/design/Project 4thBrain.md` (EP12). This file tracks the working context behind it.

## Abstract

Design the SQLite schema for the Document/Status/Classification/Job data model.

## Observations

- Sparked by the user opening a new topic — "database design" — pointing at the `Document`/`Status`/`Classification`/`Job` model already sketched in `documets/design/classes.md` from an earlier dictation session. No storage technology had been decided anywhere in the project before this.
- Original scope: cover exactly the four entities already in `classes.md`, don't attempt to resolve the open Tag/Topic-vs-Classification gap noted there, and produce design docs only — no code, no wiring into `server/`. Matches this project's now-established pattern (see `ui/plan.md`) of designing before building.
- **Post-scope expansion (2026-08-26):** The user manually edited `classes.md` to add three new classes — `Job Type`, `Job Document`, and `Process` — and renamed `Document.classification` to `Document.topicId`. This expanded the schema from 4 to 7 tables. A new standalone SQL DDL file (`documets/design/schema.sql`) was generated from the expanded spec, along with an updated ERD (`classes.mmd` → `classes.png`). The earlier 4-entity `database-schema.md` is now marked superseded.
- `Job.status` is a free string, not a foreign key into the `status` table, deliberately — `status` enumerates *document* lifecycle states (New/Processing/Indexed/Failed/Archived), a different value set from job execution states. Preserved that distinction from `classes.md` rather than "fixing" it into one shared enum.
- Proposed SQLite file location follows the same sibling-to-vault-dir pattern ADR14 established for `raw_dir` — not inside the git repo, not inside the Obsidian vault.
- No module (`ui/`, `vault/`, `ingestor-classification/`, `batch/`) currently owns EP12 in the Module Map — it's cross-cutting (documents come from ingestion, classification from EP2, jobs from EP4/batch, status displayed by EP6/dashboard). Left as an open question rather than force a Module Map edit in a design-only pass.

## Deliverable

**Original (4-entity):**
- `documets/design/database-schema.md` — table definitions, full SQLite DDL (including seed data for the fixed `status` enum), storage location/access-pattern decision.
- `documets/img/database-schema.mmd` / `.png` — Mermaid ERD, rendered.

**Expanded (7-entity, post-scope):**
- `documets/design/schema.sql` — standalone SQL DDL covering all 7 tables (status, job_type, process, classification, document, job, job_document) in dependency order, with FKs indexed and the `status` enum seeded.
- `documets/design/classes.mmd` / `classes.png` — updated ERD reflecting the 7-class schema, field renames (classification → topic_id), and all relationships.

## ADRs Created

- [ADR17](../design/ADRS.md#adr17-sqlite-as-the-local-structured-metadata--job-queue-store) — SQLite as the local structured metadata/job-queue store.

## TODO

- Decide which module owns this once it's implemented (candidate: a new `server/db/` shared under the same "cross-cutting infra" reasoning as `server/` itself, per ADR5) — or formalize a Module Map entry.
- Wire `metadata_db_path` into `params.json` and actually create the SQLite file — first implementation story (not yet numbered).
- Resolve the Tag/Topic-vs-Classification gap flagged in `classes.md`'s "Open question" — explicitly deferred, not solved here.
- Once implemented, replace the mocked `/api/status` response in `server/routes/status.js` (Story 6.4) with a real query against this schema.
