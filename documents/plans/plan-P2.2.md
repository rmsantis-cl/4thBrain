---
name: plan-P2.2
description: Execution plan for Story P2.2 (Ingestor Real Logic) — materialise captured text, archive originals, and route from a table decided in ADR29
date: 2026-09-07
metadata:
  version: 1.0
  created-by: Claude Opus 5
  story: P2.2
  owns: src/main/java/com/fourthbrain/actuators/Ingestor.java, the ingestor block in application.yaml
  new-adr: ADR29
---

# Plan — P2.2 (Ingestor Real Logic)

One of five plans written to run in parallel. See *Parallel safety*. The others are `plan-P1.18.md`,
`plan-P2.1.md`, `plan-P2.4.md` and `plan-P2.5.md`.

**This plan has a design gate and no Java may be written before it closes.** The story as written
specifies work that contradicts ADR26 and duplicates P2.7. Step 0 settles what the Ingestor is for.

## Scope

The per-document work the Ingestor does when a message reaches it: check that what the document claims
to be is actually there, put every document on disk so the stages downstream have a file to work with,
archive the original, and route. Nothing that scans a directory.

## Step 0 — the design gate, ADR29

**ADR29 is reserved by this plan.** ADR30 is `plan-P2.5.md`'s and ADR31 is `plan-P2.4.md`'s; do not
reuse a number another parallel branch has claimed.

Two questions have to be answered in writing before step 1.

### Q1 — does the Ingestor read `$RAW_DIR`?

The story's first requirement is "read files from configured RAW_DIR directory". Nothing in the
architecture supports that:

- **ADR26 decision 1** makes `Coordinator.startChain(long)` the only entry point, and it takes a
  document that already exists in the database. An actuator that discovered files would be a second
  entry point.
- **Story P2.7 (File Watcher)** already owns watching `$RAW_DIR`, creating a Document per file and
  calling `startChain`. It is READY and unstarted. Two stories cannot both own it.
- The Ingestor is a queue consumer. `Actuator.run()` blocks on `getQueue().take()`; there is no timer
  and no idle hook to scan from.

**Recommendation: no.** The Ingestor does not scan. `$RAW_DIR` becomes the *destination* of the
archive step (Q2), not a source, and directory discovery stays P2.7's entirely. Record this as ADR29's
first decision, because it strikes a requirement from a story rather than implementing it.

### Q2 — what does the Ingestor actually do, then?

The routing table it has today is the whole of it, and three things are missing that nothing else
owns. Decide each in ADR29:

1. **Captured text has no file and no copy row.** `IngestionController.buildTextDocument` sets
   `content` and `mimeType` and nothing else — no `name`, no `extension`, no `document_copy`. The
   Indexer resolves its destination from `sourcePath.getFileName()` and bails when `findLive` returns
   null, so **a typed note reaches the Indexer today and stops there with a warning**. Someone has to
   write that content to a file. The Ingestor is the first stage that sees it and the only one whose
   story says "create Document records with initial metadata".
   **Recommendation:** the Ingestor materialises any document that has `content` and no live copy,
   writing it to `${vault.tmp}` as Markdown and recording a `tmp` copy.
2. **Nothing archives the original.** ADR28's failure semantics say a failed conversion "leaves the
   original in the raw vault". No code puts anything in `raw`. `VaultArea.RAW` is defined and unused.
   **Recommendation:** before routing, copy the live `tmp` file to `${vault.raw}` and record a `raw`
   copy. `DatabaseService.addCopy` already retires a prior live copy in the same area, so this is
   idempotent on a re-run.
3. **The routing table sends text past the Classifier.** `Ingestor.doTheThing` returns `"Indexer"` for
   anything that looks like text (`:54-56`), so a `.txt` or a typed note is indexed unclassified. The
   Classifier is registered, threaded and never reached by anything.
   **Recommendation:** text routes to `Classifier`. This is the single most consequential line in the
   plan and it belongs in an ADR rather than in a commit message.

The routing table ADR29 should record:

| Document | Next | Why |
|---|---|---|
| archive (zip/rar/7z/gz) | `Extractor` | unchanged; P1.8's one-Document-per-member model |
| `source_url` set and http/https | `Clipper` | unchanged (ADR26 decision 5) |
| text, Markdown, JSON, XML, CSV | `Classifier` | **changed** from `Indexer` |
| PDF, DOCX, PPTX, XLSX and the rest of ADR28's list | `Extractor` | needs conversion first; see the caveat below |
| anything else | null, with a warning naming the mime type | unchanged |

**The caveat, and it must be written down:** `Extractor` today only unzips (`Extractor.java:63-66`
returns null for anything that is not a ZIP). Routing a PDF there parks it silently until P2.3 and
P2.9 land. Two honest options — route them to `Extractor` now and accept a queue of parked documents
that P2.3 drains, or leave them terminal with a warning until the converter exists.
**Recommendation:** leave them terminal with an explicit warning. A parked document that logged
nothing is exactly the invisible failure ADR28 argues against, and `Ingestor.doTheThing` returning
null already logs "Document type not recognized". Widen that message to name the format and say the
converter is not built yet. P2.3 flips the row when it lands.

`application.yaml:49` sets `vault.indexer.source-area: tmp` with a comment saying it becomes
`incoming` once the Extractor writes sanitized output. This plan does not change it — the archive step
writes to `raw`, and `incoming` stays P2.3's.

## Verified state of the tree

Read 2026-09-07 on branch `v04`.

| Claim | Verified |
|---|---|
| `Ingestor.doTheThing` routes text to `"Indexer"`, never to `"Classifier"` | `Ingestor.java:54-56` |
| No string `"Classifier"` is returned anywhere in `src/main` | Confirmed; the Classifier is registered and unreachable |
| A captured text document gets no `name`, no `extension`, no copy row | `IngestionController.java:206-214` |
| The Indexer bails when there is no live copy in its source area | `Indexer.java:71-75` |
| `VaultArea.RAW` is defined and referenced nowhere | `VaultArea.java:22` |
| `vault.raw` is configured and read by nothing | `application.yaml:44` |
| `DatabaseService.addCopy` retires an existing live copy in the same area | `DatabaseService.java:132-136` |
| `IngestorRoutingTest` exists and asserts on captured Logback output with real objects, no mocks | `src/test/.../IngestorRoutingTest.java` |
| `IngestionController.newName` is a public static uniqueness helper | `IngestionController.java:39-58` |

## Step 1 — materialise content to disk

New private method on `Ingestor`, called before routing, for any document with non-blank `content` and
no live copy in `tmp`:

- Derive a file name: the document's `name` when it has one; otherwise the first non-blank line of
  `content`, trimmed, lowercased, non-alphanumerics collapsed to `-`, truncated to
  `${ingestor.max-name-length:60}`; `note` when that leaves nothing.
- Make it unique in the target directory. `IngestionController.newName(Path, String)` is the existing
  helper and it does exactly this, but calling a controller from an actuator is the wrong direction.
  **Add a `VaultNaming` utility in `com.fourthbrain.persistence`** with the same loop, and leave the
  controller's copy alone — that file is not this plan's, and a shared new file conflicts with nothing.
- Extension `.md`, mime type `text/markdown` when both are absent.
- Write with `StandardCharsets.UTF_8` explicitly. The default charset on a Windows JVM is not UTF-8 in
  every configuration, and a note with an em dash in it is the first thing anyone types.
- `databaseService.addCopy(doc, VaultArea.TMP, path)`, then set `name`, `extension` and `mimeType` on
  the in-memory `Document` so the stages downstream see them (ADR26 decision 2 — the document travels
  in the message).
- Persisting those three fields: `DatabaseService` has no method for it and **this plan may not add
  one** (see *Parallel safety*). Use `documentService.updateDocument(id, doc)`, which is already
  injected in the base class and merges non-null fields. It is unsynchronized, which is DD-1's
  complaint about status writes; these are not status writes, and widening DD-1 from three parallel
  branches at once is how the inconsistency gets worse rather than better. Note it in the commit.

## Step 2 — archive the original

For any document with a live `tmp` copy, and before routing:

- `Files.copy` to `${vault.raw}`, creating the directory when absent, keeping the file name and
  resolving collisions with the same `VaultNaming` helper.
- `databaseService.addCopy(doc, VaultArea.RAW, path)`.
- Copy, not move: `tmp` is what the Extractor and the Indexer read from today
  (`Extractor.java:69`, `Indexer.java:71` via `vault.indexer.source-area`). Moving it would break both.
- Skip silently when `${ingestor.archive-original:true}` is false, and skip with a debug line when a
  live `raw` copy already exists — a re-run must not pile up archives.

## Step 3 — validation

The story asks for it and there is nothing today:

- A document claiming a `tmp` copy whose file is missing on disk: log at error with the id and the
  path, return null. Do not throw — `Actuator.run` would catch it as "Main loop error" and the
  document would read as `ingested` either way, with a worse message.
- A zero-byte file, and blank `content` with no file: log at warn, return null.
- A `source_url` that does not parse: already handled by `isUrl` returning false; make the fall-through
  log say so rather than "type not recognized".

## Step 4 — routing and logging

- Implement ADR29's table from step 0. The only behavioural change to the existing branches is text
  going to `Classifier`.
- The story asks for ingestion logged "with size and type information". One INFO line per document:
  id, name, mime type, bytes on disk (or `content` length when there is no file), and the chosen next
  stage. The line where a document leaves the Ingestor is the one anyone debugging this pipeline reads
  first.
- Drop the `content.substring(0, 50)` preview at `Ingestor.java:42-44`. It puts user note text in the
  log at INFO, and a note is the kind of thing a user would not expect to find in a log file.

## Step 5 — configuration

**This plan owns a new `ingestor:` block and nothing else in `application.yaml`.** Append it; do not
reorder the file or edit `ollama:`, `classifier:` or `indexer:`, which belong to the other plans.

```yaml
ingestor:
  archive-original: true
  max-name-length: 60
  default-extension: .md
```

`vault.raw` and `vault.tmp` already exist and are read as they are.

## Step 6 — tests

Extend `IngestorRoutingTest`, which already uses real objects with assertions on captured Logback
output. Keep that style rather than introducing mocks — the class is the template the repository
settled on.

- **Routing:** one case per row of ADR29's table, including the terminal PDF case asserting the
  warning names the format.
- **Materialisation:** a document with `content` and no copy produces a UTF-8 file in `tmp`, a `tmp`
  copy row, and a `name`/`extension`/`mimeType` on the in-memory document. Include a non-ASCII note
  and assert the bytes round-trip.
- **Naming:** two notes whose first lines are identical get distinct files; a note whose first line is
  400 characters gets a bounded name; a note that is only punctuation gets `note`.
- **Archive:** a document with a `tmp` copy gains a `raw` copy and the `tmp` file is still there.
  Running the same document twice does not produce two live `raw` copies.
- **Validation:** a copy row pointing at a deleted file returns null and logs at error; a zero-byte
  file the same.

Use `@TempDir` and property overrides for `vault.tmp` and `vault.raw` so nothing writes into the
working tree.

## Verification

1. `scripts/build-log.ps1 -Task build` compiles.
2. `scripts/build-log.ps1 -Task test` is green with nothing skipped.
3. `scripts/build-log.ps1 -Task bootRun`, then against the running app:
   - `POST /api/ingest/capture` with `{"text": "..."}` — the log shows the hop to `Classifier`, a
     file appears in `tmp` and a copy in `raw`, and `document_copy` has two live rows.
   - `POST /api/ingest/file` with a small `.txt` — same, and the original is still in `tmp`.
   - `POST /api/ingest/file` with a `.pdf` — one warning naming PDF and the missing converter, and the
     document stops rather than parking silently.
   - `POST /api/ingest/capture` with `{"url": "https://example.com"}` — reaches `Clipper` unchanged.
4. `GET /admin/db` shows the copy rows.

## Parallel safety

**Owns:** `Ingestor.java`, the new `ingestor:` block in `application.yaml`, `IngestorRoutingTest`, and
the new `com.fourthbrain.persistence.VaultNaming`.

**Must not touch:** `Actuator.java` (frozen across all five plans — DD-1 and DD-4 both live there),
`DatabaseService.java` (every method this plan needs already exists: `addCopy`, `findLive`,
`getDocument`), `Coordinator.java`, `Classifier.java` (P2.4), `Indexer.java` (P2.5), `schema.sql`,
`index.html`, `build.gradle`.

**Depends on:** nothing. This plan can merge first.

**Interacts with `plan-P2.4.md`** through the routing change only: after this merges, documents start
arriving at the Classifier. If P2.4 has not merged, they hit its stub, which logs and returns
`"Indexer"` — the pipeline still completes. That is the correct ordering either way.

## Scope boundary

Out, deliberately:

- **Watching `$RAW_DIR`.** P2.7, settled by ADR29 Q1.
- **Converting anything.** P2.3 and P2.9, behind ADR28's `MarkdownConverter` seam. This plan routes
  and archives; it does not parse a PDF.
- **Recording a failure status.** An actuator cannot: `Actuator.run()` stamps the participle
  unconditionally after `doTheThing` returns, so a document that failed here still reads `ingested`.
  Logged as DD-4. This plan logs loudly and leaves the status alone rather than fighting the run loop
  from inside one actuator.
- **DD-1**, the two writers of `Document.status`. Lives in `Actuator.java`, which is frozen.
- **Deduplication.** Ingesting the same file twice makes two documents. P2.7's criterion, not this
  one's.

## Acceptance criteria mapping

| Criterion (P2.2) | Closed by |
|---|---|
| Files in RAW_DIR are processed and Document records created | **Re-mapped by ADR29 Q1** to P2.7. This plan writes `raw` rather than reading it (step 2) |
| Document status transitions correctly through the ingestion stage | Unchanged behaviour from `Actuator.run`; verification 3 |
| File validation catches missing or corrupt inputs | Step 3 |
| Messages route to TextExtractor for processing | **Re-mapped by ADR29 Q2** — text routes to `Classifier`; archives route to `Extractor`, which is what "TextExtractor" names in the current tree |

Two of four criteria are re-mapped, which is why this plan has a design gate. Both re-mappings belong
in ADR29 and in the story's closing note, not in a commit message.

## Risks

- **Routing text to the Classifier turns on a stage that has never run.** Until P2.4 merges it is a
  stub returning `"Indexer"`, so the chain still completes — but the Classifier thread starts doing
  work for the first time, and anything latent in the base class shows up here. Verification 3's first
  case is the one to watch.
- **The archive step doubles disk use** for every ingested file. `archive-original: false` is the
  switch, and it is on by default because ADR28's failure semantics assume the original survives.
- **`updateDocument` is unsynchronized** (step 1). It is the existing service and DD-1's subject; this
  plan uses it rather than widening the inconsistency from a branch running beside two others.
- **A PDF now stops with a warning rather than reaching the Indexer.** That is deliberate and it is a
  visible regression for anyone who was uploading PDFs and seeing them "indexed". They were being
  indexed as unparsed bytes.
