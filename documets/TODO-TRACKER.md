---
name: TODO-TRACKER
description: Actionable task tracking -- open stories and manual implementation/planning tasks
metadata:
  version: 2.7
  created-by: Claude Code
  date: 2026-09-02
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
| 5.1 | Multi-Source Briefing Synthesis Engine | [OK] Task-15 UNBLOCKED | Story 2.1 COMPLETED, Story 4.1 COMPLETED. ADR22 clarifies local-data-only v0.1 scope (job queue + vault context, no OAuth). Ready for implementation. |
| 6.2 | Hybrid Keyword & Semantic Search Interface | [PENDING] 3.1 READY | Blocked on Story 3.1 (indexing). UI shell (6.4) ready. |
| 6.3 | Pipeline Monitoring & Dashboard UI | [OK] All COMPLETED | Story 4.1 COMPLETED, Story 6.4 COMPLETED, Task-13 COMPLETED (error_message column). Ready to start. |
| 7.2 | Process Lifecycle & MCP Server Setup | [OK] All COMPLETED | Design exists (ADR20); boot scripts created (bootstrap.js, wsl-init.sh, Start-4thBrain.ps1); documentation complete (BOOT-SEQUENCE.md); ready for testing and story completion verification. |
| 8.1 | Automated Test Harness & Regression Suite | [OK] 7.2 READY | 105+ tests existing; formal harness/regression suite design needed. |
| 8.2 | Bug & Issue Tracking Workflow | [PENDING] 8.1 READY | Blocked on 8.1 test harness. `documets/bugs/` directory exists. |
| 8.3 | Automated Smoke Test Suite | [OK] All prerequisites ready | Automate tests for critical routes (≥50% coverage). Needs browser automation environment. |

---

## Manual Tasks

### Active Implementation Tasks

| ID | Task | Description | Depends On | Status |
|---|---|---|---|---|
| Task-2 | wire html-sanitize-executor into file-validator | Route text/html MIME through new sanitization executor instead of direct-copy path (Story 1.1). | 1.2 code | pending |
| Task-3 | test Story 1.2 HTML sanitization end-to-end | Run full ingestion pipeline with real HTML files; verify markdown output, archiving, frontmatter. | 1.2 code + Task-2 | pending |
| Task-10 | implement PLAN-31-08-2026-Story-2.1 | Implement Story 2.1 classification executor. COMPLETED 2026-09-01. | Story 1.1 + Story 7.1 | [OK] COMPLETED |
| Task-12 | create todo-check skill | Skill to query batch agent status, remove completed tasks, sync pending work from planning docs. | todo-add skill, batch infra | pending |
| Task-13 | add error_message column to job table | DESIGN-DEBT #5: job table lacks error_message column; Story 6.3 (Pipeline Monitoring) needs it to display failure reasons. COMPLETED 2026-09-01: added error_message TEXT column to job table; updated JobRepository.markFailed() to accept errorMessage parameter; wired in error messages in batch/worker.js, batch/cleanup.js, server/lib/job-queue/poller.js; added regression test. | Story 12.2 COMPLETED | [OK] COMPLETED |
| Task-14 | design boot script for Story 7.2 | Process Lifecycle & MCP Server Setup: create master boot script coordinating Ollama (WSL2), Node.js server, and MCP server startup; verify port availability; structured JSON logging. COMPLETED 2026-09-02: Created server/bootstrap.js (orchestration + health checks), scripts/wsl-init.sh (WSL2 Ollama startup), scripts/Start-4thBrain.ps1 (PowerShell wrapper + lifecycle mgmt), scripts/4thbrain-ports.json (port config), documets/BOOT-SEQUENCE.md (user/ops guide); updated package.json to use bootstrap.js. | Story 7.1 COMPLETED | [OK] COMPLETED |
| Task-15 | email & calendar API integration design | Story 5.1 (Briefing Synthesis) requires collecting calendar events and emails. UNBLOCKED via ADR22 (2026-09-02): v0.1 uses local data only (job queue + vault context); OAuth deferred to v0.2. Clarifies scope and unblocks Story 5.1 for implementation. | NFR design gap | [OK] UNBLOCKED via ADR22 |
| Task-16 | add component selection to Start-4thBrain.ps1 | Add optional parameter [ollama \| server \| mcp] to start/stop/status/restart actions; apply command only to selected component. Without parameter, operates on all (current behavior). | Story 7.2 COMPLETED | pending |

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

- **2026-09-02** — Completed Task-17 (ensure Ollama model is loaded on startup): Added `load_ollama_model()` function to `scripts/wsl-init.sh` that checks if `llama3.2:3b` is loaded, and if not, runs `ollama run llama3.2:3b` in background to pull and load the model. Waits up to 2 minutes for model to be available via `/api/tags` check. Unblocks Story 7.2 acceptance testing.
- **2026-09-02** — Added Task-16 (add component selection to Start-4thBrain.ps1): Add optional parameter [ollama | server | mcp] to start/stop/status/restart actions to control individual components; default behavior (all) preserved.
- **2026-09-02** — Completed Task-14 (design boot script for Story 7.2): Created master boot orchestration system coordinating Ollama (WSL2), Node.js server, and MCP server startup. Deliverables: (1) `server/bootstrap.js` — Node.js orchestration script with Ollama reachability checks, port availability verification, Express app initialization, MCP subprocess management, graceful shutdown, and structured JSON logging matching batch/worker.js pattern (ADR20 implementation); (2) `scripts/wsl-init.sh` — WSL2 Fedora init script checking Ollama installation, starting systemd service, waiting for http://localhost:11434/api/tags endpoint; (3) `scripts/Start-4thBrain.ps1` — PowerShell wrapper (start/stop/status/restart actions) coordinating WSL2 init, port checks, Node process spawn, health checks, and cleanup; (4) `scripts/4thbrain-ports.json` — port/service configuration and conflict detection reference; (5) `documets/BOOT-SEQUENCE.md` — comprehensive user/ops guide (quick start, architecture, timeline, logging format, error scenarios, manual startup, graceful shutdown, CI/CD integration); (6) Updated `server/package.json` start script to use bootstrap.js. Story 7.2 (Process Lifecycle & MCP Server Setup) unblocked; dependencies met, ready for acceptance testing.
- **2026-09-01 (backlog loop pass 9)** — Completed Task-13 (add error_message column to job table) and Story 10.1 (Scheduled Vault Snapshot & Restore). Task-13: Added error_message column to job table schema; updated JobRepository.markFailed() to accept and store error message; wired in error capture in batch/worker.js, batch/cleanup.js, and server/lib/job-queue/poller.js; added regression test (8 tests in repositories.job.test.js, all passing). Unblocks Story 6.3 (Pipeline Monitoring Dashboard). Story 10.1: Implemented snapshot function (batch/snapshot.js), restore function (batch/restore.js), integrated snapshot into batch/worker.js pre-run phase, created comprehensive RESTORE.md documentation, wrote 8 tests (all passing). Story 10.1 moved READY → COMPLETED. Updated Open Stories section to clarify blockers (5.1/7.2 blocked on design gaps Task-15/Task-14; 6.3/8.3 now READY with all blockers cleared). Bumped version to 2.3.
- **2026-09-01 (backlog loop pass 8)** — Completed pass 8 analysis. Pass 7 → Pass 8 ready set unchanged (same 4 items: 5.1, 6.3, 7.2, 8.3). Pass 8 closed zero items but discovered new blockers, so loop continues. Added Tasks-13–15 documenting three blocking prerequisites: (1) Task-13 (add error_message column to job table for Story 6.3 failure reasons), (2) Task-14 (design boot script for Story 7.2 process lifecycle), (3) Task-15 (email/calendar API integration design for Story 5.1). Updated DESIGN-DEBT with new item 6 (Story 5.1 email/calendar design gap). Bumped version to 2.2.
- **2026-09-01 (backlog loop pass 6)** — Completed Story 4.1 (Background Sweep & Queue Execution Script): all 2 acceptance criteria met (18 tests passing, end-to-end sweep verified). Moved 4.1 from WIP → COMPLETED; updated dependent stories' dependency status (5.1, 6.3, 10.1 now unblocked). Completed Task-4 (backpropagate Story 12.2 schema redesign): verified all items done — `PROJECT-SUMMARY.md` (9 tables), `params.json` (system directory roles), `classes.mmd` diagram (already current), `server/db/init.js` (PRAGMA foreign_keys already set), `database-schema.md` superseded note (updated to reference Story 12.2 changes). Bumped version to 2.1.
- **2026-09-01** -- Rebuilt TODO-TRACKER from current BACKLOG-TRACKER state (version 1.7 was outdated, showing many COMPLETED stories as READY/WIP). Now reflects only open work: 1 WIP story (4.1), 9 READY stories (3.1, 5.1, 6.2, 6.3, 7.2, 8.1, 8.2, 8.3, 10.1). Updated dependency statuses to match BACKLOG-TRACKER. Marked Task-10 as COMPLETED (Story 2.1 implemented 2026-09-01). Replaced emoji symbols with [OK]/[PENDING] for ASCII clarity. Bumped version to 2.0.
- **2026-08-31** -- Created TODO-TRACKER as complement to BACKLOG-TRACKER. Extracted all READY and WIP stories. Added manual implementation tasks for Story 1.2 wiring, testing, and Story 2.1 implementation plan.
