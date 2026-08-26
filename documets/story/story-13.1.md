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

## TODO

- Decide: separate `/admin/db` page or modal in `/chat`?
- Design: filter/sort UX for large tables (pagination strategy)
- Protect: implement dev-mode gate or wait for Story 9.1 auth?
