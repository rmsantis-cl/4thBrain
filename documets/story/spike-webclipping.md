---
name: spike-webclipping
description: Evaluate and select libraries for web document retrieval and HTML extraction
metadata:
  version: 2.0
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

## Deliverables
1. Comparison table: library name, pros, cons, license, local-capable (yes/no)
2. Recommendation with rationale
3. Proof-of-concept: fetch and extract content from 5 diverse URLs (news article, blog post, PDF, documentation, markdown file)

## Acceptance Criteria
- ✅ At least 5 candidate libraries evaluated
- ✅ Comparison documented with scoring against criteria above
- ✅ Recommended library tested with proof-of-concept (working code sample)
- ✅ Integration path documented (Node.js module, Python fallback, or both)

## Status
**READY**

## Changelog
- **2026-08-28** — Spike created to unblock Story 1.2 (Clipper implementation)
