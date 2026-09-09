---
name: ADR29-ingestor-boundary
description: ADR29 — what the Ingestor is responsible for; it consumes a queue rather than scanning a directory, materialises captured text, archives the original, and routes text to the Indexer
date: 2026-09-08
metadata:
  version: 1.1
  created-by: Claude Opus 5
  adr: 29
  arises-from: Story P2.2
  amended-by: BUG-005
---

# ADR29 — The Ingestor's boundary: a queue consumer that materialises, archives and routes

**Date:** 2026-09-08
**Status:** Accepted, decision 4 amended by BUG-005
**Supersedes:** the first implementation requirement of Story P2.2 ("Read files from configured RAW_DIR directory")
**Arises from:** Story P2.2, `documents/plan-P2.2.md` step 0

*Written as its own file rather than appended to `ADRS.md`: ADR29, ADR30 and ADR31 were drafted on
three branches at the same time, and one file taking three appends is one file taking three
conflicts. It folds into `ADRS.md` after the branches merge.*

## Context

Story P2.2 asks the Ingestor to read `$RAW_DIR`, create Document records, copy structured files to
the incoming vault area and route to the TextExtractor. Three of those four sentences describe a
system that no longer exists, and the fourth is the one line of the current implementation that is
actively wrong.

What is actually in the tree:

- `Coordinator.startChain(long)` loads a persisted document and enqueues it to the Ingestor. Since
  ADR26 decision 1 it is the only entry point, and `sendMessage` is gone.
- `Actuator.run()` blocks on `getQueue().take()`. There is no timer, no idle hook, no scheduled
  sweep. An actuator that discovered work would have to invent one.
- Story P2.7 (File Watcher) is READY and unstarted, and its whole content is watching a directory,
  creating a Document per file and calling `startChain`.
- `Ingestor.doTheThing` is a routing table and nothing else. It creates no records, writes no files
  and reads none.
- A document captured as text has `content` and `mimeType`, no `name`, no `extension` and no
  `document_copy` row. It routes to the Indexer, which resolves its destination from
  `sourcePath.getFileName()` after `findLive` returned null — so it logs a warning and stops. Typed
  notes have never reached the vault.
- `VaultArea.RAW` and `vault.raw` are both defined. Neither is referenced by any code.
- No string `"Classifier"` is returned anywhere in `src/main`. The Classifier is instantiated,
  registered and threaded, and nothing has ever sent it a document.

So the question P2.2 really has to answer is not how to implement its requirements but which of them
belong to it at all.

## Decision

### 1. The Ingestor does not scan `$RAW_DIR`

It is a queue consumer. Work reaches it through `startChain` and through the Extractor re-submitting
archive members, and by no other route.

`$RAW_DIR` becomes a destination, not a source: decision 3 below writes archived originals into it.
Discovering files on disk stays entirely with Story P2.7.

This strikes P2.2's first implementation requirement and re-maps its first acceptance criterion
("Files in RAW_DIR are processed and Document records created") onto P2.7. It is recorded here
rather than in a commit message because deleting a requirement is a design decision, not a coding
one.

The alternative — give the Ingestor a scan on a timer — puts a second entry point beside `startChain`
one ADR after ADR26 removed the second entry point, and gives two stories the same job. Two owners
of a directory watch is how you get two watchers.

### 2. Captured text is materialised to disk by the Ingestor

Any document arriving with non-blank `content` and no live copy in `tmp` gets written to
`${vault.tmp}` as a file, and a `tmp` copy row recorded. Its `name`, `extension` and `mimeType` are
filled in where they are missing and persisted.

Somebody has to do this or typed notes never leave the database. The Ingestor is the first stage that
sees the document, and P2.2's own second requirement — "create Document records with initial
metadata" — is the closest thing in the backlog to a mandate for it. The Clipper does the equivalent
job for a URL; nothing did it for text.

File naming: the document's `name` when it has one, otherwise the first non-blank line of `content`
reduced to a slug and bounded by `${ingestor.max-name-length}`, otherwise `note`. Uniqueness within
the target directory is resolved by a new `com.fourthbrain.persistence.VaultNaming`, which carries
the loop `IngestionController.newName` already uses. The controller keeps its own copy; the two
converge later, and moving a public static method out of a frozen file was not worth it here.

Bytes are written as explicit UTF-8. The default charset on a Windows JVM is not UTF-8 in every
configuration, and an em dash in a typed note is the first character anyone will trip over.

### 3. The Ingestor archives the original into `raw`

Before routing, the live `tmp` file is copied — not moved — to `${vault.raw}`, and a `raw` copy row
recorded.

ADR28's failure semantics assume a failed conversion "leaves the original in the raw vault". Nothing
put anything there. Copy rather than move because `tmp` is what the Extractor and the Indexer read
from today (`vault.indexer.source-area: tmp`); moving it would break both.

`DatabaseService.addCopy` retires any existing live copy in the same area, and the step is skipped
outright when a live `raw` copy already exists, so re-running a document does not pile up archives.
`${ingestor.archive-original}` turns it off for anyone who does not want the doubled disk use; it
defaults to on, because ADR28 depends on it.

`vault.indexer.source-area` stays `tmp`. Moving it to `incoming` belongs to P2.3, when something
finally writes there.

### 4. Text routes to the Indexer, and the Classifier runs after it

**Amended 2026-09-08 by BUG-005.** The original decision routed text to the `Classifier`, which then
returned `"Indexer"`. The required chain is the other way round:

**`Ingestor → Indexer → Classifier`.** A document is published to the vault first and gains its topic
and tags afterwards. The Classifier is the terminal stage.

The routing table, in evaluation order:

| Document | Next | Change |
|---|---|---|
| archive: zip, rar, 7z, gz | `Extractor` | unchanged |
| `source_url` set and http/https | `Clipper` | unchanged (ADR26 decision 5) |
| text, Markdown, HTML, JSON, XML, CSV, log | `Indexer` | **amended**: this ADR first changed it to `Classifier`; BUG-005 changed it back, and the Classifier now runs after the Indexer rather than before it |
| PDF, DOC(X), PPT(X), XLS(X), EPub, RTF, ODT | none, with a warning naming the format | **changed**: PDF used to be classed as text and indexed as raw bytes |
| `source_url` set but not parseable as http/https | none, with a warning saying so | **changed** from the generic message |
| anything else | none, with a warning naming the mime type | unchanged |

Why it was reversed. The original argument was that a document should carry its labels before it is
published, and that the Classifier was registered, threaded and unreachable. The first half is a
preference; the second is satisfied either way, because the Classifier is reached in both orderings —
the ADR conflated "the Classifier must be in the chain" with "the Classifier must be first". Against
that, publishing first is what the pipeline is for: the vault write is the step whose failure loses
the document, and it should not sit behind a model call that takes seconds, needs a running Ollama,
and fails in ways ADR31 decision 4 already treats as survivable. With the Indexer first, "a failed
classification must not strand a document" stops being a rule the Classifier has to honour and
becomes a property of the ordering.

What it costs, and what is not solved: a file now reaches the indexing directory before it has a topic
or tags, so anything watching that directory can see a document unclassified. Nothing watches it
today (ADR30 found the installed Smart Connections MCP server has no indexing tool at all), so the
window is free for now. The story that wires an external indexer owns the question of whether it
re-reads after classification.

### 5. Formats needing conversion stop with a warning rather than parking at the Extractor

`Extractor.doTheThing` returns null for anything that is not a ZIP, so routing a PDF there today
parks it silently: status reads `extracted`, no file moves, nothing is logged above debug. That is
exactly the invisible failure ADR28 argues against.

So a PDF stops at the Ingestor with a WARN naming the format and saying the converter is not built
yet. P2.3 flips that row when `MarkdownConverter` exists.

This is a visible regression for anyone who was uploading PDFs and watching them reach `indexed`.
They were being indexed as unparsed bytes, which was worse and quieter.

### 6. Validation logs and stops; it does not throw and does not set a status

- A copy row pointing at a file that is not on disk: ERROR naming the id and the path, return null.
- A zero-byte file: WARN, return null.
- No file, no `content` and no `source_url`: WARN, return null.

Return null rather than throw, because `Actuator.run()` catches a throw as "Main loop error" and the
document reads `ingested` either way — with a worse message. And the Ingestor does not record a
failure status, because it cannot: `run()` stamps the participle unconditionally after `doTheThing`
returns. That is DD-4, it lives in `Actuator.java`, and one actuator fighting the run loop from the
inside is not the fix.

One INFO line per document records id, name, mime type, size and the chosen next stage. The
`content.substring(0, 50)` preview is dropped: it put user note text into the log at INFO, and a
private note is not something a user expects to find in a log file.

## Consequences

- The Classifier receives documents for the first time, as the stage after the Indexer rather than
  before it. Every ingested text document reaches the vault whether or not the model answers.
- Every ingested file exists twice on disk, in `tmp` and in `raw`, until the Indexer moves the `tmp`
  copy to `indexing`.
- Two of P2.2's four acceptance criteria are re-mapped: the RAW_DIR one to P2.7 (decision 1), and
  "messages route to TextExtractor" to the table in decision 4, where "TextExtractor" is the
  `Extractor` of the current tree and only archives go to it.
- `name`, `extension` and `mimeType` are persisted through `DocumentService.updateDocument`, which is
  unsynchronized. ADR26 decision 6 reserves `DatabaseService` for `Document.status` writes
  specifically, and these are not status writes; `DatabaseService` has no method for updating
  document metadata and adding one from a branch running beside two others would widen DD-1 rather
  than close it. The update is passed a fresh `Document` carrying only those three fields, so the
  merge cannot write a stale `status` back over the one `run()` just set.

## Alternatives rejected

| | Why not |
|---|---|
| Ingestor scans `$RAW_DIR` on a schedule | A second entry point one ADR after ADR26 removed one, and it takes P2.7's only job |
| Route PDFs to the `Extractor` now and let P2.3 drain the queue | The document parks with nothing above debug in the log; a silent queue of stuck documents is what ADR28 was written against |
| Move the `tmp` file to `raw` instead of copying | The Extractor and the Indexer both read `tmp`; the move breaks both today |
| Materialise text in `IngestionController` instead | Puts file I/O back at the REST boundary, and the Extractor's re-submitted members would still need the Ingestor to do it |
| Keep the Classifier first and change the requirement instead (BUG-005) | It puts the vault write, the step whose failure actually loses a document, behind a model call that needs a running Ollama and takes seconds |

## Amendments

- **2026-09-08, BUG-005.** Decision 4 reversed: text routes to the `Indexer`, and the `Classifier`
  runs after it as the terminal stage. The original heading ("Text routes to the Classifier, not the
  Indexer") and the two rejected alternatives that argued for it have been rewritten rather than left
  standing, because this file is not yet folded into `ADRS.md` and folding a superseded decision was
  the worse of the two options. The ordering is now recorded in a document about the pipeline as well:
  `PipelineFlowTest` asserts the whole chain, which nothing did when this ADR was written.
