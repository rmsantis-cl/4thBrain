---
name: INDEX
description: Index of the PowerShell scripts under scripts/ in 4thBrain v04
metadata:
  version: 1.0
  created-by: Claude Opus 5
  date: 2026-09-07
---

# INDEX — 4thBrain v04 scripts

Catalog of everything under `scripts/`. Paths are relative to this file. The repository root and
`documents/` carry their own INDEX; see [../INDEX.md](../INDEX.md).

| File Name | History |
|-----------|----------|
| build-log.ps1 | [2026-09-06] Wrapper for gradlew tasks: tees output to @logs/v04-\<name\>.log as it streams (survives interruption) and writes a keyed, replaced exit code per task to @logs/exit-codes.txt. Replaces the prose redirect-by-hand convention in clear-edits.md, which had gone stale (last log 10 hours old, nothing enforcing it)<br>[2026-09-06] Added an optional `-Extra` string array passed through to gradlew, so scoped runs such as `-Task test -Extra @('--tests','*ActuatorManagerTest')` still go through the wrapper |
| batch-p2.8-submit.ps1 | [2026-09-07] Submits the P2.8 research to the Anthropic Message Batches API as three self-contained requests (analysis with the web_search server tool, ADR-shaped conclusion, implementation story), each carrying SPIKE-MARKITDOWN.md, P2.8, P2.3 and a repository-facts block. Writes the batch id to @batch/ |
| batch-fetch.ps1 | [2026-09-07] Checks a message batch and, once ended, writes each result to @batch/\<custom_id\>.md keyed by custom_id rather than position. Does not poll |
