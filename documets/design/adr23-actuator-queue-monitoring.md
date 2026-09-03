---
name: adr23-actuator-queue-monitoring
description: Design for real-time visibility into document ingestion through job queue and executor pipeline (Story 13.4)
metadata:
  version: 1.0
  created-by: Claude Haiku 4.5
  date: 2026-09-02
---

# ADR 23: Actuator Queue Monitoring Dashboard

**Date Created:** 2026-09-02  
**Status:** Accepted  
**Epic:** EP13 (Admin & Monitoring Tools)  
**Story:** 13.4 (Actuator Queue Monitoring Dashboard)

## Problem

When users submit documents via the ingestion form (text/file/URL), they receive a jobId but have no visibility into:
1. **Queue progression** — What stage is each executor at (pending/running/completed)?
2. **Document tracking** — Did my document reach the vault? Where did it end up?
3. **Error details** — Why did my job fail? What's the actual error message?
4. **Executor health** — Are all the job executors working, or are some backed up?

This story provides end-to-end visibility through the job queue and executor pipeline so users (and QA) can troubleshoot ingestion issues and monitor system health.

## Design Decision

### Architecture

Two components: a backend status endpoint and a frontend admin panel.

**Backend: `/api/actuators/status` endpoint**

A single read-only endpoint that aggregates job queue state across all executor types.

```
GET /api/actuators/status
Response:
{
  "executors": {
    "ingest": {
      "pending": 3,
      "running": 1,
      "completed": 42,
      "failed": 2,
      "lastJobId": 45,
      "failedJobs": [
        { id: 43, documentId: 10, errorMessage: "...", startDate: "...", endDate: "..." },
        { id: 41, documentId: 9, errorMessage: "...", startDate: "...", endDate: "..." }
      ]
    },
    "convert": { ... },
    "classify": { ... },
    "index": { ... },
    "briefing": { ... }
  },
  "lastUpdated": "2026-09-02T14:30:45Z"
}
```

The counts and failed-job details come from the `job` table (Story 13.3 repository layer) filtered by `job_type` (ingest, convert, classify, index, briefing) and `status` (New/Running/Completed/Failed).

**Frontend: Actuators panel in `/chat` sidebar**

A new nav item ("Actuators") that opens a dedicated panel. The panel contains:

1. **Search/filter box** — Enter a jobId or document URI to track a single document's progress
2. **Executor queue cards** — Five cards (one per executor type) showing:
   - Executor name (ingest, convert, classify, index, briefing)
   - Status badge colors (pending=neutral, running=blue, completed=green, failed=red)
   - Counts: pending, running, completed, failed
   - "View failed" link to expand failed jobs for this executor

3. **Document tracking section** — Shown when user searches for a jobId:
   - Document name and URI
   - Current status (New/Processing/Indexed/Failed/Archived)
   - Job progression: a timeline showing which executors have touched it (start/end dates)
   - Final vault location (if indexed)
   - Error message (if failed)

4. **Failed jobs list** — Expandable list of recent failed jobs across all executors:
   - Job ID, document ID, executor type, error message
   - Sortable by date, executor, or error type
   - Click to see full job details

### UI Consistency

**Panel layout:**
- Matches existing panels (Status, Search) — card-based, section headings, consistent spacing
- Uses the existing design system (color palette, typography, button styles from `server/ui/styles.js`)

**Executor cards:**
- Mimic the stat-grid layout from the Status panel (`renderStatusPanel()`)
- Each card shows executor name + 4 counts (pending/running/completed/failed) + status badges
- Hover effect consistent with search result cards

**Search/filter:**
- Text input matching the search panel style (rounded corners, border, focus state)
- Real-time validation (highlight invalid jobId in red, valid IDs in green)
- "Clear search" button to reset

**Colors & status badges:**
- Blue (`--status-active`) for running jobs
- Green (`--status-done`) for completed jobs
- Red (`--status-failed`) for failed jobs
- Neutral grey for pending/new jobs

### Query & Performance

**Backend query pattern:**
- `SELECT COUNT(*) FROM job WHERE job_type = 'ingest' AND status = 'New'` (and similar for other statuses)
- Query by `job_type` and `status` to get counts and recent failed jobs
- Indexes already exist (`idx_job_type`, `idx_job_status`)
- Expected response time: <100ms for all executors combined

**Frontend polling:**
- No automatic polling (user clicks "Refresh" button to pull latest data)
- Optional: add a 30s auto-refresh toggle in settings for power users
- Search results update live (no polling for search queries)

### Data Model References

All data comes from existing tables:
- `job` — job records with id, job_type, status, error_message, start_date, end_date, document_id
- `document` — document records with id, name, uri_location, status, created, updated, topic (vault path)
- `status` (lookup table) — document statuses (New, Processing, Indexed, Failed, Archived)
- `job_status` (lookup table) — job statuses (New, Running, Completed, Failed)
- `job_type` (lookup table) — executor types (ingest, convert, classify, index, briefing)

No schema changes needed.

## Why This Design

1. **Single responsibility** — `/api/actuators/status` is read-only and focused on queue introspection, not mutation. Fits the data-access API pattern (Story 13.3).

2. **Consistency** — Reuses existing UI patterns (panels, cards, buttons) so the new panel feels native to the app. No new components needed.

3. **Simplicity** — Starts with manual refresh (no polling) to keep the implementation minimal. Polling can be added later without changing the endpoint.

4. **End-to-end traceability** — A user can submit a document, get its jobId, and immediately search for it in this panel to see its progress through all 5 executors. Addresses the core user need.

5. **Dev-mode only** — Consistent with `/admin/db` and `/api/docs` protection. QA and developers use this; end users never see it.

## Implementation Notes

**Backend:**
- Create `server/routes/actuators.js` with `/api/actuators/status` endpoint
- Use the job repository (`jobRepo.countsByStatus()` exists from Story 6.3) to fetch counts and failed jobs
- Filter results by executor type manually (or extend repository to support filtering by job_type if it doesn't already)
- Response time <100ms expected

**Frontend:**
- Add "Actuators" to `NAV_ITEMS` in `server/ui/page.js`
- Create `renderActuatorsPanel()` function
- Add panel HTML/CSS styling
- Create `server/ui/client.js` event handlers for search and refresh
- Use same color palette and spacing as Status panel (`--status-active`, `--status-done`, `--status-failed`)

**Styling:**
- Reuse `.stat-grid` and `.stat-card` classes for executor cards
- Create `.actuator-card` for slightly different layout if needed (executor name as header, not inline)
- Use `.search-results` / `.search-card` patterns for the search results section
- No new CSS needed beyond a few targeted overrides

## Acceptance Criteria Mapping

1. ✓ New "Actuators" nav item / panel in sidebar
2. ✓ `/api/actuators/status` returns queue counts per executor
3. ✓ UI displays executor queues with pending/running/completed/failed counts
4. ✓ User can search by jobId to track document progress
5. ✓ Display shows job progression (which executors touched the document, timings)
6. ✓ Show final vault location (if indexed)
7. ✓ Display error message for failed jobs (from `job.error_message`)
8. ✓ Dev-mode protected (consistent with `/admin/db`)
9. ✓ Real-time or refresh-on-demand (design chooses refresh-on-demand)
10. ✓ UI consistent with existing panels (stat-grid, buttons, colors)

## Open Questions

- **Historical data retention** — Should the panel show all jobs ever created, or only the past N hours? Design assumes all (simplest), but may need a time-filter UI if the job table grows large.
- **Auto-refresh interval** — Mentioned as optional future enhancement. If added, should it be configurable (30s, 1min, 5min) or fixed?
- **Executor health heuristic** — "Is an executor backed up?" Could be inferred from pending count threshold (e.g., >5 pending = warning), but requires admin configuration. Deferred to future UI enhancement.
