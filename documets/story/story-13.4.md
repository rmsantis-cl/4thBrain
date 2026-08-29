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

- All previous UI stories (6.4 shell, 6.1 ingestion, 6.2 search, 13.1 admin, 13.3 API docs) now exist and need validation
- Manual QA screenshots became tedious; automated snapshot testing prevents visual regressions and drift
- Test suite should be fast, deterministic, and runnable in CI/CD (headless browser support)
- Covers: page load, navigation, form submission, button clicks, error states, mobile viewport responsiveness
- Existing test framework in `tests/` (currently unit/integration focused); extend with browser automation
- Every story-critical UI element must have corresponding test (accessibility, button functionality, form validation)

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
| **Landing & Redirect** | `GET /` → `/chat` | 302 redirect works, `/chat` loads |
| **Chat Shell Layout** | `/chat` page load | Sidebar, nav items, main panel visible; no console errors |
| **Navigation Links** | Sidebar clicks | Ingestion, Search, Dashboard, Admin links navigate correctly |
| **Form Submission** | `/chat` → Ingestion form | Form fields focusable, submit button clickable, POST succeeds |
| **Search Input** | `/chat` → Search | Input accepts text, search button clickable, results display |
| **Admin Menu** | `/admin` page load | Menu visible, links to `/admin/db` and `/api/docs` present |
| **Admin DB Tables** | `/admin/db` page load | Table selector dropdown visible, schema preview displays, pagination controls present |
| **API Docs** | `/api/docs` page load | Scalar UI loads, endpoints listed, no JS errors |
| **Mobile Responsiveness** | All pages (360px viewport) | Text readable, buttons clickable, no horizontal scroll at 360px width |
| **Error States** | Form validation | Empty submit shows error, invalid input shows feedback, DB error shows message |

### 3. Visual Regression Testing
**Location:** `tests/ui/snapshots/`

Capture screenshots of each page in baseline state:
- Filenames: `landing-redirect.png`, `chat-shell.png`, `ingestion-form.png`, `search-results.png`, `dashboard.png`, `admin-menu.png`, `admin-db-tables.png`, `api-docs.png`
- Baseline stored in Git; CI runs test, compares to baseline, fails if visual diff > 2% (configurable threshold)
- Flag for human review: `--update-snapshots` to accept new baseline

### 4. Test Configuration & Helpers
**File:** `tests/ui/helpers.js`

```javascript
// Example helper functions
async function navigateTo(page, path)
async function fillForm(page, fields)  // { selector, value }[]
async function clickButton(page, selector)
async function waitForElement(page, selector, timeout)
async function takeScreenshot(page, name)
async function checkConsoleErrors(page)
async function setViewport(page, width, height)
```

### 5. CI/CD Integration
**File:** `.github/workflows/ui-tests.yml` (new)

Runs on every push to `main` and `develop`:
```yaml
- Install dependencies (npm i)
- Start server (npm run dev)
- Run Playwright tests (npx playwright test)
- Upload screenshots (on failure) to artifact storage
- Report results to PR/commit
```

### 6. Documentation
**File:** `tests/ui/README.md`

- How to run locally: `npm run test:ui`
- How to update snapshots: `npm run test:ui -- --update-snapshots`
- How to debug: `npm run test:ui -- --debug` or `PWDEBUG=1`
- Adding new tests: template and naming conventions
- Troubleshooting: common failures and fixes

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

- Depends on Story 6.4 (UI shell exists)
- Depends on Story 6.1 (Ingestion form exists)
- Depends on Story 13.1 (Admin DB UI exists)
- Depends on Story 13.3 (API docs page exists)
- Depends on all stories providing stable `/chat`, `/ingestion`, `/search`, `/dashboard`, `/admin`, `/admin/db`, `/api/docs` routes

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
