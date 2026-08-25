---
name: vault-Instructions
description: Install and configure the Obsidian Smart Connections plugin and its MCP server for the vault module
date: 2026-08-25
metadata:
  version: 1.1
  created-by: Claude Code
---

# Smart Connections — Install & Configure

Wires the vault's semantic index to Claude Code via MCP. Smart Connections is an Obsidian plugin that generates local embeddings for every note; the MCP server exposes those embeddings as semantic-search / similar-notes tools. All parameters referenced below (`vault_dir`, `smart_env_dir`, `mcp_server_name`, `mcp_package`, `obsidian_vault_env_var`) are defined at the top of `params.json` in the project root — update that file, not the commands below, if a value changes.

## 1. Install the Obsidian plugin

1. Open Obsidian on the vault at `vault_dir` (`params.json`).
2. Settings → Community plugins → Browse → search "Smart Connections" → Install → Enable.
3. Let it run at least one full indexing pass. This can take from minutes to hours depending on vault size and whether it's using a local or API embedding model (configurable in the plugin's settings).
4. Confirm indexing finished: a `smart_env_dir` folder (`.smart-env`) appears at the vault root, containing the embedding store.

Embeddings are generated once by the plugin and re-generated incrementally as notes change. The MCP server in step 2 only *reads* this store — it does not generate embeddings itself.

## 2. Register the MCP server

Requires Node.js (`npx` on PATH).

**Via Claude Code CLI (recommended):**

```powershell
claude mcp add smart-connections -e OBSIDIAN_VAULT="C:\Users\rsant\desar\Local Vault\Local Vault" -- npx -y @yejianye/smart-connections-mcp
```

**Or manual config** — add to `.mcp.json` (project scope) or `~/.claude.json` (global scope):

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

JSON requires doubled backslashes in the path. Restart Claude Code after editing config files directly (the CLI path picks up the change without a restart).

## 3. Verify

Run `claude mcp list` and confirm `smart-connections` shows as connected. Then run the validation script in this directory:

```powershell
python vault\validate_smart_connections.py
```

(the script reads `params.json` from the project root)

It checks the vault path, the `.smart-env` store, Node/npx availability, and the MCP registration, and reports pass/fail for each.

## Troubleshooting

- **`.smart-env` missing**: the plugin hasn't finished an indexing pass yet. Open Obsidian and wait for it to complete before registering the MCP server.
- **MCP tools return "Smart sources data not found"**: the embedding store exists but is empty or stale — re-run indexing from the plugin's settings pane.
- **`npx` not found**: install Node.js (includes `npx`).

## Sources

- https://www.npmjs.com/package/@yejianye/smart-connections-mcp
- https://github.com/yejianye/ob-smart-connections-mcp
- https://community.obsidian.md/plugins/smart-connections
