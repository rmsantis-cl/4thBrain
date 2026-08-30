# File Format

Rules for any file in this project that carries a YAML file header (a `---`-delimited block at the very top, with no text before it). Based on `documets/method/BOOT.md`. Applies project-wide.

## File header

- Header is bounded by a first line `---` and a last line `---`; nothing precedes the first line. The body between them is YAML.
- Required fields: `name`, `description`.
- Optional fields: `metadata`, `read-only`.
- Invalid YAML in the header is ignored, and a WARN is logged (state this to the user instead of failing silently).
