---
name: ui-plan
description: Implementation plan for Story 6.4 (Common UI Shell) — scoped narrowly, all cross-module interactions mocked
date: 2026-08-25
metadata:
  version: 1.0
  created-by: Claude Code
---

# UI Module — Story 6.4 Implementation Plan

## Scope

This plan covers **only Story 6.4: Common UI Shell & Design System** — the shared left-nav/right-pane shell, styled per `ui/design/STYLE-GUIDE.md`. It does not implement Story 6.1 (ingestion), 6.3 (dashboard), or 6.5 (chat) — those are separate stories with their own plans, built later. Every interaction this shell has with another module is mocked in this pass.

## Why scoped this way

An earlier attempt at this tried to deliver a fully working end-to-end server in one step — real file writes into `$RAW_DIR`, real Smart Connections status parsing, real Ollama chat calls — all in the same pass as the UI shell itself. That depends on Stories 1.1, 1.2, 3.1, 7.1, 7.2, etc., none of which are built yet. Per explicit direction: don't try to deliver the whole working application in one step, it won't work well. Build and validate the shell first; wire in each real module only when that module's own story is actually being built.

## What's real vs. mocked in this pass

| Panel | This pass (Story 6.4) | Real implementation (later story) |
| --- | --- | --- |
| Add file | UI form; POSTs to a stub endpoint that returns a canned `{ jobId }` after a short artificial delay — no disk writes | Story 6.1 — writes to `$RAW_DIR/inbox` per ADR14 |
| Add text | UI form; POSTs to a stub endpoint, canned response | Story 6.1 |
| Add url | UI form; POSTs to a stub endpoint, canned response | Story 6.1 (ADR14 clipping path, `$RAW_DIR/clipping`) |
| Ingest status | Static, hardcoded sample data rendered in the dashboard view (fixed counts, a couple of fake skipped items) | Story 6.3, using `server/lib/smart-connections-status.js` (already ported from the Spike 3.2 Python script, not wired into any route yet) |
| Chat with Llama | UI chat widget; POSTs to a stub endpoint returning a canned scripted reply | Story 6.5 — real Ollama call via the `openai` SDK against `http://localhost:11434/v1` |
| Chat with Claude | Disabled "coming soon" placeholder — no request ever fires, per ADR12 | Out of scope indefinitely (user decision, logged in `documets/story/story-6.4.md`) |

## Server, this pass

- `GET /chat` — the only GET route in the app; returns one fully self-contained HTML/CSS/JS document (no separate asset requests).
- A stub POST route per panel action above (file/text/url/status/llama-chat), each returning a hardcoded JSON payload with a small artificial delay so loading states are visible in the UI — no filesystem writes, no `.smart-env` reads, no Ollama calls.
- `server/config.js` and `server/lib/smart-connections-status.js` (already written) stay in the repo but are **not called by any route yet** — they're reserved for Story 6.3/6.5 to wire in for real.
- No auth (Story 9.1, still To Do) — this server is `127.0.0.1`-only and unauthenticated, same known gap as before, just smaller blast radius now since nothing it does is real yet.

## UI, this pass

Left nav with 6 items — Add file, Add text, Add url, Ingest status, Chat with Llama, Chat with Claude — each rendering its own view in the right pane. Styled per `ui/design/STYLE-GUIDE.md`, reusing `ui/design/common-shell-mockup.html`'s CSS tokens and component patterns directly. Mobile-friendly: left panel collapses by default under a narrow viewport, toggled open/closed by a button click.

## Explicitly out of scope for this pass

- Any real read/write to `$RAW_DIR`, `.smart-env`, or Ollama.
- Search (Story 6.2 — not one of the 6 panel items at all).
- Auth (Story 9.1).

## Next steps, after this lands

1. Story 6.1 — swap the add-file/add-text/add-url stubs for real `$RAW_DIR` writes.
2. Story 6.3 — swap the ingest-status mock for a real call into `server/lib/smart-connections-status.js`.
3. Story 6.5 — swap the Llama chat stub for a real Ollama call via the `openai` SDK.
