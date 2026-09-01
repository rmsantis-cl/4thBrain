---
name: TODO-TRACKER
description: Actionable task tracking â€” open stories and manual implementation/planning tasks
metadata:
  version: 1.13
  created-by: Claude Code
  date: 2026-09-01
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
| 1.2 | Unstructured Text Parsing & Sanitization | [OK] 1.1 COMPLETED | HTML sanitization executor added 2026-08-31 (Readability + Turndown); PDF/DOCX working; docs & fixtures included. Not COMPLETED: HTML-to-Markdown still needs to route through the new executor instead of direct-copy path. |
| 4.1 | Background Sweep & Queue Execution Script | [OK] 1.1 COMPLETED; â³ 2.1 READY | 18 tests passing; one-sweep model implemented; scheduling (cron/systemd) not yet exercised. Depends on 2.1 (classification) for meaningful batch runs. |
| 2.1 | Local LLM Metadata & Tag Inference | âœ” 1.1 COMPLETED; âœ” 7.1 WIP (Ollama reachable) | Design exists; awaiting implementation. Requires local Ollama connection. Started 2026-09-01. |
| 7.1 | WSL2 Runtime & Resource Bound Configuration | âœ” (foundation) | GPU acceleration spike complete (Intel iGPU offload verified 29/29 layers). `.wslconfig` written (16GB cap); concurrency gate generalized (`server/lib/ollama-concurrency-gate.js`). IPEX-LLM permanent install blocked on architecture decision (`spike-ollama-permanent-install.md`). See `documets/PLAN-31-08-2026-EP7-Completion.md`. |

### Ready to Start (READY)

| ID | Story | Dependencies Met? | Notes |
|---|---|---|---|
| 3.1 | Smart Connections Vector Indexing Pipeline | âœ” 1.1 COMPLETED; [TODO] 7.2 READY | Design exists; blocker identified: 4 implementation gaps documented in `documets/story/story-3.1.md` (vault watcher, MCP orchestration, job executor registration, acceptance testing). Currently blocked on Story 7.2 (MCP server setup). Spike 3.2 (status checking) is COMPLETED. |
| 5.1 | Multi-Source Briefing Synthesis Engine | â³ 2.1 READY; â³ 4.1 WIP | Blocked on Story 2.1 (tagging). Awaiting implementation once 2.1 starts. |
| 6.2 | Hybrid Keyword & Semantic Search Interface | â³ 3.1 READY; [OK] 6.4 COMPLETED | Blocked on Story 3.1 (indexing). UI shell ready (6.4). |
| 6.3 | Pipeline Monitoring & Dashboard UI | â³ 4.1 WIP; [OK] 6.4 COMPLETED | Blocked on Story 4.1 (batch jobs). UI shell ready. Mock badge notes exist (`server/ui/page.js`). |
| 6.5 | Chat with Llama â€” Local Ollama Chat Panel | [OK] 6.4 COMPLETED; â³ 7.1 WIP (Ollama reachable) | Mock handler in place (`server/routes/chat-llama.js`); real Ollama wiring needed. |
| 7.2 | Process Lifecycle & MCP Server Setup | â³ 7.1 WIP | Depends on 7.1 (WSL2 base). Design exists. |
| 8.1 | Automated Test Harness & Regression Suite | â³ 7.1 WIP; â³ 7.2 READY | Existing tests (105+ passing); formal harness/regression suite design needed. |
| 8.2 | Bug & Issue Tracking Workflow | â³ 8.1 READY | Blocked on 8.1 test harness. `documets/bugs/` directory structure exists. |
| 8.3 | Manual Smoke Test â€” Browser Navigation & Screenshot Verification | [OK] All UI stories ready (6.4, 6.1, 13.1, 13.3) | Requires running server + browser; acceptance criteria defined. |
| 9.1 | Local-Only Access Enforcement & Auth Guard | [OK] 7.2 READY; [OK] 6.1 COMPLETED | No cloud calls; local token/session auth. Design exists. |
| 10.1 | Scheduled Vault Snapshot & Restore | â³ 4.1 WIP; â³ 3.1 READY | Blocked on 4.1 (batch runner) and 3.1 (indexing). Pre-batch-run snapshot pattern. |
| 11.1 | Release Packaging & Versioning | â³ 7.1 WIP; â³ 7.2 READY; â³ 8.1 READY | Blocked on 7.1/7.2 (infra) and 8.1 (tests). Release definition & changelog. |
| 12.2 | Schema Redesign | [OK] (standalone) | Schema fixes already applied to `documets/design/schema.sql` and `classes.md`. Awaiting implementation of Story 13.3 (API layer) to verify. **Follow-up task:** documentation backpropagation (`classes.mmd`, `PROJECT-SUMMARY.md`, `params.json`, etc.) â€” see BACKLOG-TRACKER. |

---

## Manual Tasks

### Active Implementation Tasks

| ID | Task | Description | Depends On | Status |
|---|---|---|---|---|
| Task-1 | implement PLAN-31-08-2026-EP7-Completion | Finalize Story 7.1: GPU permanent setup (`.wslconfig`), concurrency gate, verify systemd wiring. See `documets/PLAN-31-08-2026-EP7-Completion.md`. | Story 7.1 | pending |
| Task-13 | implement Story 3.1 Smart Connections Vector Indexing | 4 gaps identified: (1) Vault file watcher for change detection, (2) Smart Connections MCP orchestration, (3) Job executor registration for 'index' type, (4) E2E testing. Blocked on Story 7.2 (MCP server setup). Design in `documets/story/story-3.1.md`. | Story 7.2 | pending |
| Task-10 | implement PLAN-31-08-2026-Story-2.1 | Implement Story 2.1 classification executor — LLM-based tag/topic inference via Ollama, frontmatter generation, attachment relocation. Depends on Story 1.1 complete + Story 7.1 Ollama reachable. | Story 2.1 | pending |
| Task-12 | create a todo-check skill to sync batch task status and add pending work | Create a `todo-check` skill that queries batch agent status, removes completed tasks from TODO-TRACKER, and adds any new pending work from planning documents to the tracker. | todo-add skill, batch infrastructure | pending |
| Task-14 | complete story 7.1 | Finish Story 7.1 (WSL2 Runtime & Resource Bound Configuration): (1) Resolve architecture decision on IPEX-LLM permanent install location and systemd unit (spike-ollama-permanent-install.md has two options); (2) Promote spike build to `/opt/ollama-ipex-llm/` and register systemd unit; (3) Re-verify GPU offload after WSL2 restart cycle; (4) Test Windows→WSL2 port forwarding (`curl localhost:11434/api/tags` from PowerShell). | spike-ollama-permanent-install.md, Story 7.1 design | pending |

### Documentation Follow-ups

| ID | Task | Description | Impact | Status |
|---|---|---|---|---|
| Task-5 | resolve DESIGN-DEBT item 4: “Recent activity” UI | Current sidebar hardcoded fake data; decide scope (real recent-N jobs vs. other) and formalize as a Story or defer. | Medium | pending |
| Task-6 | mobile-responsiveness audit (Story 8.3 deferred) | User Story 13.2 originally scoped mobile-UI review; deferred to later. Schedule once 8.3 lands. | Low | deferred |
| Task-11 | update TODO-TRACKER when submitting batch tasks | When a task is submitted via /submit-batch, update its status to in-progress and add session/agent reference (e.g., 'Agent abf58535cfaa7a62f'). | Medium | pending |

### Testing & QA

| ID | Task | Description | Depends On | Status |
|---|---|---|---|---|
| Task-8 | run Story 8.3 smoke test (manual) | Navigate all routes (`/`, `/chat`, `/admin`, `/admin/db`, `/api/docs`); verify no JS errors, form submissions work, screenshots for regression. | All UI stories ready | pending |
| Task-9 | audit existing test coverage gaps | 105+ tests passing; audit for missing coverage (e.g., Story 1.2's HTML path, Story 4.1 scheduling). | 4.1 WIP | pending |

---

## Completed Tasks

| ID | Task | Completed | Notes |
|---|---|---|---|
| Task-2 | wire html-sanitize-executor into file-validator | 2026-08-31 | Routed `text/html` MIME type through new executor (Story 1.2). HTML content now sanitized instead of direct-copy. |
| Task-3 | test Story 1.2 HTML sanitization end-to-end | 2026-08-31 | Full ingestion pipeline tested with real HTML files; markdown output, archiving, and frontmatter verified. |
| Task-4 | backpropagate Story 12.2 schema redesign | 2026-09-01 (pass 5) | Updated classes.mmd (visual diagram) to reflect 9-table schema (status, job_type, job_status, classification, document, tag, document_tag, job, job_file). Also updated params.json and PROJECT-SUMMARY.md in earlier passes. PNG rendering requires Mermaid CLI (deferred). |

---

## Changelog

- **2026-09-01 (pass 5)** — Completed Story 14.1 (Intel iGPU Acceleration via IPEX-LLM). IPEX-LLM Ollama service auto-starts via systemd, GPU detected on boot, Windows→WSL2 port forwarding verified, service persists across WSL2 restart. Completed Task-4 (backpropagate Story 12.2 schema redesign): updated classes.mmd diagram to reflect 9-table schema. Story 2.1 blocked on "needs dedicated implementation pass" (6–8 hour effort). Story 7.2 blocked on "needs dedicated implementation pass" (2–3 hours). Story 8.3 blocked on "requires browser environment". Identified Task-1 as stale (Story 7.1 already complete). Bumped version to 1.13.
- **2026-09-01 (pass 2-3)** — Completed Stories 6.5 (Chat with Llama real Ollama wiring) and 9.1 (Local-Only Access Enforcement). Story 6.5: replaced mock handler with real OpenAI SDK call to Ollama endpoint; removed mock-badge from UI. Story 9.1: changed server_bind_host from "0.0.0.0" to "127.0.0.1"; added `server/middleware/local-only.js` IP-based access control; applied to all sensitive routes. Story 7.1 noted as COMPLETED (moved from WIP 2026-09-01). Created working notes for Stories 6.5 and 9.1. Bumped version from 1.11 to 1.12.
- **2026-09-01 (pass 3)** — Task-4 (backpropagate Story 12.2) progressed from pending to mostly-complete: params.json updated with directory keys, PROJECT-SUMMARY.md table documentation corrected, per-module backlog files checked (no updates needed), server/db/init.js already had PRAGMA foreign_keys. Pending: classes.mmd visual diagram. Bumped version from 1.9 to 1.10.
- **2026-08-31** – Reset Task-1 and Task-10: cleared agent references, changed status from in-progress to pending.
- **2026-08-31** â€” Reorganized Manual Tasks: moved completed Task-2 and Task-3 to “Completed Tasks” section at bottom. Task-1 remains in-progress.
- **2026-08-31 (final pass)** â€” Completed Story 1.2 documentation updates and marked COMPLETED. Created comprehensive Story 3.1 working notes identifying 4 implementation gaps (vault watcher, MCP orchestration, job executor, E2E testing). Created Story 4.1 documentation coherence audit confirming no blocking issues. Updated TODO-TRACKER: moved Story 1.2 to COMPLETED section, added Story 3.1 detailed notes to READY, marked Tasks 2-3 as completed, added Task-13 for Story 3.1 implementation.
- **2026-08-31** â€” Created TODO-TRACKER as a complement to BACKLOG-TRACKER. Extracted all READY and WIP stories. Added “wire html-sanitize-executor” and “test Story 1.2 end-to-end” as active implementation tasks following the new HTML sanitization code (2026-08-31). Noted “implement PLAN-31-08-2026-EP7-Completion” as a task tracked in parallel with Story 7.1's GPU work.
- **2026-08-31** â€” Added task “Test” via /todo-add skill (documentation task, low impact, in-progress)
- **2026-08-31** â€” Added Task IDs (Task-1 through Task-9) to all manual tasks across Active Implementation, Documentation Follow-ups, and Testing & QA sections
- **2026-08-31** â€” Removed Task-7 (Test) â€” completed
- **2026-08-31** â€” Created PLAN-31-08-2026-Story-2.1 (4-phase implementation plan: prompt design, executor, job queue integration, testing) and added Task-10 to track its execution
- **2026-08-31** â€” Added Task-11 (Documentation): update TODO-TRACKER workflow to mark tasks as in-progress with agent reference when submitted to batch
- **2026-08-31** â€” Added Task-12 (Implementation): create todo-check skill to query batch agent status, remove completed tasks, and sync pending work from planning documents
- **2026-08-31** â€” Marked Task-1 and Task-10 as in-progress with agent IDs (abf58535cfaa7a62f, a7f9efb413b13e7cd) — submitted to batch processor

