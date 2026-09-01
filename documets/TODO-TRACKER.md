---
name: TODO-TRACKER
description: Actionable task tracking -- open stories and manual implementation/planning tasks
metadata:
  version: 2.2
  created-by: Claude Code
  date: 2026-09-01
---

# TODO TRACKER -- 4thBrain Open Work

Complementary to `BACKLOG-TRACKER.md`. This file tracks:
1. **Open Stories** -- READY (not started) and WIP (in progress) stories extracted from BACKLOG-TRACKER
2. **Manual Tasks** -- Implementation tasks (e.g., "implement PLAN-*"), documentation work, spikes, and ad-hoc follow-ups

Update this tracker when:
- A planning document (PLAN-*.md) is created → add a corresponding "implement PLAN-*" task
- A story moves from READY → WIP → COMPLETED → update the Open Stories section
- A manual task is resolved → mark it done or archive it

---

## Open Stories (from BACKLOG-TRACKER)

### In Progress (WIP)

(none)

### Ready to Start (READY)

| ID | Story | Dependencies Met? | Notes |
|---|---|---|---|
| 3.1 | Smart Connections Vector Indexing Pipeline | [OK] 7.2 READY | Design exists; awaiting implementation. Depends on Obsidian vault + Smart Connections plugin. |
| 5.1 | Multi-Source Briefing Synthesis Engine | [OK] All COMPLETED | Story 2.1 COMPLETED, Story 4.1 COMPLETED. Ready to start. |
| 6.2 | Hybrid Keyword & Semantic Search Interface | [PENDING] 3.1 READY | Blocked on Story 3.1 (indexing). UI shell (6.4) ready. |
| 6.3 | Pipeline Monitoring & Dashboard UI | [OK] All COMPLETED | Story 4.1 COMPLETED, Story 6.4 COMPLETED. Ready to start. |
| 7.2 | Process Lifecycle & MCP Server Setup | [OK] none | Design exists; works with Story 7.1 (WSL2 base now complete). |
| 8.1 | Automated Test Harness & Regression Suite | [OK] 7.2 READY | 105+ tests existing; formal harness/regression suite design needed. |
| 8.2 | Bug & Issue Tracking Workflow | [PENDING] 8.1 READY | Blocked on 8.1 test harness. `documets/bugs/` directory exists. |
| 8.3 | Automated Smoke Test Suite | [OK] All prerequisites ready | Automate tests for critical routes (≥50% coverage). |
| 10.1 | Scheduled Vault Snapshot & Restore | [PENDING] 3.1 READY | Story 4.1 COMPLETED; blocked on 3.1 (indexing). |

---

## Manual Tasks

### Active Implementation Tasks

| ID | Task | Description | Depends On | Status |
|---|---|---|---|---|
| Task-2 | wire html-sanitize-executor into file-validator | Route text/html MIME through new sanitization executor instead of direct-copy path (Story 1.1). | 1.2 code | pending |
| Task-3 | test Story 1.2 HTML sanitization end-to-end | Run full ingestion pipeline with real HTML files; verify markdown output, archiving, frontmatter. | 1.2 code + Task-2 | pending |
| Task-10 | implement PLAN-31-08-2026-Story-2.1 | Implement Story 2.1 classification executor. COMPLETED 2026-09-01. | Story 1.1 + Story 7.1 | [OK] COMPLETED |
| Task-12 | create todo-check skill | Skill to query batch agent status, remove completed tasks, sync pending work from planning docs. | todo-add skill, batch infra | pending |
| Task-13 | add error_message column to job table | DESIGN-DEBT #5: job table lacks error_message column; Story 6.3 (Pipeline Monitoring) needs it to display failure reasons. Implement via schema migration or Story 12.3. | Story 12.2 COMPLETED | blocking Story 6.3 |
| Task-14 | design boot script for Story 7.2 | Process Lifecycle & MCP Server Setup: create master boot script coordinating Ollama (WSL2), Node.js server, and MCP server startup; verify port availability; structured JSON logging. | Story 7.1 COMPLETED | blocking Story 7.2 |
| Task-15 | email & calendar API integration design | Story 5.1 (Briefing Synthesis) requires collecting calendar events and emails. Design not yet specified in requirements (OAuth, credential storage, data model). | NFR design gap | blocking Story 5.1 |

### Documentation Follow-ups

| ID | Task | Description | Impact | Status |
|---|---|---|---|---|
| Task-4 | backpropagate Story 12.2 schema redesign | Update `classes.mmd`, `PROJECT-SUMMARY.md` (done 2026-09-01), `params.json` (done), per-module backlogs, `server/db/init.js` (PRAGMA foreign_keys). | High | [OK] COMPLETED (all items verified 2026-09-01 pass 6) |
| Task-5 | resolve DESIGN-DEBT item 4: "Recent activity" UI | Hardcoded fake data in sidebar; decide scope (real recent-N jobs vs. other) and formalize as Story or defer. | Medium | pending |
| Task-6 | mobile-responsiveness audit | Story 13.2 originally scoped this; deferred. Schedule once 8.3 lands. | Low | deferred |
| Task-11 | update TODO-TRACKER submission workflow | When task submitted via /submit-batch, mark in-progress with agent reference (e.g., 'Agent abf58535cfaa7a62f'). | Medium | pending |

### Testing & QA

| ID | Task | Description | Depends On | Status |
|---|---|---|---|---|
| Task-8 | run Story 8.3 smoke test (automated) | Automated test coverage for critical routes (`/`, `/chat`, `/admin`, `/admin/db`, `/api/docs`); ≥50% routes. | All UI stories ready | pending |
| Task-9 | audit existing test coverage gaps | 105+ tests passing; audit gaps (e.g., Story 1.2 HTML path, Story 4.1 scheduling). | 4.1 WIP | pending |

---

## Changelog

- **2026-09-01 (backlog loop pass 8)** — Completed pass 8 analysis. Pass 7 → Pass 8 ready set unchanged (same 4 items: 5.1, 6.3, 7.2, 8.3). Pass 8 closed zero items but discovered new blockers, so loop continues. Added Tasks-13–15 documenting three blocking prerequisites: (1) Task-13 (add error_message column to job table for Story 6.3 failure reasons), (2) Task-14 (design boot script for Story 7.2 process lifecycle), (3) Task-15 (email/calendar API integration design for Story 5.1). Updated DESIGN-DEBT with new item 6 (Story 5.1 email/calendar design gap). Bumped version to 2.2.
- **2026-09-01 (backlog loop pass 6)** — Completed Story 4.1 (Background Sweep & Queue Execution Script): all 2 acceptance criteria met (18 tests passing, end-to-end sweep verified). Moved 4.1 from WIP → COMPLETED; updated dependent stories' dependency status (5.1, 6.3, 10.1 now unblocked). Completed Task-4 (backpropagate Story 12.2 schema redesign): verified all items done — `PROJECT-SUMMARY.md` (9 tables), `params.json` (system directory roles), `classes.mmd` diagram (already current), `server/db/init.js` (PRAGMA foreign_keys already set), `database-schema.md` superseded note (updated to reference Story 12.2 changes). Bumped version to 2.1.
- **2026-09-01** -- Rebuilt TODO-TRACKER from current BACKLOG-TRACKER state (version 1.7 was outdated, showing many COMPLETED stories as READY/WIP). Now reflects only open work: 1 WIP story (4.1), 9 READY stories (3.1, 5.1, 6.2, 6.3, 7.2, 8.1, 8.2, 8.3, 10.1). Updated dependency statuses to match BACKLOG-TRACKER. Marked Task-10 as COMPLETED (Story 2.1 implemented 2026-09-01). Replaced emoji symbols with [OK]/[PENDING] for ASCII clarity. Bumped version to 2.0.
- **2026-08-31** -- Created TODO-TRACKER as complement to BACKLOG-TRACKER. Extracted all READY and WIP stories. Added manual implementation tasks for Story 1.2 wiring, testing, and Story 2.1 implementation plan.
