---
name: PLAN-30-08-2026-EP1-Completion
description: Detailed plan to close out EP1 (Core Ingestion & Sanitization Pipeline) — Stories 1.1 and 1.2, and a dependency check against EP7
date: 2026-08-30
metadata:
  version: 1.1
  created-by: Claude Sonnet 5
---

# Plan: Complete EP1 (Core Ingestion & Sanitization Pipeline)

## Context

EP1 covers FR1 (Direct Structured Ingestion) and FR2 (Unstructured Extraction & Sanitization). It has exactly two stories:

- **Story 1.1** (Direct Structured Vault Ingestion) — **WIP**. Core logic implemented and tested (`server/lib/ingestion/`, 32 passing tests), but never run against a real environment. **Not touched by this pass** — see "2026-08-30 run" note below.
- **Story 1.2** (Unstructured Text Parsing & Sanitization) — **Implemented** this pass (was READY/no code written). See "2026-08-30 run" section.

This plan exists because the user asked, under time pressure, for a concrete path to EP1-complete, including plans for anything that has to happen first.

## 2026-08-30 run: what actually happened

A later batch pass implemented Story 1.2 for real (this plan's design below), in the same run as Story 6.3 (real monitoring dashboard) and a Story 13.3 verification pass, per `IMPLEMENTATION-PLAN-PHASE-2.md`. Story 1.1's real-environment verification (this plan's own next section) was explicitly **out of scope for that run** and remains untouched — its status, and Open Question 4 below, are unchanged.

**Delivered:**

- `server/lib/ingestion/transcode-executor.js` — `canHandle`/`execute` executor for `job_type='convert'`, matching `ingest-executor.js`'s contract. Dispatches by MIME type (falling back to file extension): PDF → `pdf-parse`, `.docx` → `mammoth`, everything else (images included) → an archive-only reference stub. `execute()` is `async` (both extraction libraries are Promise-based) — `batch/worker.js`'s `runCycle`/`main` were changed to `async`/`await` around the executor call to support this; `ingest-executor.js`'s existing synchronous `execute()` is unaffected (`await` on a non-Promise value is a no-op).
- `server/lib/ingestion/url-relocator.js` — `relocateToClipping(jobFile, cfg)`, a standalone utility (not a registered executor) that moves a staged file from anywhere under `$RAW_DIR` into `$RAW_DIR/clipping`. Not wired into the live `/api/ingest/url` request path — see Open Question 3's answer below for why.
- `server/lib/ingestion/vault-writer.js` gained `archiveToVaultRaw()`, mirroring the existing `copyToVaultIncoming()` but targeting `cfg.vaultDirRaw`. `server/config.js` gained `vaultDirRaw` (`$VAULT_DIR/raw`, auto-created like the other managed directories); `server/test/helpers/test-cfg.js` gained a matching `vaultDirRaw` for tests.
- `batch/job-executors.js`: `const executors = { ingest: ingestExecutor, convert: transcodeExecutor }`, as this plan specified.
- `server/lib/ingest-service.js`: `createIngestJob` now classifies the staged file (via `file-validator.classify()`) to pick `job_type` — `'ingest'` for directly-indexable text/md/html, `'convert'` for everything else. Without this the `convert` executor would be unreachable dead code, since dispatch in `batch/worker.js` is strictly keyed by `job.job_type` and nothing previously created a `job_type='convert'` row.
- Tests: `server/test/ingestion.transcode-executor.test.js` (real `.docx` text extraction against a fixture bundled with `mammoth`'s own test suite; a deliberately-unparseable PDF exercising the archive-only fallback; image archive-only handling; canHandle/error-path coverage), `server/test/ingestion.url-relocator.test.js` (move, collision handling, no-op-if-already-relocated, error paths). `batch/test/worker.test.js` updated for the new async `runCycle` signature and the changed dispatch behavior (a PDF-mime job now becomes `job_type='convert'` and completes, rather than staying stuck as an unclaimable `'ingest'` job — the old "no executor yet" test was replaced with an equivalent one for a genuinely unregistered `job_type`).

**Open design questions answered** (see the "Open questions" section below for the full original questions):

- **Q2 (transcoding libraries / image handling):** `pdf-parse` for PDF, `mammoth` for `.docx`, as proposed. Images get archive-only handling — no OCR/vision extraction — via the same fallback path used for any other binary format `pdf-parse`/`mammoth` don't cover (`.doc`, `.zip`, etc.): the original is archived to `$VAULT_DIR/raw` and a minimal `.md` stub referencing that archived location lands in `$VAULT_DIR/incoming`, so the file stays discoverable and the job still completes — it just carries no extracted body text. A malformed/unparseable PDF or `.docx` degrades to the same stub rather than failing the job.
- **Q3 (URL handling scope):** Relocation only, as the acceptance criteria implied. `url-relocator.js` exists as a tested utility but isn't wired into `/api/ingest/url`'s live request path, because `server/lib/raw-dir-writer.js`'s existing `writeUrl()` already stages new URL submissions directly into `cfg.rawDirClipping` — that path already satisfies "URLs... are relocated to `$RAW_DIR/clipping` prior to extraction" without this module. `url-relocator.js` is for the other arrival path: a URL-type file landing in `$RAW_DIR/inbox` some other way (e.g. Story 1.1's directory watcher, for a file dropped outside the web form) and needing relocating after the fact — not wired into that path either in this pass, since nothing currently distinguishes "this generic staged file is a URL" for the watcher; that classification gap is a follow-on item, not resolved here. Actual scraping/extraction of URL content remains out of scope, per the acceptance criteria (they test relocation, not extraction).

Full assumptions and reasoning: `ASSUMPTIONS.md` (repo root).

## Dependency check: is EP7 actually a blocker?

Both stories formally list `depends on Story 7.1, depends on Story 7.2` (WSL2 Runtime & Resource Bounds; Process Lifecycle & MCP Server Setup). Both are **READY** — no `.wslconfig` or systemd/PM2 supervisor files exist anywhere in the repo. Taken literally, EP1 would be blocked on two unstarted infrastructure stories.

In practice, it is not blocked:

- **ADR16 (closed, 2026-08-26)** decided Ollama runs in WSL2, but the ingestion/search app (this repo's `server/`) runs natively on Windows. Story 1.1/1.2's logic is pure file I/O — copy, path resolution, transcoding — and never calls Ollama. Story 7.1/7.2's actual subject matter (WSL2 resource bounds, Ollama process supervision, MCP server boot) is real infrastructure, but it gates **Story 2.1** (LLM classification) and **Story 3.1** (MCP/vector indexing), not EP1.
- `params.json` already has real native Windows paths configured (`vault_dir`, `raw_dir`) — not placeholder or WSL2 paths. The server already runs natively on Windows (verified live in this same session, during Story 13.3 closeout).
- Story 1.1's own working notes (`documets/story/story-1.1.md`) confirm this: the only thing not yet verified is running against "the real target environment," and per ADR16 that target is native Windows, which is already configured and reachable — no WSL2 spin-up required to close that gap.

**Conclusion:** Stories 7.1/7.2 do not need a detailed sub-plan here — they're not on EP1's critical path. The `depends on` fields in `documets/design/Project 4thBrain.md` predate ADR16's placement decision and are stale; **flagged below as a documentation fix, not treated as a blocker.**

## Story 1.1: close out WIP → COMPLETED

**Current state** (`documets/story/story-1.1.md`, verified against the actual files):

| File | Role |
|---|---|
| `server/lib/ingestion/file-validator.js` | Classifies staged file as indexable (text/md/html) vs. needs Story 1.2 |
| `server/lib/ingestion/path-resolver.js` | Collision-free destination filename in `$VAULT_DIR/incoming` |
| `server/lib/ingestion/vault-writer.js` | Byte-for-byte copy, no content rewriting |
| `server/lib/ingestion/ingest-executor.js` | `canHandle()`/`execute()` — the `job_type='ingest'` handler |
| `server/lib/ingestion/watcher.js` | chokidar watch on `$RAW_DIR/inbox` for files appearing outside the web form |

32 tests pass (`server/test/ingestion.*.test.js`), all against in-memory SQLite + temp directories — none against the real configured paths.

**Remaining work (small — this is verification, not new code):**

1. Start the server natively (`scripts/ui-server.ps1 start`, `NODE_ENV=development`) against the real `params.json` paths.
2. Drop a real `.md`, `.txt`, and `.html` file into `C:\Users\rsant\desar\Local Vault\RAW_DIR\inbox` and confirm the watcher picks each up, creates a job, and the executor copies it byte-for-byte into `C:\Users\rsant\desar\Local Vault\Local Vault\incoming` with frontmatter intact.
3. Submit one file through the `/chat` web ingestion form (Story 6.1's path) and confirm no duplicate job is created for the same file (the watcher/web-form dedup logic in `job_file.findByPath()`).
4. Confirm via `/api/tables/document` and `/api/tables/job` (Story 13.3, now working) that the resulting rows look correct — `document.status = "Processing"`, `document.uri_location` pointing at the real vault path, `job_file.status = "filed"`.
5. Watch for the one flagged risk in the story notes — UNC/network-share timing quirks with chokidar. `raw_dir` in `params.json` is a plain local NTFS path, not a UNC path, so this risk likely doesn't materialize, but confirm.
6. On success: flip `documets/story/story-1.1.md` Status to COMPLETED, update `documets/BACKLOG-TRACKER.md` (row + detail section) and `documets/PROJECT-SUMMARY.md` accordingly, same pattern used to close out Story 13.3 earlier today.

**Also close while here:** Design Debt item 3 (`documets/DESIGN-DEBT.md`) — `story-6.1.md`'s actuator table still misattributes the vault/incoming copy step to "RAG Indexing"/Story 3.1. Now that 1.1 is functionally done, correct that table to match reality and mark item 3 Cleared instead of leaving it Deferred.

**Accepted limitation, not a blocker:** `execute()` only processes the first `job_file` per job. No current caller produces multi-file jobs. Leave as-is; note in the story file if not already flagged clearly enough.

## Story 1.2: Unstructured Text Parsing & Sanitization — Implemented 2026-08-30

**Scope** (from `documets/design/Project 4thBrain.md` + ADR14, which already covers the directory-layout design authority needed to implement this — no new ADR required):

- URLs placed in `$RAW_DIR` → moved to `$RAW_DIR/clipping` "for extraction."
- Binary formats (PDF, images, Word docs, etc.) → transcoded to clean MD/text, written to `$VAULT_DIR/incoming`; original archived to `$VAULT_DIR/raw`; the transcoded file references the archived original's location.

**Reuse — this is the key implementation lever.** `batch/job-executors.js` already has the dispatch seam built and commented for exactly this:

```js
// 'convert' (Story 1.2) ... valid job_type enum values but have no executor yet
const executors = { ingest: ingestExecutor };
```

`documets/design/schema.sql` already seeds `job_type = 'convert'`. No schema change needed. The plan is to add a second executor and register it, following `ingest-executor.js`'s exact `canHandle(db, job)` / `execute(db, job, cfg)` contract:

1. **New file `server/lib/ingestion/transcode-executor.js`** — `canHandle()` returns true when `file-validator.js`'s classification is `needs-transcode` (the branch `file-validator.js` already has a name for, per its Story-1.1-era docstring: "vs. needing transcoding (Story 1.2, not yet built)"). `execute()` dispatches by MIME type to a transcoder, writes output via the existing `vault-writer.js`/`path-resolver.js` pair (reused, not rebuilt), and additionally archives the original into `$VAULT_DIR/raw` (a new small helper, mirroring `vault-writer.js`'s copy logic but targeting `/raw` instead of `/incoming`). **Delivered as described** — see "2026-08-30 run" above for the actual `canHandle()`/dispatch details (it ended up gated on `job_type === 'convert'` plus "has a job_file", not a `file-validator` "needs-transcode" enum value, since `file-validator.classify()` only actually returns `kind: "indexable" | "unsupported"` — the plan's "needs-transcode" phrasing didn't match the real code).
2. **New file `server/lib/ingestion/url-relocator.js`** — moves a staged URL-type job_file from `$RAW_DIR` to `$RAW_DIR/clipping`. Open question below on whether extraction itself is in this story's scope. **Delivered** — see Q3's answer above.
3. **Transcoder library choice — no ADR pins this, needs a decision** (see Open Questions): candidates are `pdf-parse` (PDF → text) and `mammoth` (docx → text/HTML), both pure-JS/no-native-binary, consistent with this repo's Node-only stack. Images have no obvious text-extraction path without OCR or LLM vision — likely out of scope for 1.2 itself. **Decided and implemented** — see Q2's answer above.
4. **Register in `batch/job-executors.js`**: `const executors = { ingest: ingestExecutor, convert: transcodeExecutor };` — one-line change, same pattern as `ingest`. **Delivered**, plus the necessary (previously-unplanned) connective change: `ingest-service.js` now has to actually *choose* `job_type='convert'` for non-indexable files at creation time, or this registration is unreachable — see "2026-08-30 run" above.
5. **Tests**: mirror `server/test/ingestion.*.test.js`'s existing style — one file per new module (`ingestion.transcode-executor.test.js`, `ingestion.url-relocator.test.js`), in-memory DB + temp dirs, following `server/test/helpers/test-db.js`/`test-cfg.js`. **Delivered.**

## Sequencing

Originally planned: Story 1.1 verification first (clears Design Debt item 3), then Story 1.2. **Actual 2026-08-30 run implemented Story 1.2 without touching Story 1.1**, per that run's explicit instructions (Story 1.1 real-environment sign-off was deliberately left for a separate pass). This is a safe order in practice — Story 1.2's new code (`transcode-executor.js`, `url-relocator.js`) only reuses Story 1.1's already-tested `vault-writer.js`/`path-resolver.js` helpers and doesn't touch `ingest-executor.js`, `file-validator.js`, or `watcher.js` — but it does mean EP1 is not yet fully COMPLETED even though both stories now have real code: Story 1.1 still needs its real-environment verification pass (see that section above) before EP1 as a whole can close out. Story 2.1 (Classification, depends on 1.1) remains unblocked to start regardless, since it only depends on 1.1, not 1.2.

## Design Debt callouts

- **Existing, recommend closing now:** DESIGN-DEBT item 3 (Story 1.1 vs 3.1 ownership of the vault/incoming copy step) — correct `story-6.1.md`'s actuator table as part of closing Story 1.1. **Still open** — untouched by the 2026-08-30 Story 1.2 run, since it's specifically Story 1.1's closeout item.
- **New candidate — module ownership mismatch:** root `CLAUDE.md`'s Module Map assigns EP1 to `ingestor-classification/` (depends on `local-llm/`, `vault/`), but that directory is empty — every line of Story 1.1's real implementation lives under `server/lib/ingestion/`. Either the module map is stale (the architecture consolidated into the single Node `server/` app and the map was never updated to match, similar to other doc-drift found this session — e.g. `batch/CLAUDE.md` still says "Status: Design only — no code yet" despite Story 4.1 being WIP with real code), or `ingestor-classification/` was meant to be a genuinely separate component that was quietly dropped. Not resolved here — logged as a candidate, see Open Questions. **Still open (Open Question 1, below) — deliberately untouched by the 2026-08-30 run.**
- **New candidate — binary transcoding toolchain for Story 1.2 unpinned:** ADR14 authorizes the architecture (transcode → `$VAULT_DIR/incoming` + archive → `$VAULT_DIR/raw`) but no ADR names a library or defines image handling. Treated here as an implementation-detail decision (comparable to how Story 13.3 picked `node:sqlite`/Scalar without a dedicated ADR), not a hard blocker — but flagged since it affects what "done" looks like for images specifically. **Resolved by the 2026-08-30 run** — see Q2's answer above; no ADR was judged necessary for this (implementation-detail decision, same reasoning as originally proposed here).

## Open questions for the user

1. **Module ownership:** should the root `CLAUDE.md` Module Map be corrected to show EP1 living in `server/`, retiring `ingestor-classification/` as EP1's nominal owner? Or was a separate component genuinely intended and just never started? **Untouched by the 2026-08-30 run** — out of scope for that pass.
2. **Story 1.2 binary transcoding:** what libraries/approach — `pdf-parse` + `mammoth` as proposed above? And for images specifically: archive as an attachment with no text extraction (simplest), or is OCR/vision-model extraction actually in scope for this story (bigger lift, arguably closer to Story 2.1's LLM territory)? **Answered 2026-08-30** — see "2026-08-30 run" above: `pdf-parse` + `mammoth` as proposed; images (and any other unhandled binary format) get archive-only treatment, no OCR/vision.
3. **Story 1.2 URL handling:** does "moved to `$RAW_DIR/clipping` for extraction" mean Story 1.2 also performs the extraction (fetching/scraping the URL), or just the file relocation, with the actual scrape being separate, not-yet-scoped work? The acceptance criteria only test the relocation, which suggests the latter, but the description's wording is ambiguous. **Answered 2026-08-30** — see "2026-08-30 run" above: relocation only; scraping/extraction stays out of scope and unscoped.
4. **Story 1.1 sign-off bar:** is the native-Windows verification pass described above (real paths already in `params.json`, no WSL2 needed per ADR16) sufficient to call Story 1.1 COMPLETED, or does the user want an actual live WSL2/Ollama end-to-end demo before signing off, despite that not being technically required by 1.1's own logic? **Untouched by the 2026-08-30 run** — Story 1.1 itself was explicitly out of scope for that pass.
