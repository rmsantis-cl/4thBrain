---
name: spike-gpu-ollama
description: Working notes for the GPU acceleration spike under Story 7.1 - Intel iGPU passthrough for Ollama in WSL2
date: 2026-08-31
metadata:
  version: 1.0
  created-by: Claude Code
---

# Spike: Intel iGPU Acceleration for Ollama in WSL2 (Story 7.1)

Canonical story text lives in `documets/design/Project 4thBrain.md` (EP7, Story 7.1). Scoped as a timeboxed spike by `documets/PLAN-31-08-2026-EP7-Completion.md` because there's no confirmed, supported path for Ollama GPU acceleration on Intel integrated graphics under WSL2 — this investigates one before committing to it.

## Abstract

This host has no discrete GPU — only an integrated Intel Iris Xe. Mainline Ollama's Intel SYCL backend is an unmerged PR ([ollama/ollama#11160](https://github.com/ollama/ollama/pull/11160)). Intel's own IPEX-LLM (an optimized Ollama/llama.cpp fork) is the more mature path. Investigate whether it can be installed and get real GPU offload working inside this host's WSL2 distro (Fedora Linux 44), with an explicit CPU-only fallback if it can't.

## Host facts (confirmed prior session)

- WSL2 distro: `FedoraLinux-44`, WSL version 2, systemd enabled.
- GPU: Intel Iris Xe integrated only. No discrete NVIDIA GPU. `nvidia-smi` not found.
- Ollama already installed at `/usr/sbin/ollama` (Fedora's own package), systemd service present but disabled/inactive.
- `/usr/lib/wsl/lib` has Microsoft's D3D12 WSL2 GPU paravirtualization libraries (`libd3d12core.so`, `libd3d12.so`, `libdxcore.so`) — present by default for any WSL2 GPU passthrough, vendor-agnostic.

## Observations

- **`/dev/dxg` is present inside the WSL2 Fedora distro** (`crw-rw-rw- 1 root root 10, 258 ... /dev/dxg`) — the Microsoft D3D12 GPU paravirtualization device node. No `/dev/dri` (expected under WSL2 — GPU compute goes through `dxg`, not native DRI render nodes). This confirms the WSL2 GPU-passthrough plumbing itself is active; what's missing is the userspace compute runtime.
- **Mainline Ollama's Intel SYCL backend is unmerged** — [ollama/ollama#11160](https://github.com/ollama/ollama/pull/11160) is still open.
- **Real, Microsoft/Intel-documented WSL2 GPU compute support exists for Intel GPUs**, confirmed via [Intel's oneAPI WSL2 configuration guide](https://www.intel.com/content/www/us/en/docs/oneapi/installation-guide-linux/2025-1/configure-wsl-2-for-gpu.html) and [intel/compute-runtime WSL.md](https://github.com/intel/compute-runtime/blob/master/WSL.md): the GPU driver stays on the **Windows** side (already installed, since Windows already drives the Iris Xe display), and only the userspace runtime (`intel-opencl-icd`, `intel-level-zero-gpu`, `level-zero`, plus media/VPL libs) needs installing **inside** the WSL2 guest. This is the officially-supported mechanism, not a hack.
- **Two genuinely different implementation paths emerged, with a real architectural fork between them:**

  **Path A — GPU-accelerated Ollama stays inside WSL2 (keeps ADR2/ADR16 intact).** Install the Level Zero/OpenCL packages above inside the Fedora WSL2 guest, then run IPEX-LLM's Ollama (Linux portable tgz, or build from source). Risk: Intel's packages and the IPEX-LLM Linux portable tgz are both **Ubuntu-targeted** — Intel ships oneAPI runtime packages via APT for Ubuntu and via their YUM/RPM repo mainly for RHEL-family; Fedora 44 isn't an explicitly listed/tested target for either, and the portable tgz is a prebuilt binary (glibc/dynamic-linker version sensitive), not something rebuilt per-distro. Real chance of hitting an unsupported-combination wall partway through.

  **Path B — GPU-accelerated Ollama runs natively on Windows, no WSL2 involved at all.** IPEX-LLM ships a [Windows portable zip](https://github.com/ipex-llm/ipex-llm/releases/tag/v2.3.0-nightly) (`start-ollama.bat`), explicitly verified on **"Intel Core Ultra processors, Intel Core 11th–14th gen processors"** — the same integrated-GPU class as this host's Iris Xe. It uses the Windows Intel graphics driver directly (already present and working, since Windows already renders through it day to day). Far lower implementation risk than Path A. **But this directly contradicts ADR2's fixed decision that Ollama runs in WSL2** (reaffirmed by ADR16 as recently as 2026-08-26) — adopting it isn't a spike-level call, it's a request to revisit a closed ADR.

- Stopping the spike here rather than picking a path unilaterally — this is exactly the kind of fork `.claude/rules/design-before-implementation.md` reserves for the user, not something to improvise mid-implementation.
- **User decided 2026-08-31: Path A (stay in WSL2, keep ADR2/ADR16 intact).**
- **Fedora 44 packages the Intel GPU compute stack natively** — no need for Intel's external APT/YUM repo. `sudo dnf install intel-compute-runtime intel-level-zero clinfo` pulled 15 packages (76MB) cleanly from Fedora's own repos.
- **Verified working, not just installed:**
  - `clinfo -l` → `Platform #0: Intel(R) OpenCL Graphics` / `Device #0: Intel(R) Graphics [0x9a49]` (0x9a49 = real Tiger Lake/Iris Xe PCI device ID — confirms it's seeing actual hardware through the `dxg` passthrough, not a stub).
  - Installed `oneapi-level-zero-zello_world` and ran it: enumerated the same device via the **Level Zero** API (the backend IPEX-LLM/SYCL actually uses, not just OpenCL) and **executed a real compute kernel on the GPU** — `"Congratulations, Executing on Driver #0, Device #0 completed execution!"`.
  - This proves the full chain (Windows Intel driver → `dxg` → WSL2 Level Zero runtime → GPU) genuinely works on this host. The remaining risk is narrower than originally scoped: not "does GPU compute work in WSL2 at all," but "does IPEX-LLM's specific Ollama build run against this now-confirmed-working runtime."

## Result: GPU offload confirmed working — spike succeeded

Downloaded `ollama-ipex-llm-2.3.0b20250725-ubuntu.tgz` (147MB, the Ubuntu-targeted release) into `~/ipex-ollama-spike/` inside the Fedora 44 WSL2 guest, extracted, ran unmodified.

- **The binary is largely self-contained** — `ldd ./ollama` shows it only depends on the base system's `libstdc++`/`libm`/`libgcc_s`/`libc`; it ships its own bundled SYCL/MKL/Level-Zero-adapter libraries (`libggml-sycl.so`, `libsycl.so.8`, `libur_adapter_level_zero.so.0`, etc.). This is why the Ubuntu-targeted build ran on Fedora without modification — it doesn't rely on the distro's own SYCL packages, only on the Level Zero *runtime* installed system-wide (which Fedora provided natively, see above).
- One rough edge: the bundled standalone `ls-sycl-device-bin` diagnostic tool failed (`libggml-cpu.so: cannot open shared object file`) when run directly — a missing CPU-variant symlink that tool expects. Not investigated further since the main `ollama`/`ollama-bin` launcher doesn't have this problem (see below) — the diagnostic tool's own launch wrapper is apparently incomplete in this release, unrelated to GPU functionality.
- Ran `./start-ollama.sh` (unmodified, as shipped), then `./ollama pull llama3.2:3b` (the project's own configured `ollama_chat_model` per `params.json`) and `./ollama run llama3.2:3b "Say OK in one word."` — a real inference request, not just a device probe.
- **Server log during actual model load — unambiguous full GPU offload:**
  ```
  load_backend: loaded SYCL backend from .../libggml-sycl.so
  llama_model_load_from_file_impl: using device SYCL0 (Intel(R) Graphics [0x9a49]) - 14782 MiB free
  load_tensors: offloading 28 repeating layers to GPU
  load_tensors: offloading output layer to GPU
  load_tensors: offloaded 29/29 layers to GPU
  Found 1 SYCL devices:
  | 0| [level_zero:gpu:0]|      Intel Graphics [0x9a49]|   12.0|     96|     512|   32| 15501M|  1.15.38646+6|
  ```
  All 29/29 model layers offloaded to the GPU via SYCL/Level Zero. The model responded correctly ("OK").
- **Known cosmetic bug, not a real problem:** `ollama ps` reported `100% CPU` for the loaded model, contradicting the runner log above. Root cause: Ollama's top-level startup probe (`gpu.go:217-218`, logged `"using Intel GPU"` then immediately `types.go:130 msg="inference compute" ... library=cpu`) runs *before* any model loads and mis-reports for this Intel-GPU build; the actual per-model runner process (a separate subprocess, `ollama-bin runner ...`) correctly detects and uses SYCL independent of that earlier probe. `ollama ps`'s PROCESSOR column reads the stale probe result, not the runner's real backend. Worth flagging upstream but doesn't affect actual inference — the runner log is authoritative and unambiguous.
- Test server stopped cleanly after the run (`pkill`, verified port 11434 no longer responds). Nothing was left running; the extracted build sits at `~/ipex-ollama-spike/ollama-ipex-llm-2.3.0b20250725-ubuntu` inside the WSL2 guest, not yet installed as the permanent service.

## Deliverable

**Achieved — working IPEX-LLM Ollama install with confirmed, full GPU offload**, running unmodified on Fedora 44 inside WSL2:

- Fedora system packages: `intel-compute-runtime`, `intel-level-zero`, `clinfo` (installed natively from Fedora's own repos, no external Intel repo needed).
- IPEX-LLM Ollama build: `ollama-ipex-llm-2.3.0b20250725-ubuntu.tgz`, extracted to `~/ipex-ollama-spike/ollama-ipex-llm-2.3.0b20250725-ubuntu` inside the WSL2 guest — currently a spike artifact, not yet promoted to the permanent install location or wired into systemd (that's Story 7.1's remaining work, not this spike's).

## ADRs Created

None — implementation-detail decision, same reasoning as Story 1.2's transcoder library choice. Story 7.1's own plan doc already covers the "how do we get GPU acceleration" question at the story level.

## TODO (for Story 7.1 proper, not this spike)

- Promote the spike's extracted build to a permanent location (e.g. `/opt/ollama-ipex-llm/`) and register it with systemd, replacing (or superseding) the currently-disabled Fedora-packaged `ollama.service` — this is genuinely a different binary/service now, needs a decision on how the two coexist (or don't).
- Report the `ollama ps` PROCESSOR-column cosmetic bug upstream (ipex-llm/ipex-llm or ollama/ollama) — low priority, doesn't block adoption.
- Re-verify GPU offload survives a full `wsl --shutdown` + restart cycle (this spike only tested within a single already-running WSL2 session).
- Confirm the model catalog needed for this project (`llama3.2:3b` per `params.json`, plus whatever Story 2.1/5.1 end up needing) all load correctly under this build — only `llama3.2:3b` was tested here.
