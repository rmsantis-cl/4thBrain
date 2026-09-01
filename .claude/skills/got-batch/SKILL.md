---
name: got-batch
description: Check Anthropic Batch API job status and update BATCH_TRACKER.md with latest info. Retrieve results if job is complete.
---

## Invocation

### Check batch status (update BATCH_TRACKER.md)

```
/got-batch <batch_id>
```

Example: `/got-batch b_1234abc567def`

Queries the Batch API for current status of the batch job, updates `BATCH_TRACKER.md` with the latest status and "last checked" date, and reports the result. If the job is complete, provides retrieval instructions.

### Retrieve batch results

```
/got-batch <batch_id> --retrieve
```

If the batch is complete, downloads and displays the results (stdout captured from the batch job).

### No automatic checking

By default, does NOT retrieve results even if complete — only updates status and reports. Use `--retrieve` flag to download and display results when ready.

---

## What this does

Fetches current batch status from Anthropic's Batch API, updates `BATCH_TRACKER.md` with:
- Current status (queued, processing, completed, failed, expired, canceled)
- "Last Checked" date (current date)
- Completion date (when status changes to `finish`)

Useful for checking on long-running tasks submitted via `/submit-batch` without blocking the current session. Results stay retrievable indefinitely using the batch ID.

## Steps

1. **Validate input**: Ensure batch ID is provided in the form `b_*`.

2. **Query Batch API**: Call Anthropic's `GET /v1/messages/batches/{batch_id}` endpoint with API key.

3. **Parse response**: Extract status, request counts, request counts (completed/failed/expired), created_at, expires_at fields.

4. **Update BATCH_TRACKER.md**:
   - Find the row with matching batch ID
   - Update the `Status` column: `active` → `finish` if completed/failed/expired; keep `active` if queued/processing
   - Update the `Last Checked` column to today's date
   - If status is complete (not queued/processing), update `Completed` column with completion date
   - Save the file

5. **Report to user**:
   - Batch ID
   - Current status
   - Request counts (if processing)
   - Completion date (if finished)
   - Next steps (e.g., "Run `/got-batch {id} --retrieve` to download results")

6. **Optionally retrieve results** (only if `--retrieve` flag is present):
   - If batch is not complete, report "Job not finished yet"
   - If complete, download results via `anthropic batches get {batch_id}` or API call
   - Extract the response message from batch output
   - Display or save results for user review
