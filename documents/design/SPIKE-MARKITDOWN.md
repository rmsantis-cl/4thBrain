---
name: SPIKE-MARKITDOWN
description: Spike brief for evaluating Microsoft MarkItDown as the Extractor's document-to-Markdown converter, and the options for calling an external Python process from Spring Boot
metadata:
  version: 1.0
  created-by: Claude Code
  date: 2026-09-07
  story: P2.8
---

# Spike — MarkItDown as the Extractor's converter

Brief for Story P2.8. Two questions, one of which has to be answered before the other matters:

1. Does [microsoft/markitdown](https://github.com/microsoft/markitdown) produce Markdown good enough
   to feed the Classifier, across the formats this pipeline actually receives?
2. If it does, how does a Spring Boot process on the JVM call a Python tool without the runtime
   boundary becoming the fragile part of the pipeline?

Question 2 is the one with several defensible answers, so most of this document is about it.

## Why this comes up now

Story P2.3 (TextExtractor Real Logic) names the extraction stack as "PDF → OpenDataLoader,
HTML → Turndown, Word → Mammoth". That list is inherited from v03, which ran on Node.js. Turndown
and Mammoth are JavaScript libraries; v04 has no Node runtime and no plan for one. So P2.3 currently
specifies an implementation v04 cannot carry out, and the real choice has never been made.

`Extractor.java` today does one thing: it unzips ZIP archives and creates a child Document per
member (`Extractor.java:99-142`). Nothing in the codebase converts a PDF, a Word file or an HTML
page into Markdown. That is the gap this spike is scoped against.

MarkItDown is interesting because it covers the whole list in one tool, and because it is aimed at
exactly this use case: producing Markdown for an LLM to read, rather than producing a
faithful visual reproduction of the source.

## What MarkItDown is, as of this writing

| Property | Value |
| :---- | :---- |
| License | MIT |
| Runtime | Python ≥ 3.10 |
| Distribution | PyPI: `markitdown`, plus a sibling `markitdown-mcp` |
| Interfaces | CLI (`markitdown`, also `python -m markitdown`), Python API (`MarkItDown().convert(...)`), MCP server |
| Formats | PDF, DOCX, PPTX, XLSX/XLS, HTML, CSV/JSON/XML, EPub, Outlook `.msg`, images, audio, ZIP, YouTube URLs |

Under the hood it delegates: `mammoth` for DOCX, `python-pptx` for PPTX, `pandas` + `openpyxl` for
spreadsheets, `pdfminer.six` and `pdfplumber` for PDF, `beautifulsoup4` + `markdownify` for HTML.
Format detection uses `magika`, a core dependency that carries a bundled model and its ONNX runtime,
so even a minimal install is not small. Format support is opt-in through extras
(`markitdown[pdf,docx,pptx]`), or all at once with `markitdown[all]`.

Two capabilities are optional and both cost money per call: image description through an OpenAI-style
LLM client, and Azure Document Intelligence for documents the local parsers cannot read. Neither is
in scope here. The local PDF path is text extraction only — a scanned PDF with no text layer yields
nothing, and that is a case the spike has to measure rather than assume.

The CLI is straightforward to drive:

```
markitdown path-to-file.pdf -o document.md      # file in, file out
cat path-to-file.pdf | markitdown               # stdin in, stdout out
markitdown -x .pdf < file.bin                   # extension hint for stdin input
```

Relevant flags: `-o/--output`, `-x/--extension`, `-m/--mime-type`, `-c/--charset`,
`-p/--use-plugins` (plugins are off by default), `--keep-data-uris`. Exit code is 0 on success and 1
on failure, with the message on stderr. Unknown file types are a failure, not an empty result.

`markitdown-mcp` wraps the same converter as an MCP server exposing one tool,
`convert_to_markdown(uri)`, over stdio, SSE or streamable HTTP. It accepts `http:`, `https:`, `file:`
and `data:` URIs. Its README is explicit that it has no authentication, runs with the privileges of
whoever starts it, and should stay bound to localhost.

## What it would and would not replace

| Input | v04 today | With MarkItDown |
| :---- | :---- | :---- |
| PDF, DOCX, PPTX, XLSX, EPub, `.msg` | nothing | converted |
| HTML fetched by Clipper | nothing | converted (`-x .html`) |
| Plain text, Markdown | passes through | leave as-is; no reason to round-trip it |
| ZIP | expanded in Java, one Document per member | **keep the Java path** |
| Images, audio | nothing | possible, but out of scope for P2.3 |

The ZIP row is the one to be deliberate about. MarkItDown will happily read a ZIP and return one
concatenated Markdown document. The v04 model wants the opposite: `Extractor` creates a child
Document and a `document_copy` row per member so each member is classified and indexed on its own
(P1.8). Handing ZIPs to MarkItDown would collapse that structure. Archive expansion stays in Java;
MarkItDown gets the individual members afterwards.

## Integration options

Six ways to get from a Spring bean to a Markdown string. The first four keep Python; the fifth
embeds it; the sixth removes it.

### 1. CLI subprocess per document

`ProcessBuilder` invokes `markitdown <input> -o <output>` (or `python -m markitdown`), waits with a
timeout, then reads the output file as UTF-8.

The pipeline's shape makes this cheaper than it sounds. One Extractor thread handles one document at
a time, and the Classifier behind it is gated to a single concurrent Ollama call, so an LLM call
dominates any per-document cost the converter adds. Process startup being on the order of a second
is a real cost, but not one that changes the pipeline's throughput.

What it buys: no server to run or supervise, no protocol to design, crash containment for free (a
segfault in a PDF parser kills a child process, not the JVM), a hard timeout via
`waitFor(n, TimeUnit)` followed by `destroyForcibly()`, and trivially reproducible failures — the
same command line a human can paste into a shell.

What it costs: interpreter and model-load startup on every call, and a set of small traps that have
to be handled properly rather than discovered in production.

- Never leave a pipe undrained. Use `-o <file>` and `redirectError(File)`, or consume both streams on
  separate threads. A full stderr pipe with nobody reading it is a deadlock, and it is the single
  most common way this option goes wrong.
- Set `PYTHONUTF8=1` and `PYTHONIOENCODING=utf-8` in the child's environment. On Windows the default
  console encoding will mangle non-ASCII output, and the CLI's stdout path writes with
  `errors="replace"`, so damage is silent. Reading a `-o` file as UTF-8 avoids the question entirely.
- Pass the interpreter or executable path as configuration, never as a bare `markitdown` on `PATH`.
  A venv under the project, named in `application.yaml`, is reproducible; `PATH` is not.
- Probe at startup (`markitdown --version`) and fail loudly, or degrade explicitly, rather than
  finding out on the first document.

### 2. Long-lived Python worker over stdin/stdout

One `markitdown` process started at boot, kept alive, fed a request per line and answering with a
framed response. Amortizes the startup cost that option 1 pays per document.

It also means writing and owning a wire protocol, a correlation scheme, liveness checks, and
restart-on-crash supervision — plus the Python side of it, since no such worker mode ships upstream.
Worth it only if measurement shows per-call startup actually hurts. It does not look like it will,
given the Ollama gate.

### 3. Local HTTP sidecar

A small FastAPI or Flask service wrapping the `MarkItDown` Python API, bound to `127.0.0.1`. Spring
calls it with `RestClient` or `java.net.http.HttpClient`, posting the file and reading Markdown back.

This is the option that scales and the option that generalizes: timeouts, retries, concurrency
limits and error semantics are all ordinary HTTP concerns the codebase already handles for Ollama.
It moves cleanly into a container or onto another host later. The cost is a second process to start,
supervise and version alongside the JVM, on a machine where the user already runs Ollama, Obsidian
and Smart Connections. For a single-user desktop pipeline that is real friction, not a rounding
error.

Reasonable position: design for option 1, keep the seam clean, and move here if the spike's
measurements or later concurrency needs justify it.

### 4. markitdown-mcp over MCP

Run the upstream MCP server and call `convert_to_markdown(file:///...)` from an MCP client in the
JVM — the official MCP Java SDK, or Spring AI's wrapper around it.

The honest argument for this option is not MarkItDown at all. It is that v04 already has an
unanswered "how does Java talk to an MCP server" question: P2.5 requires the Indexer to trigger Smart
Connections indexing over MCP, and `SmartConnectionsMonitor` is an empty class. If that client has to
exist anyway, a second MCP tool call is nearly free, and the transport is upstream-maintained rather
than hand-rolled.

Against it: it adds Spring AI or the MCP SDK to a build that currently has no AI dependency at all,
it returns the whole document as text inside a JSON-RPC envelope, and it inherits the server's own
warning about running unauthenticated with the caller's privileges. It also settles the MCP client
question by accident, which is backwards — that decision deserves its own story.

### 5. Python inside the JVM

GraalPy, Jython or JEP. Jython is Python 2 and out. JEP is JNI, so the JVM shares a process with
native parser code and inherits its crashes. GraalPy is the only serious candidate, and MarkItDown's
dependency graph — `pandas`, `lxml`, `onnxruntime` via `magika` — is exactly the native-extension
territory where GraalPy support is thin.

The whole appeal of running a document parser out-of-process is that a malformed PDF cannot take the
application down with it. This option gives that up to save a process spawn. Not recommended.

### 6. No Python: Apache Tika in the JVM

Tika covers the same formats (PDF via PDFBox, OOXML via POI, HTML via its own parsers), is Apache-2.0
licensed, is a Maven dependency rather than a second runtime, and has been the default answer to
"extract text from arbitrary documents in Java" for fifteen years. Tika emits text or XHTML, so
producing Markdown needs a second step — Flexmark's HTML-to-Markdown converter, for instance.

This is the arm that decides whether the spike is worth acting on at all. If Tika plus a Markdown
converter is close in output quality, the Python runtime is a dependency bought for nothing. If
MarkItDown is clearly better on the corpus that matters — and it is built for LLM consumption, where
Tika is built for search indexing — the runtime cost is justified and gets paid explicitly.

Tika must be measured against MarkItDown, not waved at.

### Comparison

| | Per-call cost | Crash isolation | Ops burden | Java code needed | New dependencies |
| :---- | :---- | :---- | :---- | :---- | :---- |
| 1. CLI subprocess | process start each call | full | none beyond installing Python | `ProcessBuilder`, timeout, stream handling | none (JDK only) |
| 2. Persistent worker | negligible after boot | full, needs restart logic | supervise one process | protocol, framing, supervision | none in Java; custom Python |
| 3. HTTP sidecar | one local request | full | run and version a service | HTTP client, error mapping | none in Java; FastAPI in Python |
| 4. markitdown-mcp | one JSON-RPC call | full | run and version a service | MCP client wiring | MCP Java SDK / Spring AI |
| 5. Embedded (GraalPy) | none | **none** | large, fragile install | polyglot embedding | GraalPy + native wheels |
| 6. Tika (no Python) | in-process call | none | none | parser plumbing + Markdown step | Tika, Flexmark |

## Recommendation going in

Start with option 1, behind an interface — something like `MarkdownConverter.convert(Path source,
String extensionHint) → String` — with the `ProcessBuilder` call as its only implementation.
`Extractor` depends on the interface and never learns that Python exists. If the spike shows the
per-call startup matters, or concurrency later grows past one Extractor thread, option 3 replaces the
implementation without touching the actuator. Option 6 is implemented as a second class behind the
same interface for the comparison, and if it wins, the interface is what makes that a configuration
change.

This is a going-in position, not the spike's conclusion. The measurements below can overturn it.

## What the spike must produce

A fixture corpus first: 15–20 real documents from the user's actual inflow, covering PDF (digital
and scanned), DOCX, PPTX, XLSX, HTML saved from Clipper, EPub, and at least one file that is
deliberately broken. The corpus goes in the repository (or is listed by path if the content is
private) so results are reproducible.

Then, for MarkItDown and for Tika + Flexmark:

1. **Output quality.** Does the Markdown keep headings, lists, tables and reading order? Judged
   against what the Classifier needs — enough structure and text to tag a document — not against
   visual fidelity. Record a verdict per file, with the output committed alongside.
2. **Latency.** Wall time per document by format and size, and separately the fixed process-start
   cost with an empty input. This is the number that decides option 1 versus option 3.
3. **Failure behaviour.** Encrypted PDF, scanned PDF with no text layer, truncated file, wrong
   extension, a 100 MB input. Record exit code, stderr, and whether anything hangs. A hang matters
   more than a bad exit code.
4. **Encoding.** Non-ASCII content survives the chosen channel intact, on Windows specifically.
5. **Install footprint.** Venv size and install time for the extras this pipeline needs, versus
   `[all]`. Whether Python ≥ 3.10 is already present on the target machine or has to be provisioned.
6. **Licence and supply chain.** MIT is fine. Note the transitive set that comes with it.

## Exit criteria

The spike is done when there is a written recommendation — MarkItDown by subprocess, MarkItDown by
sidecar, or Tika in-process — backed by the numbers above, and:

- the decision is recorded as an ADR in `documents/design/ADRS.md` (next free number; ADR24 is the
  highest inherited from v03),
- Story P2.3 is rewritten to name the chosen stack instead of the v03 Node libraries,
- and any implementation work is storied separately. No production code lands under P2.8.

Spike code lives under `spikes/markitdown/` and is throwaway by construction. It is not wired into
`src/main`, which is what keeps this spike outside the design-before-implementation rule rather than
in violation of it.

## Risks

- **Scanned PDFs.** The local path has no OCR. If a meaningful share of the corpus is scanned, both
  MarkItDown and Tika return little or nothing, and the real answer is an OCR step (or Azure Document
  Intelligence, which is a paid external call and a different decision).
- **A second runtime on the target machine.** Windows plus WSL2, with Ollama and Obsidian already
  running. Adding Python is not free operationally even when it is free technically, and it is a
  cost the user carries, not the code.
- **Upstream churn.** MarkItDown is young and its CLI surface has changed before. Pin the version,
  and treat the probe at startup as a version check rather than a liveness check.
- **Spike scope creep.** Image description and audio transcription are out of scope. They are
  tempting, they are LLM calls, and they belong to the Classifier's budget rather than the
  Extractor's.

## Timebox

One day. If the corpus is not assembled by the halfway point, the spike stops and reports that
instead — the measurements are worthless without documents that resemble the real inflow.
