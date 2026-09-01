---
name: BATCH_TRACKER
description: Track all submitted Anthropic Batch API jobs with ID, status, and metadata
metadata:
  version: 2.0
  created-by: Claude Code
  date: 2026-08-31T16:00:00-04:00
---

# Batch Tracker

Persistent record of all tasks submitted to Anthropic's Batch API via `submit-batch`. Used to retrieve results after batch completion and monitor long-running jobs across sessions.

Friendly IDs are human-readable aliases for batch jobs. Real Anthropic API IDs (msgbatch_*) are stored in HTML comments for internal reference.

| Friendly ID | Description | Submitted (EST) | Completed (EST) | Status | Last Checked (EST) | API ID |
|-------------|-------------|----------|----------|--------|------------|--------|
| The Greeting Herald #1 | Output 'Hello World' and list the current date. Keep response under 100 words. | 2026-08-31T14:30:45-04:00 | 2026-08-31T14:45:30-04:00 | finish | 2026-08-31T14:45:30-04:00 | <!-- msgbatch_01TpWXybqTmr26xhZG7Zy6Ad --> |
| The Numbered Voyager #2 | Count from 1 to 5 and output each number on a new line. Add nothing else. | 2026-08-31T14:32:15-04:00 | 2026-08-31T22:01:52-04:00 | finish | 2026-08-31T22:01:52-04:00 | <!-- msgbatch_01AVQvQ2ARZcKEfaSb8PQG6v -->
| The Tabular Architect #3 | Create a markdown table with 3 rows: Name, Age, City. Use sample data. Output only the markdown table. | 2026-08-31T14:35:00-04:00 | — | active | 2026-08-31T15:02:10-04:00 | <!-- msgbatch_017AdL9KPS4mUpbHd8eTTyG6 --> |
| The Greeting Herald #4 | Output 'Hello World' and list the current date. Keep response under 100 words. | 2026-08-31T14:38:30-04:00 | — | active | 2026-08-31T15:05:45-04:00 | <!-- msgbatch_013C79sW43XKP9m8vpaEfis4 --> |
| The Numbered Voyager #5 | Count from 1 to 5 and output each number on a new line. Add nothing else. | 2026-08-31T14:40:22-04:00 | — | active | 2026-08-31T15:08:15-04:00 | <!-- msgbatch_01QdyashKmamXaqc1F66doq3 --> |
| The Tabular Architect #6 | Create a markdown table with 3 rows: Name, Age, City. Use sample data. Output only the markdown table. | 2026-08-31T14:42:50-04:00 | — | active | 2026-08-31T15:10:30-04:00 | <!-- msgbatch_01XKKHPRv6ntDziSB35cATe7 --> |
| The Great Sanitization Quest #7 | Complete Story 1.2: Unstructured Text Parsing & Sanitization (GATE: stop if WSL unavailable) | 2026-09-01T08:15:00-04:00 | 2026-08-31T22:01:51-04:00 | finish | 2026-08-31T22:01:51-04:00 | <!-- msgbatch_01V17aWYyAWuYZK2J2vvhsLi -->
| Phoenix Oracle #980 | Create comprehensive integration tests for 4thBrain REST API ingestion endpoints. Test POST /api/ingest/text (small text, 300-character text), POST /api/ingest/file (text file submission), POST /api/ingest/url (https://arxiv.org/abs/2410.10435). Test error handling (missing fields), tags support. Verify: HTTP 200 success status, jobId in response, document created in SQLite database with correct metadata, files written to disk, URI locations recorded. Use node:test and node:assert/strict patterns (see server/test/ingest-service.test.js). Use createTestDb() and createTestCfg() test helpers. Create server/test/api-ingestion-integration.test.js with 7+ comprehensive test cases. Run all tests and output final report: test execution summary (pass/fail count), any issues found that need fixing, test coverage assessment, recommendations for improvements.
 | 2026-08-31T21:43:25-04:00 | � | active | 2026-08-31T21:43:25-04:00 | <!-- API ID: msgbatch_01PviUjA51Anzh99AdcrqAqG -->
| Mythic Voyager #831 | Test Story 1.2 HTML sanitization end-to-end with real HTML files | 2026-09-01T09:35:00-04:00 | — | in_progress | 2026-09-01T09:35:00-04:00 | <!-- msgbatch_01QktAc6YE0zWPH5DvSRqHqe --> |

Run the full ingestion pipeline with real HTML files (web clips, saved pages) through the new html-sanitize-executor. Verify:
1. HTML files ingested via POST /api/ingest/file (with text/html MIME type)
2. Content is routed through html-sanitize-executor (Readability + Turndown)
3. Markdown output is clean and semantically correct
4. Original HTML is archived to vault/raw
5. Processed markdown lands in vault/incoming with reference to raw original
6. Frontmatter is generated with proper tags and metadata

Test files to use: saved web clips from https://arxiv.org/abs/2410.10435 and a local HTML test file.

Output a detailed test report:
- Which stages passed/failed
- Any errors or exceptions
- Markdown quality assessment
- Recommendations for next steps
- If blocked on Task-2 (wiring executor into file-validator), note that clearly

Do not fix failures � just report them in detail. | 2026-08-31T22:11:59-04:00 | � | active | 2026-08-31T22:11:59-04:00 | <!-- API ID: msgbatch_01XWdyUJK7GGupHa6kWmgepA -->
