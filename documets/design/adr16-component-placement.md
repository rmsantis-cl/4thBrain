---
name: adr16-component-placement
description: ADR16 — Where each component runs (WSL2 vs. any environment), including Obsidian-in-WSL2 research
date: 2026-08-25
metadata:
  version: 1.1
  created-by: Claude Code
---

# ADR16: Where does each component run — WSL2 vs. any environment?

Abstract and cross-reference live in `documets/design/ADRS.md`. This file holds the full record.

**Status:** Closed (2026-09-02) — architecture clarified.

**Description:** Each component runs in its native/optimal environment:
- **Ollama** (LLM inference engine) — runs in WSL2 via systemd, for GPU acceleration and Linux tooling
- **Node.js server** (Web UI, API, orchestration) — runs natively on Windows via `server/bootstrap.js`
- **MCP server** (vector index access) — runs as a Windows-native Node.js subprocess
- **Obsidian** (note application) and **vault** (Markdown files) — run on Windows native filesystem
- **Smart Connections** (vector indexing) — runs as Obsidian plugin on Windows

No attempt to colocate everything in WSL2; each component runs where it makes sense.

**Constraint:**
- Ollama **must** run in WSL2 — required for GPU acceleration on this host architecture (per ADR1/ADR2).

**Closed question:** Whether to run Obsidian in WSL2 — not needed. The architecture is simpler with all Windows-side components native on Windows and only Ollama in WSL2.

**Why this matters:** Colocating all components in one OS environment (WSL2) is attractive for a future single-container Docker packaging (EP11/release management). The research below confirms Obsidian itself can run natively inside WSL2 via WSLg, which also sidesteps a separate known problem — file-locking/UNC path errors when the Windows build of Obsidian opens a vault stored inside the WSL2 filesystem. The vault's plain-Markdown format (ADR3) doesn't require WSL2 either way; this question is specifically about where the Obsidian *application* runs.

## Architecture Rationale

**Why Ollama in WSL2, everything else on Windows:**

1. **Ollama requires Linux.** GPU acceleration (IPEX-LLM) and systemd integration for process supervision work only inside a Linux environment. WSL2 provides this without needing a separate machine.

2. **Node.js runs on Windows natively.** Running the Web UI and orchestration server natively on Windows (not inside WSL2) eliminates the complexity of cross-environment IPC beyond the single HTTP boundary at port 11434. Windows→WSL2 port forwarding is already set up for Ollama; the Node.js server uses it to call Ollama.

3. **Obsidian + vault on Windows.** The vault is a directory of plain Markdown files. Obsidian needs direct filesystem access to the vault for file-locking and Smart Connections performance. Windows native access is simpler than mounting a WSL filesystem inside Windows Obsidian (or vice versa).

4. **MCP server as Windows subprocess.** The MCP server (exposing Smart Connections vector index) runs as a Windows-native Node.js subprocess launched by bootstrap.js. It communicates with Obsidian via stdio or HTTP, with no WSL boundary involved.

**Result:** One clean boundary (Windows→Ollama HTTP at localhost:11434), no complex cross-environment mounting, no UI degradation, no IPC overhead. Each component runs where it works best.

## Changelog

- 2026-09-02 (architecture correction): Updated ADR abstract and rationale — clarified that Node.js and MCP also run on Windows (not just Obsidian). Architecture is now: Ollama only in WSL2, everything else on Windows. Removed outdated Obsidian-in-WSL research section; architecture is locked as Windows-native for all non-Ollama components.
- 2026-08-26: ADR closed. Tested Obsidian and Zed in WSL via flatpak; found UI quality degradation and no functional benefit over native Windows. Decided to keep current setup (Windows-native Obsidian, WSL Ollama) and re-evaluate only at EP11 (release packaging).
- 2026-08-25: Created — split out of `ADRS.md` into its own file, full open-question text moved here.
- 2026-08-25: Added research on running Obsidian in WSL2 via WSLg, confirming it's technically viable; vault-location and distro-specific setup remain open follow-ups.
