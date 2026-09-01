---
name: TODO-TRACKER
description: Actionable task tracking -- open stories and manual implementation/planning tasks
metadata:
  version: 2.0
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

| ID | Story | Dependencies Met? | Notes |
|---|---|---|---|
| 4.1 | Background Sweep & Queue Execution Script | [OK] All COMPLETED | 18 tests passing; one-sweep model implemented; scheduling (cron/systemd) not exercised. |

### Ready to Start (READY)

| ID | Story | Dependencies Met? | Notes |
|---|---|---|---|
| 3.1 | Smart Connections Vector Indexing Pipeline | [OK] 7.2 READY | Design exists; awaiting implementation. Depends on Obsidian vault + Smart Connections plugin. |
| 5.1 | Multi-Source Briefing Synthesis Engine | [PENDING] 4.1 WIP | Blocked on Story 4.1 (batch jobs); Story 2.1 now COMPLETED. |
| 6.2 | Hybrid Keyword & Semantic Search Interface | [PENDING] 3.1 READY | Blocked on Story 3.1 (indexing). UI shell (6.4) ready. |
| 6.3 | Pipeline Monitoring & Dashboard UI | [PENDING] 4.1 WIP | Blocked on Story 4.1 (batch jobs). UI shell (6.4) ready. |
| 7.2 | Process Lifecycle & MCP Server Setup | [OK] none | Design exists; works with Story 7.1 (WSL2 base now complete). |
| 8.1 | Automated Test Harness & Regression Suite | [OK] 7.2 READY | 105+ tests existing; formal harness/regression suite design needed. |
| 8.2 | Bug & Issue Tracking Workflow | [PENDING] 8.1 READY | Blocked on 8.1 test harness. `documets/bugs/` directory exists. |
| 8.3 | Automated Smoke Test Suite | [OK] All prerequisites ready | Automate tests for critical routes (≥50% coverage). |
| 10.1 | Scheduled Vault Snapshot & Restore | [PENDING] 4.1 WIP | Blocked on 4.1 (batch runner); 3.1 (indexing) ready. |

---

## Manual Tasks

### Active Implementation Tasks

| ID | Task | Description | Depends On | Status |
|---|---|---|---|---|
| Task-2 | wire html-sanitize-executor into file-validator | Route text/html MIME through new sanitization executor instead of direct-copy path (Story 1.1). | 1.2 code | pending |
| Task-3 | test Story 1.2 HTML sanitization end-to-end | Run full ingestion pipeline with real HTML files; verify markdown output, archiving, frontmatter. | 1.2 code + Task-2 | pending |
| Task-10 | implement PLAN-31-08-2026-Story-2.1 | Implement Story 2.1 classification executor. COMPLETED 2026-09-01. | Story 1.1 + Story 7.1 | [OK] COMPLETED |
| Task-12 | create todo-check skill | Skill to query batch agent status, remove completed tasks, sync pending work from planning docs. | todo-add skill, batch infra | pending |

### Documentation Follow-ups

| ID | Task | Description | Impact | Status |
|---|---|---|---|---|
| Task-4 | backpropagate Story 12.2 schema redesign | Update `classes.mmd`, `PROJECT-SUMMARY.md` (done 2026-09-01), `params.json` (done), per-module backlogs, `server/db/init.js` (PRAGMA foreign_keys). | High | pending (classes.mmd diagram remains) |
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

- **2026-09-01** -- Rebuilt TODO-TRACKER from current BACKLOG-TRACKER state (version 1.7 was outdated, showing many COMPLETED stories as READY/WIP). Now reflects only open work: 1 WIP story (4.1), 9 READY stories (3.1, 5.1, 6.2, 6.3, 7.2, 8.1, 8.2, 8.3, 10.1). Updated dependency statuses to match BACKLOG-TRACKER. Marked Task-10 as COMPLETED (Story 2.1 implemented 2026-09-01). Replaced emoji symbols with [OK]/[PENDING] for ASCII clarity. Bumped version to 2.0.
- **2026-08-31** -- Created TODO-TRACKER as complement to BACKLOG-TRACKER. Extracted all READY and WIP stories. Added manual implementation tasks for Story 1.2 wiring, testing, and Story 2.1 implementation plan.
