---
name: adr18-persistence-tech
description: ADR18 — Local database technology for processing-state persistence; SQLite vs PostgreSQL; separate vector database evaluation
date: 2026-08-26
metadata:
  version: 1.0
  created-by: Claude Code
---

# ADR18: Local relational database technology for processing-state persistence

Abstract and cross-reference live in `documets/design/ADRS.md`. This file holds the full analysis.

**Status:** Open — evaluating options.

**The Problem**

Documents will live in the Obsidian vault as Markdown files (ADR3). But the system generates processing state — document lifecycle status, job queue entries, classification assignments, intermediate results — that must be:
1. **Persisted** across runs (not ephemeral)
2. **Queryable** (the Node.js server and batch scripts need to join/filter/sort this data)
3. **Safely accessed concurrently** (the orchestration server, Python batch jobs, and CLI tools may read/write the same tables simultaneously)
4. **Separate from the vault** (keeping the vault content-only means Obsidian + Smart Connections stay lightweight and human-readable)

ADR17 chose **SQLite** for the Document/Status/Classification/Job model — single-file, zero-config, no server process. But SQLite's write-locking behavior on local Windows filesystems is a potential bottleneck: when one process writes, others must wait for the lock to release. If multiple scripts are processing jobs concurrently (unlikely given ADR10's concurrency=1, but possible during a large batch run), SQLite could serialize access undesirably.

Additionally, the user is considering **a separate vector database** independent of Obsidian's `.smart-env` store — the current Smart Connections workflow generates embeddings only after notes are in the vault, but having pre-vault embeddings could improve the LLM's classification accuracy during ingestion (a classification hint per FR3/ADR15).

## Option 1: SQLite (same as ADR17)

**Pros:**
- Single-file storage, zero setup, zero operations overhead.
- Works with existing Node.js (`better-sqlite3`, `node:sqlite`) and Python (`sqlite3` stdlib).
- Same simplicity and local-first philosophy as ADR17.
- Good for low-volume, low-concurrency use cases.

**Cons:**
- Write-locking serializes concurrent access to the entire database — if Job A is writing and Job B tries to read, Job B may block or timeout.
- Particularly problematic on Windows NTFS, which uses stricter file locks than POSIX filesystems.
- Not ideal if the user's workflows evolve to run multiple batch jobs in parallel (e.g., concurrent transcoding, simultaneous classification) later.
- No built-in networking — all access must be local to the same machine (fine for now, but limits future distributed setups).

**Concrete risk:** During a large overnight batch run (e.g., 100 documents being classified, each generating a Job entry and a JobDocument record), the database could become a bottleneck if the orchestration server is polling for job status while Python workers are inserting new job records.

## Option 2: PostgreSQL

**Pros:**
- Designed for concurrent write access — multiple processes can write simultaneously without lock-level blocking.
- Industry-standard SQL compliance, robust transaction semantics (ACID).
- Rich query language, full-text search, JSON operators (useful if processing metadata becomes complex).
- Client/server model allows future distributed scenarios (e.g., central DB for multiple ingestion hosts, though unlikely in this single-host project).

**Cons:**
- Requires a separate server process (added operational complexity, process supervision per ADR9).
- Adds a new runtime dependency — PostgreSQL must be installed and running.
- Higher memory/disk overhead than SQLite (not a concern for low volume, but adds setup friction).
- More complex local development setup (need to run a database server, manage credentials, handle connection pooling in scripts).
- Overkill for the current low-volume, low-concurrency use case.

**Operational reality:** On a single Windows PC, running PostgreSQL is feasible via WSL (or native Windows PostgreSQL), but it adds another process to supervise. ADR9 already mandates ordered startup (Ollama → Node.js/MCP); adding PostgreSQL to that chain increases failure modes.

## Separate Vector Database (Independent of Obsidian)

**Current state (via ADR3):** Smart Connections generates embeddings (`.smart-env` files) for notes *after* they're filed into the vault. This means:
- Classification happens based on the raw ingested text (LLM reads document content, assigns topic/subtopic/tags).
- Documents are then filed into the vault.
- Smart Connections scans the vault and generates embeddings.
- Subsequent RAG queries use those embeddings.

**Proposed change:** Generate embeddings *during* ingestion, before filing into the vault. Benefits:
- The LLM could compare the ingested document's embedding against existing vault embeddings and suggest related documents / refine classification.
- Faster classification decisions if the LLM can see "this document is similar to Topic X notes, so classify it accordingly."

**Technology options for pre-vault embeddings:**
1. **SQLite with a BLOB column for embeddings** — store vectors alongside the Document/Classification metadata (ADR17's table). Simple, zero new dependencies, but inefficient for similarity search (no vector indexing).
2. **Lightweight embedding engine (Qdrant, Milvus, Weaviate)** — purpose-built for vector search. Overkill for low volume, but clean separation of concerns.
3. **In-process with Node.js** — e.g., `hnswlib` or `ml.js` running inside the orchestration server, embeddings cached in memory + persisted to disk. Minimal infrastructure, but couples the vector store to Node.js lifecycle.
4. **Keep Smart Connections as the only vector store** — skip pre-vault embeddings, accept that classification is based on content alone. Simpler, but misses the optimization opportunity.

**Trade-off:** The benefit of pre-vault embeddings (better classification hints) must be weighed against:
- Storage overhead (embedding vectors for all ingested documents, not just vault notes).
- Sync complexity (keeping pre-vault embeddings in sync with the relational database; if a document is rejected during classification, its embedding should be discarded).
- Operational complexity (if choosing a separate vector engine, that's another process to manage per ADR9).

## Recommendation (Draft)

**For relational storage (ADR17 follow-up):** Start with **SQLite**. Rationale:
- The current concurrency model (ADR10, concurrency=1 for Ollama) naturally serializes job processing — writes are unlikely to collide.
- If batch runs later show database contention (job write timeouts), migrate to PostgreSQL as a follow-up. SQLite → PostgreSQL migration is straightforward (dump/restore schema, update connection strings).
- Keeps the system simple and operation-free during development.

**For vector embeddings (pre-vault classification):** Defer to a later story (EP4/Story 4.X or EP2/Story 2.X). Rationale:
- Current classification (LLM reads ingested content, infers topic/tags) works without embeddings.
- Adding pre-vault embeddings is an optimization, not a requirement (no FR/NFR explicitly calls for it).
- If classification accuracy is later measured and found lacking, evaluate the trade-offs (in-process SQLite BLOB vs. Qdrant vs. Smart Connections only).
- Deferral keeps the initial implementation focused and testable.

## Open Questions

1. **Will concurrent writes actually happen?** — the user's workflow might be entirely sequential (one script processes the job queue from start to finish per batch run), making SQLite's locking irrelevant. Requires user input or actual load testing.

2. **Should embeddings be pre-computed during ingestion?** — this is a classification-quality question, not a technology question. Needs measurement: does pre-vault embedding comparison improve topic assignment accuracy? If yes, by how much? Is the infrastructure cost worth it?

3. **If pre-vault embeddings are needed, what's the deployment model?** — in-process (less infrastructure), or separate vector service (more flexibility, more operational burden)?

## Changelog

- 2026-08-26: Created — ADR18 open, evaluating SQLite vs. PostgreSQL for processing-state persistence; separate vector database under consideration for pre-vault classification.
