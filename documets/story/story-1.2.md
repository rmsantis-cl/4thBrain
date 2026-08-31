---
name: story-1.2
description: Working notes for Story 1.2 - Unstructured Text Parsing & Sanitization
date: 2026-08-31
metadata:
  version: 2.0
  created-by: Claude Sonnet 5
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

- [ADR14](../design/ADRS.md#adr14-ingestion-directory-layout-raw_dir-staging-vs-vault_dirincoming-and-raw) — ingestion directory layout ($RAW_DIR staging vs. $VAULT_DIR/incoming and /raw). Covers the directory-placement design; no new ADR was needed for that part.
- [ADR19](../design/ADRS.md#adr19-opendataloader-pdf-opendataloaderpdf-as-the-pdf-extraction-library-replacing-pdf-parse) — OpenDataLoader PDF replaces `pdf-parse` as the PDF extraction library (2026-08-31 pass, see below).

## Implementation (2026-08-30, PDF library swapped 2026-08-31)

Implemented per `documets/PLAN-30-08-2026-EP1-Completion.md`'s "Story 1.2" section, in the same pass as Story 6.3 (real monitoring dashboard) and a Story 13.3 verification pass.

### What was built

| File | Purpose |
|---|---|
| `server/lib/ingestion/transcode-executor.js` | `canHandle()`/`execute()` — the `job_type='convert'` handler. Dispatches by MIME type (extension fallback): PDF → OpenDataLoader PDF (`@opendataloader/pdf`, swapped in 2026-08-31 per ADR19; was `pdf-parse`), `.docx` → `mammoth`, everything else (images included) → an archive-only reference stub. |
| `server/lib/ingestion/url-relocator.js` | `relocateToClipping(jobFile, cfg)` — moves a staged file from anywhere under `$RAW_DIR` into `$RAW_DIR/clipping`. Standalone utility, not a registered executor. |
| `server/lib/ingestion/vault-writer.js` | Gained `archiveToVaultRaw()`, mirroring the existing `copyToVaultIncoming()` but targeting `$VAULT_DIR/raw`. |
| `server/config.js` | Gained `vaultDirRaw` (`$VAULT_DIR/raw`, auto-created like the other managed directories). |
| `batch/job-executors.js` | `const executors = { ingest: ingestExecutor, convert: transcodeExecutor }`. |
| `server/lib/ingest-service.js` | `createIngestJob` now classifies the staged file (`file-validator.classify()`) to pick `job_type` — `'ingest'` for directly-indexable text/md/html, `'convert'` for everything else. Without this the `convert` executor would be unreachable dead code. |

### Design decisions

**`canHandle()` gated on `job_type === 'convert'` plus "has a job_file", not a `file-validator` enum value.** The original plan sketched `canHandle()` checking for a `needs-transcode` classification from `file-validator.js`. The real code (`file-validator.classify()`) only returns `kind: "indexable" | "unsupported"` — there's no `needs-transcode` value. `transcode-executor.js`'s `canHandle()` checks `job.job_type === 'convert'` and that at least one `job_file` row exists instead; `detectStrategy()`'s own archive-only fallback (below) means every `convert` job with a staged file is handleable regardless of format.

**Archive-only fallback keeps every `convert` job resolvable.** `detectStrategy()` recognizes PDF and `.docx` for real text extraction; everything else (images, `.doc`, `.zip`, and any malformed/unparseable PDF or `.docx`) degrades to an "archive-only" stub — the original is still archived to `$VAULT_DIR/raw` and a minimal `.md` reference stub still lands in `$VAULT_DIR/incoming`, so the job completes and the file stays discoverable even with no extracted body text. No `convert` job is left permanently stuck in `New`.

**URL relocation utility built but not wired into the live request path.** `raw-dir-writer.js`'s existing `writeUrl()` already stages new URL submissions directly into `cfg.rawDirClipping`, satisfying the "URLs are relocated to `$RAW_DIR/clipping`" acceptance criterion without `url-relocator.js`. That module exists for the other arrival path — a URL-type file landing in `$RAW_DIR/inbox` some other way (e.g. Story 1.1's watcher, picking up a file dropped outside the web form) and needing relocating after the fact. Not wired into that path either in this pass, since nothing currently distinguishes "this generic staged file is a URL" for the watcher — a follow-on gap, not resolved here.

**PDF library: no ADR pinned `pdf-parse` when it first shipped (2026-08-30).** It was picked as an implementation detail — pure-JS, no native binary, consistent with the Node-only stack — comparable to how Story 13.3 picked `node:sqlite` without a dedicated ADR. Flagged in `documets/PLAN-30-08-2026-EP1-Completion.md` as unpinned, resolved by ADR19 on 2026-08-31 (see next section).

### PDF library swap: `pdf-parse` → OpenDataLoader PDF (2026-08-31, ADR19)

A follow-up pass replaced `pdf-parse` with [OpenDataLoader PDF](https://github.com/opendataloader-project/opendataloader-pdf) (`@opendataloader/pdf` npm package) as the PDF extraction library, per ADR19 — see that ADR for the full rationale (accuracy benchmarks, table/reading-order fidelity, the new Java-runtime dependency this introduces).

**Implementation.** `extractPdfText()` in `transcode-executor.js` now calls `@opendataloader/pdf`'s `convert([sourcePath], { outputDir, format: "markdown,json" })`. Unlike `pdf-parse`, `convert()` doesn't return extracted text directly — it shells out to a bundled Java CLI (`opendataloader-pdf-cli.jar`, spawned via `java -jar`) and writes `<stem>.md`/`<stem>.json` files into `outputDir`. The function creates a per-call temp directory (`fs.mkdtempSync` under `os.tmpdir()`), awaits `convert()`, reads the resulting `.md` file back in as the extracted body text, and removes the temp directory in a `finally` block regardless of outcome. `transcodeBody()`'s existing try/catch is unchanged — a `convert()` rejection (malformed PDF, or `java` missing from PATH) still degrades to the same archive-only stub used before the swap, not a job failure.

**Verified live, not just against a stub.** Java 11 (Adoptium/Temurin, `java -version` reports `11.0.15`) is present in this execution environment, so the swap was exercised end-to-end rather than only unit-tested against a mock: a byte-accurate minimal PDF fixture (`server/test/fixtures/sample.pdf`, hand-built with correct xref offsets — no PDF-generation library was already a dependency) was run through both a standalone smoke script and the real test suite. `convert()` resolved, wrote `sample.md`/`sample.json` into the output directory, and the `.md` content contained the fixture's known text. A second smoke test against a deliberately malformed PDF confirmed `convert()` rejects (matching `pdf-parse`'s throw-on-malformed behavior), so the archive-only fallback path was also verified against the new library, not assumed.

**New test added**, mirroring the existing `.docx` extraction test: `execute() extracts real text from a PDF via OpenDataLoader PDF and archives the original (ADR19)` in `server/test/ingestion.transcode-executor.test.js`, running the real Java CLI against `server/test/fixtures/sample.pdf` (not mocked). The pre-existing "malformed PDF falls back to a stub" and "image archives with no extraction attempted" tests were left as-is — both already exercised the code paths this swap needed to preserve, and both still pass unmodified against the new library.

**Dependency change.** `server/package.json`: added `@opendataloader/pdf` (`^2.5.5`), removed `pdf-parse`. `npm install`/`npm uninstall pdf-parse` run; `package-lock.json` updated.

### Known limitations / explicitly out of scope

- **HTML/web-clip sanitization is not implemented.** `file-validator.js` classifies `text/html` as directly `"indexable"`, so an HTML file (including a web clip) bypasses `transcode-executor.js` entirely and is copied byte-for-byte via Story 1.1's `ingest-executor.js` path — no sanitization, no HTML-to-clean-Markdown conversion happens anywhere in the current pipeline. This leaves two of Story 1.2's five acceptance criteria genuinely unmet for the HTML/web-clip case specifically: "Input containing raw HTML, web clips, or special characters is sanitized to clean plain text/Markdown" and "Core semantic text content remains fully intact post-sanitization" (both criteria are met for PDF/DOCX, where real text extraction does happen). This is blocked on `documets/story/spike-webclipping.md` (status READY, not yet run) recommending an extraction library — that spike is explicitly out of scope for this pass, being handled separately. `documets/story/spike-extraction.md` (status READY) is the analogous spike for binary-document extraction libraries generally; it also never ran — the `pdf-parse`→OpenDataLoader PDF choice was made directly via ADR19 (user-directed) rather than via that spike's evaluation process.
- **Java 11+ is now a host runtime dependency** for PDF extraction specifically (OpenDataLoader's core is a Java CLI). Not previously true for this stack (ADR1 scoped WSL2/Windows, ADR5 scoped Node.js as the orchestration layer). Present and working in this execution environment; not yet confirmed against the real target deployment host (see Story 1.1's own not-yet-verified real-environment gap, `documets/story/story-1.1.md`).
- **Per-file JVM startup overhead.** Each `convert()` call spawns its own JVM process (~1.5–2s observed in this session's tests, dominated by JVM startup rather than parse time for a small fixture). OpenDataLoader's own docs recommend batching multiple files per `convert()` call rather than one call per file — this doesn't cleanly fit the one-job-at-a-time worker model (Story 4.1). Flagged in ADR19 as something to measure against real batch volume; not re-architected in this pass.
- **URL relocator not wired into the live `/api/ingest/url` path** (see design decisions above) — `raw-dir-writer.js` already covers the acceptance criterion via a different route.
- **No OCR/vision extraction for images** — archive-only, consistent with Story 2.1/EP2 being the LLM/vision territory, not this story's.
- **Multi-file jobs**: `execute()` only processes the first `job_file` per job, same limitation as `ingest-executor.js` (Story 1.1). No current caller produces multi-file jobs.

### Testing

`server/test/ingestion.transcode-executor.test.js` — 12 tests (was 7 before the 2026-08-31 pass): `detectStrategy` MIME/extension/fallback classification (3), `canHandle` gating (3), real `.docx` extraction via `mammoth` against a fixture bundled with `mammoth`'s own test suite (1), **real PDF extraction via OpenDataLoader PDF against `server/test/fixtures/sample.pdf`, run against the actual Java CLI, not mocked (1, new)**, archive-only fallback for an unparseable PDF (1), archive-only handling for an image (1), and error paths — no job_file records, missing source file (2). `server/test/ingestion.url-relocator.test.js` — 5 tests (move, collision handling, no-op-if-already-relocated, error paths). Full server suite: 106/106 passing after this pass (`cd server && npm test`), including a `chokidar`-dependent watcher test and the `mammoth` `.docx` fixture test that were failing before `npm install` was re-run in this worktree (this worktree's `node_modules` was stale relative to a merged `package.json`/`package-lock.json` — unrelated pre-existing gap, fixed as a prerequisite to validating this pass, not a regression introduced here).

## Acceptance Criteria

Per `documets/BACKLOG-TRACKER.md`'s Story 1.2 detail section:

- [x] Binary files are not written into the vault until transcoded; transcoded output lands in `$VAULT_DIR/incoming` and the original is archived to `$VAULT_DIR/raw` — tested (PDF, DOCX, archive-only formats).
- [x] Each transcoded file in `$VAULT_DIR/incoming` references the archived location of its original raw file — tested (`source_raw:` frontmatter field).
- [x] URLs submitted for ingestion are relocated to `$RAW_DIR/clipping` prior to extraction — tested (`url-relocator.js`); also independently satisfied for the live web-form path by `raw-dir-writer.js` (Story 6.1).
- [ ] Input containing raw HTML, web clips, or special characters is sanitized to clean plain text/Markdown — **met for PDF/DOCX** (real extraction, tested); **not met for HTML/web clips** — see "Known limitations" above.
- [ ] Core semantic text content remains fully intact post-sanitization — **met for PDF/DOCX** (extracted text verified against known fixture content); **not applicable/not met for HTML**, since no sanitization step exists for it yet.

## Status

**WIP** — 3 of 5 acceptance criteria fully met and tested (binary transcode-and-archive, provenance reference, URL relocation). The remaining 2 criteria are met only for the PDF/DOCX case, not for HTML/web clips, because no HTML sanitization step exists in the pipeline yet — `text/html` currently bypasses this story's code entirely via Story 1.1's direct-copy path. Closing this gap needs `spike-webclipping.md` (READY, separate in-flight task) to land a library recommendation first. Not marking COMPLETED while a real, in-scope acceptance criterion is unmet — this is a genuine pipeline gap, not a documentation lag or an environment-verification gap (contrast with Story 1.1's WIP status, which is real code awaiting real-environment sign-off, not missing functionality).

The 2026-08-31 ADR19 PDF-library swap itself is complete and verified live (Java 11 was available in this session) — it doesn't change this story's overall status since it swaps an already-passing extraction path for a better one; it doesn't close the pre-existing HTML gap.

## Changelog

- 2026-08-25: Working notes created (no implementation yet).
- 2026-08-30: Implemented transcode-executor (PDF via `pdf-parse`, `.docx` via `mammoth`, archive-only fallback), url-relocator, vault-writer's `archiveToVaultRaw()`, `ingest-service.js` job_type classification. 7 new tests. Tracking docs (this file, BACKLOG-TRACKER, PROJECT-SUMMARY) were not updated at the time — left at pre-implementation state (Status: READY) until this 2026-08-31 pass.
- 2026-08-31: Swapped PDF extraction library `pdf-parse` → OpenDataLoader PDF (`@opendataloader/pdf`) per new ADR19; verified live against a real Java 11 CLI invocation (not mocked), added 1 new test (12 total in the transcode-executor suite, up from 7 — the other 4 gained since 2026-08-30 predate this pass and aren't part of this changelog entry's count). Closed this story's tracking-doc gap: rewrote this file, corrected BACKLOG-TRACKER/PROJECT-SUMMARY to reflect real WIP status (was incorrectly still showing READY/no-code), added an INDEX.md entry. Left Status at WIP rather than COMPLETED — the HTML/web-clip sanitization acceptance criteria remain genuinely unmet, independent of and unrelated to the ADR19 swap.
