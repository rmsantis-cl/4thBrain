---
name: vault-CLAUDE
description: Purpose and scope of the vault module
date: 2026-08-24
metadata:
  version: 1.0
  created-by: Claude Code
---

# Vault Module

## Purpose

Owns the Obsidian-compatible Markdown vault as the system's source of truth, plus the local vector index built on top of it. Every other module reads from or writes to the vault; this module is responsible for the vault's integrity, indexing, and recoverability rather than for producing the content that fills it.

## Scope

- **EP3 — Local Vector Indexing & MCP Integration** (FR4): embedding generation and updates for new/changed notes via Smart Connections (`.smart-env`), exposed through an MCP server for semantic queries.
- **EP10 — Vault Backup, Integrity & Recovery**: scheduled snapshots of the vault and vector store, and a documented restore path after corruption or a bad batch run.

Out of scope: deciding *what* content gets written (ingestion) or *how it's tagged* (classification) — those live in `ingestor-classification/`. This module only stores, indexes, and protects.

## Dependencies

- Depends on `local-llm/` for the Ollama/MCP server runtime that Smart Connections indexing runs on top of.
- Consumed by `ingestor-classification/` (writes notes in), `batch/` (triggers snapshots pre-run, triggers re-indexing), and `ui/` (reads via search/MCP).

## Canonical Source

Full Epic/Story text: `documets/design/Project 4thBrain.md` (EP3, EP10). Requirements: `documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md` (FR4, NFR10, proposed NFR14).

## Status

Design only — no code yet. Stories tracked in `backlog.md`.
