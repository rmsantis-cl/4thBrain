---
name: Obsidian-MCP-Capabilities-Summary
description: Summary of Obsidian REST API/MCP and Smart Connections capabilities, read from the vault/Obsidian-refs clippings and framed for 4thBrain's EP3/EP10 scope
date: 2026-08-25
metadata:
  version: 1.0
  created-by: Claude Code
---

# Obsidian and MCP capabilities, from 4thBrain's perspective

This note distills six reference clippings in this folder into what matters for `vault/`'s scope: EP3 (Local Vector Indexing & MCP Integration, FR4) and EP10 (Vault Backup, Integrity & Recovery). The six sources sit in three layers, and only some of them are still relevant choices.

## Layer 1: Local REST API and its built-in MCP server

`coddingtonbear/obsidian-local-rest-api` is the foundation. It runs an authenticated HTTPS server on the vault (default port 27124) with full CRUD on notes, section-level PATCH edits targeting a heading, block reference, or frontmatter key, full-text and JsonLogic search, tag listing, and Obsidian command execution. As of its current release it ships a built-in MCP server at `/mcp/`, using the Streamable HTTP transport, exposing 15 tools (`vault_read`, `vault_write`, `vault_patch`, `search_query`, `search_simple`, `command_execute`, `open_file`, and others). The maintainers say directly that third-party MCP bridges are no longer necessary given this built-in server.

This is the layer that answers "how does an MCP client read and write the vault." For 4thBrain it's a candidate transport for whatever process (batch job, daily briefing generator, UI backend) needs to read or patch notes without shelling out to the filesystem directly.

## Layer 2: obsidian-mcp-tools (archived)

`jacksteamdev/obsidian-mcp-tools` bridged Claude Desktop to a vault via the Local REST API plugin, adding Templater prompt execution and Smart Connections semantic search as MCP tools. The project is now archived — the maintainer stepped back, citing at least five community alternatives. Since Layer 1's built-in MCP server absorbed the core vault-access functionality this plugin used to provide, it's not a dependency worth taking on for 4thBrain; note it here only because it explains why some older setup guides reference a separate MCP server binary that no longer needs installing.

## Layer 3: Smart Connections family (local semantic search)

Smart Connections and its sibling plugins do embedding-based semantic search entirely locally, with no cloud API call required for the core retrieval workflow:

- **Smart Connections** — anchored to the currently open note; answers "what's related to what I'm looking at."
- **Smart Lookup** — anchored to a plain-language question; answers "what notes are about this idea," useful when you remember the concept but not the wording, filename, or tag.
- **Smart Connections MCP server** (the mcpmarket.com listing) — exposes the plugin's precomputed embeddings (384-dimension vectors, TaylorAI/bge-micro-v2 model) to MCP clients for semantic search and multi-level connection graphs, with block-level granularity rather than whole-note only.

These plugins write their index to a `.smart-env` folder inside the vault, which `vault/CLAUDE.md` already names as the mechanism EP3 is built on.

## What this means for 4thBrain

EP3's requirement is embedding generation for new/changed notes via Smart Connections, exposed through an MCP server for semantic queries. The two layers map cleanly onto that:

- **Indexing and semantic search**: Smart Connections' local embedding pipeline (Layer 3) is the mechanism already assumed in `vault/CLAUDE.md`. Its own MCP surface (or a client reading `.smart-env` directly) is the semantic-query side of FR4.
- **Vault read/write/patch**: the Local REST API's built-in MCP server (Layer 1) is the actively-maintained, first-party choice for structural vault operations — creating notes, patching sections, listing tags — that ingestion and batch processing will need regardless of the search layer.

Neither layer requires an outbound network call for its core function, which fits the project's zero-cloud-cost, privacy-first constraint (see `documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md`, NFR set). The archived Layer 2 plugin can be treated as superseded and left out of any setup instructions.

## Sources

Read from `vault/Obsidian-refs/`:

- A secure REST API and Model Context Protocol (MCP) server for your vault.md
- Add Obsidian integrations like semantic search and custom Templater prompts to Claude or any MCP client jacksteamdevobsidian-mcp-tools.md
- Claude & MCP Integration - Optimizing AI integration.md
- Smart Connections Semantic Search & Knowledge Graphs for Obsidian.md
- Smart Lookup.md
- Smart Thinking MCP Server  Awesome MCP Servers.md
