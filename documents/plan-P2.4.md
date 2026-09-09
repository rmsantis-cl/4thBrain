---
name: plan-P2.4
description: Execution plan for Story P2.4 (Classifier Real Logic) — prompt, parse, normalise and persist topic and tags, closing DD-3
date: 2026-09-07
metadata:
  version: 1.0
  created-by: Claude Opus 5
  story: P2.4
  owns: src/main/java/com/fourthbrain/actuators/Classifier.java, the classifier block in application.yaml
  new-adr: ADR31
---

# Plan — P2.4 (Classifier Real Logic)

One of five plans written to run in parallel. See *Parallel safety*. The others are `plan-P1.18.md`,
`plan-P2.1.md`, `plan-P2.2.md` and `plan-P2.5.md`.

This plan has a design gate. It also closes **DD-3** — DESIGN-DEBT names P2.4's design as what settles
where tags come from, and this is that design.

## Scope

Give `Classifier.doTheThing` a real body: build a prompt from the document, send it through
`OllamaClient`, parse the reply, normalise what comes back, write a topic and tag links, route on.

## Step 0 — the design gate, ADR31

**ADR31 is reserved by this plan.** ADR29 belongs to `plan-P2.2.md` and ADR30 to `plan-P2.5.md`; do
not reuse a number a parallel branch has claimed.

Four things have to be written down before step 1.

### D1 — where tags come from (closes DD-3)

DD-3 records two open answers: the user types tags, or the Classifier produces them. ADR27 removed the
tags field from the composer, so nothing types them today.

**Decision: the Classifier produces them.** Manual tagging is not ruled out and is not built — a later
story can add a field to the composer, and `/api/ingest/file`'s existing `tags` parameter is the seam
it would use. What this decision settles is that a document acquires tags without anyone typing
anything, which is what makes the vault worth searching.

DD-3 also names a trap and it belongs in the ADR: **`#tag` at the start of a line is a Markdown
heading**, and the vault stores Markdown. Because tags arrive from the model as JSON array elements
rather than as inline tokens in the body, this plan never parses `#` out of prose and the trap does not
fire. Say so explicitly, so a later manual-tagging story does not assume the problem was solved.

### D2 — there is no `classification` table

The story asks for a "Classification record linking document to response". `schema.sql` has three
tables and none of them is it, and this plan **may not add one** — `schema.sql` is shared, indexed in
the root INDEX, and a migration from a branch running beside three others is the worst place for it.

**Decision: no new table.** The classification result lives in `document.topic` plus `document_tag`
rows, which is what the story's own remaining requirements ask for. The raw model response is logged at
DEBUG and not persisted. A story that later wants the response kept — for prompt tuning, or to
re-derive tags without re-running the model — can add the table with a schema change of its own.

### D3 — the output contract

The model is asked for strict JSON and gets a schema in the system prompt:

```json
{ "topic": "one short noun phrase", "tags": ["lowercase-hyphenated", "..."] }
```

Local models wrap JSON in prose or fences regardless of instruction, so the parser extracts the first
balanced `{...}` from the reply rather than parsing the whole string. That is a contract detail with
teeth and it belongs in the ADR: **the parser tolerates surrounding text; it does not tolerate a
missing object.**

### D4 — what a parse failure does

**Decision: it is not a pipeline failure.** An unparseable reply logs the raw response at WARN, leaves
`topic` null, writes no tags, and still returns `"Indexer"`. An unclassified document in the vault is
worth more than a document stuck outside it, and the Classifier has no way to record a failure status
anyway (DD-4). The same for an `OllamaException`: log at ERROR, route on.

This is the opposite of ADR28's choice for conversion failures, and the asymmetry is deliberate — a
failed conversion produces no content to index, while a failed classification produces content with no
labels. Write the contrast down; it is the kind of thing that reads as an inconsistency later.

## Verified state of the tree

Read 2026-09-07 on branch `v04`.

| Claim | Verified |
|---|---|
| `Classifier.doTheThing` is a stub: logs, returns `"Indexer"` | `Classifier.java:35-57` |
| Nothing routes to the Classifier — `Ingestor` sends text to `"Indexer"` | `Ingestor.java:54-56` |
| `DatabaseService` already has every persistence method needed | `getTag`, `createTag`, `linkDocumentToTag`, `endDateDocumentTag`, `getActiveTagsByDocumentId`, `updateDocumentTopic` |
| `document.topic` exists in the schema and is written by nothing | `schema.sql:12`, `Document.java:41` |
| `tag` and `document_tag` exist, with soft delete via `end_date` | `schema.sql:31-46` |
| No `classification` table exists | Confirmed |
| Jackson is on the classpath through `spring-boot-starter-web` | `build.gradle:24` |
| `ollama.model` is the floating tag `mistral` | `application.yaml:37` |
| Tests fail at 15s per method | `build.gradle:59` |

**Dependency note.** `plan-P2.2.md` is what makes documents reach this stage. Until it merges, the
Classifier is registered, threaded and never sent anything, so verification here needs a message put
on its queue by hand or by a test. That does not block development — it changes how step 6 is
verified.

## Step 1 — the shared `OllamaClient` contract

`plan-P2.1.md` owns `com.fourthbrain.llm`. If that plan has merged, use what is there and skip this
step. If it has not, create these two files **byte-identical to P2.1's copies** — git merges an
add/add of identical content without a conflict, and if the two ever differ, P2.1's version wins and
this one is discarded.

```java
package com.fourthbrain.llm;

/** A call to the local model. Implementations are gated: one call is in flight at a time (P2.1). */
public interface OllamaClient {
    String chat(String systemPrompt, String userPrompt) throws InterruptedException;
    boolean isAvailable();
}
```

plus `OllamaException extends RuntimeException`. **Do not create `OllamaHttpClient` or
`ConcurrencyGate` here** — those are P2.1's implementation and there is no identical-content guarantee
to lean on. For tests, a hand-written fake implementing the interface is enough (step 6).

## Step 2 — the prompt

The story asks for a configurable prompt template, so it lives in `application.yaml` as a block
scalar, not in a Java string constant.

- **System prompt:** the role, the JSON schema from D3, a cap on tag count, and an instruction to
  answer with the object alone. State that tags are lowercase and hyphenated — normalisation (step 4)
  enforces it either way, and asking costs nothing.
- **User prompt:** the document's name when it has one, its mime type, and its content truncated to
  `${classifier.max-chars:8000}` on a whitespace boundary with an explicit `…[truncated]` marker. The
  marker matters: a model given a sentence cut mid-word will sometimes classify the truncation.
- A document whose content is blank after truncation is skipped entirely — log at INFO, no model call,
  return `"Indexer"`. Spending the one gate permit on an empty string blocks the Briefing later for
  nothing.

`temperature: 0` in the request, if the request builder exposes it — classification wants the same
answer twice for the same document. If P2.1's `chat(String, String)` has no parameter for it, leave it
alone rather than widening a shared interface from this branch.

## Step 3 — the call

`ollamaClient.chat(systemPrompt, userPrompt)`, inside the existing `try`. The gate, the timeouts and
the HTTP errors are all P2.1's; this plan adds no retry, no second timeout and no thread of its own.

`InterruptedException` from the gate is rethrown, not swallowed. `Actuator.run` catches it and breaks
the loop, which is what shutdown needs.

Log the elapsed time at INFO alongside the document id. It is the comparison point ADR28's trigger 3
asks for.

## Step 4 — parse and normalise

Both as package-private static methods on `Classifier`, so step 6 can test them without a Spring
context or a model:

```java
static String extractJsonObject(String reply)      // first balanced {...}, or null
static Classification parse(String reply)          // record Classification(String topic, List<String> tags)
static List<String> normalise(List<String> raw)
```

`extractJsonObject` scans for the first `{`, tracks brace depth while ignoring braces inside string
literals, and returns the balanced span. A regex does not do this correctly and the failure mode is a
truncated object that parses as valid JSON with the last tag missing.

`normalise`, in order: trim; strip a leading `#`; lowercase; collapse internal whitespace and `_` to
`-`; drop anything left that is not `[a-z0-9-]`; collapse repeated `-` and trim them from the ends;
drop empties and anything longer than `${classifier.max-tag-length:64}`; de-duplicate preserving
order; cap at `${classifier.max-tags:8}`.

`topic`: trimmed, collapsed whitespace, truncated to 256 characters — `document.topic` is
`VARCHAR(256)` and SQLite will not complain, but the Indexer and the UI will show whatever lands
there.

## Step 5 — persist

In this order, each through `DatabaseService`, which is the synchronized service under ADR17:

1. `updateDocumentTopic(docId, topic)` when topic is non-blank.
2. Set `doc.setTopic(topic)` on the in-memory `Document` too. It travels in the `Message` (ADR26
   decision 2), and the Indexer is the next stage to read it. Skipping this is the mistake DD-1
   describes in its second half, in the one place where it is cheap to get right.
3. Retire existing active links before writing new ones: `getActiveTagsByDocumentId(docId)`, then
   `endDateDocumentTag(id)` on each. Re-classifying a document must not accumulate two generations of
   tags. Skip the whole step when there are none, which is the normal case.
4. For each normalised tag: `getTag(name)`, `createTag(name)` when absent, then
   `linkDocumentToTag(docId, name)`.

`tag.name` is the primary key, so tags are shared across documents by construction and there is no
uniqueness handling to write. Two Classifier threads creating the same tag concurrently is possible
in principle; `DatabaseService`'s methods are synchronized and the check-then-create straddles two of
them, so wrap that pair in a `catch (DataIntegrityViolationException)` that re-reads rather than
adding a lock. With `classifier: 1` thread it never fires; the catch is there because the thread count
is a config value.

**Do not add a method to `DatabaseService`.** Everything above exists. That file is frozen (see
*Parallel safety*).

## Step 6 — configuration

**This plan owns a new `classifier:` block and nothing else in `application.yaml`.** Append it; leave
`ollama:` (P2.1), `ingestor:` (P2.2) and `indexer:` (P2.5) alone, and do not reorder the file.

```yaml
classifier:
  max-chars: 8000
  max-tags: 8
  max-tag-length: 64
  system-prompt: |
    You classify documents for a personal knowledge vault.
    Answer with a single JSON object and nothing else:
    {"topic": "<one short noun phrase>", "tags": ["<lowercase-hyphenated>", ...]}
    Use at most 8 tags. Do not explain. Do not use code fences.
```

Every key carries a default in its `@Value` so an older config still starts.

## Step 7 — tests

**`ClassifierParseTest`** — plain JUnit 5, no Spring, no model. This is where the real coverage is:

- A bare JSON object parses.
- The same object wrapped in prose parses.
- The same object inside a ```` ```json ```` fence parses.
- An object containing `{` inside a string value parses to the full span, not a truncated one.
- A reply with no object at all returns null rather than throwing.
- Normalisation: `#Machine Learning` → `machine-learning`; `  SPACED  OUT ` → `spaced-out`; `---` →
  dropped; a 200-character tag dropped; duplicates collapsed; a nine-tag list capped at eight.
- A topic longer than 256 characters is truncated.

**`ClassifierTest`** — a hand-written fake `OllamaClient`, no Mockito needed:

- A canned good reply writes a topic and the expected `document_tag` rows, and returns `"Indexer"`.
- A garbage reply writes nothing, logs at WARN, and still returns `"Indexer"` (D4).
- A fake that throws `OllamaException` logs at ERROR and still returns `"Indexer"`.
- A blank-content document makes no call at all — assert the fake was never invoked.
- Re-classifying a document that already has active tags retires the old links; the new set is what
  `getActiveTagsByDocumentId` returns.
- The in-memory `Document` passed in has its `topic` set on return (step 5.2).

Follow `IngestorRoutingTest`'s style — real objects and captured Logback output — rather than mocking
`DatabaseService`. Use `@TempDir` and an in-memory or temp-file SQLite URL so nothing writes to
`data/fourthbrain.db`.

## Verification

1. `scripts/build-log.ps1 -Task build` compiles.
2. `scripts/build-log.ps1 -Task test` is green with nothing skipped.
3. With Ollama running (P2.10 — note its status is disputed; see `plan-P2.1.md`), boot the app and
   put a document on the Classifier queue:
   - if `plan-P2.2.md` has merged, `POST /api/ingest/capture` with a paragraph of real text;
   - if it has not, `POST /api/ingest/file` with a `.txt` and enqueue to the Classifier by hand, or
     drive it from a temporary test.
   The log shows the elapsed model time, and `GET /admin/db` shows a topic and tag rows.
4. Feed a document that provokes a chatty reply — a one-word note usually does it — and confirm the
   fenced or prose-wrapped case parses.
5. Stop Ollama, submit again: an ERROR line, no tags, and the document still reaches `indexed`.
6. Submit the same document twice: one generation of active tags, the earlier one end-dated.

## Parallel safety

**Owns:** `Classifier.java`, the new `classifier:` block in `application.yaml`, and its two test
classes.

**Shares:** `OllamaClient.java` and `OllamaException.java` with `plan-P2.1.md`, byte-identical, P2.1
authoritative (step 1).

**Must not touch:** `Actuator.java` (frozen across all five plans — DD-1 and DD-4 live there),
`DatabaseService.java` (every method needed exists), `schema.sql` (D2), `Ingestor.java` (P2.2),
`Indexer.java` (P2.5), `index.html`, `build.gradle`, `Coordinator.java`.

**Depends on:** `plan-P2.1.md` for the real client — merge after it where possible. Step 1 is what
lets this branch compile if it runs first.

**Interacts with `plan-P2.2.md`:** that plan routes text here. Neither blocks the other; the ordering
only changes how verification 3 is driven.

## Scope boundary

Out, deliberately:

- **A `classification` table.** D2.
- **Manual tagging in the UI.** D1 leaves it open and unbuilt. ADR27 removed the field.
- **Search over tags.** `/api/search` is a stub and belongs to no story in this set.
- **The Briefing's prompts.** P2.6.
- **Recording a classification failure as a status.** An actuator cannot; DD-4.
- **Retries, backoff, model selection per document.** One call, one outcome.
- **Pinning the model tag.** P2.10. Classification output will drift if `mistral` is re-pulled, which
  is that story's whole point and worth remembering when a tag set changes for no visible reason.

## Acceptance criteria mapping

| Criterion (P2.4) | Closed by |
|---|---|
| LLM classification produces valid tags and topic | Steps 2–5, verification 3 |
| Classification and DocumentTag records created correctly | **Partly re-mapped by D2** — `DocumentTag` rows and `document.topic`; no `classification` table |
| Document status updates to classified stage | Unchanged from `Actuator.run` (`classifying` → `classified`); verification 3 |
| Messages route properly to Indexer | Step 3's return value, held in every failure path per D4 |
| Parsing errors logged and handled gracefully | D4, step 4, `ClassifierParseTest` |

## Risks

- **A 7B model returning strict JSON is not guaranteed.** The parser tolerating prose and fences is
  what makes this workable, and D4 is what keeps a bad day from stopping the pipeline. If the failure
  rate turns out high in practice, the answer is a better prompt or a bigger model, not a stricter
  parser.
- **One gate permit shared with the Briefing.** A long classification delays the 6 AM briefing and
  vice versa. That is P2.1's design working as intended; the acquire timeout is the guard.
- **The floating `mistral` tag.** Tag vocabulary can change under a model pull with no code change.
  P2.10 pins it.
- **Tag vocabulary drift generally.** Nothing constrains the model to a controlled vocabulary, so the
  `tag` table grows one row per phrasing. Acceptable at personal-vault scale; it is the first thing to
  revisit if search gets noisy.
