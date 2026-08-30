---
name: ui-style-guide
description: Claude-style design system for 4thBrain's web UI (Story 6.4)
date: 2026-08-25
metadata:
  version: 1.0
  created-by: Claude Code
---

# 4thBrain UI Style Guide

Design system for Story 6.4 (Common UI Shell), modeled on the Claude.ai desktop app's dark theme — a warm near-black background, terracotta accent, serif display heading paired with a clean sans-serif UI, and a persistent left sidebar shell with a floating input bar. Sidebar items and the input bar are relabeled for 4thBrain's own surfaces (capture, search, dashboard) rather than copied from Claude's chat-app chrome. Reference: user-supplied screenshot of the Claude.ai chat home screen.

Static mockup applying this spec: `ui/design/common-shell-mockup.html`.

## Color palette

Warm dark theme — near-black rather than neutral gray, with a single terracotta accent used sparingly.

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#191817` | App background, sidebar background |
| `--surface` | `#211f1d` | Cards, input bar, elevated panels |
| `--surface-hover` | `#2a2825` | Hover/active state for sidebar items, buttons |
| `--border` | `#34322e` | Dividers, input border |
| `--text-primary` | `#f2efe9` | Headings, primary text |
| `--text-secondary` | `#a3a099` | Sidebar labels, secondary text, placeholders |
| `--text-muted` | `#6f6c66` | Timestamps, disabled state |
| `--accent` | `#d97757` | Brand mark, active nav indicator, primary actions |
| `--accent-hover` | `#c96a4c` | Accent hover state |
| `--status-active` | `#5b9dd9` | "In progress" job indicator (dashboard) |
| `--status-done` | `#6fae7c` | "Indexed" / success status |
| `--status-failed` | `#c9645a` | "Failed" status (distinct from accent to stay readable) |

## Typography

- **Display / greeting heading:** serif (e.g. `Georgia, "Iowan Old Style", serif` as a system fallback stack) — used only for the single home-screen greeting, nowhere else. Large size (~32px), regular weight.
- **UI chrome (nav, buttons, body, forms):** sans-serif (e.g. `-apple-system, "Segoe UI", Inter, sans-serif`). Regular 14px for nav items, 13px for secondary text.
- Don't mix serif into buttons, form fields, or dashboard tables — it's reserved for the one warm/human touch on the home view, everything functional stays sans-serif.

## Spacing & shape

- Base spacing unit: 4px; component padding in multiples of 4 (8/12/16/24).
- Sidebar width: fixed 260–280px.
- Corner radius: 8px for cards/buttons, 10px for the sidebar's active-item pill, 16px for the floating input bar (it should read as one continuous rounded surface, not a plain rectangle).
- Icons: single-weight line icons, 18–20px, `--text-secondary` at rest, `--text-primary` or `--accent` on hover/active.

## Layout pattern

1. **Left sidebar** (fixed): brand mark (accent-colored icon) at top, a primary action ("+ New Capture"), then nav items — **Capture**, **Search**, **Dashboard** — each icon + label, active item gets a `--surface-hover` pill background, not just a text color change. Below nav: a scrollable "Recent" list (last few ingestion jobs, small dot + title, most recent first). Bottom: account row (avatar circle, name, local-runtime status badge) instead of Claude's subscription-plan badge.
2. **Main content area**: for the home/landing state, vertically centered greeting ("Good evening, {name}") in the serif display face, with the floating input bar below it. Other screens (search results, dashboard table) replace this centered layout with a standard top-aligned content region — the centered greeting is a home-view-only pattern, not the general page template.
3. **Floating capture bar**: rounded `--surface` panel, placeholder text describing what can be dropped in (text / link / file), a cluster of small icon buttons on the left for input type, and a compact status pill on the right (local runtime state) instead of Claude's model selector — 4thBrain has no user-facing model choice, so that slot is repurposed to show the thing that actually varies here: whether local inference is reachable.

## What NOT to copy literally

- Claude's own product nomenclature (Projects, Artifacts, Scheduled, Chat/Cowork toggle) is chat-product-specific and doesn't map onto an ingestion/search/dashboard tool — don't reuse those labels.
- The subscription plan badge ("Pro") has no equivalent in a single-user local system — repurposed as a local-runtime status indicator instead (ties to ADR2/ADR12: local-only inference).
