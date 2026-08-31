---
name: PLAN-31-08-2026-EP7-Completion
description: Plan to close out EP7 (System Infrastructure & Host Runtime) — Stories 7.1 and 7.2, grounded in this session's live probe of the actual WSL2/Ollama/GPU state on the host
date: 2026-08-31
metadata:
  version: 1.0
  created-by: Claude Sonnet 5
---

# Plan: Complete EP7 (System Infrastructure & Host Runtime)

## Context

EP7 covers NFR1–NFR12 and has 5 stories. Three are already **COMPLETED** (7.3 SQLite setup, 7.4 schema DDL, 7.5 seed data — all closed independently of the WSL2/Ollama work below). The two remaining, both **READY** (not started):

- **Story 7.1** — WSL2 Runtime & Resource Bound Configuration
- **Story 7.2** — Process Lifecycle & MCP Server Setup

`local-llm/CLAUDE.md` currently says "Design only — no code yet," which matches 7.1/7.2's status but understates what's actually present on the host — see findings below.

## Live host findings (probed this session, not assumed)

- **WSL2 is installed and running.** Distro `FedoraLinux-44`, WSL version 2, systemd enabled (`/etc/wsl.conf` has `[boot] systemd=true`). This isn't something the project set up — it's pre-existing host state.
- **Ollama is already installed inside that distro** (`/usr/sbin/ollama`), but its systemd service is **disabled and inactive**. `curl localhost:11434/api/tags` fails — confirmed not running.
- **No `.wslconfig` exists anywhere** (`%USERPROFILE%\.wslconfig` absent). WSL2 is currently running on its implicit default (~50% of host RAM, no explicit cap) — NFR8/ADR8 require an explicit cap, which doesn't exist yet.
- **Host has ~32GB total physical RAM** (`33984925696` bytes); WSL2 currently reports ~15GB available to it, consistent with the unconfigured 50%-of-host default.
- **No GPU passthrough is available on this hardware.** `nvidia-smi` is not found inside WSL2, and the only GPU on this machine is an integrated **Intel Iris Xe** — no discrete NVIDIA GPU. NFR2/ADR2 and Story 7.1's AC explicitly require "GPU passthrough" / "GPU acceleration active." This is a hardware constraint, not a missing config step — see Open Question 1.
- **`server/config.js` is already Ollama-ready**: `ollamaBaseUrl`/`ollamaChatModel` are wired from `params.json` (`http://localhost:11434/v1`, `llama3.2:3b`), and `checkOllamaReachable()` already exists as a health check. Nothing on the Node side needs to change once Ollama is actually reachable.
- **No process supervision exists** to boot Ollama → confirm the port → then start Node/MCP in order (NFR9/ADR9) — no systemd unit, no PM2 config.
- **No MCP server is installed or running anywhere.** `params.json` names the package (`mcp_package: "@yejianye/smart-connections-mcp"`) but nothing installs or launches it. Spike 3.2 (COMPLETED) deliberately bypassed MCP entirely — it reads `.smart-env/smart_sources/smart_sources.ajson` directly via a Python script — so Story 7.2's MCP exposure is genuinely unbuilt, not just unverified.
- **A concurrency=1 mutex already exists, but scoped too narrowly.** `batch/lock-manager.js` implements ADR10's file-based, PID-tracked lock — today it only guards the batch worker's sweep. Story 7.1's AC ("Concurrency locks prevent multiple simultaneous local LLM calls from overwhelming memory") reads as a general invariant over *all* Ollama callers, not just the batch sweep — see Open Question 2.

## Architecture note: reconcile stale AC wording with ADR16 before implementing

Story 7.1/7.2's literal text says "Node.js and Ollama run inside WSL2." **ADR16** (closed 2026-08-26) superseded that: Ollama must run in WSL2 (fixed by ADR2), but the ingestion/search app (`server/`) runs natively on Windows — already confirmed live, since Story 1.1's verification pass ran the server natively against real `params.json` paths. This plan implements per ADR16: Ollama (and, per Open Question 3, likely the MCP server) inside WSL2; `server/` stays native Windows and reaches both over `localhost` HTTP. Recommend a documentation-only correction to Story 7.1/7.2's AC text in `Project 4thBrain.md` to stop citing the superseded framing — logged as a Design Debt candidate below, not a blocker to proceeding.

## Story 7.1: WSL2 Runtime & Resource Bound Configuration

| AC (as written) | Reinterpreted per ADR16 |
|---|---|
| Node.js and Ollama run inside WSL2 with GPU acceleration active | Ollama runs inside WSL2 with GPU acceleration active via the Intel iGPU path decided below; Node.js stays native (already true) |
| WSL2 RAM usage stays within configured bounds without host OOM errors | unchanged |
| Concurrency locks prevent multiple simultaneous local LLM calls from overwhelming memory | generalized — see decision below |

**Decided 2026-08-31 (GPU path):** attempt Intel iGPU acceleration rather than falling back to CPU-only. Researched the current state: mainline Ollama's Intel SYCL backend is **not yet merged** — [PR #11160](https://github.com/ollama/ollama/pull/11160) ("Enable Intel GPU support with SYCL backend") is still open, tested on both Windows/Ubuntu with iGPU/dGPU, offloading layers via SYCL, but not in a released build. The more mature, currently-working path is **Intel's own IPEX-LLM** (their optimized `llama.cpp`/Ollama fork), documented directly by Intel: [Run Ollama with IPEX-LLM on Intel GPU](https://github.com/intel/ipex-llm/blob/main/docs/mddocs/Quickstart/ollama_quickstart.md). This means the already-installed mainline `ollama` package (`/usr/sbin/ollama`, Fedora's own build) likely needs to be **replaced** with the IPEX-LLM build inside WSL2, not just reconfigured — a bigger, riskier change than originally scoped, and one with no fallback path already proven if it doesn't work cleanly.

**Work:**

1. Write `%USERPROFILE%\.wslconfig` with `memory=16GB` (see Decisions below) and restart WSL2 (`wsl --shutdown`) to apply. Verify with `wsl -d FedoraLinux-44 -- free -h`.
2. **GPU spike — done, succeeded.** See "2026-08-31 GPU spike run" below and the full trail in `documets/story/spike-gpu-ollama.md`. Real GPU offload confirmed (29/29 layers on the Iris Xe via SYCL/Level Zero, live inference tested). Remaining: promote the spike build to a permanent install (next step, see below) — not yet done.
3. Generalize `batch/lock-manager.js`'s concurrency=1 mutex into a shared gate any Ollama caller acquires before issuing a request (batch worker, live `/api/chat/llama` route, future Story 2.1 classification calls) — one invariant, matching ADR10's intent over "Ollama processing jobs" broadly. Not yet done.
4. Enable the (IPEX-LLM) Ollama systemd service so it starts automatically: `sudo systemctl enable --now ollama` inside the WSL2 distro — pending decision on how the IPEX-LLM build coexists with (or replaces) the currently-disabled Fedora-packaged `ollama` unit, see next step below.
5. Verify: `ollama run llama3.2:3b` responds inside WSL2 with GPU offload visible in its logs/device list — **done** (see below). `curl http://localhost:11434/api/tags` succeeds from **native Windows PowerShell** — still not tested; only tested from inside WSL2 itself. This needs a real check since both Node.js and, per the Story 7.2 MCP decision, the MCP server depend on reaching Ollama across the WSL2/Windows boundary.

### 2026-08-31 GPU spike run: what actually happened

Ran the spike scoped above. Full detail in `documets/story/spike-gpu-ollama.md`; summary:

- Fedora 44 packages the Intel GPU compute stack natively (`intel-compute-runtime`, `intel-level-zero`, `clinfo`) — installed cleanly from Fedora's own repos, no external Intel repo needed.
- Verified the passthrough chain actually works, not just installed: `clinfo` detected the real Iris Xe device (`[0x9a49]`); a Level Zero smoke test (`zello_world`) executed a real compute kernel on the GPU.
- Downloaded Intel's IPEX-LLM Ollama build (`ollama-ipex-llm-2.3.0b20250725-ubuntu.tgz`, Ubuntu-targeted, 147MB) and ran it **unmodified** on Fedora — the binary is mostly self-contained (bundles its own SYCL/MKL/Level-Zero-adapter libs), so the distro mismatch didn't matter.
- Pulled `llama3.2:3b` (this project's own configured model) and ran a real inference request. Server log: `load_tensors: offloaded 29/29 layers to GPU`, `Found 1 SYCL devices: ... Intel Graphics [0x9a49]` — unambiguous full GPU offload. (`ollama ps` misreported "100% CPU," a cosmetic bug in that build's status display — the runner's own log is authoritative and contradicts it.)
- Cleaned up: test server stopped, port 11434 confirmed free. The extracted build sits at `~/ipex-ollama-spike/ollama-ipex-llm-2.3.0b20250725-ubuntu` inside the WSL2 guest — a spike artifact, not a permanent install.

**Next step for Story 7.1 (not yet done):**

1. Decide where the IPEX-LLM build lives permanently (e.g. `/opt/ollama-ipex-llm/`) and how it relates to the currently-disabled Fedora-packaged `ollama.service` — replace it, or leave it disabled and register a new unit for the IPEX-LLM binary instead.
2. Write a systemd unit for the IPEX-LLM build (mirroring `start-ollama.sh`'s env vars: `OLLAMA_NUM_GPU=999`, `ZES_ENABLE_SYSMAN=1`, `OLLAMA_HOST=127.0.0.1:11434`, etc.) and `systemctl enable --now` it.
3. Re-verify GPU offload survives a full `wsl --shutdown` + restart cycle (this spike only tested within an already-running session).
4. Verify `curl http://localhost:11434/api/tags` succeeds from native Windows PowerShell (still open — see Work step 5 above).
5. Write `.wslconfig` (Work step 1) and generalize the concurrency gate (Work step 3) — both still outstanding, independent of the GPU work.

## Story 7.2: Process Lifecycle & MCP Server Setup

**Decided 2026-08-31 (MCP placement):** runs **natively on Windows**, alongside `server/` — not inside WSL2. This is a new placement decision (ADR16 didn't rule on MCP specifically, only on Ollama vs. the app). It means the MCP server reaches the vault directly at its native Windows path (`params.json`'s `vault_dir`) with no WSL2 mount translation needed, but it does mean MCP now depends on reaching WSL2-hosted Ollama across the Windows/WSL2 boundary the same way `server/` already does — see the unverified-forwarding note in Story 7.1 step 5 above.

**Work:**

1. Confirm Ollama's systemd unit (enabled in 7.1 step 4) starts automatically on WSL2 boot — `[boot] systemd=true` is already set, so this should just work once enabled; verify with a fresh `wsl --shutdown` + restart.
2. Install and configure the MCP server package (`@yejianye/smart-connections-mcp`) to run **natively on Windows** (npm install + a process-manager entry, not inside WSL2). It reads `params.json`'s existing `vault_dir`/`smart_env_dir`/`obsidian_vault_env_var` directly — no path translation needed since both it and the vault live on the same Windows filesystem.
3. Write a small Windows-side boot-order helper (matching this repo's existing `scripts/*.ps1` convention, e.g. alongside `ui-server.ps1`) that: confirms WSL2/Ollama is reachable at `http://localhost:11434/api/tags` (bounded retries, not indefinite), then starts the MCP server process. Structured JSON logging to stdout/file per NFR12/ADR11, matching the convention already established in `batch/worker.js`.
4. No change expected on the Node.js `server/` side — its existing `checkOllamaReachable()` per-request check already degrades gracefully if Ollama/MCP aren't up; confirm this still holds rather than adding new boot-time coupling.
5. Verify: starting the new boot-order helper brings up the MCP server correctly once Ollama is confirmed reachable; kill and restart the MCP process to confirm the log format matches convention.

## Sequencing

7.1 before 7.2 — formally "must be worked with," and 7.2's boot-order script needs 7.1's systemd-enabled Ollama service to already exist. Suggested order: 7.1 steps 1 and 4 first (config-only, no open questions blocking them), then resolve Open Questions 1–3 before touching GPU config, the concurrency gate, or MCP placement.

## Design Debt callouts

- Story 7.1/7.2's AC text in `documets/design/Project 4thBrain.md` still says "Node.js and Ollama run inside WSL2," contradicted by ADR16. Recommend a doc-only correction once this plan is executed — not a blocker to starting.
- `local-llm/CLAUDE.md`'s Status line ("Design only — no code yet") will need updating once any of this lands, consistent with similar stale-status corrections already made for `batch/CLAUDE.md` and others.

## Decisions (resolved 2026-08-31)

1. **GPU:** attempt Intel iGPU acceleration (against the plan's own CPU-only recommendation) — via Intel's IPEX-LLM Ollama build, since mainline Ollama's Intel SYCL support ([PR #11160](https://github.com/ollama/ollama/pull/11160)) is unmerged. Scoped as its own timeboxed spike (Story 7.1 step 2) with an explicit CPU-only fallback if it doesn't work cleanly — this is the highest-uncertainty part of the plan.
2. **Concurrency gate:** generalize `batch/lock-manager.js` into one shared gate for every Ollama caller (batch worker, live chat route, future classification calls), as recommended.
3. **MCP placement:** natively on Windows alongside `server/` (against the plan's own WSL2-co-location recommendation) — no vault path translation needed, but adds a new cross-boundary dependency (MCP → WSL2-hosted Ollama) that needs the same forwarding check as Node.js already relies on implicitly.
4. **`.wslconfig` memory cap:** 16GB, as recommended — leaves ~16GB headroom for Windows on this 32GB host.

## Changelog

- 2026-08-31: Created — grounded in a live probe of this session's actual host (WSL2 distro state, Ollama install/service state, GPU hardware, host RAM), not assumptions.
- 2026-08-31: Recorded user decisions on all four open questions (GPU: attempt Intel IPEX-LLM path; concurrency: generalize the gate; MCP: native Windows; RAM cap: 16GB); researched current Ollama Intel-GPU support state and updated Story 7.1/7.2's work steps to match the decisions made.
- 2026-08-31: Ran the GPU spike (`documets/story/spike-gpu-ollama.md`) — succeeded, real GPU offload confirmed via live inference. Story 7.1 moved READY → WIP (`documets/story/story-7.1.md` created). Defined the concrete next step: promote the spike build to a permanent systemd-managed install, re-verify offload survives a WSL2 restart, verify Windows→WSL2 port forwarding, then close out `.wslconfig` and the concurrency gate.
