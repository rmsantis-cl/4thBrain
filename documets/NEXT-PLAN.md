---
name: NEXT-PLAN
description: Consolidated plan of all open work — stories, tasks, blockers, and execution order
date: 2026-09-02
metadata:
  version: 1.0
  created-by: Claude Code
---

# NEXT-PLAN — All Open Work

Consolidated view of all unfinished work across the project. Source: BACKLOG-TRACKER (stories), TODO-TRACKER (tasks), and architectural blockers. Updated 2026-09-02.

---

## Executive Summary

**Completed:** 36 stories + spikes, 14 infrastructure/design stories, 105+ passing tests  
**Open:** 9 stories (all READY; no WIP), 7 tasks, 3 architectural gaps  
**Critical Blockers:** Task-15 (email/calendar design), Task-17 (Ollama model loading), Task-16 (component selection)  
**Next Phase:** Implement remaining UI/search (Stories 3.1, 6.2) and monitoring (6.3), resolve design gaps

---

## READY Stories — Priority Order

All stories are in READY state (not started). Order reflects dependencies and impact.

### P0 — Foundation & Infrastructure

**Story 7.2: Process Lifecycle & MCP Server Setup** | depends: none  
- **Status:** READY (design complete: ADR20, bootstrap.js, Start-4thBrain.ps1)
- **Work remaining:** Implementation testing and acceptance verification
- **Blocks:** Stories 3.1, 6.2 (depend on 7.2 for boot orchestration)
- **Acceptance criteria:**
  1. Bootstrap.js starts Ollama/Node/MCP with health checks
  2. Logs structured JSON to stdout
  3. Graceful shutdown on SIGTERM
- **Implementation notes:** See `documets/design/adr20-boot-sequence.md` and `server/bootstrap.js`

### P1 — Core Features (No Blockers)

**Story 3.1: Smart Connections Vector Indexing Pipeline** | depends: 1.1, 7.2  
- **Status:** READY (all prerequisites COMPLETED)
- **Work remaining:** Implement vector index trigger and monitoring
- **Blocks:** Story 6.2 (hybrid search needs indexed vectors)
- **Acceptance criteria:**
  1. Modified/created notes automatically trigger .smart-env updates
  2. Embeddings stored locally without cloud calls
- **Implementation notes:** Use `vault/check_smart_connections_status.py` (spike 3.2) for status API

**Story 6.2: Hybrid Keyword & Semantic Search Interface** | depends: 3.1  
- **Status:** READY (blocked on Story 3.1 completion)
- **Work remaining:** Implement search UI + backend (keyword via SQLite FTS5, semantic via Smart Connections)
- **Blocks:** Users can't search vault notes until this lands
- **Acceptance criteria:**
  1. Keyword search returns results ranked by BM25
  2. Semantic search returns results ranked by embedding similarity
  3. Search UI displays snippets and source attribution
- **Implementation notes:** ADR22 specifies SQLite FTS5 + derived index; UI shell already built (Story 6.4)

**Story 6.3: Pipeline Monitoring & Dashboard UI** | depends: 4.1  
- **Status:** READY (Task-13 unblocked it; all prerequisites COMPLETED)
- **Work remaining:** Implement dashboard showing job status, error reasons, pipeline health
- **Blocks:** None (informational UI only)
- **Acceptance criteria:**
  1. Dashboard shows job counts (running, completed, failed)
  2. Failure reasons displayed for each failed job
  3. Real-time updates via polling
- **Implementation notes:** error_message column added (Task-13); use `/api/tables/job` endpoint (Story 13.3)

### P2 — Dependent on Design Gaps

**Story 5.1: Multi-Source Briefing Synthesis Engine** | depends: 2.1, 4.1  
- **Status:** READY (prerequisites COMPLETED; **blocked on Task-15**)
- **Work remaining:** Task-15 (email/calendar API design) must complete first
- **Blocks:** Briefing feature entirely
- **Acceptance criteria:**
  1. Daily briefing note generated each morning
  2. Sections: agenda, action items, contextual reminders
  3. Data sourced from calendar events, emails, and vault notes
- **Blocker:** No email/calendar OAuth design yet; needs credential storage strategy and API selection (Gmail, Outlook, etc.)

### P3 — QA/Testing

**Story 8.1: Automated Test Harness & Regression Suite** | depends: 7.2  
- **Status:** READY (105+ tests already written; needs formal harness)
- **Work remaining:** Consolidate tests into regression suite, CI/CD integration
- **Blocks:** Story 8.2 (issue tracking), formal test automation
- **Acceptance criteria:**
  1. All 105+ tests run automatically
  2. Regression suite includes critical-path tests
  3. CI/CD integration (GitHub Actions or equivalent)

**Story 8.2: Bug & Issue Tracking Workflow** | depends: 8.1  
- **Status:** READY (blocked on Story 8.1)
- **Work remaining:** Formalize bug lifecycle and tracking
- **Blocks:** Systematic QA process
- **Acceptance criteria:**
  1. Bug discovery workflow documented
  2. Triage/priority assignment process defined
  3. `documets/bugs/` entries follow Bug n template

**Story 8.3: Automated Smoke Test Suite** | depends: none  
- **Status:** READY (all prerequisites COMPLETED)
- **Work remaining:** Automate tests for critical routes (at least 50% coverage)
- **Blocks:** None (incremental improvement)
- **Acceptance criteria:**
  1. Smoke tests cover: `/`, `/chat`, `/admin`, `/admin/db`, `/api/docs`
  2. Tests run in CI/CD pipeline
  3. ≥50% route coverage

---

## Manual Tasks — Priority & Sequence

All tasks are in **pending** state unless marked otherwise. Order reflects dependencies.

### Immediate/P0 (Blocking Other Work)

**Task-17: Ensure Ollama model is loaded on startup** | depends: Story 7.1  
- **Category:** Implementation
- **Description:** Ollama service (systemd) starts but model `llama3.2:3b` is not loaded. Add `ollama run llama3.2:3b` to wsl-init.sh or Start-4thBrain.ps1 to ensure model is ready when Node.js bootstrap checks Ollama reachability.
- **Impact:** WITHOUT this, bootstrap health check passes but `/api/tags` returns no available models; Ollama effectively non-functional
- **Estimated effort:** 30 min (add to wsl-init.sh, verify via Start-4thBrain.ps1 status)

**Task-15: Email & Calendar API Integration Design** | depends: NFR design  
- **Category:** Documentation (Architecture/Design)
- **Description:** Story 5.1 (Briefing Synthesis) requires collecting calendar events and unread priority emails. Design not yet specified in requirements — need to decide on: (1) OAuth provider(s) (Gmail? Outlook?), (2) credential storage strategy, (3) email/calendar data model, (4) API selection (library vs. native).
- **Impact:** BLOCKS Story 5.1 (Briefing feature)
- **Estimated effort:** 2-4 hours (research + ADR creation)

### P1 (Story 7.2 Implementation)

**Task-14: Design boot script for Story 7.2** | depends: Story 7.1  
- **Category:** Implementation
- **Status:** COMPLETED 2026-09-02
- **Deliverables:** server/bootstrap.js, scripts/Start-4thBrain.ps1, scripts/wsl-init.sh, documets/design/adr20-boot-sequence.md
- **Note:** Marked for acceptance testing of Story 7.2 completion

### P2 (Story 7.2 Enhancement)

**Task-16: Add component selection to Start-4thBrain.ps1** | depends: Story 7.2 COMPLETED  
- **Category:** Implementation
- **Description:** Add optional parameter `[ollama | server | mcp]` to start/stop/status/restart actions to control individual components. Without parameter, operates on all (current behavior).
- **Rationale:** Useful for development/debugging — can restart Node.js without restarting Ollama
- **Estimated effort:** 1 hour (add parameter validation, conditionally execute component actions)

### P3 (Documentation & Maintenance)

**Task-2: Wire html-sanitize-executor into file-validator** | depends: Story 1.2 code  
- **Category:** Implementation
- **Description:** Route text/html MIME through new sanitization executor instead of direct-copy path. Currently HTML bypasses Story 1.2's sanitization and uses Story 1.1's direct copy (gap found during 1.2 implementation).
- **Impact:** Story 1.2 acceptance criterion technically unmet (HTML not sanitized)
- **Estimated effort:** 2 hours

**Task-3: Test Story 1.2 HTML sanitization end-to-end** | depends: Task-2  
- **Category:** Testing & QA
- **Description:** Run full ingestion pipeline with real HTML files; verify markdown output, archiving, frontmatter. Requires Task-2 to be complete.
- **Estimated effort:** 1 hour

**Task-5: Resolve DESIGN-DEBT item 4 — "Recent activity" UI** | depends: Story 6.3  
- **Category:** Documentation
- **Description:** Hardcoded fake data in Story 6.4 sidebar; decide scope (real recent-N jobs vs. other) and formalize as Story or defer.
- **Impact:** Low (cosmetic only)
- **Estimated effort:** 1 hour (design decision + scope formalization)

**Task-6: Mobile-responsiveness audit** | depends: Story 8.3  
- **Category:** Testing & QA
- **Status:** deferred
- **Description:** Story 13.2 originally scoped this; deferred pending completion of core features
- **When:** Schedule after Story 8.3 lands

**Task-9: Audit existing test coverage gaps** | depends: Story 4.1  
- **Category:** Testing & QA
- **Description:** 105+ tests passing; audit gaps (e.g., Story 1.2 HTML path, Story 4.1 scheduling, API endpoint coverage)
- **Estimated effort:** 2-3 hours

**Task-11: Update TODO-TRACKER submission workflow** | depends: none  
- **Category:** Documentation
- **Description:** When task submitted via /submit-batch, mark in-progress with agent reference (e.g., 'Agent abf58535cfaa7a62f')
- **Impact:** Workflow metadata only
- **Estimated effort:** 30 min (Skill update)

**Task-12: Create todo-check skill** | depends: todo-add skill, batch infra  
- **Category:** Implementation
- **Description:** Skill to query batch agent status, remove completed tasks, sync pending work from planning docs
- **Impact:** Developer productivity (automation)
- **Estimated effort:** 2-3 hours

---

## Architectural Gaps & Known Issues

### Blocking Work

1. **Task-15 (Email/Calendar Design Gap)**  
   Blocks Story 5.1 (Briefing Synthesis). Needs: OAuth provider selection, credential storage ADR, email/calendar data model, API choice.

2. **Task-17 (Ollama Model Loading)**  
   Blocks full Story 7.2 acceptance. Ollama service starts but model not loaded; bootstrap health check will fail when checking for available models.

### Non-Blocking Design Debt

- **DESIGN-DEBT #7:** SQLite FTS5 index placement (derived index in metadata DB vs. schema.sql) — logged but not blocking Story 6.2 implementation (ADR22 resolves it)
- **Story 1.2 HTML sanitization:** Gap found during implementation but deferred pending spike completion (spike-webclipping.md now COMPLETED); Task-2/3 to close gap
- **Story 6.3 fake data:** Task-5 to resolve

---

## Execution Roadmap

### Phase 1 — Resolve Critical Blockers (2-3 days)

1. **Task-17:** Load Ollama model on startup (30 min)
2. **Task-15:** Design email/calendar integration (2-4 hours)
3. **Story 7.2 acceptance testing:** Verify bootstrap.js, Start-4thBrain.ps1 (1-2 hours)

### Phase 2 — Core Features (1-2 weeks)

1. **Story 3.1:** Smart Connections indexing trigger
2. **Story 6.2:** Hybrid search (keyword + semantic)
3. **Story 6.3:** Pipeline monitoring dashboard
4. **Story 5.1:** Briefing synthesis (after Task-15 design)

### Phase 3 — QA & Automation (1 week)

1. **Story 8.1:** Consolidate test harness
2. **Story 8.2:** Bug tracking workflow
3. **Story 8.3:** Smoke test automation

---

## Dependency Graph

```
Task-17 (Ollama model)         → Story 7.2 acceptance
Task-15 (Email/Calendar)       → Story 5.1 (BLOCKED until resolved)
Task-16 (Component selection)  → (nice-to-have enhancement)

Story 7.2 (Bootstrap) ─────────→ Story 3.1 (Indexing)    ─→ Story 6.2 (Search)
                                   ↓
Story 4.1 (Batch) ──────────────→ Story 6.3 (Dashboard)
   ↓
Story 5.1 (Briefing)  [BLOCKED on Task-15 until resolved]

Story 8.1 (Test Harness) ──────→ Story 8.2 (Bug Tracking)
```

---

## Tracking & Status Updates

- **BACKLOG-TRACKER.md** — master story status (READY/WIP/COMPLETED)
- **TODO-TRACKER.md** — manual tasks and implementation checklists
- **NEXT-PLAN.md** (this file) — consolidated roadmap and blockers
- **PROJECT-SUMMARY.md** — current-state summary (read first)

Update flow:
1. On story/task completion → move from READY/pending to COMPLETED
2. Update corresponding tracker (BACKLOG-TRACKER or TODO-TRACKER)
3. This NEXT-PLAN auto-reflects changes at next session start

---

## Changelog

- **2026-09-02:** Created NEXT-PLAN v1.0 — consolidated all open stories (9 READY, 0 WIP), manual tasks (7 pending), blockers (Tasks 15/17), and execution roadmap. Source: BACKLOG-TRACKER 1.25, TODO-TRACKER 2.6, current architectural state.
