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

**Status:** Closed (2026-08-26) — tested and resolved. Decision: keep all components in their current native environments (Ollama in WSL2, Obsidian/app in Windows). No practical benefit to moving Obsidian into WSL2; re-evaluate only when packaging for delivery after development is complete.

**Description:** Placement of the system's components across host environments is undecided beyond one fixed point: Ollama (local LLM inference, ADR2) must run in WSL2. The ingestion/classification app and the search app can run in any environment. Whether Obsidian (and by extension the vault it manages, ADR3) can/should also run in WSL2 is an open question — running everything in the same OS environment could simplify a later move to a single Docker image.

**Constraints established so far:**
- Llama (Ollama) **must** run in WSL2 — fixed, not up for debate (per ADR1/ADR2).
- The ingestion/search app has no environment constraint — can run in WSL2, native Windows, or elsewhere.

**Open question:** Can Obsidian run inside WSL2?

**Why this matters:** Colocating all components in one OS environment (WSL2) is attractive for a future single-container Docker packaging (EP11/release management). The research below confirms Obsidian itself can run natively inside WSL2 via WSLg, which also sidesteps a separate known problem — file-locking/UNC path errors when the Windows build of Obsidian opens a vault stored inside the WSL2 filesystem. The vault's plain-Markdown format (ADR3) doesn't require WSL2 either way; this question is specifically about where the Obsidian *application* runs.

## Research: running Obsidian in WSL2

Yes — Obsidian can run in WSL2 by installing the Linux version inside the WSL distribution and using WSLg to display the GUI directly on the Windows desktop.

**How it works:**
- **Native Linux app:** install the Linux package (AppImage or equivalent) inside the WSL2 environment, rather than running the Windows build against a vault on the WSL filesystem.
- **WSLg integration:** WSLg (Windows Subsystem for Linux GUI) streams the app window to the Windows taskbar/desktop, so it behaves like a normal Windows app despite running inside the Linux distro.
- **Direct file access:** running Obsidian natively inside WSL lets it read/write the Linux filesystem directly, avoiding the file-locking and UNC-path errors that occur when the *Windows* build of Obsidian tries to open a vault stored inside WSL.

**Basic setup steps:**
1. Open a WSL terminal (e.g., Ubuntu).
2. Download the latest Linux installer package from the Obsidian download page.
3. Install graphics dependencies if the package manager prompts for them.
4. Run the installer or launch the binary directly from the WSL terminal — the GUI opens on the Windows screen via WSLg.

**Open follow-up questions from the research (not yet answered for this project):**
- Vault storage location: inside the WSL2 filesystem, or on the Windows `C:` drive? This affects both Obsidian performance and whether other Windows-side tools need direct vault access.
- Exact per-distribution install commands, once a target distribution is chosen.

**Sources:**
1. https://matthew-field.ca/2024/08/09/installing-obsidian-on-wsl-with-a-windows-gui-easy-setup/
2. https://www.reddit.com/r/ObsidianMD/comments/1ohfnua/i_moved_my_notes_and_files_to_wsl2_and_obsidian/
3. https://forum.obsidian.md/t/support-for-vaults-in-windows-subsystem-for-linux-wsl/8580
4. https://forum.obsidian.md/t/support-for-vaults-in-windows-subsystem-for-linux-wsl/8580?page=3

**Date Created:** 2026-08-25
**Date Cancelled:** —

## Testing & Decision (2026-08-26)

**Tested:** Obsidian and Zed installation in WSL2 via flatpak.

**Results:**
- Both install successfully and run via WSLg (Windows GUI).
- Obsidian in WSL can mount files on WSL filesystem or access NTFS volumes directly.
- Smart Connections (vector index) works fine inside WSL.
- **Critical finding:** UI quality is noticeably lower when running in WSL2 — window rendering is slower, text rendering is less crisp, responsiveness is degraded compared to native Windows.
- No functional benefit over the current Windows-native setup — the vault is accessible to both environments regardless of where Obsidian runs.

**Decision:** Keep the current setup (Obsidian running natively on Windows, Ollama in WSL2). The UI degradation is not worth the theoretical Docker-packing simplification. **Re-evaluate this decision only when the development process is complete and it's time to package for final delivery** (EP11). At that point, the cost/benefit of moving Obsidian into WSL2 for Docker isolation may shift if deployment targets require it.

**Why:** The goal is to build and test the product first. Obsidian's native-Windows performance is better for development iteration. Changing the architecture late, right before release, is lower-risk than doing it now and dealing with UI issues during feature development.

## Changelog

- 2026-08-26: ADR closed. Tested Obsidian and Zed in WSL via flatpak; found UI quality degradation and no functional benefit over native Windows. Decided to keep current setup (Windows-native Obsidian, WSL Ollama) and re-evaluate only at EP11 (release packaging).
- 2026-08-25: Created — split out of `ADRS.md` into its own file, full open-question text moved here.
- 2026-08-25: Added research on running Obsidian in WSL2 via WSLg, confirming it's technically viable; vault-location and distro-specific setup remain open follow-ups.
