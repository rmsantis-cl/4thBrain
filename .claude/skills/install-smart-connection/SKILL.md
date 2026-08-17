---
name: install-smart-connection
description: Install and verify the Smart Connections MCP server for Claude Code, wired to the Obsidian vault at C:\Users\rsant\desar\Local Vault\Local Vault. Use when the user asks to install, set up, reinstall, or troubleshoot the Smart Connections MCP integration.
---

# Install Smart Connections MCP

Wires Claude Code to the Smart Connections Obsidian plugin's embedding index via MCP, so semantic search / similar-notes tools become available over the vault.

Vault path: `C:\Users\rsant\desar\Local Vault\Local Vault`

## Steps

1. **Check prerequisites**
   - Confirm the vault path exists.
   - Confirm a `.smart-env` folder exists inside the vault (Smart Connections plugin must have generated embeddings at least once in Obsidian first — this skill does not generate embeddings, only wires the MCP server to them).
   - Confirm `npx`/Node.js is available (`npx --version`).

2. **Register the MCP server** via Claude Code CLI:

   ```powershell
   claude mcp add smart-connections -e OBSIDIAN_VAULT="C:\Users\rsant\desar\Local Vault\Local Vault" -- npx -y @yejianye/smart-connections-mcp
   ```

   If the CLI approach fails or the user wants manual config instead, add to `.mcp.json` (project) or `~/.claude.json` (global):

   ```json
   {
     "mcpServers": {
       "smart-connections": {
         "command": "npx",
         "args": ["-y", "@yejianye/smart-connections-mcp"],
         "env": {
           "OBSIDIAN_VAULT": "C:\\Users\\rsant\\desar\\Local Vault\\Local Vault"
         }
       }
     }
   }
   ```

3. **Verify** with `claude mcp list` and confirm `smart-connections` shows as registered/connected. Tell the user to restart Claude Code if it doesn't pick up immediately.

## Notes

- Source docs: `Install-SmartConnection.md` in the project root.
- If `.smart-env` is missing, stop and tell the user to open Obsidian and let Smart Connections finish indexing first — don't proceed with registration until embeddings exist.
