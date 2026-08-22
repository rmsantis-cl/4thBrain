# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**brain4th** is a Claude Code automation framework for a personal Obsidian vault at `C:\Users\rsant\desar\Local Vault\Local Vault`. It provides `b4-*` skills to automate research, note-taking, tagging, and quality review.

## Vault Architecture & Conventions

**Vault location:** `C:\Users\rsant\desar\Local Vault\Local Vault`

**Note organization:** Nested topic hierarchy: `<Topic>/<Subtopic>/<Specific note>`. Examples:
- `AI/Claude` — Claude-specific notes
- `AI/Claude/Skills/<skill-name>` — documentation for a specific skill
- `Writing/AI/Signs of AI Writing.md` — research sourcing the `write-properly` rule

**External content storage:** Retrieved web pages and reference logs live under `External/Web/`:
- `External/Web/<host>/` — HTML/images from a domain (e.g., `External/Web/example.com/`)
- `External/Web/References/references.md` — log of every URL fetched or referenced

## Skills

### Shipped

| Skill | Purpose | Trigger |
|---|---|---|
| `b4-research` | Research a topic, write a cited (APA 7) note to the vault | User asks to research, "look into X", or add a sourced note |
| `install-smart-connection` | Install/verify Smart Connections MCP | If MCP lookup tools are unavailable |

### Planned (see TODO.md)

- `b4-tags` — add/remove tags from notes
- `b4-review` — review/correct notes' citations, attribution, and tags
- `b4-ai-score` — heuristic 0–100 confidence scorer using vault's own AI-writing-tells research
- Batch-queue skill set — enqueue research tasks, manage queue state, run non-LLM jobs in WSL, route LLM jobs through Claude Batch

## MCP Servers

Two MCPs are required. Both are configured at project scope in `.mcp.json` (empty by default; register these via `claude mcp add`).

### Smart Connections

Enables semantic vault lookup for duplicate-detection in `b4-research`.

**Install:**
```powershell
claude mcp add smart-connections -e OBSIDIAN_VAULT="C:\Users\rsant\desar\Local Vault\Local Vault" -- npx -y @yejianye/smart-connections-mcp
```

**Prerequisite:** The vault must have the Obsidian Smart Connections plugin installed and the vault indexed (run in Obsidian's Smart Connections plugin first).

**Status:** See TODO.md — vault index is currently empty (`mcp__smart-connections__lookup` returns "Smart sources data not found").

### Firecrawl

Web scraping for `b4-research` and other skills. Stores retrieved content per `scrapper.md`.

**Install:**
```powershell
claude mcp add firecrawl -s local -e FIRECRAWL_API_KEY=<your-key> -- npx -y firecrawl-mcp
```

Get a key at [firecrawl.dev](https://firecrawl.dev).

## Project Rules (`.claude/rules/`)

- **`shell.md`** — PowerShell only; no Bash or cmd.exe syntax or commands.
- **`scrapper.md`** — use Firecrawl (not `WebFetch`) to retrieve pages; store under `External/Web/<host>/` and log URLs in `External/Web/References/references.md`.
- **`write-properly.md`** — avoid AI-writing tells in generated text. **Scoped to `Generated/` directory only** (enforced via `Generated/CLAUDE.md`). Applies to any note written by `b4-research` or other skills that output to `Generated/`.

## Task Tracking

Two parallel systems kept in sync manually:

- **Session `TaskList`** (`TaskCreate`/`TaskUpdate`/`TaskList` tools) — in-memory, survives only within a session.
- **`TODO.md`** — persistent file at project root, mirrors the session list. Treat this as source of truth across sessions.

Update `TODO.md` directly as work progresses, or ask Claude to sync it when closing a session.

## How Skills Work: b4-research Example

1. Take the user's research topic
2. Search vault for related notes using Smart Connections (checks for duplicates)
3. Surface any matches; suggest a save location following the vault hierarchy
4. Research on the web using Firecrawl (per `scrapper.md`)
5. Draft a Markdown note with APA 7 citations (in-text `(Author, Year)` + numbered footnotes + References section)
6. Before writing, confirm or override the save location
7. If a file exists at that location, ask: append, merge, or save as new note with numeric suffix
8. Write to vault; report the final path, write mode, and summary

See `.claude/skills/b4-research/SKILL.md` for the full flow.

## Creating New Skills

Skills live in `.claude/skills/<skill-name>/SKILL.md`. Each skill:

1. Starts with YAML frontmatter (name, description, when to trigger)
2. Documents the full workflow step-by-step
3. References relevant vault paths, MCP tools, and rules
4. Specifies any MCP dependencies

Example: `.claude/skills/b4-research/SKILL.md`

When building a new `b4-*` skill:
- Follow the same vault hierarchy and APA 7 citation style as `b4-research`
- Use Firecrawl for web content (per `scrapper.md`)
- Apply `write-properly` rules to generated text
- Use Smart Connections for vault lookups (when index is working)
- Check for existing notes before writing; never silently overwrite
- Document the skill in `SKILL.md` including all steps and MCP dependencies

## Project Status & Open Issues

See `HANDOUT.md` for a full status summary.

**Open issues:**
1. Smart Connections vault index is empty — blocks `b4-research` duplicate detection and any future skill using vault lookup
2. Firecrawl MCP tool exposure was flaky in prior sessions — verify if `scrapper.md` usage falls back to `WebFetch`

See `TODO.md` for the persistent task list.
