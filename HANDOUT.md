# brain4th — Project Status Handout

_Obsidian vault automation project. Vault: `C:\Users\rsant\desar\Local Vault\Local Vault`._

## What this project is

A set of Claude Code skills (`b4-*`) that automate working with a personal Obsidian vault: researching topics and writing cited notes, tagging, reviewing note quality, and (planned) a local task queue for non-LLM background jobs.

## Skills shipped

| Skill | Does | Status |
|---|---|---|
| `b4-research` | Researches a topic on the web, writes a cited (APA 7) Markdown note into the vault, asks before saving and never overwrites existing notes | Working |
| `install-smart-connection` | Installs/verifies the Smart Connections MCP server wired to the vault | Working, but see open issue below |
| `roast` | Multi-persona brutal-feedback review of an idea/plan (general-purpose, not vault-specific) | Available (bundled skill, not built for this project) |

## Skills planned, not yet built

- **`b4-tags`** — add/remove tags from notes.
- **`b4-review`** — review/correct notes' citations, attribution, and tags.
- **`b4-ai-score`** — heuristic 0–100 "human-confidence" scorer for a note, using the vault's own AI-writing-tells research as its checklist. Plan drafted, awaiting approval.
- **Batch-queue skill set** (see `Plan-batch-queue.md`) — `add question`, `add url`, `status`, `research [level=X] url`, `cancel`/`pause`/`continue [batch-id]`. Non-LLM jobs run in WSL bash; LLM jobs go through `[id]-prompt.md` → Claude batch → `[id]-result.md`. Still in the planning-refinement stage.

## Project rules (`.claude/rules/`)

- **`shell.md`** — PowerShell only in this project; no Bash/DOS.
- **`scrapper.md`** — use Firecrawl (not `WebFetch`) to retrieve pages; store retrieved content under `External/Web/<host>/` in the vault, log every URL (fetched or just referenced) in `External/Web/References/references.md`.
- **`write-properly.md`** — avoid AI-writing tells in generated text (scoped only to files under `Generated/`, via `Generated/CLAUDE.md`).

## Vault research produced so far

- `AI/Generated Documents/Signs of AI Writing.md` — sourced summary of AI-writing tells.
- `AI/Generated Documents/AI Writing - Words to Avoid.md` — exhaustive word/phrase list compiled from the same sources, with cross-source ★ weighting. Feeds the planned `b4-ai-score` skill.
- `AI/Claude/Plugins/Claude Plugins.md` — survey of Claude Code plugin marketplace repositories.
- `PKM/Second Brain/Grow 21 Skills.md` — summary of a second-brain/PKM skills article.
- `External/Web/` — raw retrieved copies of the above sources plus the reference log.

## Open issues

1. **Smart Connections vault index is empty** — `mcp__smart-connections__lookup` fails with "Smart sources data not found." Blocks the duplicate-detection step in `b4-research` and any future `b4-*` skill that needs it. Needs (re)indexing in Obsidian's Smart Connections plugin.
2. **Firecrawl MCP tool exposure was flaky** across sessions (connected at the CLI level but not always visible as a callable tool) — appears resolved after a full restart, but worth re-verifying if `scrapper.md` usage silently falls back to `WebFetch` again.

## Task tracking

Two parallel systems, kept in sync manually:
- **Session `TaskList`** (`TaskCreate`/`TaskUpdate`/`TaskList` tools) — in-memory, doesn't survive a restart.
- **`TODO.md`** (project root) — persistent, mirrors the session task list. Treat this as the source of truth across sessions.
