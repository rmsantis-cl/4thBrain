# Installing Smart Connections MCP for Claude Code

Vault: `C:\Users\rsant\desar\Local Vault\Local Vault`

## Prerequisites

1. Smart Connections plugin installed and enabled in Obsidian, pointed at the vault above.
2. Let it finish generating embeddings at least once — check for a `.smart-env` folder inside the vault path. The MCP server reads from that; it does not generate embeddings itself.
3. Node.js / npx available on your machine.

## Install via Claude Code CLI (recommended)

```powershell
claude mcp add smart-connections -e OBSIDIAN_VAULT="C:\Users\rsant\desar\Local Vault\Local Vault" -- npx -y @yejianye/smart-connections-mcp
```

## Or manual config

Add to `.mcp.json` (project) or `~/.claude.json` (global):

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

Note the double backslashes required in JSON.

## Verify

After adding, restart Claude Code (or run `claude mcp list` to confirm it's registered). The server should expose semantic search / similar-notes tools over the vault's embeddings.

## Sources

- https://www.npmjs.com/package/@yejianye/smart-connections-mcp
- https://github.com/yejianye/ob-smart-connections-mcp
- https://community.obsidian.md/plugins/smart-connections
