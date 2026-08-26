---
name: story-6.4
description: Working notes for Story 6.4 - Common UI Shell & Design System
date: 2026-08-25
metadata:
  version: 1.0
  created-by: Claude Code
---

# Story 6.4: Common UI Shell & Design System

Canonical story text lives in `documets/design/Project 4thBrain.md` (EP6). This file tracks the working context behind it.

## Abstract

Build the shared navigation shell and visual design system that Stories 6.1–6.3 render inside of.

## Observations

- Sparked by the user sharing a screenshot of the Claude.ai desktop app's dark theme and asking to design "claude-style" — rather than pick one of the three existing EP6 screens (ingestion form / search / dashboard) to skin, the user asked to factor out a fourth, shared story for the common shell those three screens sit inside of.
- Claude's own chrome (Projects, Artifacts, Scheduled, Chat/Cowork toggle, model selector) is chat-product-specific vocabulary — none of it maps onto an ingestion/search/dashboard tool, so the design borrows the *visual language* (warm dark theme, sidebar nav, serif greeting, floating rounded input bar) but relabels every component for 4thBrain's actual surfaces.
- The model-selector slot in Claude's input bar has no equivalent here (4thBrain has no user-facing model choice — inference is always local per ADR2/ADR12), so it's repurposed as a local-runtime status pill ("Ollama · llama3.2") instead.
- The floating "quick-capture" bar on the home view is a lightweight, site-wide entry point (text/link/file icon buttons) — it is not a replacement for Story 6.1's fuller multi-field ingestion form, which still owns the dedicated submission flow.
- Stories 6.1, 6.2, and 6.3 were updated to add "depends on Story 6.4" so they build on this shell rather than each inventing their own chrome.
- A first pass at implementing the actual `server/` code tried to deliver real cross-module integration (file writes into `$RAW_DIR`, real Smart Connections status, real Ollama chat) in the same step as the UI shell — corrected by the user: don't deliver the whole working application in one step, it won't work well. Scope narrowed to Story 6.4 only, with every cross-module interaction mocked; see `ui/plan.md` for the resulting plan and what's mocked vs. real.

## Deliverable

- `ui/design/STYLE-GUIDE.md` — color tokens, typography, spacing/shape rules, layout pattern, and an explicit "what not to copy literally" section.
- `ui/design/common-shell-mockup.html` — static, dependency-free HTML/CSS mockup of the shell (sidebar nav, recent-activity list, account row, greeting, capture bar). Rendered to `ui/design/common-shell-mockup-preview.png` for a quick look without opening a browser.
- `ui/plan.md` — scoped implementation plan for the actual `server/` build: Story 6.4 only, all 6 panels present, every interaction with another module mocked (canned responses, no real file I/O or Ollama calls) until that module's own story is built.

## ADRs Created

None. This is a visual design deliverable, not an architectural/technical decision — doesn't fit the ADR template (runtime/technical choices), so it stays scoped to the style guide.

## TODO

- Once Story 6.1/6.2/6.3 are actually built, verify their real content fits the shell's main-content slot (the mockup only shows the home/landing state, not a search-results or dashboard-table layout).
- Confirm serif font choice (currently a system fallback stack) once real typography/licensing preferences are decided — not blocking for a design-only phase.
