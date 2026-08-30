---
name: classes
description: Data model class definitions (Document, Status, Classification, Job, JobType, JobStatus, JobFile, Tag)
date: 2026-08-28
metadata:
  version: 2.0
  created-by: Claude Code
---

# Data Model Class Specifications

Originally transcribed from `Class_Definitions_Specification.rtf` (user-supplied source). Re-baselined 2026-08-28 by Story 12.2 (Schema Redesign) to match `documets/design/schema.sql` exactly, closing Bug 1 (unauthorized `process`/`job_document` tables and UUID-generated keys added without a Story or design behind them) and the earlier Tag reconciliation gap. `Process` and `JobDocument` are removed from this spec — they are not present in `schema.sql`.

## Document Class

| Field Name | Data Type | Description / Details |
|---|---|---|
| id | INTEGER, PK | Auto-generated (SQLite `INTEGER PRIMARY KEY`); not a UUID. |
| name | String | Name of the document. |
| uri_location | URI | Supports protocols: file, https, http, obsidian. |
| mime_type | String | MIME type of the document, if known. |
| charset | String | Character encoding of the document, if known. |
| status | String, not null, FK Status(name) | Reference to Status name. |
| created | Timestamp | Timestamp when the document was created. |
| updated | Timestamp | Timestamp when the document was last updated. |
| topic | String, FK Classification(name) | Reference to Classification name. |

## Status Class

| Field Name | Data Type | Description / Details |
|---|---|---|
| name | String, PK | Short string values: New, Processing, Indexed, Failed, Archived. |
| description | String | Detailed text description of the status. |

## Classification Class

| Field Name | Data Type | Description / Details |
|---|---|---|
| name | String, PK | Classification name; globally unique across the whole tree (no surrogate id). Doubles as a registry of known system directory roles (e.g. `VAULT_DIR`, `VAULT_RAW`, `TMP_DIR`), each resolvable to an actual filesystem path via a matching uppercase key in `params.json`. |
| parent | String, FK Classification(name) | Parent classification name for hierarchical structure. |

## Job Class

| Field Name | Data Type | Description / Details |
|---|---|---|
| id | INTEGER, PK | Auto-generated (SQLite `INTEGER PRIMARY KEY`); not a UUID. |
| job_type | String, not null, FK JobType(name) | Type of job being executed. |
| document_id | INTEGER, FK Document(id) | Document this job is processing, if any. |
| start_date | Timestamp | Execution start timestamp. |
| end_date | Timestamp | Execution end timestamp. |
| status | String, not null, FK JobStatus(name) | Execution status. |
| parent_job_id | INTEGER, FK Job(id) | Reference to the parent job. |

## JobType Class

| Field Name | Data Type | Description / Details |
|---|---|---|
| name | String, PK | Short name (e.g. ingest, convert, classify, index). |
| description | String | Long description. |

## JobStatus Class

| Field Name | Data Type | Description / Details |
|---|---|---|
| name | String, PK | Job lifecycle state: New, Running, Completed, Failed. Distinct from Document `Status` — a job's lifecycle isn't a document's lifecycle. |
| description | String | Detailed text description of the status. |

## JobFile Class

| Field Name | Data Type | Description / Details |
|---|---|---|
| id | INTEGER, PK | Auto-generated (SQLite `INTEGER PRIMARY KEY`). |
| name | String | File name. |
| path | String | Filesystem path. |
| mime_type | String | MIME type, if known. |
| directory | String | Directory the file lives in. |
| job_id | INTEGER, FK Job(id) | Job this file is associated with. |
| status | String | File status, distinct from job status; intentionally unvalidated free text for now (no FK). |
| lock_by_PID | INTEGER | OS process ID currently holding the file locked, if any. |

## Tag Class

| Field Name | Data Type | Description / Details |
|---|---|---|
| name | String, PK | Tag name — the identity itself, no surrogate id. |
| start_date | Timestamp | When the tag was created. |
| end_date | Timestamp | When the tag was retired. Tags are never hard-deleted — "removing" a tag sets `end_date`, so any FK pointing at it is never orphaned by a cascade. |
| active | Boolean | Whether the tag is currently active (mirrors `end_date IS NULL`, kept as an explicit column). |

**Document ↔ Tag** is many-to-many via the `document_tag` link table: `document_id` (FK `Document(id)`) + `tag_name` (FK `Tag(name)`), composite primary key.

## Resolved gaps

The previous version of this file noted an unreconciled gap: an earlier dictated class list named `Document, DocumentReference, Tag, Topic, Subtopic, Job`, while the then-current spec covered only `Document, Status, Classification, Job` with no separate `Tag` class, even though FR3/Story 2.1 called for multi-valued tags distinct from single-valued topic/subtopic. That gap is closed by this revision: `Tag` is now a formal class with its own lifecycle (start/end date, no hard delete), linked to `Document` many-to-many via `document_tag`.
