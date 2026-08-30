---
name: ui-CLAUDE
description: Purpose and scope of the ui module
date: 2026-08-24
metadata:
  version: 1.0
  created-by: Claude Code
---

# UI Module

## Purpose

Owns the unified web interface: the ingestion form, search bar, and pipeline monitoring dashboard, plus the access control guarding them. This is the only module with a user-facing surface and a plausibly independent deployment lifecycle from the rest of the system.

## Scope

- **EP6 — Unified Web Management & Search Interface** (FR7, FR8, FR9): ingestion form + job ID confirmation, hybrid keyword/semantic search UI, and a dashboard for active/pending/failed job status with retry controls.
- **EP9 — Security & Access Control**: local-only auth guard on the Node.js orchestration server so ingestion/search/dashboard endpoints aren't reachable by arbitrary network callers.

## Dependencies

- Depends on `ingestor-classification/` (submits jobs via the ingestion endpoint), `vault/` (search queries hit the MCP/vector index), `batch/` (dashboard reflects batch job state), `local-llm/` (hosts the Node.js server itself).

## Canonical Source

Full Epic/Story text: `documets/design/Project 4thBrain.md` (EP6, EP9). Requirements: `documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md` (FR7–FR9, proposed NFR13).

## Status

Design only — no code yet. Stories tracked in `backlog.md`.
