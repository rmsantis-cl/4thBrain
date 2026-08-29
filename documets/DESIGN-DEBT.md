---
name: DESIGN-DEBT
description: Log of design gaps found mid-plan — missing Epic/Story coverage or missing design decisions — per .claude/rules/design-before-implementation.md
date: 2026-08-27
metadata:
  version: 1.0
  created-by: Claude Code
---

# Design Debt Log

Per `.claude/rules/design-before-implementation.md`: no implementation without a design and without an Epic/Story it belongs to. When planning surfaces a gap — something needed that has no Epic/Story, or no design decision behind it — it's logged here instead of implemented around. A plan isn't complete until every Design Debt item it raised is Cleared or explicitly deferred with sign-off.

| ID | Description | Raised During | Status | Resolution |
|---|---|---|---|---|
| 2 | `GET /` returns "Cannot GET /" — no route redirects the root path to `/chat`. EP6 covers the `/chat` UI shell but no Story specifies root-path behavior. | User hit `http://localhost:3000/` directly after starting the server, 2026-08-28 | Open | |

## Changelog

- 2026-08-27: Created, empty — companion log for the new design-before-implementation rule.
- 2026-08-28: Added item 2 (root path redirect to /chat).
