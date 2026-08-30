---
name: story-4.1-plan
description: Implementation plan for Story 4.1 Background Sweep & Queue Execution Script using FileSystemWatcher
metadata:
  version: 1.0
  created-by: Claude Code
  date: 2026-08-28
---

# Story 4.1: Background Sweep & Queue Execution Script — Implementation Plan

## Overview

Story 4.1 implements an automated background worker that processes enqueued jobs (created by Story 6.1) and executes them through the mock action handlers (Story 6.1 SUB-TASKS) or, later, real implementations (Stories 1.2, 2.1, 3.1).

## Architecture Options

### Option A: FileSystemWatcher (Recommended)
**Trigger:** Monitor SQLite database file for changes (flush to disk forces file timestamp update)

**Mechanism:**
- PowerShell `System.IO.FileSystemWatcher` object monitors `server/4thbrain-metadata.db`
- On file write event, `LastWriteTime` change indicates database transaction flush
- Watcher triggers job sweep: query database for `status = "New"` records, execute in sequence
- Process completes, sleeps, waits for next file change

**Pros:**
- Minimal latency — reacts immediately to database changes
- Low CPU overhead — event-driven, not polling
- Precise timing — only runs when there's actual work

**Cons:**
- File timestamp resolution may miss rapid transactions
- Requires Windows/WSL2 with FileSystemWatcher support
- Harder to debug/test event timing

### Option B: Polling (Simpler, Also Valid)
**Trigger:** Periodic SQL query every `DELTA` seconds

**Mechanism:**
- PowerShell loop: `while ($true) { $jobs = db.query("SELECT * FROM job WHERE status = 'New'"); foreach $job in $jobs { execute($job); }; sleep($DELTA) }`
- Configurable `DELTA` in `params.json` (e.g., 5-30 seconds)
- Simple, deterministic, easy to test

**Pros:**
- Simple to implement and understand
- Predictable timing
- Easy to test with fixed delays
- No OS-level file monitoring required

**Cons:**
- Higher latency (up to DELTA seconds)
- Constant polling overhead (even when idle)
- Less responsive to bursty job creation

**Recommendation:** Start with Option B (polling) in first pass; optimize to Option A (FileSystemWatcher) if latency becomes an issue.

---

## Implementation Approach (Option B — Polling)

### 1. Database Query
```powershell
# Retrieve unprocessed jobs
$newJobs = @($db.query("
  SELECT id, document_id, job_type, created_at 
  FROM job 
  WHERE status = 'New' 
  ORDER BY created_at ASC 
  LIMIT $THREAD_COUNT
"))
```

**Constraint (ADR17):** Keep transaction brief; read jobs, release lock immediately.

### 2. Job Routing
Based on `job_type` (ingest, transcode, classify, batch-run, index), route to appropriate handler:
- `ingest` → Clipper mock (or Story 1.2 real implementation)
- `transcode` → Extractor mock (or Story 1.2 real implementation)
- `classify` → Classification mock (or Story 2.1 real implementation)
- `batch-run` → RAG Indexing mock (or Story 3.1 real implementation)
- `index` → placeholder for Smart Connections integration

### 3. Handler Execution
Mock handlers (from Story 6.1 SUB-TASKS):
1. Update job status → "Processing"
2. Execute mock logic (state transition, file movement, seeded response)
3. Update job status → "Completed" (or "Failed" on error)
4. Update document status (Clipped, Extracted, Indexed, Classified, etc.)

### 4. Error Handling
- On handler failure: set job status → "Failed", log error to database or file
- Retry strategy: TBD (retry immediately, defer N seconds, skip)
- Orphaned files: clean up temp files if job fails

### 5. Logging
- Each job execution logs to file or database:
  - job_id, document_id, job_type, start_time, end_time, status, error_message (if failed)
- Summary log: total jobs processed, success/failure counts

---

## Implementation Approach (Option A — FileSystemWatcher)

### 1. FileSystemWatcher Setup
```powershell
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = Split-Path -Parent "server/4thbrain-metadata.db"
$watcher.Filter = "4thbrain-metadata.db"
$watcher.NotifyFilter = [System.IO.NotifyFilters]::LastWriteTime
```

### 2. Event Handler
```powershell
Register-ObjectEvent -InputObject $watcher -EventName "Changed" -SourceIdentifier "DbChanged" -Action {
  # Trigger job sweep
  Invoke-JobSweep
}
```

### 3. Throttling
- Debounce rapid events (multiple writes in <1s) to avoid race conditions
- Use `LastWriteTime` tracking to skip duplicate events

### 4. Fallback to Polling
- FileSystemWatcher may miss events under high concurrency
- Fallback to periodic poll every DELTA seconds as safety net

---

## File Structure

```
server/
  ├── jobs/
  │   ├── queue-processor.ps1      # Main loop (polling or event-driven)
  │   ├── handlers.ps1             # Handler dispatch logic
  │   └── mock-actions.ps1         # Mock Clipper, Extractor, RAG, Classification
  ├── lib/
  │   └── job-logger.ps1           # Structured job logging
  └── 4thbrain-metadata.db
```

---

## Configuration (params.json)

```json
{
  "THREAD_COUNT": 1,
  "DELTA": 10,
  "JOB_PROCESSOR": {
    "mode": "polling",
    "poll_interval_seconds": 10,
    "retry_failed_jobs": false,
    "log_dir": "server/logs/jobs/"
  }
}
```

---

## Testing Strategy

### Smoke Test
1. Create a Document and Job via Story 6.1 form
2. Manually trigger job processor (or wait for next poll)
3. Verify job status changes from "New" → "Processing" → "Completed"
4. Verify document status updated
5. Verify mock files created in TMP_DIR / VAULT_INCOMING / VAULT_DIR

### Automated Tests
- Mock test: inject 10 jobs, verify all process in sequence
- Error handling: inject job with invalid handler, verify "Failed" status
- Concurrency: set THREAD_COUNT > 1, inject 5 jobs, verify correct number process in parallel

---

## Acceptance Criteria (Story 4.1)

- ✅ Background job processor executes unattended against pending queue items
- ✅ Job state flags (New, Processing, Completed, Failed) update correctly
- ✅ Document status updated based on job execution result
- ✅ All jobs processed in FIFO order (by created_at)
- ✅ Logs record job execution (start, end, status, errors)

---

## Changelog
- **2026-08-28** — Implementation plan created with two options (FileSystemWatcher vs. polling); Option B (polling) recommended for first pass; file structure and configuration detailed.
