---
name: simple-claude-plan
description: Audit of the project's Claude governance — rules, skills, agents and trackers — identifying what is over-engineered and what to remove
metadata:
  version: 1.0
  created-by: Claude Opus 5
  date: 2026-09-07
---

# Simplifying the Claude setup

An audit of everything in this repository that instructs Claude: `CLAUDE.md`, the nine files in
`.claude/rules/`, the eight skills in `.claude/skills/`, the one agent in `.claude/agents/`,
`.claude/settings.local.json`, and the three tracking documents at the repository root.

The finding in one line: the governance layer is larger than the thing it governs, and a
substantial part of it refers to files that do not exist.

## Weight

| What | Bytes | Loaded when |
| --- | --- | --- |
| `CLAUDE.md` | 10,579 | every session |
| `.claude/rules/` (9 files) | 13,866 | every session |
| Global rules (`Diff.md`, `Verbosity.md`) | ~2,400 | every session |
| `.claude/skills/` (8 skills) | 28,640 | descriptions every session, bodies on invoke |
| `.claude/agents/solving-loop.md` | 9,417 | on invoke |
| `INDEX.md` + `BACKLOG-TRACKER.md` + `PROJECT_4thBrain.md` | 49,272 | read and edited constantly |

Roughly 27KB of instruction text is in context before a single line of Java is read. The Java
side of the project is 39 tracked source files.

## Dead references

These are cited by rules and skills as the things they operate on. None of them exists:

| Referenced | Cited by | Exists |
| --- | --- | --- |
| `documents/method/BOOT.md` | file-format, file-versioning, file-indexing, file-protection ("Based on…") | no |
| `TODO-TRACKER.md` | todo-add skill, solving-loop skill, solving-loop agent | no |
| `documents/DESIGN-DEBT.md` | design-before-implementation, solving-loop skill and agent | no |
| `INDEX` (no extension) | file-indexing | no (`INDEX.md` exists) |
| `documents/PROJECT-SUMMARY` | solving-loop skill | no |
| `.backup/` | clear-edits (mandatory first step) | no |
| `documents/loop/list-N.txt` | solving-loop agent | no |
| `documents/story/story-6.1.md`, `documents/design/schema.sql` | clear-edits worked examples | no |

Four rule files derive their authority from a document that was never in this repository. Two
skills and one agent drive a tracker that has never existed. A previous cleanup (CLAUDE.md
changelog, 2026-09-07) already removed `merge-to-v03.md`, `md-memory.md` and the
`submit-batch`/`got-batch` skills for exactly this reason; the same problem is still present in
the files listed above.

## Findings

### 1. The file-lifecycle rules reimplement git, by hand

`file-format.md`, `file-versioning.md`, `file-indexing.md` and `file-protection.md` are four
separate always-loaded files, 4.7KB total, that together specify: a mandatory YAML header on
every document, a `version` field incremented on every edit, a `date` field set on every edit, a
hand-maintained `INDEX` table recording who changed what and when, and — if the storage does not
support update — writing `${name};${version}` sidecar files in the VMS style.

Git records authorship, timestamps, per-file history and prior versions already, more accurately
and without an edit step. The manual layer costs three extra writes per document change and
drifts the moment anyone forgets one.

The drift is documented. `file-indexing.md` itself records that indexing source produced 61 rows
where 6 of 7 actuator files were pre-rename names, all 4 `messaging/` entries were wrong, `Job`
had rows after being deliberately deleted, and a dozen files appeared twice with conflicting
descriptions. Source was then excluded from INDEX. The remaining 42 rows are in better shape —
one stale row (`SYSTEM-REQUIREMENTS-SPECIFICATION.md`, no longer on disk), nothing missing — but
that is 42 rows of `git log` retyped by hand, at 20KB.

**Recommendation.** Delete `file-indexing.md` and `INDEX.md`. Merge `file-format.md`,
`file-versioning.md` and `file-protection.md` into one short rule that says: documents carry a
`name` and `description` header; `read-only: true` means do not edit; git is the version history.
Drop version bumps and date stamps entirely.

### 2. Two rule files protect nothing

`file-protection.md` (read-only enforcement) and the whole backup half of `clear-edits.md`
(mandatory `.backup/` copy before any edit, with a checklist, a gate check and three worked
examples) apply to files carrying `read-only: true` or `backup-cycle: session`.

No file in the repository carries either marker. The only occurrences of both strings anywhere are
inside the rule files describing them. `.backup/` does not exist. The worked examples cite
`documents/story/story-6.1.md` (stories here are P1.x/P2.x/P3.x) and `documents/design/schema.sql`
(the real schema is `src/main/resources/schema.sql`), so the examples were never checked against
this repository either.

Beyond being unused, session backups duplicate git: an uncommitted edit is recoverable with
`git checkout --`, a committed one with `git revert`.

**Recommendation.** Delete `file-protection.md`. Cut the "File Safety Rules" section from
`clear-edits.md` (about 60% of the file), keeping only the shell and build-log conventions. Retain
one line about `read-only: true` in the merged format rule for when it is eventually used.

### 3. The same verbosity instruction exists in three places, and one contradicts a fourth

- Global `Verbosity.md`: one line per operation, suppress tool output.
- Project `clear-edits.md`, "Execution Style": perform operations silently, show results only.
- Skill `clean-command`: suppress all output blocks, logs and explanatory text.

Three sources, one behavior. `clean-command` also instructs "no reasoning or thinking blocks" and
"only: direct results, code diffs, or one-line confirmation", which sits against the global
`Diff.md` rule requiring a rendered diff for every code change. Whichever wins, one of them is
being ignored.

**Recommendation.** Delete the `clean-command` skill. Delete `clear-edits.md`'s execution-style
section. The global `Verbosity.md` already covers it, and applies everywhere without a slash
command.

### 4. solving-loop exists twice, and its central mechanism is fictional

`.claude/skills/solving-loop/SKILL.md` (5.8KB) and `.claude/agents/solving-loop.md` (9.4KB) are
two versions of the same backlog loop with different parameter sets, different stop conditions and
different report formats. Invoking `/solving-loop` and spawning the `solving-loop` agent give
different behavior under the same name.

The mechanism both are built around — "escalate temperature to 1.0 / 1.3 / 1.5 when an item stays
blocked" — cannot happen. Neither a skill nor an agent definition can change the sampling
temperature; both files state the number and then describe how a higher one would feel. What
actually produces the effect is the single line buried in the agent's escalation step: "DISCARD
that reasoning, try a fundamentally different approach". That instruction works. The temperature
apparatus around it, roughly 8KB of pseudocode, state tables and status-line mockups, does nothing.

Both versions also update `TODO-TRACKER.md` and `DESIGN-DEBT.md` on every pass. Neither file
exists, so the loop's bookkeeping step fails or is silently skipped every time. The agent
additionally pins `model: haiku` for work the rest of the project treats as needing care.

**Recommendation.** Delete the skill. Cut the agent to about a page: read `BACKLOG-TRACKER.md`,
take the ready set, attempt each item, stop when a pass closes nothing new, and on a repeated
blocker explicitly discard the prior reasoning and try another angle. Drop the temperature model,
the status line, the JSON state tables and the `documents/loop/` output. Remove the `model: haiku`
pin.

### 5. todo-add drives a tracker that does not exist

The `todo-add` skill (2.7KB) parses key:value arguments, infers categories from task-name patterns,
normalizes status variants, and appends rows to `TODO-TRACKER.md` — a file that is not in the
repository and is not in its git history. Every invocation fails at the last step.

**Recommendation.** Delete it. `BACKLOG-TRACKER.md` is the tracker of record and already covers
stories and bugs.

### 6. Five skills have nothing to do with this project

`dictation`, `surprise-me`, `roast`, `b4-research` and `install-smart-connection` sit in
`.claude/skills/`, which scopes them to this repository, puts their descriptions in every session's
context here, and commits them to the repo. None concerns a Java Spring Boot backend.
`install-smart-connection` is arguably adjacent — the Indexer will call Smart Connections — but it
is a one-time machine-setup task, not project work.

**Recommendation.** Move all five to `~/.claude/skills/`, where they stay available in every
project including this one, without being version-controlled as part of it. That empties
`.claude/skills/` completely once items 3 and 5 are done.

### 7. Status is tracked in four places at once

A single story moving from READY to COMPLETED currently touches:

1. `PROJECT_4thBrain.md` — phase deliverable checkboxes and the story list
2. `BACKLOG-TRACKER.md` — the story's row moves between sections, and the Summary counts change
3. `documents/story/PX.Y.md` — the story file's own `version` and `date` header
4. `INDEX.md` — a new `[date] comment` entry appended to that file's History cell

Three of the four are hand-maintained duplicates of the first. The counts in
`BACKLOG-TRACKER.md`'s Summary ("31 stories: 1 WIP, 6 READY, 12 NOT-READY, 12 COMPLETED") are
maintained by hand against the four tables below them in the same file, which is a fifth place for
the same fact.

**Recommendation.** `BACKLOG-TRACKER.md` is the status of record — it already says so. Remove
status tracking from `PROJECT_4thBrain.md` and leave it as scope and story definitions, stop
bumping story-file headers, and delete `INDEX.md` per item 1. Drop the hand-counted Summary line
or accept that it will be wrong.

### 8. design-before-implementation is right, but its escape hatch is missing

The rule itself is sound and worth keeping: no code without a Story and a design behind it. The
problem is the Design Debt mechanism it depends on. When a gap is found mid-plan the rule requires
logging it in `documents/DESIGN-DEBT.md`, and says a plan cannot proceed to implementation until
every logged item is cleared. That file does not exist, so the rule has one path — stop — and no
way to record a gap and move on.

**Recommendation.** Keep the rule. Either create `documents/DESIGN-DEBT.md`, or replace the
mechanism with something already in place: log the gap as a NOT-READY row in `BACKLOG-TRACKER.md`
with the blocker in the Note column, which is what that table is for.

### 9. settings.local.json is an unpruned forensic log

77 entries in `permissions.allow`. `Bash` is denied at the top of the same file, and 37 of the
allow entries are `Bash(...)` — dead by construction. Most of the rest are one-shot commands from
a WSL/Ollama/IPEX-LLM GPU spike: `dnf search level-zero`, `nvidia-smi | head -15`, a `curl` of one
specific nightly tarball, seven `sqlite3 /tmp/schema-test.db` queries against a database that no
longer exists, `mv vault/params.json params.json`. None will run again.

The cost is not correctness — an extra allow entry is harmless — but that the file is unreadable,
so nobody can tell which permissions are load-bearing.

**Recommendation.** Reduce to patterns that recur: `PowerShell(git *)`, `PowerShell(gradle *)`,
`PowerShell(./gradlew *)`, `PowerShell(& ...\scripts\*.ps1 *)`, the Smart Connections MCP lookup,
and the Firecrawl skill. Delete every `Bash(...)` entry while `Bash` stays denied. About 8 lines
instead of 77.

### 10. Repository hygiene

Not rules, but they make the working tree harder to read:

- `tmp/` is in `.gitignore`, yet 29 fixture files under it are tracked. They predate the ignore
  line, so the ignore has no effect on them. Either untrack them or move the real fixtures to
  `src/test/resources/`.
- `.claude/worktrees/` holds three stale worktrees (`plan-11-13-17`, `story-ollama-v04`,
  `story-ollama-windows`), 249 files, all from 2026-09-07. Remove with `git worktree remove` once
  their branches are merged.
- `scrapper.md` routes all web fetches through Firecrawl and requires storing retrieved HTML under
  an absolute Obsidian vault path, which couples the code repository to one machine's vault
  location. Worth keeping only if the vault is genuinely the destination for research; otherwise
  reduce it to "use Firecrawl, not WebFetch".

## The plan

Three passes, each independently safe. Nothing here touches Java source or the build.

### Pass 1 — delete what refers to nothing

No behavior change, since none of it currently works.

- `.claude/skills/todo-add/` (drives a missing tracker)
- `.claude/skills/clean-command/` (duplicate, and conflicts with `Diff.md`)
- `.claude/skills/solving-loop/` (duplicate of the agent)
- `.claude/rules/file-protection.md` (no file it applies to)
- `.claude/rules/file-indexing.md` and `INDEX.md` (git already has this)
- The "File Safety Rules" section of `.claude/rules/clear-edits.md`

Net: 9 rules to 7, 8 skills to 5, about 20KB out of every session's context and 20KB out of the
tree.

### Pass 2 — merge and shrink what remains

- Fold `file-format.md` and `file-versioning.md` into one `documents.md` rule, under a page: header
  fields, `read-only: true`, git is the history. No version bumps, no date stamps.
- Rename what is left of `clear-edits.md` to reflect that it is now only the build-log convention,
  or fold those four lines into `CLAUDE.md` and delete the file.
- Cut `.claude/agents/solving-loop.md` to about a page (item 4).
- Prune `settings.local.json` to the recurring patterns (item 9).
- Point `design-before-implementation.md`'s Design Debt at `BACKLOG-TRACKER.md`, or create
  `DESIGN-DEBT.md`.

Net: 7 rules to 5 (`documents.md`, `design-before-implementation.md`, `shell.md`,
`write-properly.md`, `scrapper.md`), all short.

### Pass 3 — one status of record

- `BACKLOG-TRACKER.md` keeps story and bug status. Nothing else does.
- `PROJECT_4thBrain.md` becomes scope and story definitions only; remove the deliverable checkboxes
  that restate tracker status.
- Story files stop carrying `version` and `date`.
- Move the five off-project skills to `~/.claude/skills/`.
- Untrack `tmp/`, remove the three stale worktrees.

## What to keep as is

- `CLAUDE.md`. It is 10KB, which is large, but it is the only place recording the architecture
  decisions (no Job table, static queues, ADR25's view-layer trap) and its changelog is accurate.
- `design-before-implementation.md`, once its Design Debt target exists. The rule is the reason
  this project has 24 story files and 28 ADRs instead of improvised code.
- `shell.md`. Short, specific, and it overrides a real harness default that would otherwise reach
  for Bash on a Windows box where Bash is denied.
- `write-properly.md`. Concrete and checkable.
- `BACKLOG-TRACKER.md`. Genuinely useful, and already declares itself the status of record.

## Expected result

| | Before | After |
| --- | --- | --- |
| Rule files | 9 (13.9KB) | 5 (~6KB) |
| Project skills | 8 (28.6KB) | 0 (5 moved to user scope) |
| Agents | 1 (9.4KB) | 1 (~2KB) |
| Root tracking docs | 3 (49.3KB) | 2 (~29KB) |
| Files updated per story status change | 4 | 1 |
| Permission entries | 77 | ~8 |
| Dead file references | 8 | 0 |
