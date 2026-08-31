---
name: spike-webclipping
description: Evaluate and select libraries for web document retrieval and HTML extraction
metadata:
  version: 2.2
  created-by: Claude Sonnet 5
  date: 2026-08-30
---

# Spike: WebClipping Library Selection

## Abstract
Research and evaluate available libraries for fetching web documents (HTML, markdown, text) from URLs and extracting readable content, then recommend the most suitable tool for 4thBrain's Clipper implementation.

## Description
The Clipper action (Story 1.2) needs to fetch documents from URLs and extract readable text/HTML. This spike will survey available tools, evaluate them against 4thBrain requirements, and recommend a single library for implementation.

## Evaluation Criteria
- **Local execution** — no cloud API calls or external service dependencies
- **Document type support** — HTML, Markdown, PDF URLs, and archive URLs
- **Dependency footprint** — minimal external dependencies, fits Node.js ecosystem
- **Content extraction quality** — preserves semantic structure (headings, lists, links); identifies embedded images/attachments
- **License** — open-source or compatible with 4thBrain's use case
- **Ease of integration** — straightforward Node.js/Python integration

## Candidates to Evaluate
- Web scraping libraries (Puppeteer, Cheerio, Jsdom, etc.)
- Content extraction tools (Readability, Mozilla Reader, etc.)
- Dedicated clipping services (Firecrawl, Apify, etc.) — evaluate even if cloud-based, for comparison
- HTML parsing + semantic analysis combinations

## Deliverable 1: Comparison Table

Ten candidates, spanning the fetch/render layer, the content-extraction layer, PDF handling, and cloud services (evaluated for comparison only — ADR12 requires fully local execution, no outbound calls).

| Library | Layer | Pros | Cons | License | Local-capable |
|---|---|---|---|---|---|
| **Playwright** | Fetch/render | Multi-engine (Chromium/Firefox/WebKit) gives resilience against site-specific rendering quirks; auto-waiting reduces flaky extraction; already a devDependency at the repo root (`package.json`, `test:ui`) with Chromium already provisioned locally — zero new browser-binary setup; handles JS-hydrated/SPA content; actively maintained by Microsoft. | Heaviest option by install size (~300MB+ with browser binaries); slower per page than a plain HTTP fetch (launches a real browser process); `waitUntil: "networkidle"` proved unreliable in this spike's own POC run — pages with persistent ad/analytics connections (the BBC News article, Joel on Software's blog) never went network-idle and timed out, requiring a switch to `domcontentloaded` + a settle delay. | Apache-2.0 | Yes |
| **Puppeteer** | Fetch/render | Simpler API surface than Playwright; Chromium-only means one browser binary, not three; huge community/StackOverflow coverage. | Chromium-only — no Firefox/WebKit fallback if a site fingerprints/blocks headless Chrome specifically; not already present anywhere in this repo, so adopting it means provisioning a second, separate browser-binary toolchain alongside Playwright's (which stays needed for `test:ui` regardless). | Apache-2.0 | Yes |
| **Plain `fetch` (Node/undici, no browser)** | Fetch (no render) | Zero extra dependency — built into Node.js 18+; fastest, lightest option; fine for static HTML, PDFs, and plain text/Markdown. | Cannot execute JavaScript — any client-hydrated content is invisible; would silently under-extract on a meaningful share of real-world "diverse URLs" (the exact case Clipper must handle since it takes arbitrary user-pasted links, not just URLs this codebase controls). Still needed as the byte-fetch primitive for the PDF and plain-Markdown branches (see Recommendation). | MIT (Node.js core / undici) | Yes |
| **Mozilla Readability (`@mozilla/readability`) + jsdom** | Content extraction | Purpose-built "find the main article" heuristic — the same algorithm behind Firefox's Reader View; correctly isolated the article body from nav/ads/comments on all HTML test URLs in this spike's POC; actively maintained by Mozilla; works against HTML from any fetch layer (Playwright, Puppeteer, or plain fetch). | Requires a DOM implementation to run against (jsdom, a second dependency); the heuristic can return `null` on non-article-shaped pages (needs a Turndown-on-full-body fallback — implemented in the POC, not exercised by any of the 5 test URLs but a known failure mode); jsdom logged non-fatal `Could not parse CSS stylesheet` warnings against one test page — cosmetic, didn't affect extraction. | Apache-2.0 (Readability) / MIT (jsdom) | Yes |
| **Cheerio** | Content extraction | Very fast, lightweight — no full DOM, no JS execution; jQuery-like selector API is convenient when a site's structure is already known; good fit for targeted scraping of a fixed template. | No "find the main content automatically" capability — requires hand-written CSS selectors per site, which does not scale to "arbitrary URL a user pastes in" (Clipper's actual use case); still needs something else to supply HTML (fetch or browser layer). | MIT | Yes |
| **Turndown** | HTML → Markdown | Purpose-built, well-maintained HTML-to-Markdown converter; configurable heading/list/link style matching Obsidian-compatible Markdown; small, dependency-free. | Only the last-mile conversion step — does nothing for fetching or main-content identification; only useful paired with Readability or Cheerio. | MIT | Yes |
| **pdf-parse** | PDF handling | Was a direct dependency of this repo — `server/package.json` pinned `^1.1.1`, used by `server/lib/ingestion/transcode-executor.js` (Story 1.2's binary-transcode path, per `v03`) for this job. Simple, pure JS, no native binary, near-instant in-process call. | Text-only extraction, no layout/table/heading structure preserved — its output was a flat, unstructured text blob (confirmed in this spike's own POC run, see Deliverable 3's earlier PDF result); v1.x's function API (`pdfParse(buffer) -> {text}`) is a breaking-changed API from the current v2.x major release on npm, requiring an exact version pin. **Superseded by ADR19** (2026-08-30), which replaces `pdf-parse` with OpenDataLoader PDF project-wide. Kept here as the prior baseline, not the recommendation. | MIT | Yes |
| **OpenDataLoader PDF** (`@opendataloader/pdf` / `opendataloader-pdf`) | PDF handling | Benchmark-leading extraction accuracy per its own published numbers (#1 overall, 0.907, across 200 real-world PDFs — correct reading order, table structure, heading hierarchy, per-element bounding boxes); built-in OCR (80+ languages) and LaTeX formula extraction in hybrid mode; fully local in its default (non-hybrid) mode, confirmed by its own docs ("no API calls, no data transmission") and by this spike's own POC run against it; genuinely open-source core (Apache-2.0); Node.js, Python, and Java SDKs. Confirmed live in this spike: converting the arXiv test PDF produced real Markdown headings, correct multi-column reading order, and 3 extracted images, versus `pdf-parse`'s flat unstructured text with 0 images on the same file. **Recommended per ADR19** (registered 2026-08-30, closed/user-directed) — see Deliverable 2. | Requires a local Java 11+ runtime in addition to Node.js — a new external runtime dependency (confirmed present in this dev environment: Java 11.0.15); each conversion call spawns a fresh JVM process (confirmed in this spike: ~3 seconds wall time for a single-file conversion) — ADR19 itself flags this as needing real measurement against expected job volume before being treated as fully settled; its highest-accuracy/OCR/formula modes require a separate local backend server process (out of scope — only the default deterministic local mode is adopted). | Apache-2.0 (2.0+; pre-2.0 was MPL-2.0) | Yes |
| **Firecrawl** (cloud, comparison only) | All-in-one cloud service | One hosted API call returns clean Markdown; handles rendering, anti-bot evasion, and PDF conversion entirely server-side; no local browser-binary maintenance. | Cloud service — every clip is an outbound call to Firecrawl's servers, which violates ADR12 (fully local execution, zero cloud API calls) outright regardless of extraction quality; per-request/subscription cost; the extraction engine and infrastructure aren't auditable or controllable by this project; core repo is AGPL-3.0, and the hosted API itself is proprietary SaaS. | AGPL-3.0 (core repo) / proprietary (hosted API) | No |
| **Apify (Crawlee + Apify Cloud)** (cloud, comparison only) | All-in-one cloud service | Crawlee, its open-source scraping SDK, is genuinely capable and can run entirely locally; Apache-2.0 licensed; large library of ready-made "Actor" scrapers for common site patterns. | The platform's actual value-add (proxy rotation, hosted scheduling, dataset storage) requires the Apify Cloud, which is the same ADR12 conflict as Firecrawl; running only the local Crawlee half forfeits that value-add and reduces to "Playwright/Cheerio wrapped in a job-queue framework this repo doesn't need" (EP12 already owns the job queue). | Apache-2.0 (Crawlee SDK) / proprietary (Apify Cloud) | Partial — Crawlee alone: yes; the platform: no |

## Deliverable 2: Recommendation

**Recommended stack for Clipper:** **Playwright** (fetch/render) + **Mozilla Readability + jsdom** (main-content extraction) + **Turndown** (HTML → Markdown) for HTML URLs; **OpenDataLoader PDF** (`@opendataloader/pdf`), per **ADR19**, for URLs that resolve to a PDF; direct pass-through (no extraction library) for URLs that resolve to plain text/Markdown.

The PDF branch changed from this spike's earlier draft: `pdf-parse` was the initial recommendation, but ADR19 (registered 2026-08-30, closed/user-directed — `documets/design/ADRS.md`) replaces `pdf-parse` with OpenDataLoader PDF as the single extractor for every PDF this system handles, regardless of arrival path (a locally-ingested PDF and a Clipper-fetched PDF both route through the same `job_type='convert'` executor — see ADR19's Scope note and Deliverable 4 below). This spike follows that decision rather than independently re-deciding it.

Strategy is selected per URL by sniffing `Content-Type` (falling back to file extension), mirroring `transcode-executor.js`'s `detectStrategy()` pattern already established in this repo for Story 1.2's binary-transcode path — see Deliverable 3 for the working implementation.

### Pros of the recommended stack
- Fully local, zero outbound cost or calls — the POC run below made only direct HTTPS requests to the five source URLs themselves, plus a local JVM invocation for the PDF branch, nothing else (ADR12-compliant; OpenDataLoader's own docs confirm the same for its default mode).
- Covers the full document-type diversity in the acceptance criteria (JS-hydrated HTML, static HTML, PDF, plain Markdown) through one coherent module with per-type branching, not a single one-size-fits-all tool that's a poor fit for some of those types.
- Reuses a dependency already present in this repo for the HTML branch (Playwright, root `package.json`, `test:ui`, browser binaries already provisioned) and follows ADR19 for the PDF branch rather than introducing a second, spike-local PDF decision.
- Readability's "find the main content" heuristic is exactly Clipper's problem shape: arbitrary user-submitted URLs, no per-site selector maintenance possible or desired.
- Turndown's output is Markdown, matching the vault's Obsidian-compatible format directly — no separate HTML-to-vault conversion step needed downstream. OpenDataLoader's Markdown output format does the same for the PDF branch, confirmed in this spike's POC run (real headings, correct reading order — see Deliverable 3).
- One PDF code path for the whole system: per ADR19's Scope note, a Clipper-fetched PDF and a locally-ingested PDF both end up routed through the same `transcode-executor.js` executor (see Deliverable 4) — Clipper doesn't need its own PDF-extraction code at all.

### Cons of the recommended stack
- Heaviest runtime footprint among the local-only options for the HTML branch: a full Chromium process per HTML fetch. Acceptable for this project's low-volume, mostly-overnight-batch workload (NFRs target dozens of jobs per run, not thousands), but a real concurrency limit is needed rather than launching unbounded parallel browser instances — the existing `THREAD_COUNT` param (params.json) already governs this for other job types and should govern this one too.
- Four runtime dependencies to add to `server/package.json` for the HTML branch in the eventual implementation pass (`playwright`, `jsdom`, `@mozilla/readability`, `turndown`) versus the single client library a cloud service would need. The PDF branch's `@opendataloader/pdf` dependency and its Java 11+ host requirement are ADR19's trade-off, already accepted there, not a new cost this spike introduces.
- Readability can return `null` on non-article-shaped pages — handled in the POC by falling back to Turndown-on-full-body, but that fallback produces noisier Markdown (nav/sidebar content included) than a true article extraction.
- `domcontentloaded` + a fixed settle delay is a heuristic, not a guarantee, for JS-hydrated content — a page with unusually slow client-side rendering could still be captured mid-render. A more robust future refinement would wait for a specific content selector instead of a fixed delay; noted for the implementation pass, not solved here.
- OpenDataLoader's per-call JVM spawn (confirmed in this spike: ~3s wall time for one PDF) means a URL that happens to be a PDF costs noticeably more latency than the HTML branch's rendering time for a comparable page. ADR19 already flags this as needing real measurement against expected job volume — this spike doesn't re-litigate it, just inherits it.

### Why it beats the runner-up(s)
- **vs. Puppeteer + Cheerio + Turndown (HTML branch):** Playwright is already installed in this repo for `test:ui`, so choosing it adds zero new browser-binary provisioning; Puppeteer would be a second, separate Chromium install to maintain alongside Playwright's (which stays needed regardless, for the UI test suite). Multi-engine support is a bonus, not the deciding factor. Cheerio alone can't execute JavaScript — since Clipper must handle arbitrary pasted-in URLs rather than pages this codebase controls, an engine capable of rendering client-hydrated content is a stronger match for the actual acceptance criteria than assuming every target page is server-rendered.
- **vs. Firecrawl / Apify:** Both are disqualified by ADR12 regardless of technical merit — a cloud API call is a cloud API call, full stop. This is a hard disqualifier, not a close call on the comparison table.
- **vs. `pdf-parse` (PDF branch):** this spike's own earlier draft recommended `pdf-parse` for operational simplicity (no JVM, no per-call process spawn, one fewer dependency) over OpenDataLoader's heavier footprint. ADR19 settles that trade-off the other way — accuracy and structure preservation (table/heading/reading-order, per its benchmarks and confirmed directly in this spike's POC run) outweigh the JVM cost, as an explicit user-directed, project-wide decision covering both Clipper and `transcode-executor.js`. This spike follows ADR19 rather than re-arguing it; see the `pdf-parse` comparison-table row above for the fuller case that ADR19 weighed and decided against.

## Deliverable 3: Proof-of-Concept

Working POC at `documets/story/spike-webclipping-poc.js`, using the recommended stack. Run standalone with:

```
npm install playwright jsdom @mozilla/readability turndown @opendataloader/pdf
node spike-webclipping-poc.js
```

Requires a local Java 11+ runtime for the PDF branch (`@opendataloader/pdf`, per ADR19); Playwright's Chromium browser binary must also be provisioned (`npx playwright install chromium`).

It fetches and extracts content from 5 diverse, live URLs — one per required document type — detecting strategy per URL (PDF / plain-Markdown passthrough / rendered HTML) exactly as Deliverable 2 recommends:

| Type | URL |
|---|---|
| News article | `https://www.bbc.com/news/articles/cx2z72x5z1po` |
| Blog post | `https://joelonsoftware.com/2000/04/06/things-you-should-never-do-part-i/` |
| PDF | `https://arxiv.org/pdf/1706.03762` |
| Documentation page | `https://nodejs.org/api/fs.html` |
| Plain Markdown file | `https://raw.githubusercontent.com/microsoft/playwright/main/README.md` |

### Actual output (live run, 2026-08-30, PDF branch re-run after ADR19)

All 5 URLs succeeded on this run — 4 via the `html` strategy (Playwright → Readability → Turndown), 1 via `pdf` (`@opendataloader/pdf`, per ADR19), 1 via `markdown-passthrough` (no extraction library at all, direct fetch). The PDF branch was re-run against OpenDataLoader after ADR19 was registered; the other 4 URLs are unchanged in approach and were also re-run for consistency — the news article's exact text differs slightly from the first run since it's a live, still-updating story (same URL, same strategy, content moved on between runs).

```
=== news article: https://www.bbc.com/news/articles/cx2z72x5z1po ===
strategy: html
title: US and Iran trade strikes after first known US attack in weeks
markdown length: 4974 chars
embedded <img> count: 2
--- first 500 chars ---
2 hours ago

Ruth Comerfordand

Ghoncheh Habibiazad

![Reuters Large ships in the Strait of Hormuz are visible near the beach of Bandar Abbas.](https://ichef.bbci.co.uk/news/480/cpsprodpb/baab/live/f7f345a0-a4b4-11f1-b109-879e35c24276.jpg.webp)Reuters

Vessels in the Strait of Hormuz are visible near the beach of Bandar Abbas, close to Larak Island

Iran and the US have traded strikes after American forces attacked two rocket launchers on Larak Island in the Strait of Hormuz.

The first known US

=== blog post: https://joelonsoftware.com/2000/04/06/things-you-should-never-do-part-i/ ===
strategy: html
title: Things You Should Never Do, Part I
markdown length: 8454 chars
embedded <img> count: 4
--- first 500 chars ---
Netscape 6.0 is finally going into its first public beta. There never was a version 5.0. The last major release, version 4.0, was released almost three years ago. Three years is an awfully long time in the Internet world. During this time, Netscape sat by, helplessly, as their market share plummeted.

It's a bit smarmy of me to criticize them for waiting so long between releases. They didn't do it on purpose, now, did they?

Well, yes. They did. They did it by making the single worst strat

(jsdom logged 5x non-fatal "Could not parse CSS stylesheet" warnings on this page — cosmetic, did not affect extraction)

=== PDF: https://arxiv.org/pdf/1706.03762 ===
strategy: pdf
title: (none)
markdown length: 40950 chars
embedded <img> count: 3
--- first 500 chars ---
# arXiv:1706.03762v7 [cs.CL] 2 Aug 2023

Provided proper attribution is provided, Google hereby grants permission to reproduce the tables and figures in this paper solely for use in journalistic or scholarly works.

###### Attention Is All You Need

###### Ashish Vaswani∗

Google Brain avaswani@google.com

###### Noam Shazeer∗

Google Brain noam@google.com

###### Niki Parmar∗

Google Research nikip@google.com

Jakob Uszkoreit∗ Google Research usz@google.com

###### Llion Jones∗

Google Research
...

(OpenDataLoader detected 38 headings and extracted 3 images to a sibling directory, none of which pdf-parse's flat-text output on the same file identified — see the comparison table's pdf-parse row for that earlier result: 39488 chars, 0 headings, 0 images)

=== documentation page: https://nodejs.org/api/fs.html ===
strategy: html
title: File system | Node.js v26.8.1 Documentation
markdown length: 411075 chars
embedded <img> count: 0
--- first 500 chars ---
The `node:fs` module enables interacting with the file system in a way modeled on standard POSIX functions.

To use the promise-based APIs:

    import * as fs from 'node:fs/promises';

To use the callback and sync APIs:

    import * as fs from 'node:fs';

All file system operations have synchronous, callback, and promise-based forms, and are accessible using both CommonJS syntax and ES6 Modules (ESM).
...

=== plain markdown file: https://raw.githubusercontent.com/microsoft/playwright/main/README.md ===
strategy: markdown-passthrough
title: (none)
markdown length: 11261 chars
embedded <img> count: 0
--- first 500 chars ---
# 🎭 Playwright

[![npm version](https://img.shields.io/npm/v/playwright.svg)](https://www.npmjs.com/package/playwright) [![Chromium version](https://img.shields.io/badge/chromium-153.0.8010.12-blue.svg?logo=google-chrome)](https://www.chromium.org/Home) [![Firefox version](https://img.shields.io/badge/firefox-155.0-blue.svg?logo=firefoxbrowser)](https://www.mozilla.org/en-US/firefox/new/) ...
```

### Lessons from the POC run
- `waitUntil: "networkidle"` (the original candidate approach) timed out on both the news article and the blog post — real sites with persistent ad/analytics/websocket connections never go fully network-idle. Switched to `waitUntil: "domcontentloaded"` plus a 1.5s settle delay, which succeeded on all 4 HTML URLs.
- Content-Type sniffing via `HEAD` correctly routed the PDF and plain-Markdown URLs away from the browser entirely — neither touched Playwright, keeping the common case (an actual PDF or `.md` link) fast and lightweight.
- Readability succeeded (returned a non-null article) on all 4 HTML test URLs; the "degraded fallback" (Turndown on the whole `<body>`) implemented in the POC was not exercised by this run but exists for non-article-shaped pages.
- `@opendataloader/pdf`'s `convert()` writes output to disk rather than returning it — the POC downloads the PDF to a temp file, calls `convert([path], { outputDir, format: "markdown" })`, then reads the resulting `<stem>.md` back (and counts files in the sibling `<stem>_images/` directory for the image count). A single-file conversion took ~3 seconds wall time (JVM spawn included), against pdf-parse's near-instant in-process call on the same file in the earlier run — the latency trade-off ADR19 explicitly accepts.
- OpenDataLoader's output on the same arXiv PDF that `pdf-parse` was tested against earlier in this spike is a clear structural upgrade — real Markdown headings (38 detected) and 3 extracted images, versus `pdf-parse`'s flat, heading-less text blob with no image detection at all.

## Deliverable 4: Integration Path

**Node.js only** — no Python fallback needed. This repo's ingestion pipeline (Story 1.1/1.2, `server/lib/ingestion/`) is 100% Node.js/Express with `node:sqlite`; every library in the recommended stack (Playwright, jsdom, `@mozilla/readability`, Turndown, `@opendataloader/pdf`) has a first-class Node API with no missing capability that would require a second-language fallback (OpenDataLoader's own JVM dependency is a host runtime requirement, not a second application-language fallback — it's still driven from Node via its `@opendataloader/pdf` SDK).

The HTML branch and the PDF branch have different owners, per ADR19's Scope note:

**HTML branch (owned by Clipper — new code, this spike's main deliverable):**
Proposed shape, following the existing `server/lib/ingestion/` executor pattern (`canHandle(db, job)` / `execute(db, job, cfg)`, dispatched by `batch/job-executors.js`'s `job_type` table — see `ingest-executor.js` and `v03`'s `transcode-executor.js`):

- New module, e.g. `server/lib/ingestion/clip-executor.js`, exporting the same `canHandle`/`execute` contract as the existing executors, handling the HTML fetch/render/extract path (Playwright → Readability/jsdom → Turndown).
- Picks up where `url-relocator.js` (in `v03`) currently leaves off: that module only *relocates* a staged URL placeholder into `$RAW_DIR/clipping` "for extraction" — it does not fetch anything yet. `clip-executor.js` would be the actual fetch-and-extract step for the HTML case.
- Registers under the existing `convert` `job_type` (`documets/design/schema.sql`'s enum is `ingest` / `convert` / `classify` / `index` — no dedicated `clip`/`fetch` type, and none is needed).
- Reuses `vault-writer.js`'s `copyToVaultIncoming` (already established by `v03`'s `transcode-executor.js`) to land extracted Markdown in `$VAULT_DIR/incoming` with a frontmatter block referencing the source (parallel to `transcode-executor.js`'s `source_raw` field — here, `source_url`).
- New `server/package.json` dependencies for that future pass: `playwright`, `jsdom`, `@mozilla/readability`, `turndown`. Playwright additionally needs its browser binary provisioned (`npx playwright install chromium`) as a one-time setup step — worth documenting alongside `scripts/ui-server.ps1` when that implementation pass happens, since it's currently only provisioned because of the root-level `test:ui` dependency, not anything `server/` itself declares.

**PDF branch (owned by `transcode-executor.js` — an existing-file library swap, not new Clipper code):**
Per ADR19's Scope note, a Clipper-fetched PDF gets no PDF-handling code of its own. When `clip-executor.js`'s `detectStrategy()`-style sniff (mirrored from the POC — see Deliverable 3) identifies a URL as a PDF, the downloaded file is staged and handed off as a `convert`-type `job_file` exactly like a locally-ingested PDF (file upload, directory watcher) already is — both converge on the same `transcode-executor.js` executor, so there is no PDF-specific code inside `clip-executor.js` at all. The work ADR19 actually requires is a separate, already-scoped swap inside `transcode-executor.js` itself: replace its `extractPdfText()`/`pdf-parse` branch with a call to `@opendataloader/pdf`'s `convert()`, update `server/package.json` (drop `pdf-parse`, add `@opendataloader/pdf`), and account for `convert()`'s file-in/file-out shape (unlike `pdf-parse(buffer)`, it needs a real path and writes its own output file — see the POC's `clipPdf()` for the read-back pattern) and its JVM-spawn latency. ADR19 notes this swap is being handled as its own follow-up implementation pass, separate from this spike and separate from Clipper's HTML work.

This spike does not modify `server/` or `batch/` — both shapes above are recommendations for future implementation passes (Clipper's HTML path, and `transcode-executor.js`'s already-scoped PDF-library swap), not something built here.

## Acceptance Criteria
- ✅ At least 5 candidate libraries evaluated — 10 evaluated (Deliverable 1).
- ✅ Comparison documented with scoring against criteria above — Deliverable 1.
- ✅ Recommended library tested with proof-of-concept (working code sample) — Deliverable 3, `spike-webclipping-poc.js`, live output captured above.
- ✅ Integration path documented (Node.js module, Python fallback, or both) — Deliverable 4.

## Status
**COMPLETED**

## Changelog
- **2026-08-28** — Spike created to unblock Story 1.2 (Clipper implementation)
- **2026-08-30** — Filled in all four deliverables: 10-candidate comparison table, recommendation (Playwright + Readability/jsdom + Turndown for HTML; `pdf-parse` for PDF), working POC against 5 live diverse URLs with captured output, and integration path into `server/lib/ingestion/`. Mid-spike, a message referenced "ADR19" as having pinned OpenDataLoader PDF (`@opendataloader/pdf`) as this project's PDF tool; `documets/design/ADRS.md` was checked directly and ended at ADR18 with no ADR19 present, in both this worktree and the `v03` branch at that moment, and an attempt to install `@opendataloader/pdf` to evaluate it live was declined by the tool-permission layer. OpenDataLoader PDF was evaluated on its own merits in the comparison table but not adopted as the recommendation pending verification. Status flipped to COMPLETED with `pdf-parse` as the PDF recommendation.
- **2026-08-30 (correction)** — ADR19 confirmed real: it was registered in the coordinating session's working copy at the user's explicit request, committed to the `v03` branch (`documets/design/ADRS.md`), and independently verified there directly (not just taken on the coordinator's word) before this correction was made. ADR19 replaces `pdf-parse` with OpenDataLoader PDF as the single PDF extractor for this whole system, both for locally-ingested PDFs and Clipper-fetched ones, both routed through `transcode-executor.js`. Revised: Deliverable 2's recommendation (PDF branch now OpenDataLoader PDF, citing ADR19; `pdf-parse` demoted to "prior baseline, superseded" in the comparison table); re-ran the POC's PDF branch live against `@opendataloader/pdf`'s `convert()` (Java 11 runtime, already present in this dev environment) and captured real output — 40,950-char structured Markdown with 38 detected headings and 3 extracted images, versus `pdf-parse`'s flat 39,488-char text blob with no structure or images on the same file; updated Deliverable 4's integration path to reflect ADR19's scope note — PDF handling is an existing-file library swap inside `transcode-executor.js`, not new code owned by Clipper. The HTML/text recommendation, the rest of the comparison table, and the non-PDF POC results are unchanged.
