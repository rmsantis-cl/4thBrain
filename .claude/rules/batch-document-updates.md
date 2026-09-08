# Batch Document Updates

Closing a story, writing an ADR or logging a bug touches the same handful of files every time — the
artifact itself, the story file, `BACKLOG-TRACKER.md`, an INDEX, sometimes `DESIGN-DEBT.md`. Applies
project-wide, to documentation. Source files under `src/` are exempt: an edit there is usually one
change to one place.

## Rule

Before touching any file in a multi-document update, write down every change the whole set needs.
Then apply each file's changes in **one write operation per file**.

Two things trigger this: a change spanning two or more documents, or a single document needing two or
more separate changes.

## How

1. **Plan first.** List the files, and under each, every change it needs — body edits, status fields,
   counts, changelog line, header `date` and `metadata.version` bump (see `file-versioning.md`), and
   the INDEX row (see `file-indexing.md`). Do this before the first write, not as each one occurs to
   you.
2. **Read what you are changing** — the whole file where it is small enough, the relevant sections
   otherwise. Half the repeat edits come from discovering a stale note only after editing the table
   above it.
3. **One write per file.** Compose the file's final state and write it once. Where several separate
   passages change, that means `Write` with the full content rather than a chain of `Edit` calls. A
   single `Edit` is fine when exactly one passage changes.
4. **Header bookkeeping belongs in that same write.** Bumping `version` and `date` is never its own
   follow-up edit.

## Exception

A second write to a file is warranted when something genuinely new turns up after the first — a later
file in the set contradicts what you wrote, or the user changes the decision mid-flight. Discovering
that you forgot the changelog is not new information.

## Why

Closing Story P1.17 took 21 write operations across 7 files, where 7 would have done: six passes over
`BACKLOG-TRACKER.md` alone (summary counts, three table rows, a stale note, the changelog, the
version), five over `P1.18.md`, five over `documents/INDEX.md`. Each pass costs a permission prompt
and a diff to review, and the churn hides which changes actually mattered. It also creates real
inconsistency windows: between edit three and edit four, the tracker said P1.17 was COMPLETED while
its own story file still said READY.

## Related Rules

- `.claude/rules/file-versioning.md` — what a header update owes on each save
- `.claude/rules/file-indexing.md` — which INDEX gets the row
- `.claude/rules/clear-edits.md` — backup and read-only gates that run before any of this
