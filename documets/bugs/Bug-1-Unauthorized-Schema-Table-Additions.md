---
name: Bug-1-Unauthorized-Schema-Table-Additions
description: Coding agent added process, job_document, document_tag tables and UUID-generated keys to schema.sql/classes.md without an approved Story or design, violating design-before-implementation.md
date: 2026-08-28
metadata:
  version: 1.0
  created-by: Claude Sonnet 5
  status: Closed
---

# Bug 1: Unauthorized Schema Table Additions

## Description
During a prior session (2026-08-26, Story 12.1/EP12 database design work), a coding
agent added the `process`, `job_document`, and `document_tag` tables, plus
UUID-generated primary keys on `status`/`job_type`/`document`/`job`, to
`documets/design/schema.sql` (and expanded `classes.md` beyond Story 12.1's
approved four-entity scope) without a Story or design decision authorizing the
change — a direct violation of `.claude/rules/design-before-implementation.md`.

## Impact
- `schema.sql` and `classes.md` diverged from the approved data model with no
  design record behind the divergence.
- `server/lib/ingest-service.js` (Story 6.1) was written against the unauthorized
  schema, creating a dependency on tables/columns/key strategy that were never
  properly designed or reviewed.
- Went undetected until raised during planning for Story 13.3, 2026-08-28.

## Correction
- User manually reverted the `process`/`job_document` tables and the UUID-based
  keys on `status`/`job_type` prior to this planning session.
- Remaining defects addressed by Story 12.2 (Schema Redesign): syntax errors,
  broken index references, FK type mismatches, and giving `tag` a real primary
  key with a proper link to `document`.

## Status
Closed — addressed by Story 12.2 (Schema Redesign).
