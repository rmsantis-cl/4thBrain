---
name: OriginalProcess
description: Formal technical specification of the original document ingestion and processing pipeline
metadata:
  version: 1.0
  created-by: Claude Code
  date: 2026-08-29
---

# Original Document Processing Pipeline

## Overview

The document processing system implements a parallel ingestion, extraction, and indexing pipeline. An incoming document is routed through specialized processors based on payload type, with parallel execution paths for binary content, URLs, and text. Processing outcomes determine final storage location and availability for retrieval.

## Pipeline Stages

### Stage 1: Ingestion & Initial Routing

The Ingestor is the entry point for all documents. Upon receipt, the Ingestor evaluates the document payload and classifies it into one of three types, immediately routing payload components to their respective processing pipelines in parallel:

- **Text payload** is forwarded directly to the Indexer for vector embedding generation.
- **Binary files** are sent to the TextExtractor for content extraction and conversion to plain text.
- **URLs** are sent to the WebClipper for fetching and retrieval of external content.

This parallel routing enables simultaneous processing of all three content types within a single document, reducing pipeline latency.

### Stage 2: URL Processing — WebClipper Branch

The WebClipper subsystem is responsible for external content retrieval. Upon receiving a URL reference:

1. The WebClipper fetches the referenced content over the network.
2. The retrieved document (now local content) is returned to the Ingestor.
3. The Ingestor rejoins this content stream with the main pipeline for continued processing.

The WebClipper abstracts network I/O and external content handling from the core pipeline, allowing the Ingestor to treat fetched content identically to native uploads.

### Stage 3: Extraction — TextExtractor Branch

The TextExtractor processes binary payloads (PDFs, images, documents, etc.) to extract machine-readable text:

**Success Path:** 
- Extracted plain text is returned to the Ingestor.
- The Ingestor passes the extracted text to the Indexer for vector embedding.

**Failure Path:**
- If text extraction fails, the raw binary file (unprocessed) is persisted to the Raw Repo.
- The document exits the active pipeline and is archived for later recovery or manual inspection.

### Stage 4: Indexing & Embedding

The Indexer processes all text streams (whether native, extracted, or fetched) and generates vector embeddings for semantic search and retrieval:

**Success Path:**
- Document metadata and computed embeddings are forwarded to the Classifier.
- The document remains in the active pipeline for further processing.

**Failure Path:**
- If indexing fails (e.g., embedding generation error or insufficient content), the document is routed to the Notes Repo.
- The document is marked as not indexed and exits the active pipeline, but remains accessible as a note.

### Stage 5: Classification & Final Storage

The Classifier performs semantic analysis and topic extraction on indexed content:

1. The Classifier evaluates the indexed document's metadata, embeddings, and text content.
2. Topic metadata is extracted and associated with the document.
3. The final structured document (with metadata, embeddings, and topic tags) is routed to the Doc Repo.
4. The document is now fully processed and available for search and retrieval.

## Storage Destinations

| Repository | Purpose | Trigger |
|---|---|---|
| **Doc Repo** | Primary indexed knowledge base; documents with successful embeddings and classification. | Successful indexing and classification. |
| **Notes Repo** | Secondary archive for documents that failed indexing but retain value as unstructured notes. | Indexing failure or insufficient embeddable content. |
| **Raw Repo** | Unprocessed binary archive; documents that failed text extraction. | Text extraction failure on binary content. |

## Error Handling

The pipeline implements two explicit failure modes:

1. **Extraction Failure** → Raw Repo: Binary content that cannot be converted to text is preserved in its original form for later manual processing or format-specific extraction.
2. **Indexing Failure** → Notes Repo: Text content that cannot be embedded is preserved as unindexed structured data, remaining queryable by metadata or full-text search but unavailable for semantic/vector-based retrieval.

Both failure paths preserve document integrity and prevent loss of content, while isolating problematic documents from active retrieval pipelines.

## Concurrency & Parallelism

- **Stage 1 routing** executes in parallel: text, binary, and URL processing begin concurrently from a single ingestion event.
- **Inter-stage dependencies** are sequential: Stage 2 (WebClipper) and Stage 3 (TextExtractor) feed back to Stage 1 (Ingestor), which then passes unified output to Stage 4 (Indexer).
- **Stages 4 and 5** are sequential: Indexer output → Classifier input (classification requires valid embeddings).

## Design Principles

1. **Content Preservation**: Failures at any stage preserve the document in an appropriate archive; no content is lost.
2. **Parallel Entry Processing**: Multiple payload types within a single document are processed in parallel to minimize end-to-end latency.
3. **Type-Specific Handling**: Each content type (text, binary, URL) receives specialized processing appropriate to its characteristics.
4. **Clear Failure Semantics**: Two distinct failure modes (extraction vs. indexing) provide operational visibility into which stage failed and why, enabling targeted remediation.
