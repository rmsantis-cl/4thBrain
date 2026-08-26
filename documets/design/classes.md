---
name: classes
description: Data model class definitions (Document, Status, Classification, Job)
date: 2026-08-25
metadata:
  version: 1.0
  created-by: Claude Code
---

# Data Model Class Specifications

Transcribed from `Class_Definitions_Specification.rtf` (user-supplied source).

## Document Class

| Field Name | Data Type | Description / Details |
|---|---|---|
| UUID | ID, PK  | Standard UUID identifier. |
| name | String | Name of the document. |
| URI location | URI | Supports protocols: file, https, http, obsidian. |
| statusId | not null, FK Status ID | Reference to Status ID. |
| created | Timestamp | Timestamp when the document was created. |
| updated | Timestamp | Timestamp when the document was last updated. |
| topicId | Fk , Classification ID | Reference to Classification ID. |

## Status Class

| Field Name | Data Type | Description / Details |
|---|---|---|
| ID | Integer | Sequential integer identifier. |
| name | String | Short string values: New, Processing, Indexed, Failed, Archived. |
| description | String | Detailed text description of the status. |

## Classification Class

| Field Name | Data Type | Description / Details |
|---|---|---|
| ID | UUID , PK | Unique UUID identifier for the classification. |
| name | String | Classification name. |
| parent | UUID FK Classification.ID| Parent classification UUID for hierarchical structure. |

## Job Class

| Field Name | Data Type | Description / Details |
|---|---|---|
| ID | UUID, PK | Unique UUID identifier for the job. |
| job type | Not null, FK Job Type ID | Type of job being executed. |
| start date | Timestamp | Execution start timestamp. |
| end date | Timestamp | Execution end timestamp. |
| status | String | Execution status string. |
| parent job ID | UUID | Reference to the parent job UUID. |

## Job Type class
| Field Name | Data Type | Description / Details |
|---|---|---|
| ID | UUID, PK | Unique UUID identifier for the jobtask |
| name | String | short name |
| description | String | long description |

## Job Document
| Field Name | Data Type | Description / Details |
|---|---|---|
| ID | UUID, PK | Unique UUID identifier for the job document. |
| jobId | UUID, not null , FK Job.Id | Reference to the job UUID. |
| docId | UUID, not null, FK Document.Id | Reference to the document UUID. |
| processId | UUID, not null, FK Process.Id | Reference to the process UUID. |
| PID | string | the actual process instance |
| status | String | execution status string |

## Process class

| Field Name | Data Type | Description / Details |
|---|---|---|
| ID | UUID, PK | Unique UUID identifier for the process |
| name | String | short name |
| description | String | long description |
| environment | String | environment ( windows, wsl , batch ) |


An earlier dictated class list named Document, DocumentReference, Tag, Topic, Subtopic, and Job. This spec covers Document, Status, Classification, and Job only — `Classification`'s self-referencing `parent` field expresses topic/subtopic hierarchy, and there's no separate multi-valued `Tag` or `DocumentReference` class. FR3/Story 2.1 (`documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md`, `documets/design/Project 4thBrain.md`) separately call for multi-valued tags distinct from single-valued topic/subtopic — reconciling that gap is unresolved.
