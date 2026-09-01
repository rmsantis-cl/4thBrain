---
name: story-13.2
description: Working notes for Story 13.2 - Remove Embedded Admin Panel, Add Root Redirect and Standalone Admin Menu
date: 2026-08-31
metadata:
  version: 1.0
  created-by: Claude Code
---

# Story 13.2: Remove Embedded Admin Panel, Add Root Redirect and Standalone Admin Menu

Canonical story text lives in `documets/design/Project 4thBrain.md` (EP13). This file tracks the working context behind it.

## Abstract

Remove the Story 13.1 embedded "Admin Tools" panel from the `/chat` shell; add a `GET /` → `/chat` redirect; add a small standalone `/admin` menu page linking to the existing dev tools.

## Observations

- The `/chat` page previously had an embedded admin panel that cluttered the main ingestion/search/dashboard interface.
- Moving admin tools to a separate `/admin` menu page improves UX by separating user-facing features from dev/QA tools.
- The root redirect (`GET /` → `/chat`) provides a natural entry point for users accessing the app.

## Implementation (2026-08-30)

Implemented as part of a UI-orphan-pages cleanup and mocking-action review pass.

### What was built

| File | Purpose |
|---|---|
| `server/index.js:29` | Added `GET /` redirect to `/chat` (302 response) |
| `server/routes/admin-page.js` | New dev-gated (`NODE_ENV=development` only) route serving `/admin` menu with links to `/admin/db` and `/api/docs`; returns 403 in non-dev mode |
| `server/ui/page.js` — `NAV_ITEMS` | Modified sidebar "Admin" nav item to render as a link (`<a href="/admin">`) instead of a panel toggle |
| `server/ui/page.js` — `renderChatPage()` | Removed `renderAdminPanel()` call and all embedded admin panel markup |
| `server/ui/client.js` | Removed "Admin panel" event listener block and panel toggle logic |
| `server/ui/styles.js` | Removed admin panel CSS block |
| `server/routes/admin-db.js` | Unchanged — still serves `/admin/db` table browser as before |

## Acceptance Criteria Met

- ✓ `GET /` returns a 302 redirect to `/chat`.
- ✓ `GET /admin` (dev-only) returns 200 with links to `/admin/db` and `/api/docs`; 403 in non-dev mode.
- ✓ `GET /admin/db` is unchanged — no internal changes.
- ✓ `/chat` contains no embedded admin panel markup or `fetch('/admin/db/api/...')` calls.
- ✓ The sidebar's "Admin" nav item is a link (`<a href="/admin">`), not a panel toggle; clicking it navigates without JS errors.

## Deferred Work

The mobile-responsiveness audit originally scoped to this story is deferred to a later pass (documented as Task-6 in TODO-TRACKER).

## Status

COMPLETED — all acceptance criteria verified 2026-08-30 against running server. No outstanding gaps.

## Related Stories

- **Story 13.1** (Database Inspector) — the admin tools now accessible via the new `/admin` menu.
- **Story 6.4** (Common UI Shell) — the sidebar/nav structure being modified here.
- **Story 13.3** (Unified Data-Access API) — the `/api/docs` link on the `/admin` menu points to this.

## Changelog

- **2026-08-31** — Working notes file created as part of close-out for COMPLETED story.
