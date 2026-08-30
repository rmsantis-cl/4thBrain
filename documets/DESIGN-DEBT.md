---
name: DESIGN-DEBT
description: Log of design gaps found mid-plan — missing Epic/Story coverage or missing design decisions — per .claude/rules/design-before-implementation.md
date: 2026-08-30
metadata:
  version: 1.3
  created-by: Claude Code
---

# Design Debt Log

Per `.claude/rules/design-before-implementation.md`: no implementation without a design and without an Epic/Story it belongs to. When planning surfaces a gap — something needed that has no Epic/Story, or no design decision behind it — it's logged here instead of implemented around. A plan isn't complete until every Design Debt item it raised is Cleared or explicitly deferred with sign-off.

| ID | Description | Raised During | Status | Resolution |
|---|---|---|---|---|
| 2 | `GET /` returns "Cannot GET /" — no route redirects the root path to `/chat`. EP6 covers the `/chat` UI shell but no Story specifies root-path behavior. | User hit `http://localhost:3000/` directly after starting the server, 2026-08-28 | Cleared | Story 13.2 added the redirect (`server/index.js:29`, `app.get("/", ...) => res.redirect(302, "/chat")`) and is itself now correctly marked COMPLETED in BACKLOG-TRACKER (was mislabeled "Review Mobile UI"/READY — corrected 2026-08-30). Verified live during the UI orphan-page review, 2026-08-30. |
| 3 | Which Story owns copying an already-indexable file (text/md/html) from staging into `$VAULT_DIR/incoming`? `documets/BACKLOG-TRACKER.md`, `documets/design/ADRS.md` (ADR14), and `documets/story/story-1.1.md` all assign this to **Story 1.1**. `documets/story/story-6.1.md`'s "Actuator" mock table instead assigns the same action ("Copies file from TMP_DIR to VAULT_INCOMING") to **"RAG Indexing" / Story 3.1** — but BACKLOG-TRACKER describes Story 3.1 as triggering Smart Connections *embedding* updates for files already in the vault, not staging them there. Three of four sources agree; story-6.1.md is explicitly a "first version for state flow testing" mock design, not a ratified actuator assignment. | Implementing Story 1.1, 2026-08-30 | Deferred | Proceeded per the majority/authoritative sources (BACKLOG-TRACKER + ADR14 + story-1.1.md): Story 1.1 owns the copy-to-`$VAULT_DIR/incoming` step; Story 3.1 remains scoped to triggering the embedding pass once a file is already there. story-6.1.md's actuator table should be corrected to match on a future pass touching that file. |
| 4 | The `/chat` sidebar's "Recent" list (`server/ui/page.js`, `.recent-list`/`.recent-item` markup) is hardcoded static HTML — 4 fake entries with no data source, no fetch call in `client.js`, and no `mock-badge` label (unlike the "Ingest status"/"Chat with Llama" panels, which do self-label as mocked). No Epic/Story in `documets/design/Project 4thBrain.md` covers a recent-activity sidebar feed at all. | UI orphan-page / mocked-action review, 2026-08-30 | Open | Needs a scope decision before a Story can be written: is this meant to show the N most recent `document`/`job` rows (data already available via `/api/tables/document` per Story 13.3), or something richer (per-item status icons imply live job state, which the current static markup fakes with hardcoded `done`/`active`/`failed` dot classes)? |
| 5 | `job` table (`documets/design/schema.sql`) has no error-message/reason column, so a Failed job has nowhere to persist *why* it failed — `batch/worker.js`'s catch block only logs `err.message` to the structured log stream, it never writes it to the row. Story 6.3's acceptance criterion "Failed jobs show error reason" (`documets/design/Project 4thBrain.md` doesn't state this explicitly, but `IMPLEMENTATION-PLAN-PHASE-2.md` §1 does) can't be met with real per-job error text without a schema change. | Implementing Story 6.3 (real monitoring dashboard), 2026-08-30 | Open | Implemented the failed-jobs list and Retry action without a persisted reason — the panel shows a fixed "No error detail persisted for this job — see server logs" string instead of fabricating detail the system doesn't capture (`server/routes/status.js`). Closing this needs a schema change (an `error_message` column on `job`) plus `JobRepository.markFailed(id, message)` writing to it — out of this pass's scope (schema.sql wasn't touched). |

## Changelog

- 2026-08-27: Created, empty — companion log for the new design-before-implementation rule.
- 2026-08-28: Added item 2 (root path redirect to /chat).
- 2026-08-30: Added item 3 (Story 1.1 vs. 3.1 ownership conflict over the vault/incoming copy step), deferred with resolution basis recorded; discovered while implementing Story 1.1.
- 2026-08-30: Cleared item 2 (root redirect — already implemented via Story 13.2, itself now correctly tracked as COMPLETED). Added item 4 (undocumented "Recent" sidebar list, no Story, needs scope decision). Found during a UI orphan-page/mocked-action review.
- 2026-08-30: Added item 5 (job table has no persisted error-message column, so Story 6.3's "Failed jobs show error reason" can only show a fixed placeholder, not real per-job detail). Found while implementing the real Story 6.3 monitoring dashboard.
