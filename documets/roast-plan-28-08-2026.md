# Roast: Schema Redesign → API Layer → Admin UI Restructuring (PLAN-28-08-2026)

## Contrarian

Bug 1 is marked **Closed** with resolution "Addressed by Story 12.2" — but the plan's own status table shows Story 12.2's actual deliverable, the corrected `schema.sql`, is still ⬜ **not applied**. That's closing a bug before the fix exists, which means the tracker isn't recording reality, it's recording intent. Six months from now "Closed" will read as "done" to anyone who didn't read this plan, and the whole point of a bug tracker is that you don't have to re-read the plan.

Second: Story 12.1 shipped a schema with `INTEGERPRIMARY KEY` (missing space — a straight-up syntax error) and a `DEFAUL` typo. Nobody ran `db.exec()` against this before calling the Story "Completed." That's not a design gap, that's a testing discipline gap, and it means "Completed" on any prior Story in this project is not evidence the thing works, only evidence someone stopped working on it.

Third, the plan contradicts itself on Story 13.3's dependencies: the Context section (line 17) says it "depends on 12.2's corrected schema" — singular. The draft Story text three sections later lists four dependencies (12.2, 6.4, 13.1, 6.1), and 6.4 never appears anywhere else in the document. Either that's a copy-paste leftover or a real dependency nobody explained — either way, a plan whose own sections disagree about what it depends on shouldn't be approved as-is.

## Investor

There's no market here — single user, local-only, zero revenue by design — so score this on time ROI instead. This plan spends an entire Story building a repository layer, a REST API, a full OpenAPI 3.0 spec, and an interactive Scalar docs UI, gated behind dev-only middleware, for a database with seven tables that exactly one person will ever query, from their own machine. That's the kind of infrastructure you build when you're staffing a team of five against a growing external API surface. You're staffing a team of one against a personal note-taking tool. Every hour in `server/openapi/spec.js` is an hour not spent on FR1–FR9 — ingestion, classification, the daily briefing — which is the entire reason this project exists. If this were a pitch, I'd ask: what does the OpenAPI docs UI make possible that a person reading `repositories/*.js` directly couldn't already do in five minutes?

## Pragmatist

Give credit where due: the dependency order — schema, then API, then UI — is the right order, and it's a real dependency chain, not just topic grouping. That part of the plan is sound.

But look at what Story 13.3 actually bundles: seven per-table repository files with domain validation, a full REST router layer, an OpenAPI spec matching every table, and a Scalar UI — described as one Story. That's four separate build-outs wearing one Story's acceptance criteria. First thing that breaks Monday morning isn't the code, it's the estimate — this will not fit in the time a single Story implies, and something will get cut or rushed, most likely validation coverage in the repository layer since it's the least visible piece.

Also unaddressed: `scripts/reset-dev-db.ps1` wipes and recreates the dev database from scratch as the verification step for Step 1. Fine for a schema that has no real data in it yet — but the plan never says so explicitly, and there's no migration story anywhere in this document for the day this schema needs to change again against a database that actually has ingested documents in it. That question is going to come back.

## Domain Expert

Four real schema problems that will bite once the repository layer is built on top of them:

1. **`tag.name` as primary key with no cascade.** `document_tag.tag_name` references it, but nothing in the DDL declares `ON UPDATE CASCADE`. Rename a tag — a completely normal user action — and every existing `document_tag` row pointing at the old name silently orphans. Natural keys as PKs are fine right up until the natural key needs to change, and tag names are exactly the field users rename.

2. **No cycle protection on `classification.parent_id`.** It's a self-referencing FK with no `CHECK` constraint or trigger stopping someone from setting a node's parent to one of its own descendants. That's a classic self-referencing-hierarchy bug, and the acceptance criteria don't mention it.

3. **`job.status` is unvalidated while `document.status` isn't.** `document.status` is a proper FK against `status(name)`. `job.status` is a bare `TEXT NOT NULL` with no FK, no CHECK, nothing. Two tables tracking lifecycle state, one enforced, one not — and the "corrected" schema's acceptance criteria ("every FK column's type matches") doesn't catch this because `job.status` was never declared as an FK in the first place, so there's nothing to check.

4. **`document_tag` has no temporal bounds of its own.** The whole point of `tag.end_date` is that tags are time-scoped, not deleted. But the document↔tag *association* has no start/end date — if a tag is ended and later reactivated, does every document ever linked to it silently reappear as tagged? The model doesn't say, and this is exactly the kind of decision that should be in the schema Story's acceptance criteria, not discovered later.

## Hype Man

The sequencing instinct is genuinely good: catching Bug 1 and fixing the schema *before* building a repository layer and REST API on top of it is the right call, and it's not obvious in the moment — it would've been easy to start on the API layer and only hit the FK type mismatches once queries started failing at runtime. That's real discipline, not busywork.

The repository-layer move itself is worth defending, not just tolerating: centralizing the tag soft-delete rule and status/job_type validation in one place means the next consumer — batch processing, the daily briefing job, whatever reads this data next — doesn't have to reimplement or accidentally violate those rules. That's the actual payoff of this Story, buried under the OpenAPI ceremony.

And folding the admin UI restructuring into the already-open Story 13.2 instead of spinning up a fourth Story is the right judgment call — it recognizes when the process should bend to what's already there instead of manufacturing a new ticket to match a topic boundary.

## Visionary

If the repository layer is actually built as a clean boundary — not just moved SQL — it stops being "the admin panel's backend" and becomes the one place every future consumer talks to the data: batch jobs, the daily briefing generator, a future mobile or voice client, all hitting the same validated `/api/tables/*` surface instead of each hand-rolling SQL against a schema they half-remember. That's the version of this where the OpenAPI spec isn't overhead, it's the system's actual interface contract — and six months from now, when the user has forgotten exactly what `job.status` accepts, the Scalar docs are the answer instead of a re-read of `schema.sql`.

## Verdict

The sequencing is correct and the instinct to fix the schema before building on it is a real save — don't undo that. But two things need to happen before this proceeds: close the loop on Bug 1's status (it should not read "Closed" while its fix is still ⬜), and settle `job.status` validation and the `tag.name` cascade/rename risk in Story 12.2 itself, since 13.3's entire repository layer inherits whatever gaps ship in the schema. Worth pursuing after those fixes — but before greenlighting the full scope of Story 13.3, get an honest answer to whether a single-user local tool needs an OpenAPI spec and interactive docs UI, or whether that's solving a problem this project doesn't have yet.
