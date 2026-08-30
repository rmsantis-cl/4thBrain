---
name: story-13.1
description: Working notes for Story 13.1 - Database Inspector, Table Browser & Admin Panel
date: 2026-08-26
metadata:
  version: 1.0
  created-by: Claude Code
---

# Story 13.1: Database Inspector — Table Browser & Admin Panel

Canonical story text lives in `documets/design/Project 4thBrain.md` (EP13). This file tracks the working context behind it.

## Abstract

Web UI for developers and QA to inspect and edit SQLite database tables for debugging and testing.

## Observations

- Operational/diagnostic tool, not user-facing — belongs in a new EP13 (Admin & Monitoring Tools) separate from core feature epics
- Low priority for Phase 5 (core ingestion/classification/batch come first)
- Enabled by Story 7.3 (database now exists and is queryable)
- Protected access needed before production (Story 9.1 auth still To Do, so interim dev-mode check is OK)
- Use case: QA inspecting ingestion results, developers debugging classification logic, ops verifying job queue state

## Deliverable

Single-page admin interface at `/admin/db`:
- Table selector dropdown + schema preview
- Paginated row browser with filtering/sorting by any column
- Clickable rows to view full record details (JSON-like display)
- Inline edit/delete (with confirmation)
- Insert row form (guided by table schema)
- Database stats sidebar (7 tables, row counts, total DB size, last modified)
- "Development Only" warning label or access gate

## Implementation Notes

**Tech:** Should follow same patterns as Story 6.4 (single GET route returning inlined HTML/CSS/JS, mocked fetch calls). Could use `/admin/db` as a separate HTML page or a modal within the main `/chat` page.

**Data display:** SQLite query results mapped to HTML tables. Use `app.locals.db` (wired in Story 7.3) to query schema (`pragma table_info(table_name)`) and rows.

**Caution:** Delete/edit are risky in production. Interim solution: dev-mode check (e.g., `NODE_ENV=development` or a flag) with warning. Story 9.1 (auth) will add proper access control later.

**Smoke test:** Story 7.3 requires Node.js ↔ Python cross-language DB access test; this story consumes that by allowing humans to verify what's in the DB.

## Implementation Status

**COMPLETED** — 2026-08-26

### What Was Built

Single-page admin interface at `/admin/db` with full CRUD capabilities:

**Frontend (Vanilla JS):**
- Sidebar: database stats (7 tables, total rows, file size, last modified)
- Table selector dropdown + schema preview
- Row browser: paginated table (25 rows/page default) with sortable headers
- Filtering: column-based text filter (LIKE search)
- Record detail panel: JSON-like display of full record
- Modal forms: Insert, Edit (with pre-filled values), Delete (with confirmation)

**Backend (Node.js + SQLite):**
- Main route handler: `GET /admin/db` with dev-mode check (NODE_ENV === 'development')
- API endpoints (7 total):
  1. GET `/api/tables` — List all tables with row counts
  2. GET `/api/table/:name/schema` — Column definitions (PRAGMA table_info)
  3. GET `/api/table/:name/rows` — Paginated rows (supports sort, filter, pagination)
  4. GET `/api/table/:name/row/:id` — Single record detail
  5. POST `/api/table/:name/row` — Insert new record
  6. PATCH `/api/table/:name/row/:id` — Update existing record
  7. DELETE `/api/table/:name/row/:id` — Delete record

**Styling:**
- Dark theme (matches main UI dark mode)
- Responsive layout (sidebar + main area)
- Inlined CSS (no external dependencies)
- Accessible buttons and form controls

### Acceptance Criteria Met

✅ Admin panel accessible at `/admin/db`  
✅ Table list shows all 7 tables with row counts and schema preview  
✅ User can select a table and view paginated rows (25/page)  
✅ Column filtering and sorting implemented  
✅ Single record details displayed in JSON format  
✅ Insert, update, delete with modals and confirmation  
✅ Database stats sidebar (total tables, rows, size, last modified)  
✅ Dev-mode protection enforced (NODE_ENV check returns 403 if not development)

### Verified Features

- Server starts with NODE_ENV=development
- Route accessible at http://127.0.0.1:3000/admin/db
- HTML renders correctly (full page with sidebar, table browser, modals)
- All 7 tables listed in sidebar with accurate row counts
- No console errors; JavaScript ready for user interaction

### Known Limitations & Future Enhancements

1. **Row ID lookup:** Assumes all tables have a primary key; query uses first PK column
2. **Concurrent edits:** No locking; last-write-wins (acceptable for dev tool)
3. **Large datasets:** Paginated at 25 rows; performance untested on 100k+ row tables
4. **FK validation:** Delete operation doesn't pre-check foreign key violations (relies on SQLite constraint errors)
5. **Data types:** All form inputs are text; no type-specific UI (date picker, etc.)
6. **Mobile UI:** Not optimized for mobile; desktop-first design

### Future Work (Not in Scope)

- Add export feature (CSV/JSON dump of table)
- Add raw SQL query editor (for power users)
- Add connection pooling if performance issues emerge
- Add audit logging (who accessed what when)
- Replace dev-mode check with proper auth (Story 9.1) once available
