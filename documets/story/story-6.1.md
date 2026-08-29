---
name: story-6.1
description: Web Ingestion Form & Submission Handler — working notes and implementation status
metadata:
  backup-cycle: session
  version: 1.0
  created-by: Claude Code
  date: 2026-08-28
---

# Story 6.1: Document Ingestion Form

## Epic
EP6 — Web UI, Ingestion API, Search, Dashboard

## Abstract
Build web-based entry form for submitting links, files, and text directly into the 4thBrain ingestion pipeline.

## Description
Construct frontend form components allowing raw text input, file uploads, and web URL submissions directly to the Node.js ingestion endpoint. The form lives in the `/chat` shell (part of Story 6.4's UI architecture) and works alongside Story 6.3's pipeline monitoring dashboard. When a user submits the form, a valid pipeline job is created immediately and a unique Job ID is returned.
This story implements "input" state from [[Ingestion-State-Diagram]]


## Dependencies
- depends on **Story 1.1** (Direct Structured Vault Ingestion) — ingestion pipeline must exist
- depends on **Story 6.4** (Common UI Shell & Design System) — form renders inside the shared UI shell
- must be worked with **Story 6.3** (Pipeline Monitoring & Dashboard UI) — monitoring panel watches jobs created by this form

## USE CASES
- `url`: Entering a URL creates a document and enqueues it in the Clipper action queue
- `typed text`: A document is created, saved in TMP_DIR, and submitted to `RAG Indexing`
- `local file path`: File copied to TMP_DIR; MIME type is calculated from extension and content
  - `text/plain`, `text/markdown`, and other `text/*` are submitted to `RAG Indexing`
  - Other MIME types are submitted to `Extract` action queue 
- `post document`: A document posted in multipart/form-data format is stored in TMP_DIR and processed like the others.
  
## Actions and Actuators

> **Note:** Story 6.1 creates Document records and changes their state and location in the file system. The following actions are implemented by Stories 1.1, 1.2, 2.1, 3.1, 4.1, and covered in their respective working notes.

| actuator | story |
|---|---|
| Clipper | 1.2 | 
| RAG Indexing | 3.1 |
| Extractor | 1.2 | 
| Classification | 2.1 | 

## Actuators specs

### RAG Indexing (Story 3.1)
- Copies file from TMP_DIR to VAULT_INCOMING
- Smart Connections will index it and we need to monitor the file status: success or skip
- On success: document marked indexed; sent to Classification job
- On skip (file too short, unsupported format): document moved to VAULT_RAW, status marked Failed

### Clipper (Story 1.2)
- Fetches HTML content from URL — **implementation tool selection: see [[spike-webclipping]]**
- Stores HTML/text in TMP_DIR with appropriate MIME type
- Scans document for embedded URLs and images; creates child Document records for each reference
- Text files enqueued to RAG Indexing; binary/archive files enqueued to Extractor
- Monitors Smart Connections to track indexing progress

### Extractor (Story 1.2)
- Converts binary files (PDF, Word, images, archives) to plain text — **implementation tool selection: see [[spike-extraction]]**
- Creates transcription Document record with extracted text
- Enqueues transcription to RAG Indexing
- If extraction fails: original file moved to VAULT_RAW, Document marked Failed

### Classification (Story 2.1)
- Sends indexed Document to local LLM (Ollama) for topic/subtopic/tag inference
- LLM returns structured metadata (topic, subtopic, tag list)
- File moved from VAULT_INCOMING to VAULT_DIR/{topic}/{subtopic}/{fileName}.md
- Transcribed/extracted files: original stored as sibling at {fileName}/original.{ext}
- Clipped documents: attached images moved to {fileName}/ subdirectory


## Acceptance Criteria
When documents are submitted, we expect them to follow the State Diagram.
What each actuator does is described at [[story-6.1#Actuators specs]]
In the `first version` for state flow testing, we will use mocks implemented by [[story-6.1#Actuator Mocks]]

  - [ ] Submitting URL
    1.  [ ] pointing to HTML with images 
    2.  [ ] point to an md file
    3.  [ ] point to a PDF file
    4.  [ ] point to zip file
  - [ ] Type a text: a new document is created 
  - [ ] Local File
    1. - [ ] Local TXT file
    2. - [ ] Local MD file
    3. - [ ] Local PDF
    4. - [ ] local zip file
  - [ ] Form-encoded posted document
    1. - [ ] TXT file
    2. - [ ] MD file
    3. - [ ] PDF
    4. - [ ] Zip file

## Actuator Mocks

The following SUB-TASKS implement mock handlers that simulate downstream actions (Clipper, Extractor, RAG Indexing, Classification) with seeded responses. Mocks must execute state transitions and file movements as if real actions had completed.

### SUB-TASK-6.1.1: Implement Mock Clipper Handler
For URL input: returns seeded HTML/markdown content simulating web fetch
- Input: Document with URL metadata
- Mock behavior: 
  - HTML URL (with images): return seeded HTML with embedded image references; create mock child Document records for images
  - Markdown URL: return seeded markdown text
  - PDF URL: return mock extracted text (as if Extractor had run)
  - ZIP URL: return mock file listing
- State change: document status → "Clipped"
- File movement: store mock content in TMP_DIR/{document_id}.{ext}

### SUB-TASK-6.1.2: Implement Mock Extractor Handler
For binary file input: returns seeded text content simulating extraction
- Input: Document with binary file reference (PDF, image, archive, etc.)
- Mock behavior:
  - PDF file: return seeded extracted text
  - Image (JPG/PNG): return seeded OCR text
  - Office document (DOCX): return seeded extracted text
  - Archive (ZIP): return mock file listing
  - Other formats: return mock transcription note
- State change: document status → "Extracted"
- File movement: store mock transcription in TMP_DIR/{document_id}_transcription.txt; archive original to VAULT_RAW

### SUB-TASK-6.1.3: Implement Mock RAG Indexing Handler
For text input and extracted text: simulates indexing without actual Smart Connections
- Input: Document with text file reference
- Mock behavior: mark document as indexed immediately (no actual Smart Connections interaction)
- State change: document status → "Indexed"
- File movement: copy text file from TMP_DIR to VAULT_INCOMING/{document_id}.md

### SUB-TASK-6.1.4: Implement Mock Classification Handler
For indexed documents: returns seeded topic/subtopic/tags
- Input: Indexed Document
- Mock behavior: assign seeded topic/subtopic (based on input type hash), generate 3-5 mock tags
- State change: document status → "Classified"
- File movement: move file from VAULT_INCOMING to VAULT_DIR/{topic}/{subtopic}/{document_id}.md

### SUB-TASK-6.1.5: Validate All Acceptance Criteria
- Test all use cases (4 URL types, 3 file types, 1 text type, 4 form-submitted types) with mocks
- Verify state transitions match state diagram expectations
- Verify file movements occur as specified
- Verify checkboxes under [[story-6.1#Acceptance Criteria]] all pass

## Status
**WORKING** — While there are use cases not working as intended with the mocking actions.
When all use cases from [[story-6.1#Acceptance Criteria]] are complete, new stories will be created to implement all the actions, unless that story already exists. A new test story will be created to test the Ingestion after the actual actuator is implemented.

The term queue is used generically as ingestion may receive multiple files at a time, and they will be processed THREAD_COUNT at a time. THREAD_COUNT is a parameter in params.json, default 1.
Using states in table fields is acceptable, as long as data consistency is assured.

## Implementation Status

### Completed
- [ ] All use cases from [[story-6.1#Acceptance Criteria]] are verified using mocking actuators
- [ ] A story to implement the actuator exists
- [ ] A story to test ingestion using the real actuator 
- [ ] System generates logs of processed documents
- [ ] Errors are properly logged and documents and files are stored properly

### Blocked / Known Gap
The design pipeline debt has been fulfilled.

**Reference:** See `documets/design/6.1-pipeline-gap.md` for detailed analysis.

## Files Modified / Created
- `server/ui/page.js` — ingestion form component
- `server/ui/client.js` — form submission handler and UX
- `server/ui/styles.js` — form styling (design system)
- `server/routes/ingest-service.js` — POST /api/ingest endpoint
- `server/db/init.js` — database initialization (if needed)

## Related Stories
- **Story 4.1** (Background Sweep & Queue Execution Script) — unblocks end-to-end ingestion
- **Story 6.3** (Pipeline Monitoring & Dashboard UI) — monitors jobs created here
- **Story 6.4** (Common UI Shell & Design System) — provides the UI container
- **Story 1.1** (Direct Structured Vault Ingestion) — the backend being invoked

## Key Database Tables Involved
- `document` — metadata for ingested content
- `job` — tracks processing state
- `status` — fixed enum (New, Processing, Indexed, Failed, Archived)
- `job_type` — fixed enum (ingest, transcode, classify, batch-run, index)

## Testing Checklist
- [ ] Submit form with raw text — verify Job ID returned and database record created
- [ ] Submit form with file upload — verify file stored and Job ID returned
- [ ] Submit form with URL — verify URL recorded and Job ID returned
- [ ] Verify form submission doesn't break under rapid clicks (debounce)
- [ ] Verify form validation messages appear for invalid input
- [ ] Verify mobile viewport (360px) form is accessible and keyboard-navigable
- [ ] Once Story 4.1 lands, verify jobs are consumed by batch processor

## Open Questions / Next Steps
1. Should the form show a progress spinner while waiting for the Job ID response? (UX polish)
2. Should failed form submissions show a retry mechanism?
3. Once Story 4.1 is implemented, verify end-to-end flow: form → database → batch processor → vault ingestion.

## Changelog
- **2026-08-28** — Working notes created; implementation status documented; pipeline consumption gap identified.
