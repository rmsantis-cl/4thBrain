---
name: TODO-TRACKER
description: Actionable task tracking â€” open stories and manual implementation/planning tasks
metadata:
  version: 1.3
  created-by: Claude Code
  date: 2026-08-31
---

# TODO TRACKER â€” 4thBrain Open Work

Complementary to `BACKLOG-TRACKER.md`. This file tracks:
1. **Open Stories** â€” READY (not started) and WIP (in progress) stories extracted from BACKLOG-TRACKER
2. **Manual Tasks** â€” Implementation tasks (e.g., "implement PLAN-31-08-2026-EP7-Completion"), documentation work, spikes, and ad-hoc follow-ups

Update this tracker when:
- A planning document (PLAN-*.md) is created â†’ add a corresponding "implement PLAN-*" task
- A story moves from READY â†’ WIP â†’ COMPLETED â†’ update the Open Stories section
- A manual task is resolved â†’ mark it done or archive it

---

## Open Stories (from BACKLOG-TRACKER)

### In Progress (WIP)

| ID | Story | Dependencies Met? | Notes |
|---|---|---|---|
| 1.2 | Unstructured Text Parsing & Sanitization | âœ“ 1.1 COMPLETED | HTML sanitization executor added 2026-08-31 (Readability + Turndown); PDF/DOCX working; docs & fixtures included. Not COMPLETED: HTML-to-Markdown still needs to route through the new executor instead of direct-copy path. |
| 4.1 | Background Sweep & Queue Execution Script | âœ“ 1.1 COMPLETED; â³ 2.1 READY | 18 tests passing; one-sweep model implemented; scheduling (cron/systemd) not yet exercised. Depends on 2.1 (classification) for meaningful batch runs. |
| 7.1 | WSL2 Runtime & Resource Bound Configuration | âœ“ (foundation) | GPU acceleration spike complete; Intel iGPU offload verified (29/29 layers). `.wslconfig` and concurrency gate still needed. See `documets/PLAN-31-08-2026-EP7-Completion.md`. |

### Ready to Start (READY)

| ID | Story | Dependencies Met? | Notes |
|---|---|---|---|
| 2.1 | Local LLM Metadata & Tag Inference | âœ“ 1.1 COMPLETED; âœ“ 7.1 WIP (Ollama reachable enough) | Design exists; awaiting implementation. Requires local Ollama connection. |
| 3.1 | Smart Connections Vector Indexing Pipeline | âœ“ 1.1 COMPLETED; âœ“ 7.2 READY | Design exists; awaiting implementation. Depends on Obsidian vault + Smart Connections plugin. |
| 5.1 | Multi-Source Briefing Synthesis Engine | â³ 2.1 READY; â³ 4.1 WIP | Blocked on Story 2.1 (tagging). Awaiting implementation once 2.1 starts. |
| 6.2 | Hybrid Keyword & Semantic Search Interface | â³ 3.1 READY; âœ“ 6.4 COMPLETED | Blocked on Story 3.1 (indexing). UI shell ready (6.4). |
| 6.3 | Pipeline Monitoring & Dashboard UI | â³ 4.1 WIP; âœ“ 6.4 COMPLETED | Blocked on Story 4.1 (batch jobs). UI shell ready. Mock badge notes exist (`server/ui/page.js`). |
| 6.5 | Chat with Llama â€” Local Ollama Chat Panel | âœ“ 6.4 COMPLETED; â³ 7.1 WIP (Ollama reachable) | Mock handler in place (`server/routes/chat-llama.js`); real Ollama wiring needed. |
| 7.2 | Process Lifecycle & MCP Server Setup | â³ 7.1 WIP | Depends on 7.1 (WSL2 base). Design exists. |
| 8.1 | Automated Test Harness & Regression Suite | â³ 7.1 WIP; â³ 7.2 READY | Existing tests (105+ passing); formal harness/regression suite design needed. |
| 8.2 | Bug & Issue Tracking Workflow | â³ 8.1 READY | Blocked on 8.1 test harness. `documets/bugs/` directory structure exists. |
| 8.3 | Manual Smoke Test â€” Browser Navigation & Screenshot Verification | âœ“ All UI stories ready (6.4, 6.1, 13.1, 13.3) | Requires running server + browser; acceptance criteria defined. |
| 9.1 | Local-Only Access Enforcement & Auth Guard | âœ“ 7.2 READY; âœ“ 6.1 COMPLETED | No cloud calls; local token/session auth. Design exists. |
| 10.1 | Scheduled Vault Snapshot & Restore | â³ 4.1 WIP; â³ 3.1 READY | Blocked on 4.1 (batch runner) and 3.1 (indexing). Pre-batch-run snapshot pattern. |
| 11.1 | Release Packaging & Versioning | â³ 7.1 WIP; â³ 7.2 READY; â³ 8.1 READY | Blocked on 7.1/7.2 (infra) and 8.1 (tests). Release definition & changelog. |
| 12.2 | Schema Redesign | âœ“ (standalone) | Schema fixes already applied to `documets/design/schema.sql` and `classes.md`. Awaiting implementation of Story 13.3 (API layer) to verify. **Follow-up task:** documentation backpropagation (`classes.mmd`, `PROJECT-SUMMARY.md`, `params.json`, etc.) â€” see BACKLOG-TRACKER. |

---

## Manual Tasks

### Active Implementation Tasks

| ID | Task | Description | Depends On | Status |
|---|---|---|---|---|
| Task-1 | implement PLAN-31-08-2026-EP7-Completion | Finalize Story 7.1: GPU permanent setup (`.wslconfig`), concurrency gate, verify systemd wiring. See `documets/PLAN-31-08-2026-EP7-Completion.md`. | 7.1 GPU spike | pending |
| Task-2 | wire html-sanitize-executor into file-validator | After Story 1.2's HTML sanitization code (2026-08-31), route `text/html` MIME type through the new executor instead of direct-copy path (Story 1.1). Currently HTML bypasses sanitization. | 1.2 code | pending |
| Task-3 | test Story 1.2 HTML sanitization end-to-end | Run the full ingestion pipeline with real HTML files (web clips, saved pages) through the new executor; verify markdown output, archiving, and frontmatter. | 1.2 code + Task-2 | pending |

### Documentation Follow-ups

| ID | Task | Description | Impact | Status |
|---|---|---|---|---|
| Task-4 | backpropagate Story 12.2 schema redesign | Update `classes.mmd`, `PROJECT-SUMMARY.md`, `params.json`, per-module backlog files, and `server/db/init.js` (PRAGMA foreign_keys). Blocked on Story 13.3 (API layer) â€” do after implementation. | High (schema docs drift) | pending |
| Task-5 | resolve DESIGN-DEBT item 4: “Recent activity” UI | Current sidebar hardcoded fake data; decide scope (real recent-N jobs vs. other) and formalize as a Story or defer. | Medium | pending |
| Task-6 | mobile-responsiveness audit (Story 8.3 deferred) | User Story 13.2 originally scoped mobile-UI review; deferred to later. Schedule once 8.3 lands. | Low | deferred |

### Testing & QA

| ID | Task | Description | Depends On | Status |
|---|---|---|---|---|
| Task-8 | run Story 8.3 smoke test (manual) | Navigate all routes (`/`, `/chat`, `/admin`, `/admin/db`, `/api/docs`); verify no JS errors, form submissions work, screenshots for regression. | All UI stories ready | pending |
| Task-9 | audit existing test coverage gaps | 105+ tests passing; audit for missing coverage (e.g., Story 1.2's HTML path, Story 4.1 scheduling). | 4.1 WIP | pending |

---

## Changelog

- **2026-08-31** â€” Created TODO-TRACKER as a complement to BACKLOG-TRACKER. Extracted all READY and WIP stories. Added “wire html-sanitize-executor” and “test Story 1.2 end-to-end” as active implementation tasks following the new HTML sanitization code (2026-08-31). Noted “implement PLAN-31-08-2026-EP7-Completion” as a task tracked in parallel with Story 7.1's GPU work.
- **2026-08-31** â€” Added task “Test” via /todo-add skill (documentation task, low impact, in-progress)
- **2026-08-31** â€” Added Task IDs (Task-1 through Task-9) to all manual tasks across Active Implementation, Documentation Follow-ups, and Testing & QA sections
- **2026-08-31** â€” Removed Task-7 (Test) â€” completed

