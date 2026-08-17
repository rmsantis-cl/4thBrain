# brain4th — TODO

Persistent task list (survives reboots/session restarts). Mirrors the session `TaskList` at time of writing; update this file directly, or ask Claude to sync it, as work progresses.

- [ ] **Code `b4-ai-score` skill** — blocked on plan approval (plan at `C:\Users\rsant\.claude\plans\mcp-list-dynamic-cherny.md`). Heuristic 0-100 human-confidence scorer for vault notes, reading `AI/Generated Documents/AI Writing - Words to Avoid.md` and `AI/Generated Documents/Signs of AI Writing.md` as its checklist source.
- [ ] **Refine plan for batch-queue skill set** — turn `Plan-batch-queue.md` into a concrete design: operations (`add question`, `add url`, `status`, `research [level=X] url`, `cancel`/`pause`/`continue [batch-id]`), queue storage format, the 5-minute post-indexation wait, a better indexed-check mechanism, WSL execution path for non-LLM jobs, and the `[id]-prompt.md`/`[id]-result.md` flow for LLM jobs via Claude batch.
- [ ] **Code the batch-queue skill set** — implement the above. *Depends on the plan-refinement task above being done first.*
- [ ] **Test the batch-queue skill set** — verify enqueue/status/research-recursion/cancel/pause/continue, WSL execution, and the prompt/result round-trip. *Depends on the coding task above being done first.*

- [ ] **Design and build `b4-tags` skill** — add/remove tags from notes, following the `b4-research` pattern.
- [ ] **Design and build `b4-review` skill** — review/correct notes' citations, attribution, and tags.
- [ ] **Fix Smart Connections vault indexing** — `mcp__smart-connections__lookup` fails with "Smart sources data not found"; vault needs (re)indexing in Obsidian's Smart Connections plugin before vault-lookup steps in `b4-*` skills work as designed.

- [ ] **Design an Obsidian plugin to "explode" references from existing notes** — given a note with footnote/reference citations, surface or extract each reference into its own linkable form (exact behavior TBD at design stage).
- [ ] **Plan the reference-exploder plugin** — concrete design: how references are detected (footnote syntax, frontmatter, etc.), what "exploding" produces (new notes? links? a references pane?), and how it fits the vault's existing citation conventions (see `.claude/rules/scrapper.md`, `b4-research` skill). *Depends on design above.*
- [ ] **Code the reference-exploder plugin**. *Depends on the plan above.*
- [ ] **Test the reference-exploder plugin** — verify against notes with existing footnote citations in the vault. *Depends on the coding task above.*
