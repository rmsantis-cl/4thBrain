# File Indexing

INDEX maintenance for files created/updated under `file-versioning.md`. Based on `documets/method/BOOT.md`. Applies project-wide.

- A file named `INDEX` tracks every artifact, spec, interview log, and foundational instruction file created or used in this project.
- It has its own file header (see `file-format.md`), plus a two-column table: `File Name`, `History`.
- Markdown tables cannot nest a table inside a cell, so the `History` cell holds a list of entries formatted `[date] comment`, most recent last. Separate multiple entries within a cell with `<br>`.
- On file creation, add a row with a single `[date] comment` entry. On file update, append a new `[date] comment` entry to the existing cell rather than replacing it.
