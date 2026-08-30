---
name: story-13.3
description: Working notes for Story 13.3 - Unified Data-Access API
date: 2026-08-28
metadata:
  version: 1.0
  created-by: Claude Code
---

# Story 13.3: Unified Data-Access API

Canonical story text lives in `documets/design/Project 4thBrain.md` (EP13). This file tracks the working context behind it.

## Abstract

Replace ad-hoc SQL and the generic PRAGMA-reflected CRUD engine with a validated repository layer and per-table REST API.

## Observations

- `server/lib/ingest-service.js` predates the Story 12.2 schema rewrite entirely and is currently broken: it writes `document.status_id`/`job.job_type_id` (neither column exists — the real columns are `status`/`job_type`, TEXT FKs to name-keyed tables) and a `job_document` table (doesn't exist at all — dropped as part of Bug 1's correction). Every `/api/ingest/*` POST currently throws a SQLite error against the live schema. This is the top-priority fix in this story.
- `server/db/init.js` only runs `schema.sql` when the `.db` file doesn't exist yet. `server/4thbrain-metadata.db` already exists (leftover from before the Story 12.2 rewrite) with zero tables, so it will never pick up the new schema without a fix. Independent bug from the DAL redesign itself, but fixed as a prerequisite step since nothing else in this story is testable against an empty database.
- `node:sqlite`'s `DatabaseSync` (this project's driver, per ADR17/Story 7.3) has **no `.transaction()` helper**, unlike `better-sqlite3`. Multi-statement writes (e.g. document + tag + document_tag + job in one ingest) need a manual `withTransaction(db, fn)` wrapping `BEGIN`/`COMMIT`/`ROLLBACK`.
- `PRAGMA foreign_keys` is never enabled anywhere in the codebase — every `REFERENCES` constraint in `schema.sql` is currently unenforced at runtime. Set once per connection in `db/init.js`.
- Architecture principle (already settled during Story 12.2 planning): REST routes are thin controllers with no business logic; validation/business rules live in the repository layer; both the REST routes AND internal app code (`ingest-service.js`) call the repository layer in-process — no self-HTTP calls.
- Routing stays DRY via one generic `/api/tables/:table/:key` dispatcher backed by a hardcoded table→repository registry, while validation stays strictly per-table (rejecting the acceptance criteria's explicit ban on generic PRAGMA-reflected validation, which is what `admin-db.js` currently does unsafely).
- `document_tag` has a composite key (no single PK), so it isn't addressable through the generic `:table/:key` shape — exposed instead as a nested resource under `document`: `GET/POST /api/tables/document/:id/tags`, `DELETE /api/tables/document/:id/tags/:tagName`.
- `admin-db.js` builds SQL by interpolating table/column identifiers directly into query strings (only values are parameterized). This story does not fix that directly — `admin-db.js` itself is retired in Story 13.2, not rewritten here — but the new repository layer/REST API this story builds is what `admin-db.js`'s replacement UI (Story 13.2) will call instead, which is how the identifier-injection surface actually gets closed.
- Scope boundary, confirmed against `documets/PLAN-28-08-2026.md`'s three-story split: deleting `admin-db.js`, moving `/admin/db` → `/admin`, and the `GET /` → `/chat` redirect are Story 13.2's job. Story 13.2 depends on this story's `/api/tables/*` existing, not the reverse. `server/ui/*` is untouched by this story.

## Deliverable

**New files:**
- `server/db/init.js` (rewritten) — `PRAGMA foreign_keys = ON` on every connection, plus a `sqlite_master` table-count check that (re-)applies `schema.sql` whenever the database has zero tables. This is a bootstrap check, not a migration system — it won't detect drift if `schema.sql` gains a column against an already-populated database later (see TODO).
- `server/lib/repositories/errors.js` — `ValidationError` (400) / `NotFoundError` (404), shared by every repository and the REST layer.
- `server/lib/repositories/tx.js` — `withTransaction(db, fn)`, the manual `BEGIN`/`COMMIT`/`ROLLBACK` wrapper `DatabaseSync` doesn't provide natively.
- `server/lib/repositories/helpers.js` — `assertExists(db, table, column, value, label)`, a shared FK-existence check. Table/column names passed to it are always hardcoded string literals inside the calling repository's own source, never derived from request input — not the same class of risk as `admin-db.js`'s identifier interpolation.
- `server/lib/repositories/status.js`, `jobStatus.js`, `jobType.js` — enum-table pattern: `create`/`update` only ever touch `description`; `remove()` unconditionally throws (`"cannot delete a fixed enum value"`) — these are fixed enumerations, never deletable or renameable.
- `server/lib/repositories/classification.js` — `create`/`update` validate `parent` exists in `classification` (when set); `remove()` checks no `document.topic` or child `classification.parent` still references the name before allowing deletion.
- `server/lib/repositories/tag.js` — `remove(name)` sets `end_date`/`active=false` instead of `DELETE` (row survives, per the tag lifecycle established in Story 12.2); `update()` rejects any attempt to change `name` (the primary key); `upsert(name)` reactivates an end-dated tag or creates a new one — this is what `ingest-service.js` calls per tag.
- `server/lib/repositories/document.js` — `create`/`update` validate `status` against `status` and `topic` against `classification`; `create()` omits `id` from the INSERT and reads the new row back via `lastInsertRowid` (no app-generated keys).
- `server/lib/repositories/documentTag.js` — not generic CRUD (composite key, no single PK): exposes `listForDocument(db, documentId)`, `link(db, documentId, tagName)` (validates both sides exist and the tag is `active`), `unlink(db, documentId, tagName)`.
- `server/lib/repositories/job.js` — `create`/`update` validate `job_type` against `job_type`, `status` against `job_status`, `document_id` against `document` (nullable), `parent_job_id` against `job` (nullable).
- `server/lib/repositories/jobFile.js` — `create` validates `job_id` against `job`; `status` is intentionally passed through unvalidated free text, per the schema's own inline comment (`-- file status, not job status; not validated for now`).
- `server/lib/repositories/index.js` — the registry: `{ status, job_status, job_type, classification, tag, document, job, job_file }` mapping table name → repository module. Single source of truth for what `/api/tables/*` can serve; `document_tag` is deliberately excluded (served via the nested-resource routes instead).
- `server/middleware/dev-only.js` — the `NODE_ENV=development` gate, extracted verbatim from `admin-db.js`'s existing inline check (behavior-preserving refactor, not a rewrite).
- `server/routes/api/tables.js` — one generic, dev-gated dispatcher router mounted at `/api/tables`, translating `GET/POST /:table` and `GET/PATCH/DELETE /:table/:key` into calls on `req.repo` (looked up from the registry) — no SQL, no validation logic in this file, per the acceptance criteria. Plus the three nested `document/:id/tags` routes for `document_tag`.
- `server/openapi/spec.js` — hand-authored OpenAPI 3.0 document (not DB-reflected), full per-field request/response schemas for all 9 tables plus a shared `Error` schema for 400/404/500 responses. Small enough to maintain by hand at this schema size.
- `server/routes/api-docs.js` — mounts `@scalar/express-api-reference` at `GET /api/docs`, dev-gated, serving the spec at `GET /api/docs/openapi.json`.

**Modified files:**
- `server/lib/ingest-service.js` — full rewrite: calls the repository layer inside `withTransaction` instead of raw `db.prepare()`; no more `crypto.randomUUID()`; `document.id`/`job.id` come from `lastInsertRowid`; `job.document_id` set directly (replacing the removed `job_document` link table); no `process`/`job_document` references anywhere (neither table exists). `server/routes/ingest.js` needs **no changes** — same call signature, same response shape (`{ jobId, message }`), only `jobId`'s type changes from a UUID string to a number. Worth a quick grep of `server/ui/client.js` during implementation to confirm nothing there assumes `jobId` is a UUID-shaped string.
- `server/routes/admin-db.js` — **only** change: replace its inline dev-gate block with `router.use(require("../middleware/dev-only"))`. No SQL or route changes — this file's actual retirement is Story 13.2's scope.
- `server/index.js` — mount `/api/tables` and `/api/docs`.
- `server/package.json` — add `@scalar/express-api-reference` dependency.

**Build sequence** (chosen so the app stays runnable at every step, not just at the end):
1. Schema-drift fix in `db/init.js` — this alone also fixes `/admin/db`, which has been reading an empty database.
2. `errors.js` / `helpers.js` / `tx.js` — zero risk, nothing wired to them yet.
3. Repositories, cheapest/most independent first: `status` → `jobStatus` → `jobType` (near-identical enum pattern, validates the approach cheaply) → `classification` → `tag` → `document` → `documentTag` → `job` → `jobFile`. Each smoke-testable standalone via a throwaway script requiring `db/init` + the module.
4. `repositories/index.js` registry.
5. Rewrite `ingest-service.js` — the three existing `/api/ingest/*` endpoints go from broken to working in this single step, verifiable end-to-end immediately.
6. `middleware/dev-only.js` + refactor `admin-db.js`'s inline gate to use it.
7. `routes/api/tables.js` + mount in `index.js`.
8. Scalar/OpenAPI: add the dependency, author the spec, mount `/api/docs`.

## TODO / follow-ups (not in this story's scope)

- Story 13.2: delete `admin-db.js`, move `/admin/db` → `/admin`, add `GET /` → `/chat` redirect, restructure the embedded admin panel out of the `/chat` shell.
- The schema-drift fix (`db/init.js`'s table-count check) is a bootstrap check, not a real migration system. If `schema.sql` gains a column against an already-populated database in a future story, this won't detect that drift — flagged as a known limitation, candidate for `documets/DESIGN-DEBT.md` if it needs formal tracking later.
- `server/routes/status.js` (mocked, Story 6.3) and `server/routes/chat-llama.js` (mocked, Story 6.5) are unrelated to this story and untouched.
- `admin-db.js`'s SQL-identifier-interpolation pattern isn't fixed directly by this story (it's retired, not patched, in Story 13.2) — noted here so it isn't mistaken for an oversight.
