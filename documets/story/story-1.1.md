---
name: story-1.1
description: Working notes for Story 1.1 - Direct Structured Vault Ingestion
date: 2026-08-25
metadata:
  version: 1.0
  created-by: Claude Code
---

# Story 1.1: Direct Structured Vault Ingestion

Canonical story text lives in `documets/design/Project 4thBrain.md` (EP1). This file tracks the working context behind it.

## Abstract

Ingest structured Markdown, text, and HTML directly into the vault's incoming queue.

## Observations

- Text, Markdown, and HTML are already indexable as-is, so they bypass any transcoding step and are copied directly from `$RAW_DIR` to `$VAULT_DIR/incoming`.
- `$RAW_DIR` sits outside the vault entirely — nothing is considered "ingested" until it's inside `$VAULT_DIR`.
- This story only covers the direct-copy path; anything needing transformation (URLs, binaries) is Story 1.2's responsibility.

## ADRs Created

- [ADR14](../design/ADRS.md#adr14-ingestion-directory-layout-raw_dir-staging-vs-vault_dirincoming-and-raw) — ingestion directory layout ($RAW_DIR staging vs. $VAULT_DIR/incoming and /raw).

## TODO

`Create todo list`
