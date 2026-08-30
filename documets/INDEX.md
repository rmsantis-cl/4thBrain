---
name: INDEX
description: Master index of all artifacts, specs, and foundational documents in 4thBrain
metadata:
  version: 1.1
  created-by: Claude Code
  date: 2026-08-30
---

# INDEX — 4thBrain Documentation & Artifacts

Master catalog of all artifacts, specification documents, interview logs, and foundational instruction files created or used in this project.

| File Name | History |
|-----------|---------|
| story/story-6.1.md | [2026-08-28] Web Ingestion Form & Submission Handler working notes; added SUB-TASKS for mock implementations (Clipper, Extractor, RAG, Classification) |
| story/spike-webclipping.md | [2026-08-28] Spike: WebClipping Library Selection — research and evaluate web scraping/content extraction tools |
| story/spike-extraction.md | [2026-08-28] Spike: Document Extraction Library Selection — research and evaluate PDF/image/archive extraction tools |
| story/story-4.1-plan.md | [2026-08-28] Story 4.1 Implementation Plan — background job processor design with FileSystemWatcher and polling options<br>[2026-08-30] Superseded by story/story-4.1.md — see that file's "Reconciling story-4.1-plan.md" section for what changed and why |
| story/story-1.1.md | [2026-08-25] Working notes created<br>[2026-08-30] Implemented (file-validator, path-resolver, vault-writer, ingest-executor, watcher); fixed Bug 2 as a prerequisite; logged Design Debt item 3 |
| story/story-4.1.md | [2026-08-30] Created — implemented (lock-manager, job-executors, cleanup, worker); reconciles story-4.1-plan.md against the live schema and ADR5/ADR10 |
| bugs/Bug-2-Repository-Layer-Schema-Mismatch.md | [2026-08-30] Created — repository layer (document/job/tag/classification) out of sync with the Story 12.2 schema redesign, closed inline while implementing Stories 1.1/4.1 |
