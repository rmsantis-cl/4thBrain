# File Protection

Read-only enforcement for any file in this project carrying a YAML file header (see `file-format.md`). Based on `documets/method/BOOT.md`. Applies project-wide.

- A file is read-only when its header sets `read-only: true`; otherwise it is writable.
- Read-only files must never be modified or deleted, regardless of who requests it. Refuse the request and tell the user why instead of silently skipping it.
- Silent ignore only applies to routine update flows (see `file-versioning.md`), not to explicit modify/delete requests — those must be refused with an explanation.
