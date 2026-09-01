---
name: spike-ollama-permanent-install
description: Spike for Story 7.1 - promote IPEX-LLM Ollama from spike artifact to permanent systemd-managed service
date: 2026-08-31
metadata:
  version: 1.0
  created-by: Claude Code
---

# Spike: Promote IPEX-LLM Ollama to Permanent Install (Story 7.1)

Canonical story: `documets/design/Project 4thBrain.md` (EP7, Story 7.1). Context: `documets/PLAN-31-08-2026-EP7-Completion.md` and `documets/story/spike-gpu-ollama.md`.

## Summary

The GPU acceleration spike (`spike-gpu-ollama.md`) succeeded — real GPU offload verified end-to-end. However, the IPEX-LLM build currently sits in the WSL2 guest at `~/ipex-ollama-spike/ollama-ipex-llm-2.3.0b20250725-ubuntu` as a spike artifact, not a permanent install wired into systemd. This spike documents the remaining work to promote it.

## Remaining Work

### 1. Architecture decision: keep or remove Fedora's ollama package (BLOCKING)

**Context:** Ollama is installed via `sudo dnf install ollama` (Fedora package manager), which installs it to a system-managed location (`/usr/sbin/ollama` observed). The IPEX-LLM build is a separate binary that will live at `/opt/ollama-ipex-llm/` (user-controlled location).

**Open question:** Keep the Fedora-packaged `ollama.service` as a fallback, or remove it entirely?

**Options:**
- **Option A** (Recommended): Keep Fedora's `ollama` package installed (system-managed location, unchanged). Extract IPEX-LLM to `/opt/ollama-ipex-llm/`. Create a new systemd unit `ollama-ipex.service` that runs the IPEX-LLM binary from `/opt/ollama-ipex-llm/`. Leave the Fedora `ollama.service` disabled.
  - Pros: Fedora package remains as CPU-only fallback; if mainline Ollama adds Intel GPU support later, you can switch back. Clean separation.
  - Cons: Two systemd units with similar names (potentially confusing); two Ollama installs on disk.
- **Option B**: Uninstall Fedora's `ollama` package entirely via `sudo dnf remove ollama`. Extract IPEX-LLM to `/opt/ollama-ipex-llm/`. Create/modify the systemd unit to run from that location as the only Ollama install.
  - Pros: Single systemd unit, single Ollama install, no package manager conflicts.
  - Cons: Uninstalling is destructive; harder to roll back to CPU-only if IPEX-LLM fails.

**Recommendation:** Adopt Option A — it's safer (keeps the Fedora package as a fallback) and aligns with the explicit CPU-only fallback strategy noted in `spike-gpu-ollama.md`'s Abstract.

**Awaiting user decision before proceeding.**

### 2. Copy spike build to permanent location (BLOCKED by decision #1)

Once the location is decided:
```bash
# Inside WSL2 Fedora guest
sudo mkdir -p /opt/ollama-ipex-llm
sudo cp -r ~/ipex-ollama-spike/ollama-ipex-llm-2.3.0b20250725-ubuntu/* /opt/ollama-ipex-llm/
sudo chown -R root:root /opt/ollama-ipex-llm
sudo chmod +x /opt/ollama-ipex-llm/ollama /opt/ollama-ipex-llm/ollama-bin
```

### 3. Create systemd unit (BLOCKED by decision #1)

Create `/etc/systemd/system/ollama-ipex.service` with:
```ini
[Unit]
Description=Ollama IPEX-LLM (Intel GPU acceleration)
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=ollama  # create this user if needed
WorkingDirectory=/opt/ollama-ipex-llm
ExecStart=/opt/ollama-ipex-llm/ollama serve
Restart=on-failure
RestartSec=10

# Environment from spike-gpu-ollama.md's start-ollama.sh
Environment="OLLAMA_NUM_GPU=999"
Environment="ZES_ENABLE_SYSMAN=1"
Environment="OLLAMA_HOST=127.0.0.1:11434"

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ollama-ipex.service
sudo systemctl status ollama-ipex.service
```

### 4. Re-verify GPU offload survives WSL2 restart

```bash
# From native Windows PowerShell:
wsl --shutdown
# Wait a few seconds
wsl -d FedoraLinux-44 -e systemctl status ollama-ipex.service
# Should show "active (running)"
# Then from inside WSL2:
ollama run llama3.2:3b "Say OK in one word."
# Server log should show: load_tensors: offloaded 29/29 layers to GPU
```

### 5. Verify Windows → WSL2 port forwarding

```powershell
# From native Windows PowerShell:
curl http://localhost:11434/api/tags
# Should return JSON array of available models
```

If this fails, diagnose with:
```powershell
# Check WSL2 is still up:
wsl -d FedoraLinux-44 -e systemctl status ollama-ipex.service

# Check the service is actually listening inside WSL2:
wsl -d FedoraLinux-44 -e "curl -s http://localhost:11434/api/tags | head -20"
```

## Status

**Spike created** — remaining tasks are blocked on user decision for Option A vs B above. Once decided, all remaining tasks are straightforward CLI operations inside WSL2 (copy, create systemd unit, test).

## Changelog

- 2026-08-31: Created. Documented remaining work, identified blocking decision point.
