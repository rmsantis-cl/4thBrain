---
name: plan-P2.9
description: Execution plan for Story P2.9 alone — the MarkdownConverter seam and its MarkItDown implementation, extracted from plan-P2.9-P2.3.md's steps 2-4
date: 2026-09-10
metadata:
  version: 1.0
  created-by: Claude Sonnet 5
  covers: P2.9
  gated-on: none
  owns:
    - src/main/java/com/fourthbrain/convert/ (new package)
    - src/test/java/com/fourthbrain/convert/ (new)
    - src/main/resources/application.yaml (new top-level `fourthbrain:` block only)
    - documents/RUNBOOK-MARKITDOWN.md (new)
---

# Plan — P2.9, the converter seam and its MarkItDown implementation

## Scope boundary — read this first

This plan delivers **Story P2.9 only**: the `MarkdownConverter` interface, its exception and
config types, and the one concrete implementation (`MarkItDownConverter`). It does **not** touch
`Ingestor.java`, `Extractor.java`, `Clipper.java`, or the `ingestor:` block in `application.yaml`.
It does not fix BUG-006 and does not implement Story P2.13. Those four pieces stay in
`documents/plans/plan-P2.9-P2.3.md`, which remains the plan for wiring the Extractor to this seam
(Story P2.3) whenever that is picked up — this plan supersedes only its steps 2 through 4.

This is possible because the seam has no actuator caller yet: nothing in `src/main` references
`com.fourthbrain.convert` today (confirmed — the package doesn't exist), so building it is
additive and compiles standalone.

## Why the census no longer gates this

Story P2.8 closed 2026-09-10 as a decision rather than a completed spike (see its Outcome
section and `BACKLOG-TRACKER.md`). **ADR38**'s "What the census gates, precisely" section already
established that the unrun format census decides one thing only — whether `MarkItDownConverter`
or a Tika implementation sits behind the `MarkdownConverter` interface — and nothing about the
interface's existence or shape. Closing P2.8 removes the last reason to wait: the decision
(MarkItDown, subprocess) stands, on the argument in ADR28, until and unless the census reverses it
later. This plan proceeds on that decision.

## Step 1 — the stack-independent seam

New package `com.fourthbrain.convert`, holding what a Tika implementation would need just as much
as a MarkItDown one — so a later reversal touches only step 2, not this step:

| Type | Shape |
|---|---|
| `MarkdownConverter` | interface: `convert(Path, String) throws ConversionException`, `supports(String)`, `probe()` |
| `ConversionException` | checked, carrying `Reason` and a persistable `detail` |
| `ConversionException.Reason` | `UNAVAILABLE`, `UNSUPPORTED_FORMAT`, `TOO_LARGE`, `TIMEOUT`, `CONVERTER_FAILED`, `EMPTY_RESULT`, `OUTPUT_TOO_LARGE`, `IO_ERROR` |
| `ProbeResult` | record `(boolean available, String version, String detail)` |
| `ProcessRunner` | functional interface over "run this command with this environment and this timeout" |
| `ConverterProperties` | `@ConfigurationProperties("fourthbrain.converter")` |

No `ProcessBuilder` here. `ProcessRunner` has only test fakes at this step, the same shape as how
`ConcurrencyGate` is injected into `OllamaHttpClient` (Story P2.1's pattern, the closest precedent
in this codebase) — it is what lets step 4's tests run with no Python installed.

Covers Story P2.9's acceptance criteria 1 (the interface exists with the three-method signature)
and 17 (`ConverterProperties` binds every configured key, including `timeout` as a `Duration`
written `120s`).

## Step 2 — `MarkItDownConverter`

The one implementation, plus the `fourthbrain.converter` block in `application.yaml`, appended as
a new top-level block before `logging:` — nothing existing is reordered. Follows Story P2.9's own
14-step conversion path and 5-step startup probe as written; they're detailed enough that this
step is transcription, not design. The two places most easily got wrong — an undrained pipe, and
the child process's UTF-8 environment on Windows — are the two that turn this option into a hang
or into silent mojibake, so they're worth extra care in review.

Covers acceptance criteria 2 through 16. Criteria 4 through 13 run against a faked `ProcessRunner`
and need no Python; criteria 8, 9 and 15 need a real MarkItDown install to verify (see step 3).

## Step 3 — `documents/RUNBOOK-MARKITDOWN.md`

A file to follow on a fresh machine, not a paragraph in a story:

- Venv creation pinned to an interpreter, not to whatever `python` resolves to on `PATH`:
  `py -3.12 -m venv <project-local path>`.
- The install line with extras and a pinned version:
  `<venv>\Scripts\pip install "markitdown[pdf,docx,pptx,xlsx,outlook]==<version>"`.
- The two absolute paths to paste into `application.yaml` (`executable` and `python`) — exactly
  one is set, neither falls back to `PATH`.
- The WSL rule: the interpreter lives on the same side of the WSL boundary as the JVM. Record
  which side that is on this machine.

**This step's concrete values — the pinned version, the two absolute paths — are supplied by
whoever actually creates the venv on the target machine.** That is a manual step on real hardware,
the same as the format census was; this plan ships the document with the procedure and leaves the
values as placeholders rather than inventing them.

## Step 4 — tests

New `src/test/java/com/fourthbrain/convert/` package, no Mockito, matching this repo's existing
style (`IngestorRoutingTest`, `ClassifierTest`): hand-written fakes for collaborators, assertions
against captured behavior rather than mock verification.

- `MarkItDownConverterTest` against a fake `ProcessRunner` — covers the criteria that need no real
  install: timeout handling, non-zero exit, malformed/truncated UTF-8 output, oversized output,
  the failure-reason mapping, `supports()` for each configured extension.
- A separate `@EnabledIfEnvironmentVariable`-gated test class for the criteria that need a real
  MarkItDown install (8, 9, 15) — skipped by default so `gradle build` stays green with no Python
  on the machine running it.
- No `ExtractorTest`. That belongs to Story P2.3, out of scope here.

## Open placeholders carried forward, not resolved

Story P2.9 itself lists eight items contingent on measurement (`timeout`, `min-output-chars`,
`max-input-bytes`, which side of the WSL boundary, the `-x` flag's exact behavior, `--version`'s
output, subprocess-vs-sidecar startup cost, and whether `MarkItDownConverter` is even the right
class). This plan ships them at their documented provisional defaults and says so in code comments
and in the runbook, rather than guessing numbers to make them look decided.

## Verification

- `gradle build` green with no Python installed — step 1 and the fake-based half of step 4 need
  nothing on `PATH`.
- Once a venv exists per the runbook: the startup probe succeeds against the real interpreter, and
  a real fixture (a small non-ASCII `.html` file is enough) converts to Markdown.
- `git diff` shows only the new `com.fourthbrain.convert` and its test package, the new
  `fourthbrain:` block in `application.yaml`, and the new runbook file — nothing in `actuators/`.
