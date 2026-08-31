---
name: EPIC-TRACKER
description: Epic-level rollup of story status and blocking issues — sourced from BACKLOG-TRACKER.md and DESIGN-DEBT.md
date: 2026-08-31
metadata:
  version: 1.1
  created-by: Claude Code
---

# EPIC TRACKER — 4thBrain Epics

Epic-level rollup derived from `documets/BACKLOG-TRACKER.md` (per-story status) and `documets/DESIGN-DEBT.md` (open gaps). Update this file whenever those two change status — it does not track independently.

Status legend: **NOT STARTED** (all stories READY) · **WIP** (mix of statuses, or a story actively in progress) · **COMPLETED** (all stories COMPLETED).

| Epic | Status | Open Stories | Show Stoppers |
|---|---|---|---|
| EP1 — Core Ingestion & Sanitization Pipeline | WIP | 1.2 | HTML/web-clip sanitization unbuilt — `text/html` bypasses Story 1.2's sanitizer via Story 1.1's direct-copy path. Design work (`spike-webclipping`) is done; code isn't. Blocks 1.2 from COMPLETED. |
| EP2 — Automated Tagging & Classification Engine | NOT STARTED | 2.1 | Needs local LLM inference reachable; depends on EP7 (7.1/7.2 still READY). |
| EP3 — Local Vector Indexing & MCP Integration | WIP | 3.1 | Depends on Story 7.2 (MCP server setup — READY, not started). Spike 3.2 is done; the implementation story itself hasn't begun. |
| EP4 — Overnight Batch Processing Engine | WIP | 4.1 | Real scheduling (systemd timer/cron) unexercised — no WSL2 host available in dev sessions to verify. Sweep logic itself is tested. |
| EP5 — Proactive Daily Briefing Pipeline | NOT STARTED | 5.1 | Blocked on both dependencies: Story 2.1 (not started) and Story 4.1 (WIP). |
| EP6 — Unified Web Management & Search Interface | WIP | 6.2, 6.3, 6.5 | Design Debt #5 (open): `job` table has no `error_message` column, so Story 6.3's "Failed jobs show error reason" AC can only show a fixed placeholder. Design Debt #4 (open): the sidebar "Recent" activity list has no Epic/Story coverage — needs a scope decision before it can be built for real. Story 6.5 needs Ollama actually reachable (EP7). Story 6.2 depends on Story 3.1 (not started). |
| EP7 — System Infrastructure & Host Runtime | WIP | 7.1, 7.2 | Real WSL2/Ollama host access confirmed available (2026-08-31) — a GPU-acceleration spike proved Intel iGPU offload works end-to-end (see `documets/story/spike-gpu-ollama.md`). Remaining gap is production wiring, not host availability: `.wslconfig`, a permanent systemd-managed install, the generalized Ollama-call concurrency gate, and Story 7.2's MCP server are all still unbuilt. |
| EP8 — QA, Testing Harness & Bug/Issue Tracking | NOT STARTED | 8.1, 8.2, 8.3 | No formalized automated test harness (Story 8.1) despite per-module ad hoc suites already existing (e.g. 105 tests under `server/`). |
| EP9 — Security & Access Control | NOT STARTED | 9.1 | Proposed NFR13 (Auth & Local Access Control) not yet formally scope-locked — EP9's acceptance criteria inherit from it. Also depends on Story 7.2 (not started). |
| EP10 — Vault Backup, Integrity & Recovery | NOT STARTED | 10.1 | Proposed NFR14 (Backup & Recovery) not yet formally scope-locked. Also depends on Story 4.1 (WIP) and Story 3.1 (not started). |
| EP11 — Production Deployment & Release Management | NOT STARTED | 11.1 | Depends on Story 7.1, 7.2, and 8.1 — none started. |
| EP12 — Structured Data & Job Queue Persistence | WIP | 12.2 | Documentation inconsistency: the 12.2 schema redesign is already reflected in `schema.sql`/`classes.md`/root `CLAUDE.md`, but the story itself is tracked READY, and several docs haven't caught up (`classes.mmd`/`classes.png`, `database-schema.md`, `PROJECT-SUMMARY.md`, `params.json`, and `server/db/init.js` missing `PRAGMA foreign_keys = ON`) — see BACKLOG-TRACKER's "Follow-up Tasks". |
| EP13 — Admin & Monitoring Tools | COMPLETED | none | None blocking. OpenAPI schema fidelity gap (generic placeholders instead of full per-field schemas) logged as a non-blocking documentation follow-up. |

## Notes

- "Open Stories" lists story IDs not yet COMPLETED (READY or WIP) per `documets/BACKLOG-TRACKER.md`.
- "Show Stoppers" pulls from `documets/DESIGN-DEBT.md` open items (#4, #5), the two pending NFRs (NFR13/NFR14) noted in `documets/PROJECT-SUMMARY.md`, and unresolved story dependencies. Design Debt items #2 and #3 are Cleared and omitted here.
- EP7 is the systemic show-stopper across most other epics per the dependency chain in root `CLAUDE.md` — it's called out per-epic above rather than repeated as a blanket caveat.

## Changelog

- 2026-08-31: Created — epic-level rollup sourced from BACKLOG-TRACKER.md v1.9 and DESIGN-DEBT.md v1.4.
- 2026-08-31: Updated EP7's Show Stoppers — the "no WSL2 host available" caveat no longer holds (this session had live access and used it for a successful GPU-acceleration spike). Reworded to reflect the real remaining gap: production wiring, not host availability.
