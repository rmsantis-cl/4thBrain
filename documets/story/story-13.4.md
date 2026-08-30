---
name: story-13.4
description: Working notes for Story 13.4 - Automated UI Testing & Visual Regression Suite
date: 2026-08-29
metadata:
  version: 1.0
  created-by: Claude Code
---

# Story 13.4: Automated UI Testing & Visual Regression Suite

Canonical story text lives in `documets/design/Project 4thBrain.md` (EP13). This file tracks the working context behind it.

## Abstract

Build an automated browser-based test suite that verifies all UI surfaces work correctly, captures visual snapshots for regression detection, and validates interactive elements (forms, buttons, navigation).

## Observations

- UI stories 6.4 (shell), 6.1 (ingestion), 13.1 (admin), 13.3 (API docs) are built; 6.2 (search) and 6.3 (dashboard) are not yet (will defer their coverage to a future pass)
- Manual QA screenshots became tedious; automated snapshot testing prevents visual regressions and drift
- Test suite should be fast, deterministic, and runnable in CI/CD (headless browser support)
- Covers: page load, navigation, form submission, button clicks, error states, mobile viewport responsiveness
- Every story-critical UI element must have corresponding test (accessibility, button functionality, form validation)
- Tests verify synchronous ingestion job creation but do NOT wait for async pipeline completion (which requires Ollama/extractors unavailable in CI)

## Deliverable

### 1. Browser Automation Test Framework
**Location:** `tests/ui/` (new directory)

Setup using Playwright (Node.js, headless-capable, cross-platform):
- Configuration: `playwright.config.js` with headless Chrome/Firefox, mobile viewport variants
- Base utilities: `tests/ui/helpers.js` for common actions (navigate, fill form, click, screenshot, wait for element)
- Test runner integration with existing Jest/Mocha setup

### 2. Test Suite: Core Pages & Flows
**File:** `tests/ui/core.spec.js`

| Test | Scope | Verifies |
|------|-------|----------|
| **Landing & Redirect** | `GET /` → `/chat` | 302 redirect works, `/chat` loads correctly |
| **Chat Shell Layout** | `/chat` page load | Sidebar, nav items (ingestion/status/chat), main panel visible; no console errors |
| **Panel Navigation** | Sidebar panel switches | Each `.nav-item[data-panel]` switches active panel correctly |
| **Ingestion Form** | `/chat` ingestion panel | Form fields focusable, submit button clickable, API accepts POST; job row created immediately |
| **Admin Menu** | `/admin` page load | Menu visible, links to `/admin/db` and `/api/docs` present and navigate correctly |
| **Admin DB Tables** | `/admin/db` page load | Table selector dropdown visible, table data displays with pagination controls; filter/sort/detail/edit/delete lifecycle works |
| **API Docs** | `/api/docs` page load | Scalar UI loads, endpoints listed, openapi.json is valid, no JS errors |
| **Dev-Only Gating** | Admin/DB/API routes with NODE_ENV≠development | Routes return 403; non-gated routes still return 200 |
| **Mobile Responsiveness** | All pages (360px viewport) | Text readable, buttons clickable, no horizontal scroll at 360px width |

### 3. Visual Regression Testing
**Location:** `tests/ui/*-snapshots/`

Capture screenshots of each page in baseline state (tagged with `@visual`):
- Baselines auto-saved under `tests/ui/<spec>-snapshots/<name>-<project>-<platform>.png`
- Stored in Git; CI runs tests, compares to baselines, fails if visual diff > 2% (configurable threshold)
- Update baseline with `npx playwright test --update-snapshots` (must run inside official Playwright Docker image for CI OS compatibility)
- Alternative: generate first baselines from CI failure artifacts if Docker unavailable locally

### 4. Test Configuration & Helpers
**Files:** `playwright.config.js`, `tests/ui/global-setup.js`, `tests/ui/helpers.js`

- **playwright.config.js**: Single `webServer` (port 3100, `NODE_ENV=development`), two projects (`desktop-chromium`, `mobile-360`), `@visual` snapshot threshold 0.02 (2%), `reuseExistingServer: false` to prevent absorption by stray real dev server
- **global-setup.js**: Pre-flight port 3100 check, fail fast if already bound (avoid silent timeout)
- **helpers.js**: `gotoPanel`, `collectConsoleIssues`, `assertNoHorizontalOverflow`, `uniqueName`

### 5. Local Test Execution

Tests run locally on developer machines via:
- `npm run test:ui` — run all tests headless
- `npm run test:ui:functional` — run without visual regression tests (avoids Windows/Linux baseline diffs)
- `npx playwright test --debug` — interactive step-through debugging
- `npx playwright show-report` — view HTML report with screenshots and traces

### 6. Documentation
**Files:** `tests/ui/README.md`, `CLAUDE.md` (Testing section added)

- **README.md**: how to run (`npm run test:ui`), run functional only (`npm run test:ui:functional`), view report, update snapshots (Docker method + CI-artifact fallback), debug (`--debug` / `PWDEBUG=1`), isolation env vars and real-vault rationale, `@visual` tag convention
- **CLAUDE.md**: add short Testing section pointing to `tests/ui/README.md`

---

## Test Isolation Configuration

**Problem:** `params.json`'s `vault_dir` points to the user's actual Obsidian vault, and `server/index.js` starts the job-queue poller unconditionally on every boot, which writes into `vault_dir/incoming` and `vault_dir/raw`. Tests must not touch the real vault or database.

**Solution:** Add optional environment variable overrides (backward-compatible, unused when unset):

| Env Var | File | Purpose |
|---------|------|---------|
| `FOURTHBRAIN_PARAMS_FILE` | `server/config.js` | Override the path to `params.json` (enables isolated vault/raw dirs) |
| `FOURTHBRAIN_DB_PATH` | `server/db/init.js` | Override the path to `4thbrain-metadata.db` (enables isolated test DB) |
| `FOURTHBRAIN_PORT_OVERRIDE` | `server/config.js` | Override `params.server_port` (allows parallel server instances on different ports) |
| `FOURTHBRAIN_TEST_HARNESS` | `server/config.js` | Marker set only by Playwright config; triggers fail-loud guard if overrides are missing |

**Implementation:**
- `server/config.js`: read env vars, assert both isolation vars are set if test-harness marker is present (fail loud, not silent)
- `server/db/init.js`: read env var override
- `server/routes/admin-db.js`: import `dbPath` from `db/init.js` instead of hardcoding (also fixes a pre-existing bug where `/admin`'s file-size display wouldn't reflect a DB path change)

**Effect:** Playwright's `playwright.config.js` sets all four env vars when spawning each server instance, pointing to `tests/ui/.tmp/`, which is wiped on every config load. Each test run starts from a clean isolated directory tree with zero risk to the real vault or production DB.

---

## Out of Scope

This story does **not** verify end-to-end ingestion pipeline completion:
- Tests assert that ingestion endpoints (`POST /api/ingest/text`, `/file`, `/url`) synchronously create a job row and return success — this is verified
- Tests do **not** wait for the async job-queue pipeline to complete (classification, vault file writes, etc.) — the pipeline requires Ollama/extractors which are unavailable in CI
- Search and Dashboard features (Stories 6.2, 6.3) are not yet built, so coverage of those UI surfaces is deferred to a future pass

---

## Implementation Plan

### Phase 1: Setup (1–2 days)
1. Install Playwright: `npm install -D @playwright/test`
2. Create `playwright.config.js` with headless config, mobile viewport
3. Create `tests/ui/helpers.js` with utilities
4. Create `tests/ui/core.spec.js` skeleton

### Phase 2: Core Tests (2–3 days)
1. Write tests for landing/redirect, chat shell, navigation
2. Write tests for each admin page (menu, DB tables, API docs)
3. Write form submission and search tests
4. Add mobile viewport tests for each page

### Phase 3: Snapshots (1 day)
1. Run full suite, capture baseline screenshots
2. Commit `tests/ui/snapshots/` to Git
3. Verify CI can detect a visual change (intentional break test)

### Phase 4: CI/CD & Documentation (1 day)
1. Add `.github/workflows/ui-tests.yml`
2. Write `tests/ui/README.md`
3. Test locally and in CI

---

## Acceptance Criteria

- [ ] `tests/ui/core.spec.js` contains at least 10 tests (landing, shell, nav, forms, admin, search, mobile)
- [ ] Each test is deterministic (no flakiness on repeated runs)
- [ ] Tests run headless and in-browser without modification
- [ ] Visual snapshots captured and committed to `tests/ui/snapshots/`
- [ ] CI workflow runs tests automatically; PR status shows pass/fail
- [ ] No unhandled JavaScript errors on any page (console.error check)
- [ ] All button/link clicks work (no 404s or network errors)
- [ ] Forms submit successfully and show confirmation or results
- [ ] Mobile viewport (360px) renders without horizontal scroll
- [ ] README documents how to run, debug, and add tests
- [ ] Screenshots are named consistently and stored in Git

---

## Dependencies

- Depends on Story 6.4 (UI shell exists) ✓
- Depends on Story 6.1 (Ingestion form exists) ✓
- Depends on Story 13.1 (Admin DB UI exists) ✓
- Depends on Story 13.3 (API docs page exists) ✓
- Note: Stories 6.2 (Search) and 6.3 (Dashboard) are not yet built; coverage deferred to a future pass

---

## Test Execution Examples

```bash
# Run all tests
npm run test:ui

# Run a specific test file
npm run test:ui tests/ui/core.spec.js

# Run with headed browser (see what's happening)
npm run test:ui -- --headed

# Update snapshots after intentional visual changes
npm run test:ui -- --update-snapshots

# Run only mobile tests
npm run test:ui -- -g "Mobile"

# Debug a failing test
PWDEBUG=1 npm run test:ui
```

---

## Notes

- Playwright is language-agnostic (Node.js test runner, but tests Chrome/Firefox/Webkit browsers)
- Snapshot diffs can be visually reviewed via Playwright HTML report (generated on failure)
- Video recording can be enabled for failed tests (useful for async bugs)
- Lighthouse integration possible later (performance metrics, accessibility scores)
- Tests assume local server running on `http://localhost:3000` (configurable)

---

## Status

Ready for implementation. All prerequisite UI stories are in place or nearing completion.
