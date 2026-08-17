# brain4th

## Work in process 

Claude Code automation for a personal Obsidian vault: research, tagging, and note review, driven by a set of `b4-*` skills.

Vault: `C:\Users\rsant\desar\Local Vault\Local Vault`

## Setup

1. **Smart Connections MCP** — wires Claude Code to the vault for semantic note lookup. See `.claude/skills/install-smart-connection/SKILL.md`, or run:
   ```
   claude mcp add smart-connections -e OBSIDIAN_VAULT="C:\Users\rsant\desar\Local Vault\Local Vault" -- npx -y @yejianye/smart-connections-mcp
   ```
   Requires the vault's `.smart-env` folder to already exist (created by Obsidian's Smart Connections plugin — index the vault there first).

2. **Firecrawl MCP** — used for web retrieval per `.claude/rules/scrapper.md`, instead of `WebFetch`. Registered at local scope with a `FIRECRAWL_API_KEY`:
   ```
   claude mcp add firecrawl -s local -e FIRECRAWL_API_KEY=<your-key> -- npx -y firecrawl-mcp
   ```
   Get a key at [firecrawl.dev](https://firecrawl.dev).

## Skills

| Skill | Purpose |
|---|---|
| `/b4-research` | Research a topic on the web, write an APA 7-cited Markdown note into the vault. Checks for existing related notes first, asks where to save, never silently overwrites. |
| `/install-smart-connection` | Install/verify the Smart Connections MCP server. |

Planned: `/b4-tags` (tag management), `/b4-review` (citation/attribution/tag audit), `/b4-ai-score` (heuristic AI-writing-tell scorer). See `TODO.md`.

## Project rules (`.claude/rules/`)

- **`shell.md`** — PowerShell only; no Bash or cmd.exe syntax.
- **`scrapper.md`** — use Firecrawl to retrieve pages; store retrieved content under `External/Web/<host>/` in the vault, log every URL (fetched or referenced) in `External/Web/References/references.md`.
- **`write-properly.md`** — avoid AI-writing tells in generated text. Scoped to `Generated/` only (see `Generated/CLAUDE.md`).

## Vault layout conventions

Notes follow a nested topic hierarchy: `<Topic>/<Subtopic>/<Specific note>` — e.g. `AI/Claude/Skills/<skill-name>` for a skill's own documentation. `b4-research` suggests a path in this shape and asks for confirmation before writing.

## Project status

See `HANDOUT.md` for a fuller status summary, and `TODO.md` for the persistent task list (survives restarts — the session `TaskList` tool does not).
