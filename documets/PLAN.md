---
name: PLAN
description: Master project planning and tracking document for 4thBrain
date: 2026-08-24
metadata:
  version: 1.0
  created-by: Claude Code
---

# 4thBrain — Master Project Plan

## 1. Lifecycle Phase Reference

Per `documets/method/Software Documentation Summary and Framework.md`:

| # | Phase Name | Status |
| --- | --- | --- |
| 1 | Requirement Collection | Complete |
| 2 | Requirement Review & Technical Formalization | Complete |
| 3 | Stakeholder Clarification & Scope Lock | Complete (implicit — SRS/Epics doc marked Approved/Baseline) |
| 4 | Epic Creation | Complete (EP1–EP7 baseline); extended with EP8–EP11 (see §4) |
| 5 | Story Creation, Development Cycle, Release & UAT | Not started (all Stories = To Do) |
| 6 | Post-Release Technical Gap Analysis & Action Strategy | Not started |
| 7 | Final Buy-off & Production Deployment | Not started |
| 8 | Maintenance and Operation | Not started |

## 2. Phase 4 Definition (for reference)

**Phase 4: Epic Creation**
- Team Collaboration Meeting: Architect, program manager, developers, and IT collaborate to define project scope into Epics.
- List Finalization: Team finalizes the list of Epics covering all requirements.
- Exit Criteria: Having enough defined Epics to begin execution.

## 3. Baseline Epics (EP1–EP7)

Source: `documets/design/Project 4thBrain.md`.

| Epic | Title | Associated Requirements | Depends On |
| --- | --- | --- | --- |
| EP1 | Core Ingestion & Sanitization Pipeline | FR1, FR2 | EP7 |
| EP2 | Automated Tagging & Classification Engine | FR3 | EP1 |
| EP3 | Local Vector Indexing & MCP Integration | FR4 | EP1 |
| EP4 | Overnight Batch Processing Engine | FR5 | EP1, EP2 |
| EP5 | Proactive Daily Briefing Pipeline | FR6 | EP2, EP4 |
| EP6 | Unified Web Management & Search Interface | FR7, FR8, FR9 | EP1, EP3, EP4 |
| EP7 | System Infrastructure & Host Runtime | NFR1–NFR12 | Foundation (none) |

Stories and schedule: see `documets/design/Project 4thBrain.md` and `documets/design/Gantt Chart.md`.

## 4. Additional Epics Added This Session (EP8–EP11)

Identified via gap analysis against the framework's document taxonomy (QA/Bug Tracking, cross-cutting NFR concerns) and appended to `documets/design/Project 4thBrain.md`.

| Epic | Title | Associated Requirements | Depends On |
| --- | --- | --- | --- |
| EP8 | QA, Testing Harness & Bug/Issue Tracking | Cross-cutting (validates FR1–FR9, NFR1–NFR12) | EP7 |
| EP9 | Security & Access Control | Gap — proposed NFR13 | EP6, EP7 |
| EP10 | Vault Backup, Integrity & Recovery | Extends NFR10 — proposed NFR14 | EP3, EP4 |
| EP11 | Production Deployment & Release Management | Extends EP7 into Phase 6/7 | EP7, EP8 |

Full Epic/Story detail lives in `documets/design/Project 4thBrain.md` alongside EP1–EP7.

## 5. Open Items Requiring Scope Lock (Phase 3 revisit)

- **NFR13 (proposed): Authentication & Local Access Control** — needed to give EP9 a formal source for inherited acceptance criteria.
- **NFR14 (proposed): Backup & Recovery** — needed to give EP10 a formal source for inherited acceptance criteria.
- No ADR (Architectural Decisions, Document Type 4) log exists yet despite decisions already made (Ollama/llama3.2, Node.js orchestration, Smart Connections MCP, WSL2 host). Recommend starting an `ADR1...ADRn` log.
- Two lower-confidence gaps flagged but not turned into epics: Email/Calendar Integration (credential/OAuth handling assumed as an input to EP5), and Onboarding/Configuration UX (first-run vault path, taxonomy setup).

## 6. Source Documents

- `documets/method/Software Documentation Summary and Framework.md` — process/document taxonomy
- `documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md` — FR1–FR9, NFR1–NFR12
- `documets/design/Project 4thBrain.md` — EP1–EP11 (baseline + this session's additions), Stories
- `documets/design/Gantt Chart.md` — story schedule/dependencies
- `documets/Interviews/PHASE-1.1-INTERVIEW.md`, `documets/Interviews/PHASE-4.1-TRANSCRIPT.md`
- `CLAUDE.md` — repo/process orientation

## Changelog

- 2026-08-24: Created. Documents Phase 4 status and records EP8–EP11 added to `Project 4thBrain.md` this session.
