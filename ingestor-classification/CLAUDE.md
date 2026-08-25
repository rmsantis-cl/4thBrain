---
name: ingestor-classification-CLAUDE
description: Purpose and scope of the ingestor-classification module
date: 2026-08-24
metadata:
  version: 1.0
  created-by: Claude Code
---

# Ingestor & Classification Module

## Purpose

Owns everything that turns raw input (structured Markdown, freeform text, web clips, files) into clean, tagged Markdown notes ready for the vault. Covers both the sanitization/write path and the LLM-driven metadata/tagging step, since in practice a note isn't usably "ingested" until it's also classified.

## Scope

- **EP1 — Core Ingestion & Sanitization Pipeline** (FR1, FR2): direct structured vault writes preserving frontmatter, plus sanitization of unstructured/raw text and web clips.
- **EP2 — Automated Tagging & Classification Engine** (FR3): local LLM inference to generate YAML frontmatter and tags aligned to vault taxonomy.

## Dependencies

- Depends on `local-llm/` (Ollama inference for classification) and writes into `vault/` (target subfolders, triggers vector re-indexing).
- Consumed by `ui/` (ingestion form submits jobs here) and `batch/` (overnight queue processes items through this pipeline).

## Canonical Source

Full Epic/Story text: `documets/design/Project 4thBrain.md` (EP1, EP2). Requirements: `documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md` (FR1–FR3).

## Status

Design only — no code yet. Stories tracked in `backlog.md`.
