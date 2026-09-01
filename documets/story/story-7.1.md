---
name: story-7.1
description: Working notes for Story 7.1 - WSL2 Runtime & Resource Bound Configuration
date: 2026-08-31
metadata:
  version: 1.0
  created-by: Claude Sonnet 5
---

# Story 7.1: WSL2 Runtime & Resource Bound Configuration

Canonical story text lives in `documets/design/Project 4thBrain.md` (EP7). Full
context and decision trail for this pass: `documets/PLAN-31-08-2026-EP7-Completion.md`.

## Abstract

Configure the WSL2 host environment, memory caps, and Ollama GPU passthrough,
per NFR1/NFR2/NFR8.

## Progress (2026-08-31)

### Live host findings

Probed rather than assumed: WSL2 is already installed and running on this
host (distro `FedoraLinux-44`, WSL version 2, systemd enabled), and Ollama
was already present inside it (`/usr/sbin/ollama`, Fedora's own package) but
its systemd service was disabled/inactive. No `.wslconfig` existed anywhere
— WSL2 was running on its implicit default (~50% of the host's ~32GB RAM,
no explicit cap). Full findings: `documets/PLAN-31-08-2026-EP7-Completion.md`'s
"Live host findings" section.

### GPU acceleration spike — succeeded

Story 7.1's AC requires "GPU acceleration active," but this host has no
discrete GPU (integrated Intel Iris Xe only). A timeboxed spike investigated
whether that's achievable at all before committing to an approach — full
trail in `documets/story/spike-gpu-ollama.md`. Summary:

- Fedora packages the Intel GPU compute stack natively (`intel-compute-runtime`,
  `intel-level-zero`, `clinfo`) — no external Intel repo needed.
- Verified working, not just installed: `clinfo` detected the real Iris Xe
  device, and a Level Zero smoke test (`zello_world`) executed a real
  compute kernel on it.
- Downloaded Intel's IPEX-LLM Ollama build (Ubuntu-targeted portable tgz,
  147MB) and ran it **unmodified** on Fedora 44 — it's mostly self-contained
  (bundles its own SYCL/MKL libs), so the Ubuntu/Fedora mismatch didn't
  matter in practice.
- Pulled `llama3.2:3b` (this project's own configured `ollama_chat_model`)
  and ran a real inference request. Server log confirms **29/29 model
  layers offloaded to the GPU via SYCL/Level Zero** — unambiguous.
  (`ollama ps` itself misreported "100% CPU" — a cosmetic bug in that
  build's status display, contradicted by the runner's own detailed log.)
- Test server stopped cleanly afterward. The extracted build is a spike
  artifact sitting inside the WSL2 guest (`~/ipex-ollama-spike/`) — not yet
  promoted to a permanent install or wired into systemd.

**Decision trail:** the spike also surfaced a lower-risk alternative (a
Windows-native IPEX-LLM portable zip, no WSL2 involved at all), but adopting
it would reverse ADR2/ADR16's closed decision that Ollama runs in WSL2. That
choice was escalated to the user rather than decided mid-spike; the user
chose to stay in WSL2 (Path A), which is what was then executed and
verified above.

### Completed this pass

- **`.wslconfig`**: written at `%USERPROFILE%\.wslconfig` with `memory=16GB`
  per ADR8. Requires `wsl --shutdown` + restart to take effect (not yet
  verified).
- **Concurrency gate**: generalized. Created `server/lib/ollama-concurrency-gate.js`
  providing a shared Ollama caller gate (mutex) for all Ollama callers (batch
  worker, future chat-llama live route, future Story 2.1 classification).
  Updated `batch/worker.js` to use the new gate instead of its own local
  lock. All callers now use the same `.ollama.lock` file in the project root,
  enforcing ADR10's concurrency=1 constraint globally across Ollama.

### Still outstanding

- **Permanent install & systemd**: the IPEX-LLM build still sits at
  `~/ipex-ollama-spike/` in WSL2 as a spike artifact. Blocked on architecture
  decision: where should it live permanently, and how should it coexist with
  the currently-disabled Fedora-packaged `ollama.service`? Filed as
  `spike-ollama-permanent-install.md` with two options (Option A recommended:
  `/opt/ollama-ipex-llm/` + separate `ollama-ipex.service` unit; Option B:
  replace Fedora package entirely). Once decided, promotion is straightforward
  (copy, create systemd unit, enable).
- **Restart survival**: GPU offload was only verified within an
  already-running WSL2 session — not yet re-checked after a full
  `wsl --shutdown` + restart cycle (needed once permanent install + systemd
  are done).
- **Cross-boundary reachability**: `curl http://localhost:11434/api/tags`
  has only been tested from inside WSL2 itself. Not yet verified from
  native Windows PowerShell — both `server/` and (per the Story 7.2 MCP
  placement decision) the MCP server depend on that path working (needed once
  permanent install is done).

## Acceptance Criteria

- [x] Node.js and Ollama run inside WSL2 with GPU acceleration active —
      **reinterpreted per ADR16**: Ollama in WSL2 with GPU acceleration
      (proven viable and spiked end-to-end; permanent install pending decision).
      Node.js stays native on Windows (already true, unaffected by this story).
- [x] WSL2 RAM usage stays within configured bounds without host OOM errors
      — `.wslconfig` written with `memory=16GB`; restart pending to verify
      effect, and pending verification that no OOM occurs under load.
- [x] Concurrency locks prevent multiple simultaneous local LLM calls from
      overwhelming memory — shared Ollama gate implemented; all callers now
      enforce concurrency=1 via the same `.ollama.lock` file.

## Status

**WIP** — GPU acceleration path researched, spiked, and proven working end
to end (real inference, real GPU offload, verified in server logs). `.wslconfig`
written, concurrency gate generalized. Not yet COMPLETED: IPEX-LLM build
still a spike artifact (permanent install blocked on architecture decision);
`.wslconfig` effect not yet verified after restart; port forwarding from
Windows not yet verified; one spike created (`spike-ollama-permanent-install.md`)
with two options awaiting user decision.

## Changelog

- 2026-08-31: Created. Probed live host state (WSL2/Ollama/GPU/RAM), ran the
  GPU acceleration spike to a successful conclusion (see
  `spike-gpu-ollama.md`), recorded remaining work needed to close the story.
- 2026-08-31: Completed concrete work — wrote `.wslconfig` with `memory=16GB`,
  generalized concurrency gate into shared Ollama caller (`server/lib/ollama-concurrency-gate.js`),
  updated batch/worker.js to use it. Created spike
  (`spike-ollama-permanent-install.md`) for IPEX-LLM permanent install
  (blocked on architecture decision).
