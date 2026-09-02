---
name: OGT
description: Open, Gaps, and Tracking — complete inventory of incomplete Stories, Tasks, and blockers
metadata:
  version: 1.0
  created-by: Claude Code agent
  date: 2026-09-01
---

# Open, Gaps, and Tracking (OGT)

Comprehensive snapshot of all incomplete work extracted from `BACKLOG-TRACKER.md` and `TODO-TRACKER.md` as of 2026-09-01. Organized by Epic, then by Story/Task. Includes blockers and dependency status.

---

## Executive Summary

- **Total Stories:** 28
- **Completed Stories:** 19 (68%)
- **Incomplete Stories:** 9 (32%) — all READY status (not yet started)
- **Manual Tasks:** 13
  - Completed: 2 (Task-4, Task-10)
  - Pending: 9
  - Deferred: 2 (Task-6)

**No WIP (in-progress) stories as of 2026-09-01.** All open work is in READY state, waiting to start.

---

## Epic-by-Epic Breakdown

### EP1: Core Ingestion & Sanitization Pipeline

**Status:** 2/2 stories COMPLETED ✓

All ingestion and sanitization capabilities shipped. Story 1.1 verified against real native-Windows environment (2026-08-31). Story 1.2 COMPLETED with PDF/DOCX sanitization; HTML path deferred pending spike results.

| Story | Status | Dependencies | Notes |
|---|---|---|---|
| 1.1 | COMPLETED | 7.2 | Direct Structured Vault Ingestion. Verified 2026-08-30. |
| 1.2 | COMPLETED | 1.1 | Unstructured Text Parsing & Sanitization. PDF/DOCX/URL handling complete. HTML sanitization deferred. |

**Blockers:** None. Task-2 and Task-3 (HTML sanitization wiring) are pending but do not block other epics.

---

### EP2: Automated Tagging & Classification Engine

**Status:** 1/1 story COMPLETED ✓

Story 2.1 (Local LLM Metadata & Tag Inference) shipped with full Ollama integration and classification logic.

| Story | Status | Dependencies | Notes |
|---|---|---|---|
| 2.1 | COMPLETED | 1.1, 7.1 | Infers tags, metadata, topic/subtopic via Ollama. Verified 2026-09-01. |

**Blockers:** None.

---

### EP3: Local Vector Indexing & MCP Integration

**Status:** 1/2 complete; 1 READY

| Story | Status | Dependencies | Notes |
|---|---|---|---|
| 3.1 | READY | 1.1, 7.2 | Smart Connections Vector Indexing Pipeline. Design exists; awaiting implementation. Depends on Obsidian vault + Smart Connections plugin. |
| Spike 3.2 | COMPLETED | 3.1 | Smart Connections Indexing Status Retrieval. Spike completed 2026-08-30; deliverable `vault/check_smart_connections_status.py` verified against live vault. |

**Blockers:** 3.1 not started; depends on Story 7.2 (Process Lifecycle) to be READY.

---

### EP4: Overnight Batch Processing Engine

**Status:** 1/1 story COMPLETED ✓

Story 4.1 (Background Sweep & Queue Execution Script) shipped with 18 passing tests and end-to-end verification.

| Story | Status | Dependencies | Notes |
|---|---|---|---|
| 4.1 | COMPLETED | 1.1, 2.1 | Batch worker and job-state management. Verified 2026-09-01. |

**Blockers:** None.

---

### EP5: Proactive Daily Briefing Pipeline

**Status:** 0/1 READY (blocked)

| Story | Status | Dependencies | Notes |
|---|---|---|---|
| 5.1 | READY | 2.1, 4.1 | Multi-Source Briefing Synthesis Engine. All Story dependencies met (2.1 & 4.1 COMPLETED). **Blocked on Task-15.** |

**Blockers:** 
- **Task-15: email & calendar API integration design** (pending) — Story 5.1 requires collecting calendar events and unread emails, but the design (OAuth, credential storage, data model) is not yet specified in requirements. Blocks Story 5.1 start.

---

### EP6: Unified Web Management & Search Interface

**Status:** 5/5 complete; 0 READY

| Story | Status | Dependencies | Notes |
|---|---|---|---|
| 6.1 | COMPLETED | 1.1, 6.4 | Web Ingestion Form & Submission Handler. Form works, jobs created, IDs returned. Verified 2026-08-30. |
| 6.2 | READY | 3.1, 6.4 | Hybrid Keyword & Semantic Search Interface. Blocked on Story 3.1 (vector indexing). |
| 6.3 | READY | 4.1, 6.4 | Pipeline Monitoring & Dashboard UI. All Story dependencies met (4.1 & 6.4 COMPLETED). **Blocked on Task-13.** |
| 6.4 | COMPLETED | none | Common UI Shell & Design System. Shipped with sidebar nav, greeting, quick-capture bar. |
| 6.5 | COMPLETED | 6.4, 7.1/7.2 | Chat with Llama — Local Ollama Chat Panel. Wired to real Ollama; mock handler removed. Verified 2026-09-01. |

**Blockers:**
- **6.2 depends on Story 3.1** (Vector Indexing, READY). Sequence: 3.1 → 6.2.
- **Task-13: add error_message column to job table** (blocking 6.3) — Story 6.3 (Pipeline Monitoring) needs `job.error_message` to display failure reasons. Currently unimplemented. Blocks Story 6.3 start.

---

### EP7: System Infrastructure & Host Runtime

**Status:** 5/5 complete; 0 READY

| Story | Status | Dependencies | Notes |
|---|---|---|---|
| 7.1 | COMPLETED | none | WSL2 Runtime & Resource Bound Configuration. Ollama systemd service enabled, WSL2 reachable, GPU acceleration via IPEX-LLM (Story 14.1). Verified 2026-09-01. |
| 7.2 | READY | 7.1 | Process Lifecycle & MCP Server Setup. All dependencies met (7.1 COMPLETED). **Blocked on Task-14.** |
| 7.3 | COMPLETED | 7.2 | SQLite Database Setup for Processing-State Persistence. Database initialized with full schema, cross-language access verified. |
| 7.4 | COMPLETED | 7.3 | Create Database Schema from DDL. All 9 tables created (schema.sql corrected via Story 12.2). |
| 7.5 | COMPLETED | 7.4 | Seed Constants & Enumerations. Status, job_type, job_status, classification (system roles) seeded. |

**Blockers:**
- **Task-14: design boot script for Story 7.2** (pending) — Story 7.2 (Process Lifecycle & MCP Server Setup) requires a master boot script coordinating Ollama, Node.js server, and MCP server startup with structured JSON logging. Design not yet specified. Blocks Story 7.2 start.

---

### EP8: QA, Testing Harness & Bug/Issue Tracking

**Status:** 0/3 READY (all awaiting test infrastructure setup)

| Story | Status | Dependencies | Notes |
|---|---|---|---|
| 8.1 | READY | 7.1, 7.2 | Automated Test Harness & Regression Suite. 105+ tests exist; formal harness/regression design needed. No external blockers; design needed. |
| 8.2 | READY | 8.1 | Bug & Issue Tracking Workflow. Blocked on 8.1 test harness. `documets/bugs/` directory exists. |
| 8.3 | READY | 6.4, 6.1, 13.1, 13.3 | Automated Smoke Test Suite. All UI/API dependencies ready (6.4, 6.1, 13.1, 13.3 COMPLETED). Story requires ≥50% route coverage and JavaScript error checking. |

**Blockers:**
- **8.1 (test harness) is a prerequisite for 8.2** — 8.2 cannot start until 8.1 defines the testing framework. Both READY but sequenced.

---

### EP9: Security & Access Control

**Status:** 1/1 story COMPLETED ✓

| Story | Status | Dependencies | Notes |
|---|---|---|---|
| 9.1 | COMPLETED | 7.2 | Local-Only Access Enforcement & Auth Guard. `params.json` bound to 127.0.0.1; IP-based access control middleware applied. Verified 2026-09-01. |

**Blockers:** None.

---

### EP10: Vault Backup, Integrity & Recovery

**Status:** 0/1 READY (blocked by dependency)

| Story | Status | Dependencies | Notes |
|---|---|---|---|
| 10.1 | READY | 4.1, 3.1 | Scheduled Vault Snapshot & Restore. Story 4.1 COMPLETED; blocked on Story 3.1 (Vector Indexing, READY). |

**Blockers:** 10.1 depends on Story 3.1 (Smart Connections Vector Indexing, READY). Sequence: 3.1 → 10.1.

---

### EP11: Production Deployment & Release Management

**Status:** 1/1 story COMPLETED ✓

| Story | Status | Dependencies | Notes |
|---|---|---|---|
| 11.1 | COMPLETED | 7.1, 8.1 | Release Packaging & Versioning. VERSION (0.1.0), CHANGELOG.md (Keep a Changelog), RELEASE.md (rollback procedures) shipped. |

**Blockers:** None.

---

### EP12: Structured Data & Job Queue Persistence

**Status:** 2/2 complete ✓

| Story | Status | Dependencies | Notes |
|---|---|---|---|
| 12.1 | COMPLETED | none | Document/Status/Classification/Job Database Schema Design. Design foundation; all AC met. |
| 12.2 | COMPLETED | none | Schema Redesign. Corrected schema.sql (9 tables), fixed FK types, natural keys, seeded system roles. 105+ tests passing. |

**Blockers:** None. However, **Task-13** (add error_message to job table) may require a Schema Migration Story if the schema needs further corrections — currently deferred as a manual task.

---

### EP13: Admin & Monitoring Tools

**Status:** 3/3 complete ✓

| Story | Status | Dependencies | Notes |
|---|---|---|---|
| 13.1 | COMPLETED | 7.3 | Database Inspector — Table Browser & Admin Panel. `/admin/db` route; full CRUD, pagination, filtering, stats. Dev-mode protected. |
| 13.2 | COMPLETED | 6.4, 13.1 | Remove Embedded Admin Panel, Add Root Redirect and Standalone Admin Menu. Root redirect (`/` → `/chat`), standalone `/admin` menu, sidebar navigation refactored. Verified 2026-08-30. |
| 13.3 | COMPLETED | 12.2, 6.4, 13.1, 6.1 | Unified Data-Access API. Repository layer + `/api/tables/*` REST endpoints; Scalar interactive docs at `/api/docs`. Dev-mode gated. |

**Blockers:** None.

---

### EP14: Performance & GPU Acceleration

**Status:** 1/1 complete ✓

| Story | Status | Dependencies | Notes |
|---|---|---|---|
| 14.1 | COMPLETED | 7.1 | Intel iGPU Acceleration via IPEX-LLM. IPEX-LLM binary installed at `/opt/ollama-ipex-llm/`, systemd auto-start configured, GPU detection confirmed, WSL2 persistence verified, Windows→WSL2 port forwarding tested. All 5 AC met. |

**Blockers:** None.

---

## Open Manual Tasks

All manual tasks extracted from TODO-TRACKER.md:

### Active Implementation Tasks

| ID | Task | Description | Depends On | Status | Blocking | Priority |
|---|---|---|---|---|---|---|
| Task-2 | wire html-sanitize-executor into file-validator | Route text/html MIME through new sanitization executor instead of direct-copy path (Story 1.1). | Story 1.2 code | **pending** | Story 1.2 completion | Low |
| Task-3 | test Story 1.2 HTML sanitization end-to-end | Run full ingestion pipeline with real HTML files; verify markdown output, archiving, frontmatter. | Task-2 + 1.2 code | **pending** | Story 1.2 completion | Low |
| Task-12 | create todo-check skill | Skill to query batch agent status, remove completed tasks, sync pending work from planning docs. | todo-add skill, batch infra | **pending** | (nice-to-have) | Low |
| Task-13 | add error_message column to job table | DESIGN-DEBT #5: job table lacks error_message column; Story 6.3 needs it to display failure reasons. Implement via schema migration or Story 12.3. | Story 12.2 (COMPLETED) | **pending** | **Story 6.3 start** | High |
| Task-14 | design boot script for Story 7.2 | Process Lifecycle & MCP Server Setup: create master boot script coordinating Ollama (WSL2), Node.js server, and MCP server startup; verify port availability; structured JSON logging. | Story 7.1 (COMPLETED) | **pending** | **Story 7.2 start** | High |
| Task-15 | email & calendar API integration design | Story 5.1 (Briefing Synthesis) requires collecting calendar events and emails. Design not yet specified in requirements (OAuth, credential storage, data model). | NFR design gap | **pending** | **Story 5.1 start** | High |

### Documentation Follow-ups

| ID | Task | Description | Impact | Status | Priority |
|---|---|---|---|---|---|
| Task-4 | backpropagate Story 12.2 schema redesign | Update `classes.mmd`, `PROJECT-SUMMARY.md`, `params.json`, per-module backlogs, `server/db/init.js`. | High | **[OK] COMPLETED** | — |
| Task-5 | resolve DESIGN-DEBT item 4: "Recent activity" UI | Hardcoded fake data in sidebar; decide scope (real recent-N jobs vs. other) and formalize as Story or defer. | Medium | **pending** | Low |
| Task-11 | update TODO-TRACKER submission workflow | When task submitted via /submit-batch, mark in-progress with agent reference. | Medium | **pending** | Low |

### Testing & QA

| ID | Task | Description | Depends On | Status | Priority |
|---|---|---|---|---|---|
| Task-8 | run Story 8.3 smoke test (automated) | Automated test coverage for critical routes (`/`, `/chat`, `/admin`, `/admin/db`, `/api/docs`); ≥50% routes. | All UI stories (ready) | **pending** | Medium |
| Task-9 | audit existing test coverage gaps | 105+ tests passing; audit gaps (e.g., Story 1.2 HTML path, Story 4.1 scheduling). | Story 4.1 (COMPLETED) | **pending** | Medium |

### Deferred Tasks

| ID | Task | Description | Impact | Status | Reason |
|---|---|---|---|---|---|
| Task-6 | mobile-responsiveness audit | Story 13.2 originally scoped this; deferred. Schedule once 8.3 lands. | Low | **deferred** | Low priority; schedule after Story 8.3 (test harness) complete. |

---

## Dependency Graph — Ready to Start

**Stories ready to start immediately (all dependencies met):**

1. **Story 3.1** (Smart Connections Vector Indexing) → **not blocked** ✓
2. **Story 6.3** (Pipeline Monitoring) → **blocked on Task-13** ⚠
3. **Story 7.2** (Process Lifecycle) → **blocked on Task-14** ⚠
4. **Story 8.1** (Test Harness) → **not blocked** ✓
5. **Story 8.3** (Smoke Test Suite) → **not blocked** ✓
6. **Story 10.1** (Vault Snapshot) → depends on Story 3.1; start after 3.1 begins

**Stories blocked on manual design tasks:**

| Story | Blocked By | Manual Task | Required For |
|---|---|---|---|
| 5.1 | Task-15 | email & calendar API integration design | OAuth/credential/data model spec |
| 6.3 | Task-13 | add error_message column to job table | Display failure reasons in dashboard |
| 7.2 | Task-14 | design boot script | Master startup script spec |
| 6.2 | Story 3.1 | (story dependency, not a manual task) | Vector search implementation |

---

## Critical Path to Next Release

**Highest-priority unblocked work:**

1. **Start Story 3.1** (Smart Connections Vector Indexing) — unblocks 6.2, 10.1
2. **Start Story 8.1** (Test Harness) — unblocks 8.2
3. **Start Story 8.3** (Smoke Test Suite) — validates UI/API readiness
4. **Complete Task-13, Task-14, Task-15** (design tasks) — unblocks 5.1, 6.3, 7.2

**Dependency chain:**
```
Task-13 → Story 6.3 (Pipeline Monitoring)
Task-14 → Story 7.2 (Process Lifecycle)
Task-15 → Story 5.1 (Daily Briefing)
Story 3.1 → Story 6.2 (Hybrid Search) & Story 10.1 (Vault Snapshot)
Story 8.1 → Story 8.2 (Bug Tracking)
```

---

## Design Debt Entries (Related)

From `DESIGN-DEBT.md`, items affecting incomplete work:

- **#4:** "Recent activity" UI (hardcoded fake sidebar data) — needs scope decision
- **#5:** job table lacks error_message column (blocking Story 6.3) — **Task-13**
- **#6:** Story 5.1 email/calendar integration design gap — **Task-15**

---

## Summary Statistics

| Category | Count | Notes |
|---|---|---|
| **Total Epics** | 14 | EP1–EP14 |
| **Total Stories** | 28 | Across all 14 epics |
| **Completed Stories** | 19 (68%) | 1.1, 1.2, 2.1, 4.1, 6.1, 6.4, 6.5, 7.1–7.5, 9.1, 11.1, 12.1–12.2, 13.1–13.3, 14.1 |
| **Ready Stories** | 9 (32%) | 3.1, 5.1, 6.2, 6.3, 7.2, 8.1, 8.2, 8.3, 10.1 |
| **WIP Stories** | 0 | None as of 2026-09-01 |
| **Spikes Completed** | 2 | Spike 3.2 (Smart Connections status), Spike 14.1 GPU (foundational work for Story 14.1) |
| **Manual Tasks** | 13 | 9 pending, 2 completed, 2 deferred |
| **High-Priority Blockers** | 3 | Task-13 (6.3), Task-14 (7.2), Task-15 (5.1) |

---

## How to Use This Document

1. **For daily standup:** Check "Critical Path to Next Release" section for unblocked work.
2. **For sprint planning:** Use the Epic-by-Epic breakdown to pull stories by feature area.
3. **For roadmap:** Review Dependency Graph to understand sequencing and critical path items.
4. **For blocker resolution:** Scan "Dependency Graph" and "Open Manual Tasks" tables to identify what's preventing progress.

</content>
</invoke>