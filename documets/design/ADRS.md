---
name: ADRS
description: Architectural Decision Records for 4thBrain
date: 2026-08-24
metadata:
  version: 1.0
  created-by: Claude Code
---

# Architectural Decision Records

Per the ADR document type (Document Type 4) defined in `documets/method/Software Documentation Summary and Framework.md`. Each record has a Description, Why, Date Created, and Date Cancelled (blank if still active). Decisions below were extracted from the existing NFR baseline (`documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md`) and from choices made during this session — none had been formally logged as ADRs before now.

## ADR1: Windows 11 host with WSL2 as the runtime environment

**Description:** Core compute (Node.js, Ollama) runs inside WSL2 on a single Windows 11 PC, not on bare Windows or a separate server.
**Why:** Keeps the system single-host and local — no cloud infrastructure, while still getting a Linux-compatible runtime for Ollama/Node tooling. Source: NFR1.
**Date Created:** 2026-08-23
**Date Cancelled:** —

## ADR2: Ollama running llama3.2 as the local inference engine

**Description:** All LLM inference (classification, tagging, briefing synthesis) runs through Ollama hosting the llama3.2 model, with GPU passthrough in WSL2.
**Why:** Zero outbound network calls and zero cloud API cost is a core project requirement (privacy-first design). Source: NFR2.
**Date Created:** 2026-08-23
**Date Cancelled:** —

## ADR3: Obsidian vault + Smart Connections as knowledge base and vector store

**Description:** Notes are stored as plain Markdown in an Obsidian-compatible vault; Smart Connections generates and maintains local vector embeddings (`.smart-env`).
**Why:** Keeps the vault human-readable and portable (plain `.md` files) while still supporting RAG retrieval, without depending on an external vector database service. Source: NFR3.
**Date Created:** 2026-08-23
**Date Cancelled:** —

## ADR4: Smart Connections MCP server exposes the vector index

**Description:** The vault's vector index is exposed to external tools (Claude Code, custom scripts) via a Model Context Protocol server over stdio/HTTP, rather than a bespoke API.
**Why:** MCP gives a standard, tool-agnostic query interface instead of building a custom retrieval API. Source: NFR4.
**Date Created:** 2026-08-23
**Date Cancelled:** —

## ADR5: Node.js as the orchestration server

**Description:** A Node.js process runs the background pipeline tasks, processing logic, and Web UI endpoints — the single orchestration layer tying modules together.
**Why:** One runtime for both backend job orchestration and serving the Web UI, avoiding a split stack. Source: NFR5.
**Date Created:** 2026-08-23
**Date Cancelled:** —

## ADR6: OpenAI-compatible SDK against Ollama's local endpoint

**Description:** Data processing scripts call Ollama via the OpenAI JS SDK pointed at `http://localhost:11434/v1`, rather than a custom Ollama client.
**Why:** Reuses a well-supported, familiar SDK interface for LLM calls instead of writing bespoke HTTP handling, while still keeping inference fully local. Source: NFR6.
**Date Created:** 2026-08-23
**Date Cancelled:** —

## ADR7: Web-based management UI hosted by the Node.js server

**Description:** The ingestion form, search interface, and monitoring dashboard are a web UI served directly by the Node.js orchestration server, not a separate frontend deployment.
**Why:** Single-host, single-process simplicity for a personal single-user system; no separate frontend server/deployment needed. Source: NFR7.
**Date Created:** 2026-08-23
**Date Cancelled:** —

## ADR8: WSL2 resource governance via `.wslconfig`

**Description:** WSL2 memory/VRAM usage is capped via `.wslconfig` (e.g., max 16GB RAM) to prevent Ollama/Node from starving the Windows host.
**Why:** Protects the host OS from OOM crashes during heavy local LLM inference, a real risk when running both inference and orchestration on one consumer machine. Source: NFR8.
**Date Created:** 2026-08-23
**Date Cancelled:** —

## ADR9: Ordered process supervision (Ollama → Node.js/MCP) via systemd/PM2

**Description:** Service startup is managed by systemd or PM2, enforcing a strict boot order: Ollama starts first, its port is confirmed available, then Node.js/MCP services initialize.
**Why:** Node/MCP services depend on Ollama being reachable; starting them out of order causes early failures. A supervised, ordered boot sequence avoids manual startup steps. Source: NFR9.
**Date Created:** 2026-08-23
**Date Cancelled:** —

## ADR10: Strict concurrency=1 queueing for local inference

**Description:** Batch payloads to Ollama are processed sequentially or via a queue with concurrency capped at 1, rather than firing concurrent inference requests.
**Why:** Local inference on consumer hardware doesn't have headroom for concurrent LLM calls — parallel requests risk memory overhead spikes or dropped HTTP sockets. Source: NFR11.
**Date Created:** 2026-08-23
**Date Cancelled:** —

## ADR11: Structured JSON logging to stdout/file

**Description:** Script execution, LLM parse failures, and MCP tool call traces are logged as structured JSON rather than freeform text logs.
**Why:** Enables failures (bad LLM JSON responses, MCP dropouts) to be logged and inspected without crashing the main server process, and keeps logs machine-parseable for future tooling. Source: NFR12.
**Date Created:** 2026-08-23
**Date Cancelled:** —

## ADR12: Fully local inference — zero cloud API calls

**Description:** All LLM inference, indexing, and processing runs locally; the system makes no outbound calls to cloud LLM APIs at runtime.
**Why:** Core privacy-first design goal stated in the Project Description — eliminates both privacy exposure and ongoing cloud API cost. Cuts across NFR2, NFR6, and the overall Project Description.
**Date Created:** 2026-08-23
**Date Cancelled:** —

## ADR13: Single repository with per-module directories, not separate subprojects

**Description:** The five functional areas (`vault/`, `local-llm/`, `ui/`, `ingestor-classification/`, `batch/`) are organized as directories within one repository, each with its own `CLAUDE.md` and `backlog.md`, rather than split into independent repos/subprojects.
**Why:** The modules are runtime-coupled (share the same WSL2/Ollama process and vault) and there's no team boundary to enforce via repo separation — for a single-user local system, separate repos would add cross-repo dependency and release overhead without a corresponding benefit. The Web UI (`ui/`) was considered as a candidate for a separate repo due to its more independent lifecycle, but was kept in-repo for now given the project's early stage.
**Date Created:** 2026-08-24
**Date Cancelled:** —

## Changelog

- 2026-08-24: Created. Backfilled ADR1–ADR12 from the existing NFR baseline; logged ADR13 for this session's module-split decision.
