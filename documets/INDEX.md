---
name: INDEX
description: Master index of all artifacts, specs, and foundational documents in 4thBrain
metadata:
  version: 1.4
  created-by: Claude Code
  date: 2026-09-02
---

# INDEX — 4thBrain Documentation & Artifacts

Master catalog of all artifacts, specification documents, interview logs, and foundational instruction files created or used in this project.

| File Name | History |
|-----------|---------|
| design/adr20-boot-sequence.md | [2026-09-01] Boot sequence design for Story 7.2 — orchestrates Ollama/Node.js/MCP startup with structured JSON logging and port verification |
| BATCH_TRACKER.md | [2026-08-31] Created to persist Anthropic Batch API job tracking across sessions; stores batch ID, description, submission/completion dates, status<br>[2026-08-31] Infrastructure: submit-batch skill refactored to use Anthropic Batch API (half cost), got-batch skill created to check/update status on demand |
| story/story-13.2.md | [2026-08-31] Working notes created for Story 13.2 (admin UI restructuring); documents implementation, acceptance criteria verification, and deferred mobile-responsiveness audit |
| story/story-6.1.md | [2026-08-28] Web Ingestion Form & Submission Handler working notes; added SUB-TASKS for mock implementations (Clipper, Extractor, RAG, Classification) |
| story/spike-webclipping.md | [2026-08-28] Spike: WebClipping Library Selection — research and evaluate web scraping/content extraction tools |
| story/spike-extraction.md | [2026-08-28] Spike: Document Extraction Library Selection — research and evaluate PDF/image/archive extraction tools |
| story/story-4.1-plan.md | [2026-08-28] Story 4.1 Implementation Plan — background job processor design with FileSystemWatcher and polling options<br>[2026-08-30] Superseded by story/story-4.1.md — see that file's "Reconciling story-4.1-plan.md" section for what changed and why |
| story/story-1.1.md | [2026-08-25] Working notes created<br>[2026-08-30] Implemented (file-validator, path-resolver, vault-writer, ingest-executor, watcher); fixed Bug 2 as a prerequisite; logged Design Debt item 3 |
| story/story-4.1.md | [2026-08-30] Created — implemented (lock-manager, job-executors, cleanup, worker); reconciles story-4.1-plan.md against the live schema and ADR5/ADR10 |
| bugs/Bug-2-Repository-Layer-Schema-Mismatch.md | [2026-08-30] Created — repository layer (document/job/tag/classification) out of sync with the Story 12.2 schema redesign, closed inline while implementing Stories 1.1/4.1 |
| bugs/Bug-3-Boot-Script-Encoding-Parse-Failure.md | [2026-09-02] Created — Start-4thBrain.ps1 does not parse under PowerShell 5.1 (UTF-8 without BOM + non-ASCII glyphs); second latent defect uses PS7-only Join-String. Open, against Story 7.2 |
