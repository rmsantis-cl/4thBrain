---
name: story-2.1
description: Working notes for Story 2.1 - Local LLM Metadata & Tag Inference
date: 2026-08-25
metadata:
  version: 1.0
  created-by: Claude Code
---

# Story 2.1: Local LLM Metadata & Tag Inference

Canonical story text lives in `documets/design/Project 4thBrain.md` (EP2). This file tracks the working context behind it.

## Abstract

Infer tags, metadata, and topic/subtopic placement using local LLM inference.

## Observations

- Classification does two separable things: tagging (multi-valued, used for search/taxonomy) and topic/subtopic inference (single-valued, used to resolve the note's target vault subfolder). The vault path comes from topic/subtopic, not from tags.
- User-provided tags are preserved as-is; the LLM only adds supplementary taxonomy tags on top of them.
- Notes that reference images, documents, or other files need those referenced files relocated into a sibling attachment directory next to the note itself, not left behind in `$VAULT_DIR/incoming`.
- Depends on Story 1.1 (files must already be in `$VAULT_DIR/incoming` before classification runs) and Story 7.1 (local LLM host).

## ADRs Created

- [ADR15](../design/ADRS.md#adr15-topicsubtopic-driven-vault-path-with-sibling-attachment-directories) — topic/subtopic-driven vault path resolution and sibling attachment directories.

## TODO

`Create todo list`
