---
name: proposed-context-loading-rules
description: Claude-proposed rules for right-sizing what gets auto-loaded into context, grounded in findings from context-usage-report.md
date: 2026-08-30
metadata:
  version: 1.0
  created-by: Claude Sonnet 5
---

# Proposed Rules: Context Loading

A proposal, not yet adopted. Each rule below traces to a specific finding
in `context-usage-report.md` from this session — none of this is generic
context-hygiene advice. If adopted, these would live as new or amended
files under `.claude/rules/`; they're left here for review first, per the
`ctx-research` scope this session was asked to write them into.

## Rule 1: Split the unconditional rule bundle into "always" and "on-demand"

**Problem observed:** all 11 files in `.claude/rules/` load in full at
session start regardless of task. This session, 4 of them
(`clear-edits.md`, `file-protection.md`, `scrapper.md`, `md-memory.md`)
never became relevant, and a 5th (`shell.md`) was actively unfollowable in
this environment. That's roughly half the bundle paid for and unused.

**Proposal:** classify each rule file by a header field,
`load: always | on-demand`, and only inject `always` rules unconditionally.
`on-demand` rules load the same way module `CLAUDE.md` files already do —
triggered by the first matching tool call in a session, not before:

| Rule | Proposed `load` | Trigger |
|---|---|---|
| `design-before-implementation.md` | `always` | Governs every code change; no reasonable task-shape excludes it |
| `file-format.md`, `file-versioning.md`, `file-indexing.md` | `always` | Apply to any file with a YAML header, which is most of this repo's docs |
| `write-properly.md` | `always` | Applies to all generated prose, cheap to keep loaded |
| `shell.md` | on-demand, first `Bash`/shell tool call | Only relevant once a shell command is about to run — and see Rule 3 below for the environment-mismatch problem |
| `scrapper.md` | on-demand, first `WebFetch` or web-research request | Irrelevant to sessions that never touch the web |
| `md-memory.md` | on-demand, first read/write of `/MEMORY.md` | Irrelevant otherwise |
| `clear-edits.md`, `file-protection.md` | on-demand, first `Edit`/`Write` on a file whose header actually sets `backup-cycle: session` or `read-only: true` | These are conditional on a file property that's cheap to check before deciding whether the rule is even in play |

This mirrors a pattern the repo already uses successfully for module
`CLAUDE.md` files (`server/CLAUDE.md`, `documets/design/CLAUDE.md`) —
extending it to `.claude/rules/` is a smaller change than it sounds like,
since the loading mechanism already exists.

## Rule 2: De-duplicate directory-scoped `CLAUDE.md` re-injection within a session

**Problem observed:** `documets/design/CLAUDE.md` fired twice in one
session, both times restating "read `PROJECT-SUMMARY.md` first" — already
true both times, since that file had been read in an earlier, unrelated
turn.

**Proposal:** track, per session, which directory-scoped `CLAUDE.md` files
have already been surfaced at least once. On a second-or-later file read
under the same directory, skip re-injection by default. If a directory's
`CLAUDE.md` genuinely has state-dependent content worth re-checking (rare —
most are static orientation text), it can opt out of dedup with an explicit
header field (`reinject: always`) rather than that being the default for
every directory `CLAUDE.md` in the repo.

## Rule 3: Rules that assume a specific host environment should say so

**Problem observed:** `shell.md` unconditionally mandates PowerShell and
forbids Bash. That's correct for this project's actual target (WSL2 +
Windows host, per ADR1) and was simply false for this session, which ran in
a Linux-only remote container with no PowerShell binary — every shell
command necessarily used Bash, silently contradicting the rule for the
entire session with no acknowledgment either way.

**Proposal:** add an optional header field,
`requires_environment: <tag>` (e.g. `windows-wsl2`), to any rule whose
instructions assume a specific host. At session start, if the environment
tag can't be confirmed (no PowerShell binary found, e.g.), surface *one*
line noting the mismatch and which rules it affects, rather than either
(a) silently violating the rule for the whole session (current behavior) or
(b) trying and failing to follow literally unfollowable instructions
repeatedly. This isn't about loosening the rule for its real target
environment — it's about making a known environment/rule mismatch visible
once instead of invisible forever.

## Rule 4: A module-placement check before creating a new module subdirectory

**Problem observed** (the most significant finding in this session):
`server/CLAUDE.md` explicitly scopes ingestion/sanitization logic as
out-of-scope for `server/`, assigning it to `ingestor-classification/`
instead. Story 1.1 is exactly that kind of logic. It was built under
`server/lib/ingestion/` anyway — the module boundary was loaded, read, and
not weighed against the decision of where to put new code, because nothing
prompted a check at the moment that decision was actually made.

**Proposal:** before creating a *new* top-level subdirectory under an
existing owning module (e.g. `server/lib/<newthing>/`), require an explicit
one-line self-check against root `CLAUDE.md`'s Module Map: does the
Epic/Story being implemented belong to the module being written into? If
not, either justify the deviation in the same commit/PR description (a
genuine cross-cutting reason can exist — e.g. shared DB connection,
repository layer, and `cfg` plumbing, which is the actual reason Story
1.1 landed in `server/` this session) or move the code to the owning
module. The point isn't to force literal compliance with the Module Map in
every case — it's to make the placement decision a deliberate one instead
of a default one. This companion-rule relationship to
`design-before-implementation.md` (which already requires tracing to an
Epic+Story before writing code) is direct: that rule checks *whether* to
build something; this one checks *where*.

## Rule 5: Version-bump verification as part of the Edit itself, not an afterthought

**Problem observed:** `DESIGN-DEBT.md` was edited (new Design Debt item,
new changelog line) without bumping `metadata.version` — caught only while
assembling `context-usage-report.md`, well after the fact.
`file-versioning.md` was in context the entire time; that didn't prevent
the miss, because nothing forced a check at the moment of the edit.

**Proposal:** when an `Edit` targets a file whose first ~10 lines match the
YAML-header pattern (`file-format.md`'s definition), treat the version bump
as part of the same edit rather than a separate follow-up step — e.g., a
lightweight habit/checklist item: "editing a file with a header must touch
`metadata.version` and `date` in the same tool call, not a later one."
This is a process discipline proposal more than a loading-mechanism one,
but it's included here because the root cause is the same pattern as the
other findings: the relevant rule was loaded and available, but nothing in
the moment connected it to the specific action being taken.

## Rule 6: Front-load "is this still current" into working-notes files

**Problem observed:** `story-6.1.md` and `story-4.1-plan.md` both required
reading the full file to determine whether their content was still
accurate — `story-6.1.md`'s actuator table turned out to conflict with
three other sources (Design Debt item 3), and `story-4.1-plan.md` turned
out to predate a schema redesign and disagree with it in five places (see
`story-4.1.md`'s reconciliation table). Both were worth reading in full
this time, but a future session hitting the same files pays the same full-read
cost to rediscover the same staleness.

**Proposal:** working-notes files (`documets/story/story-*.md`,
`*-plan.md`) should carry a short **Status** line near the top — not buried
in a "Status" section at the bottom, which is the current convention —
stating in one line whether the file is current, superseded, or
known-stale, with a pointer to whatever superseded it. This doesn't reduce
what gets loaded (the file still needs to be read to act on it), but it
lets a session stop reading after the first few lines when the answer is
"this is stale, see X instead," instead of after the whole file.

## Rule 7: Resolve duplicate-canonical-file ambiguity, don't just document it

**Problem observed** (found while assembling this proposal, not during the
original implementation): two files named `INDEX.md` exist —
`/INDEX.md` (79 rows, granular history, the file `file-indexing.md`'s own
description matches almost verbatim) and `documets/INDEX.md` (4 rows, generic
description). `file-indexing.md` says "a file named `INDEX` tracks every
artifact" with no path, so nothing disambiguates which one is canonical
when both exist. This session used the thinner, less-current one for every
edit, purely because it was the one already open while working inside
`documets/`, and never loaded the other until specifically hunting for
context-loading problems.

**Proposal:** this is a repo-content fix, not a context-loading-mechanism
fix — flagged here because it surfaced through the same audit, but the
actual remedy is outside `.claude/rules/`: either merge the two `INDEX.md`
files into one (root `INDEX.md` is the stronger candidate to keep, given
its richer history) or have `file-indexing.md` name the canonical path
explicitly (`/INDEX.md`, not `documets/INDEX.md`) so a session doesn't have
to guess. Included here as a companion to Rule 4 (module-placement check)
and the version-bump miss in Rule 5 — all three are the same underlying
failure mode: a rule got followed against a target that turned out not to
be the right one, because nothing prompted a check for a more authoritative
alternative before acting.

## What this proposal deliberately does not include

- No change to `documets/design/CLAUDE.md`'s or `server/CLAUDE.md`'s own
  content — both were accurate and useful; the problems found were about
  *when/how often* they load (Rule 2) and *whether their content gets
  applied* (Rule 4), not what they say.
- No proposal to stop loading root `CLAUDE.md` unconditionally — it was
  the single most load-bearing file this session and there's no task shape
  where repo orientation isn't relevant.
- No claim that any of this would have changed the outcome of Story 1.1's
  placement in `server/` — Rule 4 makes that a visible, deliberate decision
  next time; it doesn't pre-judge what the right decision is.
