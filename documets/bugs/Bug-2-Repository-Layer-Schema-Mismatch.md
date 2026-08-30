---
name: Bug-2-Repository-Layer-Schema-Mismatch
description: The repository layer (document.js, job.js, tag.js, classification.js) references columns removed or renamed by the Story 12.2 schema redesign, breaking document/job creation end-to-end
date: 2026-08-30
metadata:
  version: 1.0
  created-by: Claude Sonnet 5
  status: Closed
---

# Bug 2: Repository Layer Out of Sync With Story 12.2 Schema

## Description

`documets/design/schema.sql` was updated for Story 12.2 (Schema Redesign,
2026-08-28) — natural keys on lookup tables, `tag`/`classification` losing
their `description` column, `document` gaining `name`/`uri_location`/
`mime_type`/`charset`/`created`/`updated` in place of the old
`created_date`/`ingestion_notes`, and `job` gaining `start_date`/`end_date`
in place of `created_date`. `server/lib/repositories/` was never updated to
match. BACKLOG-TRACKER.md's "Follow-up Tasks" section already flagged the
*documentation* side of this gap (PROJECT-SUMMARY.md, classes.mmd, etc. still
describing the old 7-table model) but did not catch that the **repository
code** itself was also left on the old shape.

## Discovery

Found while implementing Story 1.1/1.2's dependency, Story 4.1, and while
tracing Story 6.1's ingestion path to see how a job records the file it
should process. Confirmed empirically against a fresh in-memory database
built from the live `schema.sql`:

```
createIngestJob(db, { name: "probe-test.txt", uriLocation: "/tmp/probe-test.txt", ... })
→ FAILURE: Error - no such column: description
```

(`TagRepository.upsert` → `create` selects/inserts a `description` column
that doesn't exist on `tag`.)

## Impact

Every repository method below throws `no such column` the moment it runs
against the real schema:

| Repository | Broken columns | Effect |
|---|---|---|
| `tag.js` | `description` (not on `tag`) | `TagRepository.create/get/list/upsert` all fail |
| `classification.js` | `description` (not on `classification`) | `create/get/list` all fail |
| `document.js` | `created_date`, `ingestion_notes` (not on `document`); missing `name`, `uri_location`, `mime_type`, `charset` (NOT NULL on `document`, never written) | `create/get/list/update` all fail, and even if they didn't, would never persist the file location a job is meant to process |
| `job.js` | `created_date` (not on `job`, actual columns are `start_date`/`end_date`) | `get/list` fail |

Because `server/lib/ingest-service.js` (Story 6.1) calls `repos.tag.upsert()`
before `repos.document.create()`, **every** `/api/ingest/file`,
`/api/ingest/text`, and `/api/ingest/url` request that includes a tag has
been throwing since the schema redesign landed (2026-08-28). Untagged
submissions would have failed one call later, at `repos.document.create("new", null, name)`
— both on the missing `name`/`uri_location`/`charset`/`mime_type` values and
on `status` casing (`"new"` was passed lowercase; the seeded enum value is
`"New"`).

Separately (not a schema mismatch, but found alongside it): `ingest-service.js`
received `uriLocation`/`mimeType`/`charset` for the staged file but never
wrote a `job_file` row, so even a job that *did* get created had no queryable
record of which file it should process — blocking Story 4.1's worker from
having anything to act on.

## Correction

Addressed directly as a prerequisite for implementing Stories 1.1 and 4.1
(2026-08-30):
- `document.js`, `job.js`, `tag.js`, `classification.js` rewritten to match
  `schema.sql` exactly (see git history / `server/lib/repositories/`).
- `ingest-service.js` fixed: correct `document.create()` argument order and
  status casing (`"New"`), plus a new `repos.job_file.create()` call so every
  ingest job has a queryable file record.
- Regression tests added under `server/test/repositories.*.test.js` and
  `server/test/ingest-service.test.js` asserting each repository's CRUD
  methods run clean against a fresh `schema.sql`-built database.

## Status

Closed — fixed inline while implementing Stories 1.1/4.1. See
`documets/story/story-1.1.md` and `documets/story/story-4.1.md` for the
downstream work this unblocked.
