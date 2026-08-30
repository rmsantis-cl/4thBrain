# /MEMORY.md maintenance

Rules for maintaining the project's `/MEMORY.md` file (project-local, plain-text session memory — distinct from Claude Code's own memory system). Based on `documets/method/MD-MEMORY-INSTRUCTIONS.md`. This rule file itself changes rarely; project data belongs only in `/MEMORY.md`.

## Update rules

1. **Read before writing.** Load the full current `/MEMORY.md` content before editing — never overwrite blindly.
2. **Edit, don't append-only.** When a fact changes (a decision superseded, a status changed), update the existing line in place. Mark superseded items `(superseded: <date>)` instead of deleting, unless the user asks to remove them.
3. **Keep it factual and current.** Record decisions, constraints, and state — not conversation narration. No "we discussed X," just the resulting fact.
4. **Prune stale detail.** Remove task-level status (today's bug, this week's todo) once resolved. Keep durable facts: architecture decisions, stack choices, recurring constraints.
5. **Ask before saving anything sensitive** (credentials, tokens, personal data). Never store secrets in `/MEMORY.md`.
6. **Keep sections short.** Summarize/condense a section once it passes ~15 lines rather than letting it sprawl.
7. **Timestamp major edits.** Add a one-line Changelog entry for every non-trivial update.
8. **Only write what's confirmed.** Don't record assumptions, guesses, or unconfirmed plans as fact — flag them `proposed` or `TBD` if included at all.

## Fallback behavior

- **`/MEMORY.md` doesn't exist:** create it from the template below; ask the user for the project name/purpose to seed it; leave other sections empty rather than guessing.
- **`/MEMORY.md` too large to read in full:** say so explicitly before proceeding — don't silently skim or truncate. Ask whether to condense it now.
- **Conflict between `/MEMORY.md` and what the user just said:** the user's current statement wins. Update the file to match and note the change in the Changelog rather than silently picking one version.
- **Unsure whether something belongs in `/MEMORY.md`:** default to leaving it out — a fact the user has to repeat costs less than the file drifting into an unreliable, bloated record.

## Required file structure

```markdown
---
name: MEMORY
description: make context persistent to be preloaded in other sessions
metadata:
  node_type: memory
  type: log
---

# MEMORY.md

[Load MEMORY-instructions.md before making any update to this file.]

## Project
- Name / purpose / one-line summary

## Current State
- What's built, what's in progress, what's blocked

## Decisions
- Key technical/product decisions and why (date each)

## Constraints
- Fixed limitations: stack, deadlines, external dependencies

## Open Questions / Next Steps
- Unresolved items to pick up next session

## Changelog
- YYYY-MM-DD: brief note on what changed in this file
```

## Session workflow

- **Start of session:** load `/MEMORY.md`. Summarize current state back to the user in 2-3 sentences to confirm shared context before proceeding.
- **End of session (or on request):** diff what changed against what's recorded, update only the relevant sections, add a Changelog line.
