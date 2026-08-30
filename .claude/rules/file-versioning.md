# File Versioning

Creation, update, and version-control rules for any file in this project carrying a YAML file header (see `file-format.md`; read-only enforcement in `file-protection.md`). Based on `documets/method/BOOT.md`. Applies project-wide.

## File creation

- If `${name}` already exists, ignore the creation request instead of overwriting.
- If the given content has no file header, insert one:
  ```
  ---
  name: ${name}
  description: none
  date: ${current date time}
  metadata:
    version: 1.0
    created-by: ${agent, model, or username}
  ---
  ```
- Add the new file to the INDEX (see `file-indexing.md`).

## File update

- If the target file doesn't exist, fail the update.
- If the file is read-only, silently ignore the update (no error, no change).
- Otherwise: update the header's `date` to the current date/time, increment `metadata.version`, and add the file to the INDEX.

## Version control

- Runs when all pending updates in a session finish, or when a file close is requested.
- All pending files are closed at end of session, and whenever a handout or memory dump is requested.
- If the storage supports native versioning, use it and replace the original in place.
- Otherwise, if the file has a header, bump `metadata.version` and update `date` (the `name` field never changes).
- If the storage doesn't permit update or replacement (e.g. VMS-style), write a new file named `${name};${version}` — the header's `name` field stays unchanged.
