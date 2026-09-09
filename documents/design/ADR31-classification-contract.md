---
name: ADR31-classification-contract
description: ADR31 — the Classifier produces tags, stores them in document.topic and document_tag, parses the first balanced JSON object out of the reply, and is the terminal stage where a parse failure costs only the labels
date: 2026-09-08
metadata:
  version: 1.1
  created-by: Claude Opus 5
  story: P2.4
  adr: ADR31
  amended-by: BUG-005
---

# ADR31 — The classification contract: the Classifier owns tags, and a bad reply does not stop the pipeline

**Date:** 2026-09-08
**Status:** Accepted, decision 4 amended by BUG-005
**Supersedes:** nothing
**Arises from:** Story P2.4 (Classifier Real Logic), `plan-P2.4.md` step 0
**Closes:** DD-3 (Tags have no owner)

Filed as its own file rather than appended to `ADRS.md`: ADR29, ADR30 and ADR31 were written on
three branches running at the same time, and one file taking three appends is three conflicts. Fold
it into `ADRS.md` after the branches merge.

## Context

`Classifier.doTheThing` has been a stub since the skeleton — it logs and returns `"Indexer"`. Making
it real needs four things decided first, and each of them is a decision somebody would otherwise
improvise while coding.

`schema.sql` has three tables: `document`, `tag`, `document_tag`. `document.topic` exists and nothing
writes it. `DatabaseService` already carries every method the work needs (`getTag`, `createTag`,
`linkDocumentToTag`, `endDateDocumentTag`, `getActiveTagsByDocumentId`, `updateDocumentTopic`), so
this is a decision about contract, not about plumbing.

## Decision 1 — the Classifier produces tags (closes DD-3)

DD-3 left two answers open: the user types tags, or the Classifier produces them. ADR27 removed the
tags field from the composer, so today nothing types them and no document acquires a tag by any
route.

**The Classifier produces them.** A document gets its tags from the model, without anyone typing
anything, which is what makes the vault worth searching.

Manual tagging is not ruled out and is not built. A later story can put a field back in the composer,
and the `tags` parameter the ingest endpoints already accept is the seam it would use. What this
decision settles is ownership of the default path, not exclusivity.

**The Markdown trap DD-3 names does not fire here, and that is an accident of shape rather than a
solved problem.** `#tag` at the start of a line is a Markdown heading, and the vault stores Markdown.
Tags reach this code as JSON array elements, so nothing ever parses `#` out of prose. Normalisation
strips a leading `#` from an individual tag string because a model sometimes writes `"#python"` in
the array, and that is the whole of it. A story that later adds inline tagging in the composer body
inherits DD-3's trap intact.

## Decision 2 — there is no `classification` table

Story P2.4 asks for a "Classification record linking document to response". No such table exists,
and this work does not add one.

**The classification result lives in `document.topic` plus `document_tag` rows.** The raw model
response is logged at DEBUG and not persisted.

Two reasons, in order of weight. `schema.sql` is shared and indexed in the root INDEX, and a
migration authored on one of four branches running concurrently is the worst possible place for a
schema change. And the story's own remaining requirements — a topic on the document, a `DocumentTag`
row per tag — are fully served by what exists; the record of the response is the part with no reader.

A later story that wants the raw response kept, for prompt tuning or to re-derive tags without
re-running the model, adds the table with a schema change of its own and a migration path for rows
already classified.

## Decision 3 — the output contract, and a parser that tolerates prose

The model is asked for strict JSON, and the schema goes in the system prompt:

```json
{ "topic": "one short noun phrase", "tags": ["lowercase-hyphenated", "..."] }
```

Local 7B-class models wrap JSON in prose or in a code fence regardless of instruction. So:

**The parser extracts the first balanced `{...}` from the reply and parses that, rather than parsing
the whole string. It tolerates surrounding text; it does not tolerate a missing object.**

Balanced means brace-depth tracked character by character with braces inside string literals ignored,
and escapes inside those literals honoured. A regex is the obvious implementation and it is wrong:
`\{.*\}` is greedy across a following object, `\{.*?\}` stops at the first `}` — which, for a reply
containing `{"topic": "a {weird} title", "tags": [...]}`, yields a prefix that is still valid JSON
with the tags missing. A truncated object that parses is worse than one that fails, because nothing
reports it.

Normalisation is part of the contract, not a detail of it, because the tag vocabulary is a shared
namespace: `tag.name` is the primary key, so two spellings of one idea are two tags forever. Each tag
is trimmed, stripped of a leading `#`, lowercased, has whitespace and `_` folded to `-`, has every
remaining character outside `[a-z0-9-]` dropped, has runs of `-` collapsed and trimmed from the ends,
and is discarded when empty or over the configured length. The surviving list is de-duplicated in
order and capped. `topic` is trimmed, whitespace-collapsed, and truncated to 256 characters to match
the column.

## Decision 4 — a parse failure is not a pipeline failure

**Amended 2026-09-08 by BUG-005.** The required chain is `Ingestor → Indexer → Classifier`: the
Indexer publishes the document to the vault, and the Classifier runs after it as the terminal stage.
The original version of this decision was written for the opposite order, where the Classifier ran
first and had to return `"Indexer"` on every path to avoid stranding a document it could not label.

**Every path now returns null.** An unparseable reply logs the raw response at WARN, leaves `topic`
null and writes no tags; an `OllamaException` does the same at ERROR; a document with no content
skips the model call entirely rather than spending the single Ollama permit on an empty string. None
of them routes anywhere, because there is nowhere left to route to.

The guarantee is unchanged and now costs nothing to keep: **a failed classification must not strand
the document.** Under the original ordering that was a rule the Classifier had to honour on five
separate paths, and DD-4 made getting it wrong invisible — `Actuator.run` stamps the participle
unconditionally once `doTheThing` returns, so a document stopped here would have sat at `classified`
having never reached the vault, with a log line as the only trace. Reversed, the file is already in
the vault before this stage starts. The worst outcome of any failure here is an untagged document
that is present and searchable by its text, which is what every document in the vault was before this
story existed.

**The asymmetry with ADR28's choice for conversion failures survives the reordering.** A failed
conversion produces no content to index, so continuing would put an empty file in the vault. A failed
classification produces content with no labels. The two differ in what survives the failure, and that
is still the whole of the reason.

## Consequences

**Re-classification retires the previous generation.** Before writing new links, the active
`document_tag` rows for the document are end-dated. Without this, classifying a document twice leaves
both answers active and the second run's disagreement with the first is invisible.

**The in-memory `Document` gets its topic set too**, not only the row. The document travels in the
`Message` (ADR26 decision 2), and writing only the row is the mistake DD-1 describes, in the one place
where avoiding it costs a line. No stage reads it after this one now — the Indexer, which used to,
runs before — so this is about the object being consistent with the database rather than about a
handover.

**A document is briefly in the vault unclassified.** The Indexer publishes first, so a file exists in
the indexing directory for as long as the model call takes before it has a topic or tags. Nothing
watches that directory today (ADR30), and the story that wires an external indexer owns whether it
re-reads after classification.

**Tag vocabulary drifts.** Nothing constrains the model to a controlled vocabulary, so `tag` grows a
row per phrasing the model invents. Acceptable at personal-vault scale, and the first thing to
revisit if search gets noisy. `ollama.model` is the floating tag `mistral` (P2.10 pins it), so the
vocabulary can also shift under a model pull with no code change at all.

**`OllamaClient` is injected optionally.** P2.1 owns `com.fourthbrain.llm` and merges separately; on a
tree where the interface exists but no implementation bean does, a required injection would fail the
whole application context and take every `@SpringBootTest` down with it. The Classifier therefore
takes the client as an optional dependency and, finding none, logs at WARN and stops — the same
behaviour decision 4 already specifies for a failed call.

## Alternatives rejected

| | Why not |
|---|---|
| Add a `classification` table now | A schema migration from one of four concurrent branches, for a column nothing reads yet. Decision 2. |
| Parse the whole reply as JSON and fail otherwise | Rejects the common case. Local models fence and preamble their output whatever the prompt says. |
| Extract the object with a regex | Silently truncates on a `{` or `}` inside a string value, and the truncation still parses. Decision 3. |
| Stop the chain on a classification failure | Under the original ordering it produced a document stamped `classified` that never reached the vault (DD-4). Under the required ordering the question no longer arises: the document is already published. |
| Ask the model to emit `#tags` inline in the body | Walks straight into DD-3's Markdown-heading trap for no gain over a JSON array. |
| Retry a failed or unparseable call | One call, one outcome. A retry under a one-permit gate needs a decision about queueing behind other work, and there is no evidence yet about what actually fails. |

## Amendments

- **2026-09-08, BUG-005.** Decision 4 rewritten for the required chain `Ingestor → Indexer →
  Classifier`. The Classifier is the terminal stage and returns null on all five of its paths instead
  of `"Indexer"`. The guarantee it was protecting is unchanged; it is now a property of the ordering
  rather than a rule five return statements had to keep. Consequences gained the publication window
  the reversal opens, and lost the claim that the Indexer reads the topic downstream — it no longer
  runs downstream, and it no longer logs the topic either.
