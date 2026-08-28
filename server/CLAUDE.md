---
name: server-CLAUDE
description: Purpose and scope of the server module
date: 2026-08-28
metadata:
  version: 1.0
  created-by: Claude Code
---

# Server Module

## Purpose

Owns the Node.js orchestration server: the Express app that serves the Web UI, the ingestion API, the admin/table-browser tooling, and (eventually) chat-with-Llama. This is the first module with real shipped code rather than design-only artifacts — it's the runtime home for everything EP6/EP9/EP12/EP13 produce.

## Scope

- **EP6 — Unified Web Management & Search Interface** (FR7–FR9): the `/chat` single-page UI shell, ingestion form/API, status dashboard, search (not yet built).
- **EP9 — Security & Access Control** (proposed NFR13): local-only access enforcement, auth guard (Story 9.1, not yet built).
- **EP12 — Structured Data & Job Queue Persistence** (NFR15): consumes `documets/design/schema.sql` to run the SQLite metadata database (`server/4thbrain-metadata.db`) that tracks document/job lifecycle state.
- **EP13 — Admin & Monitoring Tools**: the dev-only database inspector (`/admin/db`), and the unified data-access API/repository layer (Story 13.3) it's being generalized into.

Out of scope: the actual ingestion/sanitization/classification logic that produces vault content (`ingestor-classification/`), the vector index (`vault/`), and the WSL2/Ollama host runtime itself (`local-llm/`) — `server/` calls into Ollama over HTTP but doesn't manage its process lifecycle.

## Dependencies

- Depends on `local-llm/` for the reachable Ollama HTTP endpoint (`checkOllamaReachable` in `server/config.js`), and on `documets/design/schema.sql` (owned by EP12 design, not by any module) for its database schema.
- Consumed by end users directly (it's the only user-facing surface in the repo) and by QA/dev workflows via `/admin/db`.

## Canonical Source

Full Epic/Story text: `documets/design/Project 4thBrain.md` (EP6, EP9, EP12, EP13). Requirements: `documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md` (FR7–FR9, proposed NFR13, NFR15).

## Status

Real code, not design-only — see `documets/PROJECT-SUMMARY.md` for current story-level status (don't duplicate it here, it goes stale). Stories tracked in `backlog.md`. As of this writing: Stories 6.1, 6.4, 13.1, 12.1, 12.2 shipped/done; Story 13.3 (this module's own data-access-layer redesign) in planning, see `documets/story/story-13.3.md`.
