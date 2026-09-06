# File Indexing

INDEX maintenance for files created/updated under `file-versioning.md`. Based on `documets/method/BOOT.md`. Applies project-wide.

- A file named `INDEX` tracks every artifact, spec, interview log, and foundational instruction file created or used in this project, except those excluded below.
- It has its own file header (see `file-format.md`), plus a two-column table: `File Name`, `History`.
- Markdown tables cannot nest a table inside a cell, so the `History` cell holds a list of entries formatted `[date] comment`, most recent last. Separate multiple entries within a cell with `<br>`.
- On file creation, add a row with a single `[date] comment` entry. On file update, append a new `[date] comment` entry to the existing cell rather than replacing it.

## Not indexed

- **Source files under `src/`** are excluded. Do not add a row when creating or updating one, and do not re-add rows removed under this rule.
- Build output and generated trees (`bin/`, `build/`, `.gradle/`, `data/`) are excluded for the same reason.

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
