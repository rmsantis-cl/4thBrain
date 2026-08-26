---
name: INDEX
description: none
date: 2026-08-25
metadata:
  version: 1.16
  created-by: Claude Code
---

# INDEX

Tracks all artifacts, specification documents, interview logs, and foundational instruction files created or used during the development of the Personal Knowledge & Executive Assistant System. Per `.claude/rules/file-indexing.md`.

History cells are a list of `[date] comment` entries, most recent last.

| File Name | History |
| --- | --- |
| `CLAUDE.md` | [2026-08-24] Created via /init from documets/design and documets/Interviews<br>[2026-08-24] Updated — added module directories to Repository Structure, EP8–EP11 to baseline, and Module Map table |
| `documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md` | [2026-08-24] Present at INDEX creation (pre-existing, no header) |
| `documets/design/Project 4thBrain.md` | [2026-08-24] Present at INDEX creation (pre-existing, no header)<br>[2026-08-24] Added EP8–EP11 (QA/Testing, Security, Backup/Recovery, Release Management) per Phase 4 gap analysis<br>[2026-08-25] Updated Story 1.1/1.2 with dictated ingestion directory layout ($RAW_DIR, $VAULT_DIR/incoming, $RAW_DIR/clipping, $VAULT_DIR/raw), cross-referencing new ADR14<br>[2026-08-25] Updated Story 2.1 with topic/subtopic-driven vault path and sibling attachment directory behavior, cross-referencing new ADR15<br>[2026-08-25] Added Spike 3.2 under EP3 — Smart Connections indexing status retrieval, Status: Done<br>[2026-08-25] Revised Spike 3.2 findings after user supplied the in-app "Smart Environment" panel screenshots — corrected terminology to current/missing/skipped/unexpected, added block-level stats<br>[2026-08-25] Added Story 6.4 (Common UI Shell & Design System) under EP6; added it as a dependency of Story 6.1/6.2/6.3 |
| `documets/design/Gantt Chart.md` | [2026-08-24] Present at INDEX creation (pre-existing, no header) |
| `documets/Interviews/PHASE-1.1-INTERVIEW.md` | [2026-08-24] Present at INDEX creation (pre-existing, no header) |
| `documets/Interviews/PHASE-4.1-TRANSCRIPT.md` | [2026-08-24] Present at INDEX creation (pre-existing, no header) |
| `documets/method/Software Documentation Summary and Framework.md` | [2026-08-24] Header inserted, version 14 |
| `documets/method/BOOT.tar` | [2026-08-24] Found archived (tar) in place of BOOT.md, MD-MEMORY-INSTRUCTIONS.md, and the dictation guidelines file; origin unconfirmed, indexed as opaque archive |
| `.claude/rules/file-format.md` | [2026-08-24] Split out of former boot.md |
| `.claude/rules/file-protection.md` | [2026-08-24] Split out of former boot.md |
| `.claude/rules/file-versioning.md` | [2026-08-24] Split out of former boot.md |
| `.claude/rules/file-indexing.md` | [2026-08-24] Split out of former boot.md |
| `.claude/skills/dictation/SKILL.md` | [2026-08-24] Created from documets/method dictation guidelines |
| `documets/PLAN.md` | [2026-08-24] Created — Phase 4 status, EP1–EP11 summary, open scope-lock items |
| `vault/CLAUDE.md` | [2026-08-24] Created — module purpose/scope (EP3, EP10) |
| `vault/backlog.md` | [2026-08-24] Created — story backlog for vault module<br>[2026-08-25] Added Spike 3.2 row (Done) |
| `vault/check_smart_connections_status.py` | [2026-08-25] Created — Spike 3.2 deliverable: reports Smart Connections indexed/pending/excluded totals and per-note status from smart_sources.ajson<br>[2026-08-25] Rewritten to match native Smart Environment panel terminology (current/missing/skipped/unexpected) with skip-reason detection and Sources+Blocks totals; verified numbers match the panel exactly |
| `local-llm/CLAUDE.md` | [2026-08-24] Created — module purpose/scope (EP7, EP11) |
| `local-llm/backlog.md` | [2026-08-24] Created — story backlog for local-llm module |
| `ui/CLAUDE.md` | [2026-08-24] Created — module purpose/scope (EP6, EP9) |
| `ui/backlog.md` | [2026-08-24] Created — story backlog for ui module<br>[2026-08-25] Added Story 6.4 row; added Story 6.4 as a dependency of 6.1/6.2/6.3 |
| `ui/design/STYLE-GUIDE.md` | [2026-08-25] Created — Claude-style design system for Story 6.4 (color tokens, typography, layout pattern) |
| `ui/design/common-shell-mockup.html`, `ui/design/common-shell-mockup-preview.png` | [2026-08-25] Created — static HTML/CSS mockup of the common UI shell and its rendered preview |
| `ingestor-classification/CLAUDE.md` | [2026-08-24] Created — module purpose/scope (EP1, EP2) |
| `ingestor-classification/backlog.md` | [2026-08-24] Created — story backlog for ingestor-classification module |
| `batch/CLAUDE.md` | [2026-08-24] Created — module purpose/scope (EP4, EP5, EP8) |
| `batch/backlog.md` | [2026-08-24] Created — story backlog for batch module |
| `documets/design/ADRS.md` | [2026-08-24] Created — ADR1–ADR12 backfilled from NFR baseline, ADR13 logged for module-split decision<br>[2026-08-25] Added ADR14 — ingestion directory layout ($RAW_DIR / $VAULT_DIR/incoming / $RAW_DIR/clipping / $VAULT_DIR/raw)<br>[2026-08-25] Added ADR15 — topic/subtopic-driven vault path resolution and sibling attachment directories |
| `MEMORY.md` | [2026-08-24] Created — seeded from current project state per md-memory.md |
| `params.json` | [2026-08-25] Created at vault/params.json — vault_dir and Smart Connections params<br>[2026-08-25] Moved to project root |
| `vault/Instructions.md` | [2026-08-25] Created — Smart Connections install/config guide<br>[2026-08-25] Updated — params.json path reference |
| `documets/design/classes.md` | [2026-08-25] Created — Document/Status/Classification/Job class definitions transcribed from user-supplied Class_Definitions_Specification.rtf |
| `documets/design/classes.mmd` | [2026-08-25] Created — Mermaid class diagram for Document/Status/Classification/Job |
| `vault/validate_smart_connections.py` | [2026-08-25] Created — install validation script |
| `vault/Obsidian-refs/Obsidian-MCP-Capabilities-Summary.md` | [2026-08-25] Created — summary of Obsidian REST API/MCP and Smart Connections capabilities, framed for EP3/EP10 |
| `documets/INGESTION-FLOW.md` | [2026-08-25] Created — ingestion/classification flow narrative referencing img/ingestion-flow.png and img/classification-flow.png |
| `documets/img/ingestion-flow.mmd`, `documets/img/ingestion-flow.png` | [2026-08-25] Created — Mermaid source and rendered PNG for the ingestion flow diagram |
| `documets/img/classification-flow.mmd`, `documets/img/classification-flow.png` | [2026-08-25] Created — Mermaid source and rendered PNG for the classification flow diagram |
| `documets/story/story-1.1.md` | [2026-08-25] Created — abstract, observations, ADR14 reference, TODO placeholder |
| `documets/story/story-1.2.md` | [2026-08-25] Created — abstract, observations, ADR14 reference, TODO placeholder |
| `documets/story/story-2.1.md` | [2026-08-25] Created — abstract, observations, ADR15 reference, TODO placeholder |
| `documets/story/spike-3.2.md` | [2026-08-25] Created — abstract, investigation findings, deliverable, TODO follow-ups<br>[2026-08-25] Updated with native Smart Environment panel findings and revised current/missing/skipped/unexpected terminology |
| `documets/story/story-6.4.md` | [2026-08-25] Created — abstract, observations, deliverable (style guide + mockup), TODO follow-ups |
