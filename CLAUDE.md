# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**4thBrain** (a.k.a. the Personal Knowledge & Executive Assistant System) is currently in the design/requirements phase — the repository holds no application code yet. It contains the Claude Code automation framework used to *drive* the design process (skills, rules) plus the requirements/design artifacts those skills produce and consume.

The target system being designed: a privacy-first, locally hosted "second brain" that captures unstructured ideas, voice-to-text transcripts, links, documents, and email/calendar feeds; sanitizes, classifies, and indexes everything overnight via a local LLM into a human-readable Obsidian-compatible Markdown vault plus a local RAG vector database; and proactively surfaces relevant notes, daily briefings, and prioritized email summaries — with all inference running locally (Ollama/WSL2) and zero cloud API cost or outbound calls.

## Repository Structure

- **`documets/design/`** — baseline specs: `SYSTEM-REQUIREMENTS-SPECIFICATION.md` (FR1–FR9, NFR1–NFR12), `Project 4thBrain.md` (Epics EP1–EP11 and Stories), `Gantt Chart.md` (story schedule/dependencies), `ADRS.md` (ADR1–ADR13).
- **`documets/PLAN.md`** — master plan: lifecycle phase status, EP1–EP11 summary, open scope-lock items.
- **`vault/`, `local-llm/`, `ui/`, `ingestor-classification/`, `batch/`** — the five functional modules, each with its own `CLAUDE.md` (purpose/scope/dependencies) and `backlog.md` (story status). See the Module Map below. Full story text stays canonical in `documets/design/Project 4thBrain.md`; the per-module files are thin views onto it.
- **`documets/Interviews/`** — phase interview transcripts capturing requirements discovery.
- **`documets/method/`** — the process framework itself: `BOOT.md` (file-header/versioning protocol), `MD-MEMORY-INSTRUCTIONS.md` (`/MEMORY.md` maintenance rules), `Software Documentation Summary and Framework.md` (the document-type taxonomy and phase-by-phase software lifecycle this project follows — Requirement Collection → Formalization → Scope Lock → Epics → Stories/Dev/Release → Post-Release Gap Analysis → Buy-off → Maintenance), `Driving Dictation Prompt and Guidelines.md` (source for the `dictation` skill).
- **`.claude/skills/`** — `b4-research` (cited web research into the Obsidian vault), `dictation` (hands-free dictation interaction protocol), `install-smart-connection`, `roast`, `surprise-me`.
- **`.claude/rules/`** — `boot.md`, `md-memory.md`, `scrapper.md`, `shell.md`, `write-properly.md`.
- **`.backup/v2/`** — prior repository contents (an earlier, code-oriented iteration of this project: `Generated/`, `styles/`, prior `CLAUDE.md`/`README.md`/`TODO.md`/`HANDOUT.md`, batch-queue plans, `.mcp.json`) preserved during a cleanup; not part of the active tree.

## Document Framework Conventions

Per `documets/method/Software Documentation Summary and Framework.md`, project artifacts follow a fixed taxonomy and coding scheme — use these codes/prefixes when creating or referencing requirements docs:

- **FRn** — Functional Requirements (Code, Name, Abstract, Description, Priority [MVP/Good-to-Have/Desired], Acceptance Criteria)
- **NFRn** — Non-Functional Requirements (runtime/environment constraints)
- **ADRn** — Architectural Decisions (Description, Why, Date Created, Date Cancelled)
- **EPn** — Epics (group FRs/NFRs, inherit their acceptance criteria)
- **Story n** — Stories under an Epic (Abstract, Description, Acceptance Criteria, Status)
- **Bug n / Issue n** — Testing & bug tracking

Any file carrying a YAML file header (`---`-delimited block at the top with `name`/`description` required fields) is governed by `.claude/rules/boot.md`: files marked `read-only: true` must never be modified/deleted; new files without a header get one inserted; updates bump `metadata.version` and the `date` field.

## Current Baseline (as of 2026-08-24)

Eleven epics (EP1–EP7 baseline, EP8–EP11 added via gap analysis), all stories currently `To Do`:

- **EP7** (System Infrastructure & Host Runtime) is the foundation — WSL2 + Ollama + MCP server setup — and gates nearly everything else.
- **EP1** (Ingestion & Sanitization) depends on EP7.
- **EP2** (Tagging/Classification) and **EP3** (Vector Indexing/MCP) depend on EP1.
- **EP4** (Overnight Batch Processing) depends on EP1 + EP2.
- **EP5** (Daily Briefing) depends on EP2 + EP4.
- **EP6** (Web UI — ingestion form, search, dashboard) depends on EP1, EP3, EP4.
- **EP8** (QA/Testing & Bug Tracking), **EP9** (Security & Access Control), **EP10** (Vault Backup & Recovery), **EP11** (Release Management) — cross-cutting additions; EP9 and EP10 reference proposed NFR13/NFR14, pending a Phase 3 scope-lock pass.

See `documets/design/Gantt Chart.md` for exact story-level day scheduling and dependency types (Depends on / Must be worked with), and `documets/PLAN.md` for overall phase status.

## Module Map

| Module | Owns | Depends on |
| --- | --- | --- |
| `vault/` | EP3 (vector indexing/MCP), EP10 (backup/recovery) | `local-llm/` |
| `local-llm/` | EP7 (WSL2/Ollama/MCP host), EP11 (release mgmt) | none — foundation |
| `ui/` | EP6 (web ingestion/search/dashboard), EP9 (auth) | `ingestor-classification/`, `vault/`, `batch/`, `local-llm/` |
| `ingestor-classification/` | EP1 (ingestion/sanitization), EP2 (tagging) | `local-llm/`, `vault/` |
| `batch/` | EP4 (overnight processing), EP5 (daily briefing), EP8 (QA/testing — cross-cutting) | `ingestor-classification/`, `local-llm/`, `vault/` |

## Working in This Repository

- No build/lint/test commands exist yet — there is no application code to run.
- When advancing the project from design to implementation, follow the phase sequence defined in `documets/method/Software Documentation Summary and Framework.md` rather than jumping straight to code.
- Use the `dictation` skill's persona/interview/pause protocol when the user is dictating requirements or specs hands-free.
