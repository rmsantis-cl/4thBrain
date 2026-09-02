---
name: Bug-4-Text-Ingestion-Returns-Undefined
description: POST /api/ingest/text returns undefined values for jobId and message
metadata:
  version: 1.0
  created-by: Claude Haiku 4.5
  status: Open
---

# Bug 4: Text Ingestion Returns Undefined Values

**Story:** 6.1 (Web Ingestion Form & Submission Handler) — text form submission

**Date Discovered:** 2026-09-02

## Description

Attempting to submit text via the "Add text" panel results in the UI showing:
```
undefined (jobId undefined)
```

The API call completes (no network error, HTTP 200 implied by `.then()` chain), but the response contains undefined values for `message` and `jobId` fields, indicating either:
1. The values were never set in the response
2. The response structure is malformed
3. A silent error occurred before response generation

## Reproduction

1. Open 4thBrain chat at `http://localhost:3000/chat`
2. Click "Add text" panel
3. Enter text: "Hello world"
4. Click Submit
5. **Expected:** "staged X characters of text to [path] (jobId N)"
6. **Actual:** "undefined (jobId undefined)"

## Technical Details

**Request:**
- Endpoint: `POST /api/ingest/text`
- Payload: `{ text: "Hello world", tags: "" }`
- Content-Type: `application/json`

**Expected Response (from `server/routes/ingest.js`):**
```json
{
  "jobId": <integer>,
  "message": "staged <N> characters of text to <path>"
}
```

**Actual Response:** Contains fields, but values are undefined (or missing entirely)

## Root Cause (Hypothesis)

Three likely culprits:

### 1. Directory Access Issue
`raw_dir` in `params.json` points to `C:\Users\rsant\desar\Local Vault\RAW_DIR`, which may:
- Not exist (not created on startup)
- Not be writable (permissions)
- Have path issues (spaces in path)

When `rawDirWriter.writeText()` calls `fs.writeFileSync(destPath, text, 'utf-8')`, an error is thrown but caught silently by the try/catch in the route handler, leaving `written` undefined.

### 2. Database Error in Job Creation
`createIngestJob()` may fail (transaction error, FK constraint, etc.), throwing an error that gets caught, but the response still attempts to use `jobId` (which is never assigned).

### 3. Config Load Failure
`req.app.locals.config` may be missing or incomplete if config initialization failed on startup.

## Investigation Steps

```bash
# Step 1: Verify raw_dir exists and is accessible
Test-Path "C:\Users\rsant\desar\Local Vault\RAW_DIR"

# Step 2: Check server startup logs
cd server && npm start 2>&1 | Tee-Object -FilePath debug.log

# Step 3: Try submitting text and check full server log for errors

# Step 4: Check if directories were created
Get-ChildItem "C:\Users\rsant\desar\Local Vault" -Force

# Step 5: Run database health check
sqlite3 server/4thbrain-metadata.db "SELECT COUNT(*) FROM job;"
```

## Proposed Fix

**Immediate (Diagnostic):**
1. Add explicit error logging in `server/routes/ingest.js`:
   ```javascript
   catch (err) {
     console.error("Text ingestion failed:", err);  // <-- Log full error
     res.status(500).json({ error: err.message });
   }
   ```

2. Run server with debug, attempt text submission, check logs for exact error

**Long-term (Robustness):**
1. Validate `raw_dir` exists during config initialization
2. Return proper error responses instead of undefined values
3. Add unit test for text ingestion (currently exists for file ingestion)

## Status

**Open** — Blocking Story 6.1 text ingestion. Needs server debug logs to pinpoint exact failure.

## Related Files

- `server/routes/ingest.js` — POST /api/ingest/text handler
- `server/lib/raw-dir-writer.js` — writeText() function
- `server/lib/ingest-service.js` — createIngestJob() function
- `server/config.js` — Config initialization (ensureDir logic)
- `server/ui/client.js` — Client-side form submission (lines 72-89)
- `params.json` — Configuration with raw_dir path
