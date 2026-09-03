---
name: ADRS
description: Architectural Decision Records for 4thBrain
date: 2026-09-02
metadata:
  version: 1.3
  created-by: Claude Code
---

# Architectural Decision Records

Per the ADR document type (Document Type 4) defined in `documets/method/Software Documentation Summary and Framework.md`. Each record has a Description, Why, Date Created, and Date Cancelled (blank if still active). Decisions below were extracted from the existing NFR baseline (`documets/design/SYSTEM-REQUIREMENTS-SPECIFICATION.md`) and from choices made during this session — none had been formally logged as ADRs before now.

## ADR1: Windows 11 host with WSL2 for Ollama only

**Description:** Ollama (local LLM inference engine) runs inside WSL2 on a single Windows 11 PC. Node.js orchestration server, MCP server, and all other components run natively on Windows. No separate server infrastructure.
**Why:** Ollama requires Linux for GPU acceleration and the Fedora systemd integration. Node.js runs natively on Windows for simplicity (no dual-environment coordination needed for the app layer). Keeps the system single-host and local — no cloud infrastructure. Source: NFR1.
**Date Created:** 2026-08-23
**Date Cancelled:** —

## ADR2: Ollama running llama3.2 as the local inference engine

**Description:** All LLM inference (classification, tagging, briefing synthesis) runs through Ollama hosting the llama3.2 model, with GPU passthrough in WSL2.
**Why:** Zero outbound network calls and zero cloud API cost is a core project requirement (privacy-first design). Source: NFR2.
**Date Created:** 2026-08-23
**Date Cancelled:** —

## ADR3: Obsidian vault + Smart Connections as knowledge base and vector store

**Description:** Notes are stored as plain Markdown in an Obsidian-compatible vault; Smart Connections generates and maintains local vector embeddings (`.smart-env`).
**Why:** Keeps the vault human-readable and portable (plain `.md` files) while still supporting RAG retrieval, without depending on an external vector database service. Source: NFR3.
**Date Created:** 2026-08-23
**Date Cancelled:** —

## ADR4: Smart Connections MCP server exposes the vector index

**Description:** The vault's vector index is exposed to external tools (Claude Code, custom scripts) via a Model Context Protocol server over stdio/HTTP, rather than a bespoke API.
**Why:** MCP gives a standard, tool-agnostic query interface instead of building a custom retrieval API. Source: NFR4.
**Date Created:** 2026-08-23
**Date Cancelled:** —

## ADR5: Node.js as the orchestration server (Windows-native)

**Description:** A Node.js process runs natively on Windows, serving the Web UI endpoints, ingestion API, and job orchestration. It calls Ollama (running in WSL2) over HTTP. All client-side logic (browser, MCP) communicates with the Windows Node.js process directly.
**Why:** One runtime for both the Web UI and orchestration, avoiding a split stack. Running Node.js natively on Windows (not inside WSL2) simplifies the architecture — no cross-environment IPC beyond the single Ollama HTTP boundary at port 11434. Source: NFR5.
**Date Created:** 2026-08-23
**Date Cancelled:** —

## ADR6: OpenAI-compatible SDK against Ollama's local endpoint

**Description:** Data processing scripts call Ollama via the OpenAI JS SDK pointed at `http://localhost:11434/v1`, rather than a custom Ollama client.
**Why:** Reuses a well-supported, familiar SDK interface for LLM calls instead of writing bespoke HTTP handling, while still keeping inference fully local. Source: NFR6.
**Date Created:** 2026-08-23
**Date Cancelled:** —

## ADR7: Web-based management UI hosted by the Node.js server

**Description:** The ingestion form, search interface, and monitoring dashboard are a web UI served directly by the Node.js orchestration server, not a separate frontend deployment.
**Why:** Single-host, single-process simplicity for a personal single-user system; no separate frontend server/deployment needed. Source: NFR7.
**Date Created:** 2026-08-23
**Date Cancelled:** —

## ADR8: WSL2 resource governance via `.wslconfig`

**Description:** WSL2 memory/VRAM usage is capped via `.wslconfig` (e.g., max 16GB RAM) to prevent Ollama/Node from starving the Windows host.
**Why:** Protects the host OS from OOM crashes during heavy local LLM inference, a real risk when running both inference and orchestration on one consumer machine. Source: NFR8.
**Date Created:** 2026-08-23
**Date Cancelled:** —

## ADR9: Ordered startup with health checks (Ollama in WSL2 systemd, Node.js on Windows)

**Description:** Ollama is managed by systemd inside WSL2 and auto-starts on WSL2 boot. Node.js (Windows-native, running via `server/bootstrap.js`) verifies Ollama reachability before binding its own port. The bootstrap sequence waits for Ollama HTTP endpoint to respond before proceeding.
**Why:** Node.js and MCP depend on Ollama being reachable; bootstrap.js performs explicit health checks rather than blind startup to avoid early failures. Ollama's systemd management (WSL2 side) ensures it persists across restarts; Node.js bootstrap (Windows side) adds the wait-for-dependency logic. Source: NFR9.
**Date Created:** 2026-08-23
**Date Cancelled:** —

## ADR10: Strict concurrency=1 queueing for local inference

**Description:** Batch payloads to Ollama are processed sequentially or via a queue with concurrency capped at 1, rather than firing concurrent inference requests.
**Why:** Local inference on consumer hardware doesn't have headroom for concurrent LLM calls — parallel requests risk memory overhead spikes or dropped HTTP sockets. Source: NFR11.
**Date Created:** 2026-08-23
**Date Cancelled:** —

## ADR11: Structured JSON logging to stdout/file

**Description:** Script execution, LLM parse failures, and MCP tool call traces are logged as structured JSON rather than freeform text logs.
**Why:** Enables failures (bad LLM JSON responses, MCP dropouts) to be logged and inspected without crashing the main server process, and keeps logs machine-parseable for future tooling. Source: NFR12.
**Date Created:** 2026-08-23
**Date Cancelled:** —

## ADR12: Fully local inference — zero cloud API calls

**Description:** All LLM inference, indexing, and processing runs locally; the system makes no outbound calls to cloud LLM APIs at runtime.
**Why:** Core privacy-first design goal stated in the Project Description — eliminates both privacy exposure and ongoing cloud API cost. Cuts across NFR2, NFR6, and the overall Project Description.
**Date Created:** 2026-08-23
**Date Cancelled:** —

## ADR13: Single repository with per-module directories, not separate subprojects

**Description:** The five functional areas (`vault/`, `local-llm/`, `ui/`, `ingestor-classification/`, `batch/`) are organized as directories within one repository, each with its own `CLAUDE.md` and `backlog.md`, rather than split into independent repos/subprojects.
**Why:** The modules are runtime-coupled (share the same WSL2/Ollama process and vault) and there's no team boundary to enforce via repo separation — for a single-user local system, separate repos would add cross-repo dependency and release overhead without a corresponding benefit. The Web UI (`ui/`) was considered as a candidate for a separate repo due to its more independent lifecycle, but was kept in-repo for now given the project's early stage.
**Date Created:** 2026-08-24
**Date Cancelled:** —

## ADR14: Ingestion directory layout ($RAW_DIR staging vs. $VAULT_DIR/incoming and /raw)

**Description:** Inbound files land in `$RAW_DIR` (outside the vault). Text/MD/HTML — already indexable — are copied directly to `$VAULT_DIR/incoming`. URLs are moved to `$RAW_DIR/clipping` for extraction. Other binary formats are transcoded into MD/text; the transcoded output is written to `$VAULT_DIR/incoming` and the original binary is archived to `$VAULT_DIR/raw`, with the transcoded file referencing that archived location.
**Why:** Binary files can't be indexed until transcoded, so they must not enter the vault (which drives Smart Connections indexing, per ADR3) before conversion completes. Separating pre-vault staging (`$RAW_DIR`) from the indexable queue (`$VAULT_DIR/incoming`) and archived originals (`$VAULT_DIR/raw`) keeps the vault free of un-indexable content while preserving traceability back to source files. Source: FR1, FR2, Story 1.1, Story 1.2.
**Date Created:** 2026-08-25
**Date Cancelled:** —

## ADR15: Topic/subtopic-driven vault path with sibling attachment directories

**Description:** During classification, the local LLM infers a topic/subtopic in addition to tags — this topic/subtopic pair, not the tags, determines the target vault subfolder a note is filed into. If a note references images, documents, or other files, those referenced files are placed in a sibling directory next to the note (not inline in `VAULT_DIR/incoming` or mixed into the note's own path), so a note and its attachments travel together.
**Why:** Tags describe *what a note is about* for search/retrieval, but filing needs a single deterministic path — topic/subtopic gives a stable, hierarchical basis for that, decoupled from the (multi-valued, LLM-assisted) tag set. Keeping attachments in a sibling directory avoids collisions between unrelated notes' attachments and keeps a note's referenced files discoverable and easy to move/archive together with it. Source: FR3, Story 2.1.
**Date Created:** 2026-08-25
**Date Cancelled:** —

## ADR16: Where does each component run — WSL2 vs. any environment?

**Status:** Closed (2026-08-26) — tested and resolved.
**Decision:** Keep all components (Ollama, ingestion/search app, Obsidian) running in their current native/Windows environments. Running Obsidian in WSL2 via flatpak is technically feasible but offers no practical benefit — UI quality is lower, and the vault/Smart Connections work equally well accessed from Windows. Re-evaluate this decision only when packaging for final delivery (EP11), after the development process is complete.
**Abstract:** Ollama must run in WSL2 (fixed, per ADR2); the ingestion/search app can run anywhere. Testing confirmed Obsidian can run in WSL2 via WSLg/flatpak, but UI degradation and lack of benefit means keeping the current native-Windows setup is the right call for development.
**Full record, testing results, and rationale:** see `documets/design/adr16-component-placement.md`.
**Date Created:** 2026-08-25
**Date Cancelled:** —

## ADR17: SQLite as the local structured metadata / job-queue store

**Status:** Closed (2026-08-26) — implementation decision made.

**Description:** The `Document`/`Status`/`Classification`/`Job` data model (`documets/design/classes.md`) is persisted in a single-file SQLite database, separate from the Markdown vault (content) and `.smart-env` (vectors). Full schema: `documets/design/schema.sql`.

**Decision:** Use SQLite for simplicity, minimal operations overhead, and low-volume sequential processing (ADR10, concurrency=1).

**Why:** The vault stores note *content* and `.smart-env` stores *embeddings* — neither is a good fit for structured, queryable, relational metadata (document lifecycle status, hierarchical classification, job queue/history with parent-child jobs). SQLite is single-file, zero-config, requires no server process, and fits the same local-first/zero-cloud/single-host constraints as the rest of the stack (ADR1/ADR12) while giving real relational queries (join documents to their classification/status, walk job trees) that flat files and the vector store can't. It's also directly usable from the Node.js orchestration server (ADR5) via `better-sqlite3` or Node's built-in `node:sqlite`, with no new runtime dependency beyond Node itself. Source: NFR15, EP12/Story 12.1.

**Critical Implementation Constraint:** SQLite uses database-level locking (not row/table-level). When a process writes, the entire database is locked for other processes. **Transactions must be kept brief** — avoid long-running transactions that hold locks across multiple operations. If implementation reveals a need for long concurrent transactions (e.g., parallel batch processing requiring simultaneous multi-row updates), **this decision must be revisited and migrated to PostgreSQL**.

**Date Created:** 2026-08-26
**Date Closed:** 2026-08-26
**Date Cancelled:** —

## ADR18: Local relational database technology for processing-state persistence (OPEN — technology choice TBD)

**Status:** Open — evaluating SQLite vs. PostgreSQL.

**Description:** The system maintains state during ingestion, classification, and batch processing: documents' lifecycle status, job queue history, classification assignments, and intermediate results. This state must be readable and writable by multiple concurrent processes/scripts (the Node.js orchestration server, Python batch jobs, CLI tools) without corruption. It must not bloat the Obsidian vault (which stays content-only). Two technology options are being evaluated: **SQLite** (single-file, zero-config, no server) vs. **PostgreSQL** (server-based, better concurrent-write handling). Additionally, **a separate vector database (independent of Obsidian's .smart-env) is under consideration** to facilitate initial document classification before vault filing — Smart Connections currently generates embeddings only after notes are in the vault, but having pre-vault embeddings could improve the LLM's classification accuracy.

**Why this decision matters:**
- The Document/Status/Classification/Job model (ADR17) needs persistent storage. ADR17 chose SQLite for simplicity, but the concurrent-access requirement (multiple scripts writing simultaneously) may exceed SQLite's write-locking capabilities on local filesystems (especially on Windows with its stricter file locking). PostgreSQL handles concurrent writes cleanly but adds operational complexity (requires a server process, network socket configuration, process supervision per ADR9).
- A separate vector store (current .smart-env) could speed up classification — the LLM could generate embeddings and compare against existing vault vectors during ingestion, before the document is filed. This would be a classification hint mechanism (FR3 / ADR15), not a full RAG replacement.

**Constraints:**
- No cloud services — any database must be local (ADR1/ADR12).
- Single-host, single-user system (no multi-tenant requirements).
- Low volume of write operations (~dozens of jobs per overnight batch run, not thousands).
- Cross-language access (Node.js, Python, potentially bash) required.

**Open questions:**
1. Is concurrent write access to the same tables a real bottleneck, or will serialized job processing (ADR10, concurrency=1 for Ollama) keep writes naturally sequential?
2. If a separate vector database is needed, should it be SQLite (same as ADR17), a lightweight embedding store like Qdrant/Milvus, or embedded within the Node.js process (in-memory + disk cache)?
3. What is the performance impact of pre-vault embeddings on classification accuracy vs. the complexity of maintaining two vector stores?

**Full analysis:** see `documets/design/adr18-persistence-tech.md`.

**Date Created:** 2026-08-26
**Date Cancelled:** —

## ADR19: OpenDataLoader PDF (`@opendataloader/pdf`) as the PDF extraction library, replacing `pdf-parse`

**Status:** Closed — user-directed decision, 2026-08-30.

**Description:** PDF-to-text/Markdown extraction uses [OpenDataLoader PDF](https://github.com/opendataloader-project/opendataloader-pdf) (`@opendataloader/pdf` npm package, Java core under the hood via a bundled JVM invocation), replacing `pdf-parse`. This is one shared extractor for every PDF the system handles, regardless of arrival path: a locally-ingested PDF (file upload, directory watcher) and a PDF fetched by the web Clipper both land in `$RAW_DIR` and are routed through the same `job_type='convert'` executor (Story 1.2's `transcode-executor.js`) — there is no separate PDF-handling code path for web-clipped PDFs.

**Why:** `pdf-parse` was picked as an implementation detail during Story 1.2 with no ADR behind it. The user specified OpenDataLoader PDF directly as the replacement. It's open-source (Apache-2.0), runs fully locally in its default/non-hybrid mode (no outbound calls, consistent with ADR12), and its own published benchmarks report #1 overall extraction accuracy (0.907) and table accuracy (0.928) across 200 real-world PDFs (multi-column layouts, scientific papers) — a meaningful upgrade over `pdf-parse`'s flat-text-only output, which discards table structure and reading order entirely. It ships a native Node.js SDK (`@opendataloader/pdf`, `convert(files, { outputDir, format: "markdown,json" })`) matching this repo's Node-only application stack (ADR5), and its Markdown/JSON output (JSON carries per-element bounding boxes) is a better fit for the vault-Markdown target (ADR3) and for future citation/traceability needs than `pdf-parse`'s plain string.

**Trade-off accepted:** OpenDataLoader's core is Java, so it requires a Java 11+ JRE/JDK on the host in addition to Node.js — a new external runtime dependency this stack didn't previously have (ADR1 scoped WSL2/Windows, ADR5 scoped Node.js as the orchestration layer; neither anticipated a JVM dependency). Each `convert()` call spawns its own JVM process, so per-file latency is higher than an in-process JS library — the library's own docs recommend batching multiple files per call rather than one `convert()` per file, which doesn't cleanly fit this system's one-job-at-a-time worker model (Story 4.1). The first real implementation pass should measure actual per-file JVM startup overhead against expected volume (~dozens of jobs per overnight batch run, per ADR18) before treating this as settled. OpenDataLoader's optional hybrid mode (AI-assisted extraction for complex pages, via a separately-run `opendataloader-pdf-hybrid` backend) is explicitly out of scope for now — only the deterministic local mode is adopted, so this stays ADR12-compliant without needing to evaluate the hybrid backend's own model/network behavior.

**Scope:** Applies to Story 1.2's `transcode-executor.js` PDF branch (already shipped with `pdf-parse` — this ADR supersedes that choice and requires a follow-up implementation pass to swap the library) and to the webclipping spike's "PDF via URL" evaluation criterion, which should cite this ADR rather than independently evaluating PDF extraction libraries.

**Source:** User directive, 2026-08-30 — https://github.com/opendataloader-project/opendataloader-pdf (retrieved to the Obsidian vault at `External/Web/github.com/opendataloader-project-opendataloader-pdf.md`, logged in `External/Web/References/references.md`).

**Date Created:** 2026-08-30
**Date Cancelled:** —

## ADR21: Block-level embedding skips are expected coverage, not indexing failures

**Status:** Closed — decided 2026-09-02 while scoping Story 3.1 (task 3.1-E).

**Description:** Story 3.1 measures "indexed" at **source (whole-note) level only**. A note counts as indexed when Smart Connections holds a current whole-note embedding for it, regardless of how many of that note's blocks were skipped. Block-level skip counts are reported as informational coverage (the Story 6.3 status panel's "Blocks" row), never as failures: they are excluded from `listFailed()`, from the failed-notes list, and from any Story 3.1 acceptance check. Source-level skips keep the meaning Spike 3.2 assigned them under user direction — a skipped *source* is what this project reports as "failed to index".

**Why:** Spike 3.2 found 720 of 1,045 blocks skipped (68.9%) against only 1 of 31 sources. Re-measured on the same vault 2026-09-02 after it grew: 1,295 of 1,784 blocks skipped (72.6%) against 12 of 57 sources. The ratio is stable across a near-doubling of the vault, which is the signature of a policy threshold rather than a fault — `smart_env.json` sets `smart_blocks.min_chars: 200`, and most Markdown blocks (headings, single-line bullets, short paragraphs, frontmatter fences) are simply shorter than that. Three consequences follow:

1. **No content is lost.** Every one of those blocks belongs to a source that is itself embedded at whole-note level, so semantic retrieval still reaches the text. Block embeddings buy finer-grained retrieval, not coverage.
2. **Treating them as failures makes the signal useless.** It would leave Story 3.1 permanently unachievable, and would bury the 12 genuinely un-indexed notes under ~1,300 entries with no available remedy — you cannot "fix" a 40-character bullet into a 200-character one.
3. **There is no action to take.** The only lever is lowering `smart_blocks.min_chars`, which is a retrieval-quality tuning decision, not a defect fix.

**Consequences for implementation:** No filter code is needed — `server/lib/smart-connections-status.js` already scopes `listFailed()`/`skippedSources` to sources and reports blocks only as counts. This ADR pins that behavior so a later pass does not "helpfully" merge block skips into the failure list; `server/test/smart-connections-status.test.js` asserts the source/block split.

**Revisit if:** Story 6.2's semantic half turns out to need block-level granularity to return useful snippets, or the source-level skip ratio starts tracking the block ratio (which would suggest a real ingestion fault rather than a threshold effect).

**Supersedes:** the open question left in `documets/story/spike-3.2.md` ("Decide whether Story 3.1 needs to handle 'unexpected' (orphaned) embeddings, or whether surfacing them via this script is enough for MVP") only as far as *blocks* are concerned. Source-level `unexpected` items stay in the failed list, since a vector that outlived its eligibility is a real disagreement between the index and the current policy.

**Date Created:** 2026-09-02
**Date Cancelled:** —

## ADR22: SQLite FTS5 as the keyword half of hybrid search, over a derived index rebuilt from vault files

**Status:** Closed — decided 2026-09-02 while implementing Story 6.2 (tasks 6.2-A/6.2-B).

**Description:** Story 6.2's keyword search runs on SQLite's built-in FTS5 full-text extension, against a **derived** index (`document_fts` plus a `document_index_state` bookkeeping table) that the search module creates on demand and keeps in the same `server/4thbrain-metadata.db` file. Body text is read from each document's `uri_location` on disk — the `document` table stores metadata only, never note content, so name/path matching alone could not produce the snippets Story 6.2's acceptance criterion requires. The index syncs incrementally: a document is re-read only when its `document.updated` timestamp is newer than the timestamp recorded when it was last indexed. If a future runtime turns out to lack FTS5, the module falls back to a `LIKE`-based scan over the same stored bodies, with snippets computed in JS; the fallback is a documented degraded mode, not the design target.

**Why:** FTS5 ships inside the `node:sqlite` build this project already runs (verified on Node v22.22.3 — `CREATE VIRTUAL TABLE ... USING fts5`, `bm25()`, and `snippet()` all work), so it adds no dependency, no second process, and no second datastore. It gives ranking (`bm25`) and snippet extraction for free — both are explicit acceptance-criterion requirements — where a `LIKE` scan would give neither without hand-rolling them. Keeping the index in the existing database file keeps ADR17's single-SQLite-file model intact and stays consistent with ADR13 (one repo, no separate subprojects).

**Why derived, and why not in `schema.sql`:** the index holds no source-of-truth data — every row is reconstructible from `document` plus the files on disk — so it is a cache, on the same footing as `.smart-env` rather than as the metadata model. Putting it in the canonical `documets/design/schema.sql` would make a rebuildable artifact look like schema of record and would put an EP6 concern inside EP12's schema. Logged as DESIGN-DEBT item 7 so the placement gets a real EP12 decision rather than being settled by whoever wrote the code first.

**Trade-off accepted:** body text is duplicated between the vault file and the FTS index, and the first search after a batch of ingestions pays the file-read cost for the new documents (sub-second on the current dev dataset; a vault of tens of thousands of notes would want the sync moved into the batch worker instead of onto the request path). Reads are capped so one oversized file cannot stall a query.

**Date Created:** 2026-09-02
**Date Cancelled:** —

## ADR24: Actuator Coordinator — direct handoff, sweep as auxiliary backstop

**Status:** Proposed — not yet implemented, open questions unresolved.
**Decision:** Actuators hand off to the next stage by calling a Coordinator directly (in-process), in addition to writing the next-stage `job` row Bug 101's fix already produces. `batch/worker.js`'s periodic sweep (`runCycle()`) stops being the primary delivery mechanism and becomes an auxiliary backstop — it catches jobs whose creating actuator crashed before reaching the Coordinator, plus its existing orphan/stale-lock cleanup role.
**Abstract:** Matches `documets/OriginalProcess.uml` (a pre-existing sequence diagram showing a `Coordinator` actor dispatching to actuators, which then call each other directly), which Story 4.1's sweep-only implementation diverged from without a recorded reason. Raised as DESIGN-DEBT item 7 after Bug 101 exposed the consequence: a fully-processed document sat untouched because no scheduler was ever configured to run the sweep at all.
**Full record, rationale, and open questions (Story ownership, Ollama-concurrency-lock granularity, sync-vs-fire-and-forget dispatch):** see `documets/design/adr24-actuator-coordinator.md`.
**Date Created:** 2026-09-03
**Date Cancelled:** —

## Changelog

- 2026-09-03: Logged ADR24 (Proposed) — Coordinator component for direct actuator-to-actuator handoff, demoting the sweep to an auxiliary stalled-job backstop, per user correction against `documets/OriginalProcess.uml` and DESIGN-DEBT item 7. Not implemented — open questions on Story ownership, lock granularity, and dispatch semantics need resolution first.
- 2026-09-02 (architecture correction): Corrected ADR1, ADR5, ADR9 — Node.js runs natively on Windows, not in WSL2. Only Ollama runs in WSL2. ADR1 now says "Ollama-only" instead of "core compute"; ADR5 clarifies Windows-native Node.js; ADR9 describes Ollama systemd (WSL2) + Node.js bootstrap (Windows) coordination. Updated ADR16 and ADR20 to reflect this architecture (no complex cross-environment IPC; one clean boundary at Ollama HTTP:11434).
- 2026-09-02: Logged ADR21 (closed) — block-level embedding skips are expected coverage under Smart Connections' `min_chars` policy, not Story 3.1 indexing failures; indexing is measured at source level. Logged ADR22 (closed) — SQLite FTS5 over a derived, incrementally-synced index as Story 6.2's keyword backend, with a documented LIKE fallback.
- 2026-08-30: Logged ADR19 (closed) — OpenDataLoader PDF (`@opendataloader/pdf`) replaces `pdf-parse` for all PDF extraction (Story 1.2's transcode executor and the webclipping spike's PDF handling), per explicit user direction. Notes the new JVM host dependency and per-call JVM-spawn latency as accepted trade-offs.
- 2026-08-26: Closed ADR17 — SQLite chosen for simplicity and low-volume sequential processing. Critical constraint: keep transactions brief; if long concurrent transactions are needed during implementation, decision must be revisited (migrate to PostgreSQL).
- 2026-08-26: Logged ADR18 (open) — relational database technology (SQLite vs. PostgreSQL) for processing-state persistence, plus consideration of a separate vector database for pre-vault classification.
- 2026-08-26: Closed ADR16 — tested Obsidian in WSL via flatpak; no benefit due to UI degradation; keep current setup.
- 2026-08-24: Created. Backfilled ADR1–ADR12 from the existing NFR baseline; logged ADR13 for this session's module-split decision.
- 2026-08-25: Logged ADR14 for the ingestion directory layout ($RAW_DIR / $VAULT_DIR/incoming / $RAW_DIR/clipping / $VAULT_DIR/raw), dictated by the user for Story 1.1/1.2.
- 2026-08-25: Logged ADR15 for topic/subtopic-driven vault path resolution and sibling attachment directories, dictated by the user for Story 2.1.
- 2026-08-25: Logged ADR16 (open) for component-to-environment placement — WSL2 vs. any environment — with the open question of whether Obsidian itself can run in WSL2, raised by the user re: future Docker packaging.
- 2026-08-25: Split ADR16's full record into `adr16-component-placement.md`; this file now holds only the abstract and a reference. Added research confirming Obsidian can run natively in WSL2 via WSLg.
- 2026-08-26: Logged ADR17 — SQLite chosen as the structured metadata/job-queue store for the Document/Status/Classification/Job model, for the "database design" session.
