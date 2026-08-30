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
| 2 | `GET /` returns "Cannot GET /" — no route redirects the root path to `/chat`. EP6 covers the `/chat` UI shell but no Story specifies root-path behavior. | User hit `http://localhost:3000/` directly after starting the server, 2026-08-28 | Open | Addressed in Story 13.2 (root redirect part of the admin-menu refactor) |
| 3 | `spike-webclipping.md` unresolved — no URL-fetch library chosen | PLAN-29-08-2026 ingestion pipeline design | Open (deferred) | Clipper handler mocked in Phase 2 (implemented PLAN-29-08-2026, 2026-08-29); real Clipper deferred to later phase |
| 4 | `spike-extraction.md` unresolved for OCR/document-parsing (PDF, image, DOCX) — no library chosen | PLAN-29-08-2026 ingestion pipeline design | Partial | Real archive Extractor (ZIP/TAR/`.Z`) implemented Phase 2 (PLAN-29-08-2026, 2026-08-29); PDF/image/DOCX extraction remains mocked |
| 5 | No committed vault-note frontmatter schema anywhere in `documets/` | PLAN-29-08-2026 ingestion pipeline design | Cleared | Frontmatter schema implemented in Phase 3 (PLAN-29-08-2026, 2026-08-29): `title`, `tags`, `topic`, `subtopic`, `source`, `created`, `original` fields |
| 6 | `documets/story/story-4.1-plan.md` lives under `documets/story/`, not `documets/design/` — doesn't satisfy the letter of the design-before-implementation rule | PLAN-29-08-2026 ingestion pipeline design | Open | Flag for promotion to design doc or explicit sign-off that story-level plans count; not blocking Phase 1 |
| 7 | `Ingestion-State-Diagram.md`'s `VAULT_NOTES` (too-short text bucket) has no `params.json`/`classification` seed entry | PLAN-29-08-2026 ingestion pipeline design | Cleared | Phase 2 implemented default `$VAULT_DIR/notes` (PLAN-29-08-2026, 2026-08-29) |
| 8 | `schema.sql` seeds `DOCUMENT_ROOT`, unreferenced by ADR/story; narrative docs say `VAULT_TREE` — naming conflict | PLAN-29-08-2026 ingestion pipeline design | Open | Phase 3 treats `DOCUMENT_ROOT` ≈ vault_dir itself; reconcile naming later, not blocking Phase 2 |

## Changelog

- 2026-08-27: Created, empty — companion log for the new design-before-implementation rule.
- 2026-08-28: Added item 2 (root path redirect to /chat).
- 2026-08-29: Added items 3–8 from PLAN-29-08-2026 (ingestion pipeline design); documented as "Open (deferred)" or "Partial" per implementation plan's phased approach.
- 2026-08-29: Marked items 5 & 7 as Cleared (frontmatter schema and VAULT_NOTES implemented in PLAN-29-08-2026 implementation phases 2-3).
