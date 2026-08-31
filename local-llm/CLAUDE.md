---
name: local-llm-CLAUDE
description: Purpose and scope of the local-llm module
date: 2026-08-31
metadata:
  version: 1.1
  created-by: Claude Code
---

# Local LLM Module

## Purpose

Owns the local inference runtime and host infrastructure everything else calls into: WSL2, Ollama, process supervision, and the MCP server boundary. This is the foundation module — nearly every other module depends on it being up and resource-bounded before it can do anything.

## Scope

- **EP7 — System Infrastructure & Host Runtime** (NFR1–NFR12): WSL2 host config, memory/GPU bounds, concurrency locks (`concurrency: 1`), process lifecycle (boot sequence, structured logging), MCP server exposure.
- **EP11 — Production Deployment & Release Management**: versioning, changelog, and rollback for releases of this runtime layer — distinct from initial host bring-up.

Out of scope: what the LLM is asked to do (classification prompts, briefing synthesis) — those live in `ingestor-classification/` and `batch/`, which call into this module's Ollama endpoint but don't own it.

## Dependencies

- Foundation module — no dependencies on other modules.
- Everything else depends on this: `vault/` (MCP server, indexing compute), `ingestor-classification/` (LLM inference calls), `batch/` (scheduled jobs run inside this runtime), `ui/` (Node.js orchestration server lives on this host).

## Canonical Source

Full Epic/Story text: `documets/design/Project 4thBrain.md` (EP7, EP11). Requirements: `documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md` (NFR1–NFR12).

## Status

Story 7.1 is WIP: a GPU-acceleration spike (2026-08-31) proved Intel iGPU offload works end-to-end in this host's real WSL2 guest (see `documets/story/spike-gpu-ollama.md`), but nothing here is a permanent install yet — `.wslconfig`, a systemd-managed Ollama service, and the generalized concurrency gate are still outstanding. See `documets/PLAN-31-08-2026-EP7-Completion.md`. Stories tracked in `backlog.md`.
