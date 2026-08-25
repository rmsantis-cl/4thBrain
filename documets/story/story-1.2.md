---
name: story-1.2
description: Working notes for Story 1.2 - Unstructured Text Parsing & Sanitization
date: 2026-08-25
metadata:
  version: 1.0
  created-by: Claude Code
---

# Story 1.2: Unstructured Text Parsing & Sanitization

Canonical story text lives in `documets/design/Project 4thBrain.md` (EP1). This file tracks the working context behind it.

## Abstract

Clean, transcode, and normalize unstructured or binary raw payloads.

## Observations

- URLs dropped in `$RAW_DIR` are moved to `$RAW_DIR/clipping` before extraction — a distinct sub-stage from binary transcoding, though both feed the same `$VAULT_DIR/incoming` output.
- Binary formats (PDF, images, Word docs) must not enter the vault until transcoded to text/MD — they can't be indexed as binaries.
- After transcoding, the original binary is archived to `$VAULT_DIR/raw` and the transcoded file in `$VAULT_DIR/incoming` carries a reference back to that archived original, so provenance isn't lost.
- Depends on Story 1.1 being in place first (shared `$RAW_DIR` → `$VAULT_DIR/incoming` landing convention).

## ADRs Created

- [ADR14](../design/ADRS.md#adr14-ingestion-directory-layout-raw_dir-staging-vs-vault_dirincoming-and-raw) — ingestion directory layout ($RAW_DIR staging vs. $VAULT_DIR/incoming and /raw).

## TODO

`Create todo list`
