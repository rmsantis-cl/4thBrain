---
name: context-usage-report
description: Audit of every markdown file loaded into context during the Story 1.1/4.1 implementation session — what loaded, why, and whether it earned its place
date: 2026-08-30
metadata:
  version: 1.0
  created-by: Claude Sonnet 5
---

# Context Usage Report

Scope: one Claude Code session on `rmsantis-cl/4thBrain`, covering a todo
review, then implementation of Story 1.1 (Direct Structured Vault
Ingestion) and Story 4.1 (Background Sweep & Queue Execution). This session
switched branches twice (`claude/todays-todo-5fb4i3` → `v03` → `v03-eth`);
noted below where that matters.

Two loading mechanisms showed up, and they behave very differently:

1. **Auto-injected, unconditional** — the full text of root `CLAUDE.md` and
   every file in `.claude/rules/` arrived in the very first system-reminder,
   before any task was stated. Cost is paid once per session regardless of
   what the session turns out to be about.
2. **Auto-injected, directory-triggered** — a module's own `CLAUDE.md`
   (`server/CLAUDE.md`, `documets/design/CLAUDE.md`) gets re-shown as a
   system-reminder the first time a file under that directory is read via
   the `Read` tool. This one can re-fire more than once per session (see
   `documets/design/CLAUDE.md` below).

Everything else in this report is a file I explicitly chose to `Read()` —
those are listed too, since the ask was "all loaded md," but they're a
different category: I picked them for a reason, so "was it useful" mostly
means "did that reason pan out," not "should it have loaded at all."

## Auto-injected at session start (unconditional)

| File | Version / last update | Useful this task? | Why loaded |
|---|---|---|---|
| `CLAUDE.md` (root) | *no YAML header — no version available* | **Yes** | Baseline orientation: repo structure, Module Map, Epic dependency shape. Directly used to locate `documets/BACKLOG-TRACKER.md`/`PROJECT-SUMMARY.md` and to identify EP1/EP4 ownership. |
| `.claude/rules/design-before-implementation.md` | *no YAML header* | **Yes — heavily** | Shaped the actual workflow: required tracing Story 1.1/4.1 to an Epic+ADR before coding, drove the Bug 2 discovery-and-log pattern instead of silently patching around it, and produced the end-of-turn commit-authorization question. |
| `.claude/rules/file-format.md` | *no YAML header* | **Yes** | Used to write correct YAML headers on every new file (`Bug-2-...md`, `story-4.1.md`, this report). |
| `.claude/rules/file-versioning.md` | *no YAML header* | **Yes** | Used to bump `metadata.version`/`date` on every edited tracked file (`story-1.1.md`, `INDEX.md`, `BACKLOG-TRACKER.md`, `PROJECT-SUMMARY.md`, `DESIGN-DEBT.md`). **Missed once** — see "Findings" below. |
| `.claude/rules/file-indexing.md` | *no YAML header* | **Yes** | Used to add `INDEX.md` rows for every new/updated tracked file. |
| `.claude/rules/write-properly.md` | *no YAML header* | **Partial** | Style guidance was followed passively (no forced constructions, no puffery) but never consulted as an explicit checklist mid-task — it shaped output by being in context, not by being actively re-read. |
| `.claude/rules/clear-edits.md` | v2.0, updated 2026-08-28 | **No — inert** | Governs read-only/`backup-cycle: session` file handling. No file I touched this session carried either marker (`story-6.1.md` has `backup-cycle: session` but I only read it, never edited it). Loaded, never triggered. |
| `.claude/rules/file-protection.md` | *no YAML header* | **No — inert** | No `read-only: true` file was encountered. |
| `.claude/rules/scrapper.md` | *no YAML header* | **No — irrelevant to this task** | Governs Firecrawl web-research conventions. No web research happened this session. |
| `.claude/rules/md-memory.md` | *no YAML header* | **No — irrelevant to this task** | Governs `/MEMORY.md` maintenance. Never touched `/MEMORY.md` this session. |
| `.claude/rules/shell.md` | *no YAML header* | **No — actively wrong for this environment** | Mandates PowerShell, forbids Bash. This session runs in a Linux-only remote container with no PowerShell binary at all — every shell command in this session used Bash, in direct contradiction of this rule, out of necessity rather than choice. |

**7 of 11 unconditionally-loaded files did real work this session. 4 were dead weight for this particular task** (not wrong to have, just not applicable), and one (`shell.md`) was actively unfollowable in this environment.

## Auto-injected, directory-triggered

| File | Version / last update | Useful this task? | Why loaded |
|---|---|---|---|
| `server/CLAUDE.md` | v1.0, 2026-08-28 | **Yes, but under-applied** | Fired once, first time a `server/*.js` file was `Read()`. Correctly scoped `server/`'s ownership (EP6/EP9/EP12/EP13) — and explicitly states ingestion/sanitization logic is **out of scope** for `server/`, belonging to `ingestor-classification/` instead. I read this, then placed Story 1.1's ingestion modules under `server/lib/ingestion/` anyway. See "Findings" below — this is the most important miss in this session. |
| `documets/design/CLAUDE.md` | *no YAML header* | **No, second firing was pure redundancy** | Fired **twice**: once after reading `SYSTEM-REQUIREMENTS-SPECIFICATION.md`, again after reading `ADRS.md`. Both times it says "read `../PROJECT-SUMMARY.md` first" — which I'd already done, long before either firing (in an earlier turn, reviewing the backlog). Re-injection is triggered by path, not by whether its instruction is already satisfied. |

## Explicitly read during the task (not auto-injected)

| File | Version / last update | Useful? | Why loaded |
|---|---|---|---|
| `documets/PROJECT-SUMMARY.md` | v1.1 → v1.2 (bumped this session), 2026-08-27 → 2026-08-30 | **Yes** | Told me exactly where current story status lives; later updated with the new WIP entries. |
| `documets/BACKLOG-TRACKER.md` | v1.5 → v1.6 (bumped), 2026-08-28 → 2026-08-30 | **Yes** | Source of truth for Story 1.1/4.1's acceptance criteria and dependency graph; read at three different offsets across the session, edited at the end. |
| `documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md` | *no YAML header* | **Yes** | Needed NFR1/NFR2/NFR8/NFR9/NFR11 to answer "what is Story 7.1" in detail, earlier in the session. Not used again during the actual 1.1/4.1 implementation. |
| `documets/design/ADRS.md` | v1.1, 2026-08-25 | **Yes** | ADR14 (directory layout), ADR15 (topic routing), ADR10 (concurrency=1), ADR17 (brief transactions), ADR5 (Node.js orchestration) all directly informed implementation decisions and are cited by name in `story-4.1.md`'s reconciliation table. |
| `documets/DESIGN-DEBT.md` | v1.0 → v1.1 (bumped), 2026-08-27 → 2026-08-30 | **Yes** | Read before logging a new gap, per its own stated convention; edited to add item 3. |
| `documets/INDEX.md` | v1.0 → v1.1 (bumped), 2026-08-28 → 2026-08-30 | **Yes** | Read to see the existing indexing convention before adding rows for new/updated files. |
| `documets/story/story-1.1.md` (original) | v1.0, 2026-08-25 | **Yes** | Pre-existing working notes — thin (an Abstract, Observations, a link to ADR14, an empty TODO) but confirmed the story's actual intended scope before I rewrote it. |
| `documets/story/story-6.1.md` | v1.0, 2026-08-28, `backup-cycle: session` | **Yes — and it surfaced a real conflict** | Its "Actuator" mock table assigns the vault/incoming-copy step to Story 3.1 instead of Story 1.1, contradicting three other sources. Reading this in full is exactly what caught that conflict — logged as Design Debt item 3 rather than silently resolved. |
| `documets/story/story-4.1-plan.md` | v1.0, 2026-08-28 | **Yes — as a thing to correct, not to follow** | A draft plan predating the Story 12.2 schema redesign: wrong `job_type` enum, a `created_at` column that doesn't exist, PowerShell scripts contradicting ADR5, and a "THREAD_COUNT > 1" test scenario that contradicts the closed ADR10. Reading it in full was necessary to write `story-4.1.md`'s reconciliation table — the value was in finding what was *wrong*, not in following it. |
| `documets/bugs/Bug-1-Unauthorized-Schema-Table-Additions.md` | v1.0, 2026-08-28, status: Closed | **Yes** | Established the Bug-tracking format/convention before writing Bug 2, and confirmed Bug 2 was a distinct, newly-discovered issue rather than a reopening of Bug 1. |
| `documets/design/6.1-pipeline-gap.md` | — | **No — doesn't exist** | Referenced by `story-6.1.md` as containing "detailed analysis" of the pipeline gap. The file was never created. A dead pointer — cost one failed `Read()` call to discover. |
| `TODO.md` (root) | *no YAML header* | **No — branch-specific, gone by the time it mattered** | Read in the very first turn, on branch `claude/todays-todo-5fb4i3`. Doesn't exist at all on `v03`/`v03-eth` (confirmed while writing this report). Everything in it (batch-queue skill design, `b4-tags`/`b4-review` skills, an Obsidian reference-exploder plugin) belongs to a different track of work than this session's actual output. |

## Findings

**1. A module-ownership boundary was loaded, read, and then not applied.**
`server/CLAUDE.md` states plainly that ingestion/sanitization logic is out
of scope for `server/` and belongs in `ingestor-classification/`. Story 1.1
is exactly that kind of logic (EP1, owned by `ingestor-classification/` per
root `CLAUDE.md`'s own Module Map), and it got built under
`server/lib/ingestion/` anyway — because it needed to share `server/`'s
SQLite connection, repository layer, and `cfg` object, and moving it would
have meant either duplicating that plumbing or creating a cross-module
dependency that doesn't exist yet. That may turn out to be the right call,
but it was never surfaced as a decision at the time — the placement just
happened, following the path of least resistance from the code I'd already
read. Having the right information in context did not guarantee it got
weighed. Flagged as a real open question for the user, not just a
context-loading footnote.

**2. `documets/design/CLAUDE.md` re-fired on an already-satisfied
instruction.** Its entire content is "read `PROJECT-SUMMARY.md` first."
It fired twice, both times after that was already true. Directory-scoped
reminders are triggered by *path*, with no memory of whether their
instruction was already followed earlier in the same session.

**3. Most of the unconditionally-loaded rule files have no YAML header —
including `file-format.md`, the rule that mandates one.** Of the 11 files
in the first system-reminder, only `clear-edits.md` carries the
`name`/`description`/`metadata.version` header that `file-format.md`
requires of "any file in this project." Root `CLAUDE.md`,
`design-before-implementation.md`, `file-indexing.md`, `file-protection.md`,
`file-versioning.md`, `md-memory.md`, `scrapper.md`, `shell.md`, and
`write-properly.md` are all missing it — meaning this report genuinely
cannot say when most of the rules governing this session were last updated.
Not a blocker to using them, but worth noting: the convention that "any
file in this project" carries a header isn't holding for the exact files
that define the convention.

**4. `shell.md` is an unconditional rule that's environment-dependent.**
"Use PowerShell, not Bash" is correct guidance for the WSL2/Windows target
environment this project is designed for, and actively wrong for a
Linux-only remote container with no PowerShell. It loaded anyway, and every
shell command this session used Bash regardless — there was no PowerShell
binary to use. The rule has no way to express "this assumes a specific host."

**5. I missed my own version-bump rule once.** `DESIGN-DEBT.md` was edited
(new Design Debt item 3, new changelog line) without bumping
`metadata.version` — caught and fixed only while assembling this report,
not at the time of the edit. `file-versioning.md` was in context the whole
time; being loaded didn't prevent the miss.

**6. There are two `INDEX.md` files, and I used the less canonical one
without ever loading the other.** `documets/INDEX.md` (read and edited
throughout this session) is thin — 4 rows before this session, generic
"description: Master index..." header. `/INDEX.md` at repo root (never
read until assembling this report) is the far more actively maintained
one: 79 rows, granular per-change history entries going back to the
project's `/init`, and its own description text ("Tracks all artifacts...
Per `.claude/rules/file-indexing.md`") matches `file-indexing.md`'s spec
more literally than the `documets/` copy does. `file-indexing.md` itself
just says "a file named `INDEX` tracks every artifact" — singular, no
path — so nothing in the rule as written disambiguates which one is
canonical when two exist. I picked `documets/INDEX.md` for no better
reason than that it was the one I'd noticed first, while working inside
`documets/`. Corrected once discovered — root `INDEX.md` now has proper
entries for this session's work (see its own changelog), `documets/INDEX.md`'s
entries are left in place rather than removed. This is the same shape of
problem as Finding 1 (server/CLAUDE.md's module boundary) and Finding 5
(the missed version bump): a rule was being followed, just against the
wrong target, because nothing prompted a check for whether a more
authoritative instance existed first.

## Summary

| Category | Count | Useful | Inert / not applicable | Actively wrong for this environment |
|---|---|---|---|---|
| Auto-injected, unconditional | 11 | 7 | 3 | 1 (`shell.md`) |
| Auto-injected, directory-triggered | 2 (1 file, 2 firings) | 1 firing | 1 firing (redundant) | 0 |
| Explicitly read | 12 | 10 | 2 (`6.1-pipeline-gap.md` doesn't exist; `TODO.md` was branch-stale) | 0 |

The unconditional bundle is where the waste concentrates: roughly a third
of it (`clear-edits.md`, `file-protection.md`, `scrapper.md`,
`md-memory.md`) never became relevant to this particular task, and one file
(`shell.md`) actively conflicted with the runtime environment. The
directory-triggered and explicitly-read files earned their keep far more
consistently — mostly because I chose them for a specific, immediate
reason, rather than having them arrive regardless of task shape.
