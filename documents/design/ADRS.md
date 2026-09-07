---
name: ADRS
description: Architecture Decision Records for 4thBrain v04. ADR1-ADR24 are inherited from v03 and not restated here; v04's own decisions start at ADR25
metadata:
  version: 1.2
  created-by: Claude Sonnet 5
  date: 2026-09-07
---

# Architecture Decision Records — v04

ADR1 through ADR24 belong to v03 and still apply where v04 kept the same design. They are not
restated here. The ones referenced most often in this repository:

| ADR | Subject |
|---|---|
| ADR14 | (inherited from v03) |
| ADR17 | Brief, serialized database transactions — the basis for `DatabaseService` being synchronized |
| ADR24 | (inherited from v03) |

Decisions made for v04 start at ADR25.

---

## ADR25 — Thymeleaf is the view layer; server-rendered pages live in `templates/`

**Date:** 2026-09-07
**Status:** Accepted
**Supersedes:** nothing
**Arises from:** BUG-001

### Context

Five endpoints across `UIController` and `AdminController` are annotated `@Controller` and return
view names — `"index"`, `"admin"`, `"admin-db"`, `"api-docs"`. `build.gradle` carried no view
technology, so those names reached Boot's default `InternalResourceViewResolver`, which forwards a
name with no suffix attached. `index` matches no mapping, so every one of the five returned 404.
The UI had never rendered.

Reading the four HTML files turned up something worth recording, because it makes the obvious fix
look better than it is:

- None of them contains a single Thymeleaf attribute. All four are plain HTML.
- None of the five controller methods takes a `Model` parameter or sets a model attribute. Nothing
  is passed to any view.
- `static/index.html` is a single-page app. It talks to the REST API over `fetch` and builds its own
  DOM in an inline `<script>`.

So the pages need serving, not rendering. The cheapest correct fix was to forward all five endpoints
to static files and move the three admin pages from `templates/` to `static/`, with no new
dependency at all.

### Decision

Add `spring-boot-starter-thymeleaf` anyway, and keep the controllers returning view names.

Server-rendered pages live in `src/main/resources/templates/`. `src/main/resources/static/` is for
assets a page links to — stylesheets, scripts, images — not for pages an endpoint serves.
`index.html` moves into `templates/`.

### Why, given the above

The decision is deliberately not the cheapest one, and the reason is what happens next rather than
what is true today.

`admin-db.html` is a database browser. Today it is a stub, and forwarding it to a static file would
work. The moment it shows real rows it needs to render a collection server-side, which is the thing
a template engine exists for, and at that point the static-file approach has to be unwound across
every page that took it. Installing the engine now sets one convention while there are four pages
to keep consistent instead of a dozen.

The cost of being wrong in this direction is one dependency on the classpath. The cost of being
wrong in the other direction is a second migration and two conventions living side by side.

Recorded plainly: this buys nothing at the moment it lands. Every page renders byte-identical
output to what forwarding would have produced. It is a bet on the roadmap, not a fix for a present
defect.

### Consequences

**For pages added from here on.** A page an endpoint serves goes in `templates/` and the controller
returns its name without an extension. A page needing no controller can stay in `static/` and be
reached at its own path, but that is the exception, not the pattern.

**Plain HTML is already a valid template.** Thymeleaf renders a file with no `th:` attributes
unchanged. Moving a page into `templates/` requires no edits to it, and it still opens correctly
from the filesystem in a browser.

**The one real trap — `${...}` in JavaScript.** JS template literals use the same delimiter as
Thymeleaf expressions:

```javascript
return `<a href="${item.href}">${item.label}</a>`;   // JS, not Thymeleaf
```

`index.html` is full of these. They are safe by default: Thymeleaf 3 evaluates expressions inside a
`<script>` only when the tag carries `th:inline="javascript"`, and a plain `<script>` is passed
through as raw text. Do not add `th:inline="javascript"` to a script block containing template
literals. If a block ever does need to be left strictly alone, mark it `th:inline="none"`.

Inline expressions in body text, `[[...]]` and `[(...)]`, are processed by default in Thymeleaf 3.
No current page uses that syntax; a page that wants those characters literally has to escape them.

**Templates are parsed, not copied.** Thymeleaf reads each page as a document, so malformed markup
that a browser would forgive can fail at render time. A page that previously "worked" as a static
file is not automatically a working template — it has to be loaded once to know.

**`templates/` is no longer dead.** The three admin files have been unreachable since they were
written. They become live pages under this decision, which means their content gets exercised for
the first time.

### Alternatives rejected

| | Why not |
|---|---|
| Forward all five endpoints to `static/` files, no dependency | Correct and smaller today. Rejected for the roadmap reason above, not on technical grounds. |
| Delete `UIController` and let Boot's welcome page serve `static/index.html` at `/` | Works for `/`, drops `/chat`, and leaves the admin pages broken. |
| Keep the controllers and delete the three admin templates | Discards the admin surface rather than deciding about it. |

---

## ADR26 — The pipeline's entry contract: one entry point, a document-carrying message, one ingest shape

**Date:** 2026-09-07
**Status:** Accepted
**Supersedes:** nothing (`Coordinator.startChain` was an unimplemented stub; `sendMessage` was undocumented)
**Arises from:** Story P1.11, extended to cover Story P1.13

### Context

Two ways exist to start a pipeline. `Coordinator.startChain(long)` throws `UnsupportedOperationException`;
`IngestionController` calls `sendMessage(String, Document)` instead, which the tests never exercise.
`sendMessage` builds `new Message(null, ...)`, and `Message.id()` dereferences `from` unguarded, so
logging a message built this way throws an NPE the first time someone adds a debug log line. The
registry backing both is a static field read through an injected `@Component`, which means a second
`@SpringBootTest` inherits the actuators the first one registered — Spring caches contexts, so clearing
a static map on context close does not separate them.

Story P1.13 layers a second, unrelated gap on top: `/api/ingest/text` and `/api/ingest/url` are two
endpoints for one operation (put something in the vault), which duplicates the type-detection work the
composer (P1.17) already has to do to decide which button to wire a submission to.

### Decision

1. `startChain(long documentId)` is the only entry point. `sendMessage` is deleted.
2. **The message carries the fully-loaded `Document`, not an id.** `startChain` reads the document
   from the database exactly once, at the start of the chain. From there, the same `Document` object
   passes from actuator to actuator inside `Message.document`, and every stage reads and mutates that
   instance directly. No actuator re-queries `DatabaseService` for a document it is already holding —
   the database is touched only to load the document at chain start and to persist each status
   transition. `Message`'s own class comment ("carries only the document ID") has described the wrong
   design since the field was changed to `Document document`; this decision makes the actual field the
   documented contract.
3. `Message.from` is legitimately optional: a message can originate at the REST boundary, outside any
   actuator. `id()` and `toString()` render a null sender as `external` rather than dereferencing it.
4. The Coordinator registry becomes instance state on the `@Component`, not static, so each Spring
   context gets its own actuators and test contexts stop bleeding into each other.
5. A submitted URL is carried on `Document.sourceUrl`; `content` stays empty until Clipper fetches it.
   `Ingestor.isUrl` and `Clipper` read `sourceUrl`, not `content` — without this, a URL document matches
   neither `isUrl` nor `isTextContent` and the chain silently stops at `ingested`.
6. `DatabaseService` — the synchronized service under ADR17 — is the only writer of `Document.status`.
   `DocumentService.updateDocumentStatus` is unsynchronized and unused for status going forward.
7. **`/api/ingest/text` and `/api/ingest/url` collapse into one endpoint**, `POST /api/ingest/capture`,
   taking a JSON body with either a `url` key or a `text` key set — never both. The controller dispatches
   on which key is present; it does not re-derive the type from a URL pattern, because the UI has
   already made that call. `/api/ingest/file` stays separate: a multipart upload shares no shape with a
   JSON body, and forcing it into the same envelope buys nothing.
8. One response shape across all three ingest endpoints (`file`, `capture`):
   `{ "id": 42, "status": "ingesting", "message": "Queued" }`.

### Why, given the above

**Document-in-message removes a race, not just a query.** SQLite writes are already serialized behind
`DatabaseService`'s synchronized methods (ADR17). A stage that reloaded the document by id would be
asking "what does the row say right now", a question with no stable answer while another actuator could
in principle be mid-write. Passing the same in-memory object sidesteps the question entirely: a stage
sees the document exactly as the previous stage left it, with no re-fetch and no window for it to have
changed underneath. The cost is symmetrical — no stage can see a write made by something outside the
chain while the document is in flight — which is the behaviour this pipeline already has today, since
nothing outside the actuator chain writes to a document mid-pipeline.

**One ingest endpoint keeps the type-detection rule in one place.** The composer's URL-detection rule
(P1.17) already decides, client-side, whether the user typed a URL or a note. Two endpoints would make
the UI apply that rule twice — once to pick the request path, once inside the composer's own logic — for
no benefit, since the second application can only agree with the first or be wrong. One endpoint, keyed
on which field the UI populates, means the decision is made once.

### Consequences

`IngestionControllerTest`'s `/text` and `/url` assertions move to a single `/capture` test class. Any
front end — the current two panels or P1.18's composer — posts `{ "url": "..." }` or `{ "text": "..." }`
to the same path. `api-docs.html` documents one ingest-by-value endpoint instead of two. Actuators
gain no new obligation: they already receive the document by reference through `Message`, as
`Actuator.run()`'s loop shows — this decision documents that behaviour rather than changing it.

### Alternatives rejected

| | Why not |
|---|---|
| Keep `/text` and `/url` as separate endpoints | Duplicates the type-detection logic the composer already needs; two request shapes for one operation |
| Message carries a document id, actuators reload from `DatabaseService` per hop | Reintroduces a database read at every stage for an object already held in memory, with no writer outside the chain to reconcile against |

---

## ADR28 — MarkItDown, invoked as a subprocess, is the Extractor's Markdown converter

**Date:** 2026-09-07
**Status:** Accepted
**Supersedes:** the extraction stack named in Story P2.3 (Turndown, Mammoth, OpenDataLoader)
**Arises from:** Story P2.8

*Numbered 28, not 26 or 27: ADR26 (Story P1.11's entry contract) is written above. ADR27, reserved by
Story P1.17's spike, is not written yet.*

### Context

`Extractor.java` unzips ZIP archives and creates a child Document per member. That is all it does.
Nothing in `src/main` converts a PDF, a DOCX, a PPTX, an XLSX, an EPub or a saved HTML page into
Markdown, and the Classifier sits downstream of that missing step.

Story P2.3 names the stack as OpenDataLoader for PDF, Turndown for HTML and Mammoth for Word. All
three are JavaScript, inherited from v03's Node implementation. v04 has no Node runtime and no plan
for one, so P2.3 as written specifies work that cannot be done. The choice was never made for v04.

P2.8 put two candidates up: [MarkItDown](https://github.com/microsoft/markitdown) (MIT, Python ≥
3.10), and Apache Tika plus an HTML-to-Markdown step such as Flexmark, which needs no second
runtime. Six ways to reach MarkItDown from a Spring bean were compared in
`documents/design/SPIKE-MARKITDOWN.md`.

**State of evidence, stated plainly.** This decision was taken on the argument, not on the numbers.
The corpus P2.8 asks for — 15–20 real documents with committed converter output, per-format latency,
failure behaviour on encrypted and scanned PDFs, install footprint on the target machine — has not
been assembled. No measurement below is a measurement; the placeholders are marked as such, and the
triggers at the end name what would overturn this. That is a deliberate choice to unblock P2.3 now
rather than hold it behind a day of fixture work, and the risk it carries is written down rather
than discovered later.

One finding from the research does not depend on the corpus and is load-bearing in the other
direction, so it is recorded here rather than buried. **On PDF, the two candidates are the same
tool.** MarkItDown's local PDF path is `pdfminer.six` and `pdfplumber`, which return flat text with
no heading structure; Tika's path is PDFBox, which returns paragraphs in per-page divs. Neither
infers structure the PDF does not declare. So the slogan "MarkItDown is built for LLM consumption
where Tika is built for search indexing" is true for DOCX, PPTX, XLSX and HTML — where the source
carries heading styles, slide titles and cell grids that `mammoth`, `python-pptx` and `pandas`
render as real Markdown — and false for PDF. It must not be allowed to carry this argument.

### Decision

Convert documents by invoking the pinned `markitdown` CLI as a child process, one process per
document, behind an interface the Extractor depends on.

- Interface `MarkdownConverter` in a new package `com.fourthbrain.convert`, with `convert`,
  `supports` and `probe`. One implementation on the classpath, `MarkItDownConverter`. `Extractor`
  never learns that Python exists.
- The interpreter or executable is an **absolute path in `application.yaml`**, pointing at a
  project-local venv. Never a bare `markitdown` on `PATH`.
- Startup probes with a real conversion of a bundled non-ASCII fixture, not just `--version`, and
  fails the context by default when the probe fails.
- Plain text and Markdown pass through untouched. ZIP is rejected by the converter unconditionally —
  archive expansion stays in Java under P1.8's one-Document-per-member model, and MarkItDown would
  flatten an archive into one concatenated document.
- No Tika implementation is carried alongside it. A second implementation that was not chosen is
  dead code dragging PDFBox and POI behind it; the comparison lives in `spikes/`.

Carried out by Story P2.9. P2.3 is rewritten against it.

### Why, given the above

**A hard timeout only exists across a process boundary.** This is the argument that decides it, and
it is about this pipeline specifically rather than about converters in general. 4thBrain is driven
by `Document.status`. A document that stalls mid-conversion is invisible — no queue entry, no error
row, nothing to sweep it up. An in-process parser that enters a tight loop on a malformed PDF cannot
be stopped from Java: `Thread.interrupt()` does nothing to a thread inside PDFBox, and
`Thread.stop` is gone. In-process, the only remedy is to have no remedy. `destroyForcibly()` is a
remedy.

The spike brief files this under "crash isolation", which understates it. A segfault is loud and
rare. An uninterruptible parse is quiet and permanent, and the quiet one is what breaks a
status-driven pipeline.

The same reasoning applies to memory: a 100 MB input parsed in the JVM competes for heap with the
actuator queues and the SQLite connection. In a child process it competes with nothing that matters
and dies alone.

Note where this leaves the alternative. Tika's own answer to the hang problem is `ForkParser` or
`tika-server` — both of which put the process boundary back. Once a boundary is required either way,
the question narrows to which runtime sits on the far side of it, and the comparison stops being
"one runtime versus two".

Two smaller things fall out the same way. The Java code stays small, because MarkItDown covers the
whole format list through one command line, where Tika emits XHTML and the Markdown step becomes a
component to write, tune per format and own — code in this repository with this repository's bug
reports. And the build gains no compile dependency at all: the subprocess implementation needs the
JDK and nothing else, where `tika-parsers-standard-package` brings PDFBox, POI, commons-compress and
a long tail, along with the CVE traffic that follows those two into a build that currently has no
document-parsing dependency to maintain.

**The honest cost.** A Python runtime the user installs and keeps, on a Windows desktop already
running Ollama, Obsidian and Smart Connections. That cost is recurring, it lands on a person rather
than on the code, and it buys better Markdown only for DOCX, PPTX, XLSX and HTML — not for PDF. If
the real inflow turns out to be PDF-heavy, this decision is paying a runtime for nothing. That is
trigger 1.

### Consequences

**Python becomes a deployment prerequisite.** The application does not start without it under the
default `fail-fast: true`. A fresh clone needs a venv before it runs, which is a new line in the
setup instructions and a new way for a machine to be misconfigured. Related: BUG-002 already records
that a fresh clone cannot start for an unrelated reason.

**A new class of runtime failure — "converter not installed".** It is caught at boot rather than at
the first document, by a probe that converts a real fixture containing non-ASCII text. That single
check covers the executable, the `-o` write path, whether the `[pdf,docx,...]` extras actually
installed, and the Windows UTF-8 trap. `--version` alone would catch none of the last three.

**Subprocess hygiene is not optional.** Two things turn this option into a hang if done casually,
and both are settled in P2.9's design rather than left to the implementer: never leave a pipe
undrained (use `-o <file>` and redirect stderr to a file), and set `PYTHONUTF8=1` /
`PYTHONIOENCODING=utf-8` in the child environment, because the CLI's stdout path writes with
`errors="replace"` and damages non-ASCII silently on Windows.

**The WSL boundary has to be picked and written down.** If the JVM runs on Windows and the venv in
WSL2, every path on the command line needs `C:\...` → `/mnt/c/...` translation, and nothing in this
design does that. Keep the interpreter on the same side as the JVM, and record which side in
`application.yaml`.

**Failure semantics are part of the decision, not an afterthought.** A conversion failure records a
terminal status and a reason on the Document in the same transaction, leaves the original in the
raw vault, does not route to the Classifier, and does not end the actuator thread. An empty result —
the scanned-PDF case — is its own status, distinct from a failure, because it is a queryable backlog
for a future OCR story rather than something to retry.

**What it forecloses.** MarkItDown's optional LLM image description and audio transcription stay off:
both are paid or gated calls belonging to the Classifier's budget, not the Extractor's. Azure
Document Intelligence stays out. And this ADR deliberately does not settle how Java speaks MCP —
that is P2.5's question, and answering it as a side effect of choosing a document converter would be
the wrong order.

**What it keeps cheap.** The seam is the point. Moving to a sidecar, a persistent worker, or Tika
later is a new class behind the same interface plus a configuration change, with no edit to
`Extractor`.

### Triggers that would overturn this

Each is falsifiable and names what to do instead. Run the first one before writing code; it is ten
minutes and it may end the argument.

1. **Format census.** Count the real inflow by extension and by size. If it is dominated by digital
   PDF, MarkItDown's advantage evaporates — both candidates are flat text extractors there — and the
   Python runtime is being bought for nothing. In that case the decision is Tika, forked for timeout
   safety, with `MarkdownConverter` unchanged.
2. **Scanned PDFs.** For each PDF, count extracted characters per page; under about 100 means no text
   layer. If more than a quarter of PDF inflow is scanned, the converter choice stops being the
   deciding question and the real output is an OCR decision, storied separately. Worth noting Tika
   has a first-class local OCR hook in `TesseractOCRParser` where MarkItDown's only answer is paid
   Azure Document Intelligence — so a scanned-heavy corpus argues against this ADR twice.
3. **Startup cost.** Convert a 20-byte HTML file twenty times and record wall time. `magika` loads a
   bundled ONNX model on import, so this may be well above bare interpreter startup. Compare against
   the Classifier's per-document Ollama time. If it is a small fraction, subprocess stands; if it is
   comparable, reopen the HTTP sidecar with the measurement attached.

Triggers 1 and 2 reverse the decision. Trigger 3 changes the integration option without changing the
stack.

### Alternatives rejected

**Apache Tika plus Flexmark, in-process.** The strongest case, and it is strong: no second runtime,
no package manager, no ONNX inference engine on a single-user desktop; a Maven coordinate instead of
an install step; Tika's `Metadata` map — title, author, dates, page count — falling out of the same
parse, which matters in a document management pipeline; container-aware type detection on bytes
already in memory, useful to the Clipper and to mislabelled ZIP members; and no process boundary, so
the brief's entire encoding section simply does not apply because Tika returns a `String`. This was
the other defensible answer and it lost on one point: in-process parsing has no way to stop an
uninterruptible parse, and this pipeline makes a stalled document invisible. Reachable again through
trigger 1 or 2.

**Tika out of process, via `ForkParser` or `tika-server`.** Keeps every Tika argument intact and adds
back the isolation. Rejected as the starting point only because it pays a supervised service or a
fork-per-parse to protect against a failure not yet observed here — but it is the natural landing
place if trigger 1 fires, and it is why "one runtime versus two" overstates Tika's advantage.

**Persistent Python worker over stdin/stdout.** Removes per-call interpreter and `magika` model load.
Rejected on the brief's own reasoning: no worker mode ships upstream, so the project would own a wire
protocol, a correlation scheme, liveness checks and restart supervision on both sides of the
boundary, to optimise a cost nobody has measured and that the single-concurrency Ollama gate likely
hides anyway.

**Local HTTP sidecar (FastAPI/Flask around the MarkItDown Python API).** Timeouts, retries,
concurrency limits and error mapping become ordinary HTTP concerns the codebase will handle for
Ollama regardless, and it amortises startup properly. Rejected because it is a second service to
start, supervise and version on a desktop with no operator, for generality priced for a deployment
shape this project does not have. Trigger 3 is the condition that reopens it.

**`markitdown-mcp` over MCP.** The real argument is not about MarkItDown: P2.5 needs a Java MCP
client for Smart Connections indexing, `SmartConnectionsMonitor` is an empty class, and a second tool
call over an upstream-maintained transport looks nearly free once that client exists. Rejected on
three counts. The reusable part is the transport, which is the small part — server lifecycle, tool
discovery and error mapping differ per server. The cost is strictly greater than a plain subprocess:
the MCP SDK or Spring AI in a build with no AI dependency, plus Python, plus a server process, for a
JSON-RPC envelope around a document body, with no need for tool discovery because the caller is code
and not a model. And `markitdown-mcp` documents itself as unauthenticated, running with the
privileges of whoever starts it and accepting `file:` URIs, which makes it an arbitrary local file
read for anything that can reach the port.

**Embedded Python (GraalPy, JEP, Jython).** Jython is Python 2. JEP is JNI, so native parser crashes
take the JVM with them — which gives up the isolation that is this ADR's entire reason for existing.
GraalPy is the only serious candidate, and MarkItDown's dependency graph (`pandas`, `lxml`,
`onnxruntime` under `magika`) is exactly where native-wheel support is thin.
