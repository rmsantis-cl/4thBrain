---
name: story-1.1
description: Working notes for Story 1.1 - Direct Structured Vault Ingestion
date: 2026-08-30
metadata:
  version: 2.0
  created-by: Claude Sonnet 5
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

## Implementation (2026-08-30)

Implemented alongside Story 4.1 (Background Sweep) in the same pass, since
4.1's worker is the thing that actually *invokes* this story's logic on a
schedule. See `documets/story/story-4.1.md` for the batch-queue side.

### Prerequisite fix: Bug 2

Before this story could be implemented, `server/lib/ingest-service.js`
(Story 6.1's shipped ingestion path) turned out to be broken — the
repository layer referenced columns removed by the Story 12.2 schema
redesign. Fixed as a prerequisite; full writeup in
[`documets/bugs/Bug-2-Repository-Layer-Schema-Mismatch.md`](../bugs/Bug-2-Repository-Layer-Schema-Mismatch.md).
Also added a `job_file` record to `createIngestJob()`, which previously
created a job with no queryable record of which file it should process —
this story's executor (and Story 4.1's worker) depend on that record
existing.

### What was built

| File | Purpose |
|---|---|
| `server/lib/ingestion/file-validator.js` | Classifies a staged `job_file` as directly indexable (text/plain, text/markdown, text/html) vs. needing transcoding (Story 1.2, not yet built) |
| `server/lib/ingestion/path-resolver.js` | Resolves a safe, collision-free destination filename inside `$VAULT_DIR/incoming` |
| `server/lib/ingestion/vault-writer.js` | Byte-for-byte copy into `$VAULT_DIR/incoming` (no content parsing/rewriting) |
| `server/lib/ingestion/ingest-executor.js` | `canHandle()` / `execute()` — the actual `job_type='ingest'` handler Story 4.1's worker dispatches to |
| `server/lib/ingestion/watcher.js` | chokidar watch on `$RAW_DIR/inbox` for files that appear outside the web form |

### Design decisions

**Scope boundary: flat placement, not topic subfolders.** The Backlog
Tracker's AC says "target subfolder path resolution writes files directly
to designated locations" — read initially as multi-level topic/subtopic
routing, but ADR14 and ADR15 are clear that topic/subtopic-driven filing is
Story 2.1's job (not yet built), which runs *after* a file is already in
`$VAULT_DIR/incoming`. This story's "path resolution" is therefore scoped
to: resolve a safe, non-colliding filename within the single flat
`$VAULT_DIR/incoming` directory. Collisions are resolved by appending
`-2`, `-3`, ... before the extension rather than overwriting an existing
file — undocumented behavior in the original story text, decided here.

**Watcher/web-form deduplication.** `raw-dir-writer.js` (Story 6.1) already
stages files into the same `$RAW_DIR/inbox` this story's watcher observes,
and registers them synchronously within the HTTP request. Without a dedup
check, the watcher's `add` event would register a second, duplicate job for
every web-form submission. Fixed via `job_file.findByPath()` — the watcher
checks whether a `job_file` row already exists for a given path before
creating a new job, and added a `listForJob(jobId)` on the same repository
so the executor can find the file(s) belonging to a job.

**`canHandle()` is separate from `execute()`.** A job whose staged file
isn't directly indexable (a PDF, say) isn't a *failure* of Story 1.1 — it's
simply not this story's job (it's Story 1.2's, not yet built). Story 4.1's
worker checks `canHandle()` *before* claiming a job (`New -> Running`), so
an unsupported job type is left untouched in `New` rather than stranded in
`Running` or misleadingly marked `Failed`. See `story-4.1.md`.

**Documentation conflict found and deferred, not resolved unilaterally.**
`story-6.1.md`'s "Actuator" mock table assigns the vault/incoming copy step
to "RAG Indexing" (Story 3.1) instead of this story. Three other sources
(BACKLOG-TRACKER, ADR14, this file's own pre-existing notes) agree it's
Story 1.1's job. Logged as Design Debt item 3 rather than silently picking
a side — see `documets/DESIGN-DEBT.md`.

### Known limitations / explicitly out of scope

- Multi-file jobs: `execute()` only processes the first `job_file` for a
  job. No current caller produces more than one, so this is untested rather
  than actively wrong, but it's a real limitation if that changes.
- The watcher assumes staged files are stable text content — it doesn't
  sniff actual encoding/charset, just assumes UTF-8 for files it discovers
  itself (files staged via the web form already carry their own charset).
- No topic/subtopic routing (Story 2.1's job, as above).

### Testing

`server/test/ingestion.*.test.js` (26 tests) plus `server/test/ingest-service.test.js`
(6 tests, covering the Bug 2 regression) and `server/test/repositories.*.test.js`
(22 tests, also Bug 2 regressions). All run against an in-memory SQLite
database built fresh from the live `documets/design/schema.sql` on every
test, and real temp directories on disk (not the real, Windows-path
`params.json` — this session has no WSL2/Windows host to run against).
Covers: MIME/extension classification, path collision resolution, path
traversal rejection, byte-for-byte copy fidelity (including frontmatter and
unicode), the watcher's dedup logic and stale-close behavior, and full
end-to-end execution (stage a file -> run the executor -> assert vault
content + document/job_file state).

**Not verified in this session** (no WSL2/Ollama/real vault available):
watcher behavior against a real Windows-filesystem-backed `$RAW_DIR`
(UNC path / network-share timing quirks the original planning pass flagged
as a chokidar concern), and end-to-end behavior with Smart Connections
actually present.

## Status

**WIP** — core logic implemented and tested (32 passing tests across the
ingestion modules + regression coverage). Not yet run against the real
target environment. Ready for Story 2.1 (classification) to build on top of
the `Processing`-status documents this leaves behind in
`$VAULT_DIR/incoming`.

## Changelog

- 2026-08-25: Working notes created (no implementation yet).
- 2026-08-30: Implemented file-validator, path-resolver, vault-writer,
  ingest-executor, watcher, with 32 tests. Fixed Bug 2 (repository/schema
  mismatch) as a prerequisite. Logged Design Debt item 3 (Story 1.1 vs 3.1
  ownership conflict in story-6.1.md's actuator table).
