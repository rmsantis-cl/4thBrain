---
name: plan-P2.9-P2.3
description: Execution plan for Stories P2.9 (MarkdownConverter seam and its MarkItDown implementation) and P2.3 (Extractor conversion path), gated on ADR38 and on P2.8's format census
date: 2026-09-08
metadata:
  version: 1.0
  created-by: Claude Opus 5
  covers: P2.9, P2.3
  gated-on: ADR38, P2.8 census
  owns:
    - src/main/java/com/fourthbrain/convert/ (new package)
    - src/main/java/com/fourthbrain/actuators/Extractor.java
    - src/main/java/com/fourthbrain/actuators/Ingestor.java (the routing table and its predicates)
    - src/main/resources/application.yaml (new top-level `fourthbrain:` and `extractor:` blocks; one
      key added to `ingestor:`; one comment corrected in `vault:`)
    - src/test/java/com/fourthbrain/actuators/ExtractorTest.java (new)
    - src/test/java/com/fourthbrain/convert/ (new)
---

# Plan — P2.9 and P2.3, the converter and the stage that calls it

Two stories in one plan because the seam is worthless without a caller and the caller cannot compile
without the seam. They are still two merges: everything through step 4 is P2.9 and touches no actuator,
so it can land on its own.

## What this plan owns, and what it must not open

Owned, as listed in the header: the new `com.fourthbrain.convert` package, `Extractor.java`,
`Ingestor.java`'s routing table and type predicates, and `application.yaml`.

The `application.yaml` edits are additive and ordered so they cannot collide with another branch.
Two **new top-level blocks**, `fourthbrain:` and `extractor:`, appended at the end of the file before
`logging:`. Nothing already in the file is reordered. Two smaller edits inside existing blocks are
unavoidable and are called out here so a reviewer sees them: `ingestor:` gains one key
(`max-generation`), and the comment above `vault.indexer.source-area` is corrected — the value itself
does not change, for the reason under "Two corrections" below.

Not opened by this plan: `Actuator.java` and `DatabaseService.java`, both frozen since the five
parallel Phase 2 plans and both still holding DD-1 and DD-4. `Classifier.java`, `Indexer.java`,
`Clipper.java`, `schema.sql` and the entity classes are untouched.

`Clipper.java` is worth naming twice. BUG-006 is filed against it and against `Ingestor.nextStage`,
and it is a separate, smaller change that should land before this plan rather than inside it.

---

## Step 0 — the conflicts, then the design gate

Three files carried whole-file merge conflicts: `BACKLOG-TRACKER.md`, `documents/INDEX.md` and
`documents/story/P1.19.md`. Each is one hunk, and in each the `theirs` side is current `v04` and
authoritative — tracker version 3.13 against ours 3.12, INDEX 2.13 carrying rows for ADR30,
`SPIKE-LOCAL-MODEL-SELECTION` and BUG-005, and P1.19 COMPLETED and merged as `e4e0a23`/`21c5bb2`. The
sides differ by line endings rather than by content: a tree-wide LF→CRLF rewrite on the stale side met
a union merge driver, which concatenated two copies of every file. Resolution keeps `theirs` and drops
the three marker lines. No version bump for the resolution, because it restores a state rather than
authoring one.

**Then the gate: ADR38 is written before any Java in this plan is touched.** It is
`documents/design/ADR38-extractor-output-model.md`, and it settles what the Extractor produces — a set
of zero to N child Documents of mixed types, rather than a converted copy of its input. Every step
from 5 onward depends on it. Steps 1 through 4 do not, and can start while it is being reviewed.

---

## Step 1 — run P2.8's format census

**This is a user action, not an agent one.** It needs the real inflow directory, which no agent in
this project can reach: the corpus is the user's own documents and it has never been assembled. Story
P2.8 has been WIP since 2026-09-07 with exactly these two measurements outstanding.

Trigger 1, the format mix:

```
Get-ChildItem -Recurse -File <inflow-root> |
  Group-Object Extension |
  Select-Object Name, Count, @{n='TotalMB';e={[math]::Round(($_.Group|Measure-Object Length -Sum).Sum/1MB,1)}} |
  Sort-Object Count -Descending
```

Trigger 2, the scanned share, is a per-page character count over the PDFs the first command finds.
Extract the text of each PDF, divide the character count by the page count, and call anything under
about 100 characters per page a page with no text layer. Record the proportion of PDF inflow that
lands there.

Record both in `documents/story/P2.8.md`, which is where they were asked for.

**If PDF dominates the count, or more than a quarter of the PDFs are scanned, stop and reopen ADR28.**
Trigger 1 means the Python runtime is being installed to get flat text that Tika already produces
in-process. Trigger 2 means the real question is OCR, where Tika has `TesseractOCRParser` and
MarkItDown has a paid Azure call. Either way the class behind the interface changes and nothing else
does — see "What the census gates" below. Every step in this plan except step 3 stands either way.

---

## Step 2 — the stack-independent seam

New package `com.fourthbrain.convert`, holding only what a Tika implementation would need just as
much as a MarkItDown one:

| Type | Shape |
|---|---|
| `MarkdownConverter` | interface: `convert(Path, String) throws ConversionException`, `supports(String)`, `probe()` |
| `ConversionException` | checked, carrying `Reason` and a persistable `detail` |
| `ConversionException.Reason` | `UNAVAILABLE`, `UNSUPPORTED_FORMAT`, `TOO_LARGE`, `TIMEOUT`, `CONVERTER_FAILED`, `EMPTY_RESULT`, `OUTPUT_TOO_LARGE`, `IO_ERROR` |
| `ProbeResult` | record `(boolean available, String version, String detail)` |
| `ProcessRunner` | functional interface over "run this command with this environment and this timeout" |
| `ConverterProperties` | `@ConfigurationProperties("fourthbrain.converter")` |

No `ProcessBuilder` in this step. `DefaultProcessRunner` arrives in step 3; until then `ProcessRunner`
has only test implementations, which is the point — steps 9 through 13 of P2.9's conversion path are
testable with no Python installed and no OS branching.

Covers P2.9 acceptance criteria **1** (the interface exists with the three-method signature) and **17**
(`ConverterProperties` binds every configured key, including `timeout` as a `Duration` written `120s`).

---

## Step 3 — `MarkItDownConverter`

The one implementation, plus the `fourthbrain.converter` block in `application.yaml`. Follow P2.9's
fourteen-step conversion path and five-step startup probe verbatim — they are written to that level of
detail precisely so this step is transcription rather than design, and the two places they are most
easily got wrong (leaving a pipe undrained, and the child's UTF-8 environment on Windows) are the two
that turn this option into a hang or into silent mojibake.

The block goes in as written in P2.9, under a new top-level `fourthbrain:` key.

Covers P2.9 acceptance criteria **2 through 16**. Criteria 4 through 13 run against a faked
`ProcessRunner` and need no Python; criteria 8, 9 and 15 need the real converter and therefore need
step 4 done first on the target machine.

**This is the only step the census gates.**

---

## Step 4 — `documents/RUNBOOK-MARKITDOWN.md`

Not a paragraph in a story. A file someone follows on a fresh machine, holding:

- The exact venv creation, pinned to an interpreter rather than to whatever `python` resolves to:
  `py -3.12 -m venv <project-local path>`.
- The exact install line with the extras and a pinned version:
  `<venv>\Scripts\pip install "markitdown[pdf,docx,pptx,xlsx,outlook]==<version>"`. The version is
  whatever step 1's environment actually installs; it is then written into
  `fourthbrain.converter.markitdown.expected-version` with `version-check: fail`, which is P2.9's
  contingency 5.
- **The absolute path to paste into `application.yaml`**, for both `executable` and `python`, with a
  note that exactly one of them is set and neither falls back to `PATH`.
- **The WSL rule, stated as a rule and not as a caution:** the interpreter lives on the same side of
  the WSL boundary as the JVM. Nothing in the design translates `C:\...` to `/mnt/c/...`, and a venv
  in WSL2 under a Windows JVM produces a command line whose every path is wrong. **Record which side
  that is on this machine** — the `executable` path in `application.yaml` is meaningless without it,
  and P2.9 carries this as contingency 7.

The runbook also carries the uninstall and the re-pin, because the version check will fail one day
when someone upgrades the venv and the message needs to point at something.

---

## Step 5 — `Ingestor` routing

Four changes, all in `Ingestor.java`, all from ADR38 decision 5 and decision 3.

1. **The convertible row flips.** ADR29 decision 5 stops PDF, DOC(X), PPT(X), XLS(X), EPub, RTF and
   ODT at the Ingestor with a warning, because routing them to an Extractor that only unzips parked
   them silently. `needsConversion` now returns `"Extractor"`.
2. **`html` and `htm` move from text to convertible.** Remove them from `TEXT_EXTENSIONS`
   (`Ingestor.java:44`) and add them to `CONVERTIBLE_EXTENSIONS`, and add `text/html` to
   `CONVERTIBLE_MIME_TYPES`. `isTextContent` matches on the `text/` mime prefix, so `text/html` would
   otherwise be claimed as text before any extension was consulted — which is why the **evaluation
   order also changes**: `needsConversion` is tested before `isTextContent`, not after it. The new
   order is archive, convertible, text, URL, unparseable URL, unrecognised.
3. **A generation guard.** A private `generationOf(Document)` walks `parent_id` upward through
   `DatabaseService`, counting, and stops its own walk at the limit so a cycle in the data cannot spin
   it. `nextStage` refuses to return `Extractor` or `Clipper` once the generation has reached
   `ingestor.max-generation` (default 4), logging a WARN that names the document, its generation and
   the stage refused. The `Indexer` route and every path that already stops are unguarded, because
   they cannot extend the chain.
4. **`isUrl` moves after the guard**, so a document whose `source_url` sends it back to the Clipper is
   bounded rather than infinite. This is not the fix for BUG-006 and must not be described as one —
   see that bug for why. Take BUG-006's option A as well, which is one line in the same method.

`DocumentRepository` gains `findByParentId`, which it does not have today; the ancestry walk itself
uses primary-key lookups and needs nothing new. No index and no foreign key are added, for the reason
in ADR38: `schema.sql` runs `CREATE TABLE IF NOT EXISTS` under `ddl-auto: validate`, so a schema edit
never reaches an existing `data/fourthbrain.db`.

---

## Step 6 — `Extractor`, the conversion path

The ZIP path stays as it is. The conversion path is new, and it is the same shape: produce files,
create a child per file, submit each one.

1. **Assert the `raw` copy and refuse to convert without it.** `databaseService.findLive(id,
   VaultArea.RAW)` must return a live copy pointing at a file that exists. If it does not, log an ERROR
   and return; nothing is converted.

   This **deletes** Story P2.3's first implementation requirement — "archive the original into the raw
   vault area, recording a `document_copy` row, *before* conversion" — rather than implementing it. The
   Ingestor has done exactly that on every document since ADR29 decision 3, at `Ingestor.archive`
   (`Ingestor.java:243-263`), and a second archiver would either duplicate the copy or race the first.
   P2.3's criterion 6 is satisfied upstream, and the assertion is what makes it testable from here.

2. **Convert.** `converter.convert(rawOrTmpPath, extensionHint)`. The Extractor holds a
   `MarkdownConverter` and nothing else; it never learns that Python exists, which is P2.3's criterion 1
   and P2.9's criterion 1.

3. **Write the outputs into `tmp`.** Not `incoming` — see "Two corrections" below. The text output is
   named through `VaultNaming.newName(tmpDir, VaultNaming.baseOf(parentName), ".md")`, the
   extension-aware overload, so a second conversion of `notes.pdf` produces `notes_001.md` rather than
   `notes.md_001`. Any non-text output keeps its own real extension and is named through the same call.
   Record a `tmp` `document_copy` row for each file written.

4. **Create a child per file**, with `parentId` set to the original. For a text child: `content` set to
   the converted Markdown, capped at `extractor.max-content-chars`, and front matter naming the
   converter and its version, taken from a **cached** `probe()` called once at startup rather than per
   document (P2.3 criterion 7). For a non-text child: no content, no front matter, its real mime type.
   Save through `databaseService.create`, then `sendToIngestor` — reusing the method already at
   `Extractor.java:194` rather than writing a second one.

5. **Retire the parent's `tmp` copy** once a live `raw` copy is confirmed, and delete the file. The
   parent's bytes exist in `raw`; leaving a second copy in `tmp` means every converted document sits on
   disk three times. Confirm before deleting, in that order, and skip the delete if the confirmation
   fails.

6. **The parent is terminal at `extracted`** and routes nowhere (ADR38 decision 6). `doTheThing`
   returns null.

Covers P2.3 acceptance criteria **1, 2, 3 and 7**, and re-maps **6** as satisfied by the Ingestor and
asserted here. Criteria **4 and 5** are the failure statuses and move out of the story entirely — see
"The DD-4 split" below.

---

## Step 7 — tests

**`ExtractorTest`, which does not exist.** There is no test class for `Extractor` today, and none for
`Clipper` either; the suite covers `Ingestor`, `Classifier`, `Indexer`, the coordinator, the manager,
the LLM client and the controller. The new class covers, against a fake `MarkdownConverter`:

- a conversion producing one text output creates one child with `parentId` set, `content` set and
  front matter naming the converter
- a conversion producing a text output and two images creates three children, of which one is text and
  two are not
- a conversion producing nothing creates no children and leaves the parent at `extracted`
- no live `raw` copy means no conversion is attempted
- the parent's `tmp` copy is retired and its file deleted, and is not deleted when the `raw`
  confirmation fails
- two conversions of the same source name produce `notes.md` and `notes_001.md`
- the existing ZIP path still produces one child per member

**An extension to `PipelineFlowTest`**, which is the only test that states the chain as a whole. A
convertible document driven through the chain asserts three things: the parent ends at `extracted`,
the child ends at `classified`, and `child.getParentId()` equals `parent.getId()`. That last assertion
is the one that fails if anyone reverts to converting in place.

Plus the routing cases step 5 changes: a PDF routes to `Extractor` rather than stopping with a
warning; an `.html` document routes to `Extractor` rather than to `Indexer`; a document at
`max-generation` is refused with a WARN.

---

## Step 8 — documents

Written in the same pass, one write per file:

- `documents/design/ADR38-extractor-output-model.md` — the design gate (step 0).
- `documents/bug/BUG-006.md` — READY.
- `documents/story/P2.13.md` — the carved-out failure-status story, NOT-READY.
- `documents/story/P2.3.md` — rewritten against ADR38 when the plan runs: the child model, the deleted
  archive requirement, criteria 4 and 5 removed to P2.13, the Classifier route struck.
- `documents/story/P2.8.md` — the census results from step 1.
- `documents/RUNBOOK-MARKITDOWN.md` — step 4.
- `documents/DESIGN-DEBT.md`, `BACKLOG-TRACKER.md`, `documents/INDEX.md`, `INDEX.md`.

---

## Runtime decisions

**The user provides the Python, and the build must not.** MarkItDown lives in a project-local venv
created by hand from the runbook. Nothing in `gradle build` creates it, installs into it or checks for
it beyond the startup probe. Putting a Python package manager into the build would mean an offline
build fails, a build behind a proxy fails, and a build on a machine that already has the venv does
network I/O to confirm it — all of that for a single-user desktop application whose Python is
installed once and then does not change.

**Discovery is deliberately absent.** `fourthbrain.converter.markitdown.executable` and `.python` are
absolute paths. Neither falls back to a bare `markitdown` or `python` on `PATH`. Exactly one is set,
and if both are empty the probe fails. A `PATH` lookup on a Windows desktop running Ollama, Obsidian
and possibly a system Python is a lookup that will one day find the wrong interpreter and produce a
`ModuleNotFoundError` that reads as a MarkItDown bug.

**Timeout.** `fourthbrain.converter.markitdown.timeout`, default `120s`, and it is an **admitted
placeholder**: no document has been converted on this machine, so 120 seconds is a number rather than
an estimate. P2.9 contingency 2 says what replaces it — the slowest per-document wall time across the
corpus, rounded up and tripled. Enforcement is `waitFor(timeout)`, then `destroy()` on each of
`process.descendants()` and then the process, 2 seconds of grace, then `destroyForcibly()` on anything
still alive. The child is dead before `convert` returns.

**An absent runtime.** Under the default `fail-fast: true`, `@PostConstruct` throws and the Spring
context does not come up. The message carries the attempted absolute path, the exit code, an excerpt
of stderr and the venv install line from the runbook, so the person reading a stack trace at boot has
the fix in front of them. Under `fail-fast: false` the application boots, one ERROR is logged, and
every `convert` throws `UNAVAILABLE` without spawning anything.

---

## What the census gates, precisely

ADR28's triggers 1 and 2 decide **which class sits behind the interface, and nothing else.** They do
not decide whether there is an interface, what its methods are, what the failure reasons are called,
how a subprocess is supervised, or anything at all about the Extractor.

So the census gates exactly three things: `MarkItDownConverter` (step 3), the venv install, and the
pinned version. If a trigger fires, that class is replaced by a Tika implementation and steps 3 and 4
are rewritten. Steps 2, 5, 6 and 7 do not change by a line.

Everything else proceeds regardless: `MarkdownConverter`, `ConversionException`, `ProbeResult`,
`ProcessRunner`, `ConverterProperties`, and all of Story P2.3. That is the whole point of the seam, and
it is why step 2 is a step of its own rather than the first half of step 3.

---

## The DD-4 split

**P2.9's failure-status contract cannot be implemented from inside the Extractor.**

`Actuator.run()` stamps the participle one line after `doTheThing` returns:

```java
String n = doTheThing(d);                   // Actuator.java:89
service.setStatus(d, getParticiple());      // Actuator.java:90
```

So whatever the Extractor writes to `Document.status` is overwritten by `extracted` before the next
queue item is taken. `EXTRACTION_FAILED`, `EXTRACTION_UNSUPPORTED` and `EXTRACTION_EMPTY` are
unwritable from where P2.3 was told to write them.

Throwing instead is worse. `run()` catches it as "Main loop error" (`Actuator.java:113-115`), skips
the participle stamp entirely, and leaves the document at `extracting` — an in-progress status with no
thread coming back for it, which is exactly what P2.9's own rules forbid: "no failure path leaves a
document in an in-progress status."

That is DD-4, it lives in `Actuator.java`, and `Actuator.java` is frozen.

**So the failure statuses are carved out of P2.3 into Story P2.13**, blocked on DD-4, NOT-READY. P2.3
keeps everything that works without a schema change and without touching `Actuator.java`.

**The interim, and it is weaker than what P2.3 asked for.** On conversion failure the Extractor
creates no child, logs the `Reason` and the `detail` at ERROR, and the original stays in `raw` where
the Ingestor put it. The document reads `extracted`, the same as a success.

There is **no queryable failure signal**, and this plan does not pretend otherwise. The obvious one —
"documents at `extracted` with no row whose `parent_id` is theirs" — does not work under ADR38,
because **zero children is a legitimate success**: an archive containing only directories produces
none, and a conversion that yields no text but four images produces children that are all images. The
query cannot separate a failed PDF from an empty ZIP, and it cannot separate an image-only PDF that
threw `EMPTY_RESULT` from a photo archive that behaved correctly. No other column survives either:
`status` is stamped by the run loop, `content` is empty for both, and nothing records a reason.

What is left is a **review list, not a failure signal**: parents at `extracted` with no children at all
are worth a person looking at, and the reason for each is in the log. Say that in the runbook and do
not build a dashboard on it.

Until P2.13 closes, the `Reason` distinction that P2.9 spent a mapping table on exists only in the log
line. That is the cost of not opening `Actuator.java`, it is recorded rather than absorbed, and it is
the third time a plan has hit DD-4.

---

## Two corrections to existing planned work

**`vault.indexer.source-area` must stay `tmp`.** The comment at `application.yaml:77-79` says it
"becomes `incoming` once Extractor writes sanitized output there (P2.3)", and the Javadoc at
`Indexer.java:43-48` promises the same. Both are wrong and the promise is struck.

Flipping it would strand every document that never goes through the Extractor. A typed note, a
Markdown upload, a `.txt`, a JSON file — all of them are materialised or landed in `tmp` by the
Ingestor and routed straight to the Indexer, and their live copy is in `tmp` and nowhere else. An
Indexer reading from `incoming` would find no copy for any of them. The setting was written when the
Extractor was expected to be on every document's path; ADR38 puts it on the path of convertible
formats and archives only.

Change the comment and the Javadoc to say the value stays `tmp` and why. Leave the value alone.

**The Ingestor will archive derived children into `raw` alongside originals, and that stays.** Every
child comes back through the Ingestor, and `Ingestor.archive` copies its `tmp` file into `raw` without
asking where it came from. A `parentId != null` skip is the obvious tightening and it is wrong: the
same condition holds for a ZIP member, whose bytes exist nowhere else on disk once the archive is
retired, so skipping the archive for children would lose exactly the files that most need it.
Expressing the real difference — "derived from a file that is itself archived" against "extracted from
a container" — needs a field the schema does not have, and this plan adds no column.

The cost is one small Markdown copy per converted document. Accept it.

---

## The live gap this plan closes

**No uploaded file has ever been classified.**

`IngestionController` builds an uploaded document with `.content("")` — lines 119 and 301 — because the
bytes are on disk and the column is for captured text. `Classifier.doTheThing` returns early when
content is blank (`Classifier.java:114-120`), deliberately, so an empty string never spends the single
Ollama permit. Between them, every uploaded file reaches the Classifier, is found to have no content,
and leaves without a topic or a tag.

Nothing caught it because P2.4's 33 tests all build documents with content in them, and the one
end-to-end test in the suite drives a captured note, which has content by construction.

Setting the child's `content` to the converted Markdown fixes it for every document that goes through
the Extractor. It does not fix it for a `.txt` or `.md` uploaded directly, which routes Ingestor →
Indexer → Classifier with an empty column and stops there; that one needs the Classifier to read the
file rather than the column, which is DD-7's question and not this plan's.
