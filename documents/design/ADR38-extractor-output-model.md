---
name: ADR38-extractor-output-model
description: ADR38 — the Extractor produces a set of child Documents rather than converting in place; what a child carries, where each kind routes, and what bounds the loop this opens
date: 2026-09-08
metadata:
  version: 1.0
  created-by: Claude Opus 5
  adr: 38
  arises-from: plan-P2.9-P2.3
---

# ADR38 — The Extractor's output is a set of child Documents

**Date:** 2026-09-08
**Status:** Accepted
**Supersedes:** the convert-in-place model implied by Story P2.3, and ADR29 decision 5
**Arises from:** `documents/plan-P2.9-P2.3.md` step 0

*Numbered 38, not 36 or 37: a concurrent pass claimed ADR36 and ADR37 for Stories P1.15 and P1.16.
ADR39 is left unclaimed for whatever closes DD-4.*

*Written as its own file rather than appended to `ADRS.md`, for the reason ADR29, ADR30, ADR31 and
ADR35 were: several agents are writing ADRs at once and one shared file taking several appends is one
file taking several conflicts. It folds into `ADRS.md` with the others.*

## Context

Story P2.3 was written when the Extractor's only job was unzipping. It says the Extractor converts a
document to Markdown, writes the Markdown, sets the status and routes onward — one document in, the
same document out, changed. That is not what the Extractor does today and it is not what conversion
produces.

What the Extractor does today, at `Extractor.java:99-142`: it opens a ZIP, and for each member it
writes a file, builds a `Document` with `parentId` set to the archive, saves it, records a `tmp` copy
and hands it to the Ingestor. The archive itself is left alone. `Clipper.doTheThing` does the same
shape for a URL — `Clipper.java:70-87` builds a child with `parentId`, saves it and submits it. Two of
the pipeline's stages already produce children; the story that describes the third says it modifies
its input.

Conversion does not fit the convert-in-place shape either, and the reason is not stylistic. **One
input produces zero to N outputs, of mixed types.** A PDF yields a Markdown file and possibly a set of
extracted images. A ZIP yields whatever its members happen to be. A ZIP of photographs yields no text
at all, and nothing has failed. There is no single output to write back over the input, and for some
inputs there is no text output to write anywhere.

The database is already shaped for this and has been since Story P1.8. `schema.sql:6` declares
`parent_id INTEGER`; `Document.java:21-22` maps it as `private Long parentId`; `Extractor.java:150`
and `Clipper.java:71` both set it. Adopting the child model costs no migration. It removes a special
case rather than adding one, because the two stages that already produce children stop being
exceptions to how the Extractor works.

### What is missing, and it is additive only

- No foreign key on `document.parent_id`, so nothing enforces that a parent exists.
- No index on `parent_id`, so walking a child's ancestry is a table scan.
- No `findByParentId` on `DocumentRepository`, which today carries `findByStatus`, `countByStatus`
  and `updateStatus` and nothing else.

None of these is a new column, which matters. `schema.sql` runs as `CREATE TABLE IF NOT EXISTS` under
`spring.jpa.hibernate.ddl-auto: validate` (`application.yaml:13`). An existing `data/fourthbrain.db`
is therefore never altered by a schema edit, and a new column added to `schema.sql` and to the entity
would leave every existing database missing it and failing context startup on validation. That
constraint is the reason this ADR adds no column, and it is the first thing the next schema change has
to answer.

## Decision

### 1. The Extractor creates a child Document per generated file, with `parent_id` set to the original

The output of one extraction is a **set, of size 0 to N, of mixed types**. A conversion that produces
a Markdown file and four images produces five children. An archive holding eleven members produces
eleven. An archive holding nothing but directories produces none, and so does a conversion that yields
no text; the difference between those two is the subject of decision 6 and of DD-8.

Names come from `VaultNaming.newName(dir, base, extension)` — the extension-aware overload, where
`notes.md` collides into `notes_001.md` rather than `notes.md_001`. Siblings written into the same
directory must not collide, and inventing a second naming scheme beside the one Story P2.2 built is
how the two drift apart.

### 2. A child is submitted to the Ingestor as soon as it is on disk and in the database

Not batched at the end of the parent's work. This is what `Extractor.sendToIngestor`
(`Extractor.java:194`) already does per ZIP member, and doing it per generated file keeps one code
path. A parent that fails partway through has still handed on whatever it completed, and a child that
is enqueued before its siblings exist needs nothing from them.

### 3. Loop termination is the routing predicates plus a bounded ancestry guard

The child model creates a cycle that did not exist before: a child re-enters the Ingestor, and the
Ingestor can route it back to the stage that made it. A ZIP of ZIPs does this by design. A clipped
page does it by accident today, which is BUG-006.

Two things bound it. The routing predicates are the first: a `.md` child of a PDF is text, and text
routes to the Indexer, which is terminal for the Extractor's purposes. The second is a guard, because
predicates alone are an argument about every future format rather than a bound.

`Ingestor` gains a private `generationOf(Document)` that walks `parent_id` upward and counts, stopping
its own walk at the limit so a cycle in the data cannot spin it. `nextStage` refuses to return
`Extractor` or `Clipper` when the generation has reached `ingestor.max-generation`, default 4, and
logs a WARN naming the document, its generation and the stage it was refused. Routes that cannot
produce a child — `Indexer`, and every path that already stops — are not guarded, because they cannot
extend the chain.

Four is a working number rather than a measured one. A PDF inside a ZIP inside a ZIP is generation 3.
Nothing observed needs more, and the guard exists to make a runaway visible and finite rather than to
express a real limit.

### 4. Text-bearing children are classified; non-text children are not

A child whose content is text carries its own topic and tags, written by the Classifier the way any
other text document's are. An image or other binary child is not classified: there is nothing for the
Classifier to read, and `Classifier.doTheThing` already returns early on blank content
(`Classifier.java:114-120`), so this is what happens rather than something to build.

**Where a parent yields several text children, each carries its own topic and tags, and nothing
aggregates to the parent.** Three reasons, and the first is sufficient. A merge rule for conflicting
topics does not exist and nobody has decided one — two chapters of the same PDF can legitimately
classify differently, and picking a winner is a design question this ADR is not the place to answer.
Second, `document_tag` rows hang off a document id, so an aggregate would be new rows describing a
document that has no text of its own. Third, an aggregate is derivable: a later story that wants the
parent's tags can walk `parent_id` and union them, which is a query against data that is already
there. Storing it now would mean maintaining it on every child's reclassification.

The parent is provenance. It holds the original bytes, its `parent_id` links, and nothing else that
needs to be true about the content.

### 5. Convertible formats route to the Extractor, and `html`/`htm` join them

ADR29 decision 5 stops PDF and the other convertible formats at the Ingestor with a warning, because
routing them to an Extractor that only unzips parked them silently. That row flips once the converter
exists: convertible formats route to `Extractor`.

`html` and `htm` move with them, out of the text list. This closes a contradiction between two
accepted ADRs, recorded under "What this settles" below.

Because `isTextContent` matches on the `text/` mime prefix, `text/html` matches it before any
extension is consulted. So the evaluation order in `nextStage` changes as well as the table:

| Order | Document | Next |
|---|---|---|
| 1 | archive: zip, rar, 7z, gz | `Extractor`, subject to the generation guard |
| 2 | convertible: pdf, doc(x), ppt(x), xls(x), epub, rtf, odt, **html, htm** | `Extractor`, subject to the generation guard |
| 3 | text, Markdown, JSON, XML, CSV, log | `Indexer` |
| 4 | `source_url` set and http/https, and the document is not itself derived | `Clipper`, subject to the generation guard |
| 5 | `source_url` set but not http/https | none, with a warning |
| 6 | anything else | none, with a warning naming the mime type |

Convertible now sits above text, and `text/html` is added to the convertible mime list. The
qualification on row 4 is BUG-006's fix and is described there.

**Where a non-text child ends up.** An image child — `image/png`, `.png` — matches none of rows 1
through 5: not an archive, not convertible, `isTextContent` is false because the mime type does not
start with `text/`, and it has no `source_url`. It falls to row 6, logs a WARN naming the mime type,
and stops at `ingested`. That is the same terminal shape BUG-004's octet-stream upload had, and it is
accepted here deliberately rather than left to emerge: the child is on disk, archived in `raw`, and
findable as "a document with a `parent_id` sitting at `ingested`".

Images are **not** added to the convertible list, even though ADR28 lists them among MarkItDown's
formats. MarkItDown's image path is EXIF metadata or an LLM image description, and ADR28 holds image
description out of scope explicitly — it belongs to the Classifier's budget, not the Extractor's. If a
later story adds OCR, adding image extensions to the convertible list is the whole change, and at that
point `ingestor.max-generation` becomes the only thing bounding an image that OCRs to a document that
extracts an image. That is worth knowing before the change is made rather than after.

### 6. The parent is terminal at `extracted`

The parent's status records that extraction ran, not that anything downstream succeeded. It is not
routed onward, it is not classified, and it is not indexed — its bytes are the original, and the
original belongs in `raw`, which the Ingestor has already put it in.

This holds whatever the children turn out to be, including when every child is itself an archive. A
ZIP of ZIPs is stamped `extracted` and stops; each member is a fresh archive at generation+1 and the
tree terminates either at a member that is not an archive or at `ingestor.max-generation`.

### 7. The text output of a conversion is `.md`; other children keep their real extensions

The requirement as originally phrased was that generated files are "most of the time `.txt`". Asked
directly, the user chose `.md`. Four things support it:

- MarkItDown emits Markdown. `.txt` would rename it and lose nothing else, which is the worst of both.
- The vault is an Obsidian vault. `.md` is the format it reads; `.txt` is a file it displays.
- `ingestor.default-extension` is already `.md` (`application.yaml:99`), so a captured note and a
  converted document agree.
- Front matter and heading structure are the point of converting at all, and `.txt` discards the
  convention that makes both meaningful.

**This governs the text output of a conversion and nothing else.** An image child extracted from a PDF
is `.png` or `.jpg`. A ZIP member is whatever it was inside the archive. The decision is about what
the converter's Markdown is called, not a claim that every child is Markdown.

Reversing it is a one-line configuration change, because both extensions route identically: `.txt` and
`.md` are both in `TEXT_EXTENSIONS` (`Ingestor.java:44`) and both reach the Indexer through
`isTextContent`. Nothing downstream branches on which one it is.

## What this settles

### Three places Story P2.3 disagrees with this, all resolved the user's way

1. **P2.3 converts in place and creates no child.** Its implementation requirements say to write the
   resulting Markdown to the vault and set the document's status; there is no second document
   anywhere in it. Decision 1 replaces that.
2. **P2.3 routes to the Classifier.** That has been stale since BUG-005, which reversed the chain to
   `Ingestor → Indexer → Classifier` and made the Classifier terminal. A child is submitted to the
   Ingestor and takes the chain from the top; the Extractor routes nowhere.
3. **The `.txt`/`.md` question**, settled in decision 7.

### A contradiction between two accepted ADRs

ADR29 classes `.html` as text and routes it to the Indexer, so **an HTML document never reaches the
converter**. ADR28 names HTML as one of four formats where MarkItDown earns its keep — the others
being DOCX, PPTX and XLSX — and is explicit that on PDF the two candidate stacks are the same flat
text extractor. So the format that carries a large part of the argument for buying a Python runtime is
the one the routing table sends past the converter.

It is worse than an unused capability. The Clipper's entire output is HTML: `Clipper.java:75` sets
`.mimeType("text/html")` on every child it creates, and every URL submission goes through it. Under
ADR29 that HTML is written into the vault as raw markup for the Classifier to read as text. Decision 5
fixes it by moving `html`/`htm` to the convertible list, which is what makes a clipped page arrive in
the vault as Markdown.

## Consequences

- **The Classifier starts seeing uploaded files.** `IngestionController` builds an uploaded document
  with `.content("")` (lines 119 and 301) and `Classifier.doTheThing` returns early on blank content,
  so no uploaded file has ever been classified. The child carries the converted Markdown in `content`,
  which is what makes classification possible for the first time. It also puts extracted text in two
  places at once — the column and the vault file — with nothing deciding which is authoritative. That
  is DD-7.
- **Document counts grow.** One PDF is now two or more rows. `/api/status` counts documents, so its
  numbers change meaning slightly: they count units of work rather than things a person submitted.
- **A URL submission becomes three generations.** The submitted document, the Clipper's HTML child,
  and the Extractor's Markdown grandchild. `ingestor.max-generation: 4` leaves room for that inside a
  ZIP.
- **The child model does not fix failure reporting.** Decision 6 says the parent is terminal at
  `extracted` whether conversion succeeded or threw, because `Actuator.run()` stamps the participle
  unconditionally (`Actuator.java:90`). A parent at `extracted` with no children means either a
  conversion failure or an empty archive, and nothing on file separates them. See DD-8.
- **Ancestry walks are unindexed.** `generationOf` runs per document routed, bounded at four
  round trips, each a primary-key lookup on a table with no index on `parent_id`. Acceptable at this
  size; the first thing to change if document volume grows.

## Alternatives rejected

| | Why not |
|---|---|
| Convert in place, overwriting the parent's file and content | Destroys the original, contradicts ADR28's requirement that a failed conversion leave a re-runnable original, and has no answer at all for the second through Nth output of a conversion |
| One child holding all outputs concatenated | Loses the images entirely and makes the text unrecoverable from the archive case, which is the case that already works |
| A separate `derived_document` table | A new table for a relationship `parent_id` already expresses, and a schema change under `CREATE TABLE IF NOT EXISTS` plus `ddl-auto: validate` that would break every existing database |
| Aggregate children's tags onto the parent | Needs a merge rule for conflicting topics that nobody has decided, and it is derivable from a query when someone wants it |
| Depth guard alone, with no predicate change | The guard bounds a runaway; it does not stop a wrong routing decision from being taken four times before it stops. BUG-006 is the worked example |
| Route images back to the Extractor for OCR | ADR28 holds image description out of scope, and the only local path MarkItDown offers is EXIF metadata |
