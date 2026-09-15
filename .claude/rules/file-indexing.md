# File Indexing

INDEX maintenance for files created/updated under `file-versioning.md`. Based on `documents/method/BOOT.md`. Applies project-wide.

## Where the INDEX files live

Three of them, one per indexed scope:

| INDEX | Scope |
|-------|-------|
| `INDEX.md` | files at the repository root, without recursing |
| `documents/INDEX.md` | everything under `documents/`, subdirectories included |
| `scripts/INDEX.md` | everything under `scripts/` |

The set is closed at three. A new top-level directory does not get an INDEX until this rule names
it — that is what keeps three INDEX files cheaper to maintain than one, rather than three times the
work.

On creating or updating a file, update the nearest INDEX at or above it, and only that one.
`documents/story/P1.11.md` is a row in `documents/INDEX.md` and appears nowhere in the root INDEX.
A file that falls in no scope is not indexed.

`documents/` has no per-subdirectory INDEX. `design/`, `story/`, `bug/` and `done/` are all rows in
`documents/INDEX.md`.

## What an INDEX contains

- Its own file header (see `file-format.md`), plus a two-column table: `File Name`, `History`.
- `File Name` holds the path relative to the INDEX's own directory — `story/P1.11.md` in
  `documents/INDEX.md`, not `documents/story/P1.11.md`.
- Markdown tables cannot nest a table inside a cell, so the `History` cell holds a list of entries formatted `[date] comment`, most recent last. Separate multiple entries within a cell with `<br>`.
- On file creation, add a row with a single `[date] comment` entry. On file update, append a new `[date] comment` entry to the existing cell rather than replacing it.
- An INDEX carries no row for itself.

## Not indexed

- **Source files under `src/`** are excluded. Do not add a row when creating or updating one, and do not re-add rows removed under this rule.
- Build output and generated trees (`bin/`, `build/`, `.gradle/`, `data/`) are excluded for the same reason.
- `.claude/` is excluded — rules, skills, settings and worktrees. Git tracks them, and they sit in no INDEX scope.
- Root-level tooling files git already describes on its own: `gradlew`, `gradlew.bat`, `.gitignore`, `.claudeignore`, and the Eclipse and IDE dotfiles.

One exception to the `src/` rule: `src/main/resources/schema.sql` keeps a row in the root INDEX,
because it is a schema definition rather than source.

Source is already tracked by the compiler, the IDE and `git log`, which record it more accurately
than a hand-maintained table. Indexing it produced 61 rows that had drifted badly from the code:

- Of the 7 actuator files indexed, only `Actuator.java` existed. The other 6 were pre-rename names
  (`IngestorActuator.java`, `TextExtractorActuator.java`, `ActuatorRegistry.java`, …), while
  `Clipper.java` and `Coordinator.java` were never indexed at all.
- All 4 indexed `messaging/` files were wrong; the package holds one file, `Message.java`.
- `Job.java` and `JobRepository.java` had rows despite the Job class being deliberately removed.
- Around a dozen files appeared twice with conflicting descriptions, including `Actuator.java`,
  `Document.java` and every controller.

Design documents, specs, trackers and build configuration stay indexed, because nothing else
records why they changed.

Removed from INDEX 2026-09-06.

Split into three INDEX files 2026-09-07. One root INDEX carrying 42 rows meant every story edit
reached across the tree to touch it, and the two rows for the fix plans filed under
`documents/done/` had already gone stale against their real paths.
