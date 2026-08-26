---
name: ADRS
description: Architectural Decision Records for 4thBrain
date: 2026-08-25
metadata:
  version: 1.1
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

## ADR14: Ingestion directory layout ($RAW_DIR staging vs. $VAULT_DIR/incoming and /raw)

**Description:** Inbound files land in `$RAW_DIR` (outside the vault). Text/MD/HTML — already indexable — are copied directly to `$VAULT_DIR/incoming`. URLs are moved to `$RAW_DIR/clipping` for extraction. Other binary formats are transcoded into MD/text; the transcoded output is written to `$VAULT_DIR/incoming` and the original binary is archived to `$VAULT_DIR/raw`, with the transcoded file referencing that archived location.
**Why:** Binary files can't be indexed until transcoded, so they must not enter the vault (which drives Smart Connections indexing, per ADR3) before conversion completes. Separating pre-vault staging (`$RAW_DIR`) from the indexable queue (`$VAULT_DIR/incoming`) and archived originals (`$VAULT_DIR/raw`) keeps the vault free of un-indexable content while preserving traceability back to source files. Source: FR1, FR2, Story 1.1, Story 1.2.
**Date Created:** 2026-08-25
**Date Cancelled:** —

## ADR15: Topic/subtopic-driven vault path with sibling attachment directories

**Description:** During classification, the local LLM infers a topic/subtopic in addition to tags — this topic/subtopic pair, not the tags, determines the target vault subfolder a note is filed into. If a note references images, documents, or other files, those referenced files are placed in a sibling directory next to the note (not inline in `VAULT_DIR/incoming` or mixed into the note's own path), so a note and its attachments travel together.
**Why:** Tags describe *what a note is about* for search/retrieval, but filing needs a single deterministic path — topic/subtopic gives a stable, hierarchical basis for that, decoupled from the (multi-valued, LLM-assisted) tag set. Keeping attachments in a sibling directory avoids collisions between unrelated notes' attachments and keeps a note's referenced files discoverable and easy to move/archive together with it. Source: FR3, Story 2.1.
**Date Created:** 2026-08-25
**Date Cancelled:** —

## ADR16: Where does each component run — WSL2 vs. any environment? (OPEN — not yet decided)

**Status:** Open — no decision made yet.
**Abstract:** Ollama must run in WSL2 (fixed, per ADR2); the ingestion/search app can run anywhere. Whether Obsidian should also run in WSL2 is open — colocating everything in one OS could simplify a future single-container Docker image (EP11).
**Full record, constraints, and Obsidian-in-WSL2 research:** see `documets/design/adr16-component-placement.md`.
**Date Created:** 2026-08-25
**Date Cancelled:** —

## Changelog

- 2026-08-24: Created. Backfilled ADR1–ADR12 from the existing NFR baseline; logged ADR13 for this session's module-split decision.
- 2026-08-25: Logged ADR14 for the ingestion directory layout ($RAW_DIR / $VAULT_DIR/incoming / $RAW_DIR/clipping / $VAULT_DIR/raw), dictated by the user for Story 1.1/1.2.
- 2026-08-25: Logged ADR15 for topic/subtopic-driven vault path resolution and sibling attachment directories, dictated by the user for Story 2.1.
- 2026-08-25: Logged ADR16 (open) for component-to-environment placement — WSL2 vs. any environment — with the open question of whether Obsidian itself can run in WSL2, raised by the user re: future Docker packaging.
- 2026-08-25: Split ADR16's full record into `adr16-component-placement.md`; this file now holds only the abstract and a reference. Added research confirming Obsidian can run natively in WSL2 via WSLg.
