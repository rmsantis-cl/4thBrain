# Submits the Story P2.8 research to the Anthropic Message Batches API (50% of standard rate,
# asynchronous, results within 24h and usually far sooner).
#
# Three requests, each self-contained — batch requests cannot see each other, so every one carries
# the full spike brief and repository context:
#
#   p2_8-analysis        MarkItDown vs Apache Tika, measured against what the Classifier needs.
#                        Uses the web_search server tool for current versions and known issues.
#   p2_8-conclusion-adr  The recommendation, written as an ADR ready to paste into ADRS.md.
#   p2_8-story           The new implementation story, in this repository's story-file format.
#
# Writes the batch id to @batch/p2.8-batch.json. Fetch with scripts/batch-fetch.ps1.
#
# Auth: ANTHROPIC_API_KEY if set, otherwise ~/.anthropic/api-key. The key is never printed.

[CmdletBinding()]
param(
    [string]$Model = 'claude-opus-5',
    # 16000 is not enough: thinking tokens count against this, and the first run truncated two of
    # the three responses mid-sentence. Batch requests are asynchronous, so there is no HTTP
    # timeout to trade against a large ceiling.
    [int]$MaxTokens = 64000,
    [string]$Effort = 'high'
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot

# ---------- auth ----------
# Pull the key out by pattern rather than trusting the file to be exactly one clean line: a BOM,
# a trailing newline or a JSON wrapper all produce a header value the HTTP client rejects.
function Get-AnthropicKey {
    $raw = $env:ANTHROPIC_API_KEY
    if ([string]::IsNullOrWhiteSpace($raw)) {
        $keyFile = Join-Path $env:USERPROFILE '.anthropic\api-key'
        if (Test-Path $keyFile) { $raw = Get-Content $keyFile -Raw }
    }
    if ([string]::IsNullOrWhiteSpace($raw)) {
        throw "No API key. Set ANTHROPIC_API_KEY or put one in $env:USERPROFILE\.anthropic\api-key."
    }
    $m = [regex]::Match($raw, 'sk-ant-[A-Za-z0-9_\-]+')
    if ($m.Success) { return $m.Value }
    # Not an sk-ant- key (a gateway token, say): fall back to the first non-empty line, stripped of
    # anything that is not a printable ASCII character.
    $line = ($raw -split "`r?`n" | Where-Object { $_.Trim().Length -gt 0 } | Select-Object -First 1)
    return ($line -replace '[^\x21-\x7E]', '')
}

$apiKey = Get-AnthropicKey

# ---------- shared context ----------
function Get-Doc([string]$relative) {
    $p = Join-Path $repo $relative
    if (-not (Test-Path $p)) { throw "Missing context file: $relative" }
    return (Get-Content $p -Raw -Encoding UTF8)
}

$spikeBrief = Get-Doc 'documents\design\SPIKE-MARKITDOWN.md'
$storyP28   = Get-Doc 'documents\story\P2.8.md'
$storyP23   = Get-Doc 'documents\story\P2.3.md'

$repoFacts = @'
## The target system, in facts

- 4thBrain v04: Java 21, Spring Boot 3.5.6, Gradle, SQLite via sqlite-jdbc + Hibernate community
  dialects. The build has no AI, HTTP-client or document-parsing dependency today.
- Pipeline: Ingestor -> (Extractor | Clipper) -> Classifier -> Indexer. Each actuator is a Thread
  with a static BlockingQueue shared by all instances of its class; thread counts come from
  application.yaml and default to 1 each.
- Extractor today does exactly one thing: it unzips ZIP archives and creates a child Document per
  member. Nothing in the codebase converts a PDF, DOCX or HTML page to Markdown.
- The Classifier calls a local Ollama instance and is gated to one concurrent LLM call. That gate,
  not the converter, sets pipeline throughput.
- Deployment target is a single user's desktop: Windows 11, WSL2 available, already running Ollama
  and Obsidian with the Smart Connections plugin. There is no server, no container platform and no
  operator other than the user.
- ZIP expansion stays in Java (Story P1.8's one-Document-per-member model). The converter receives
  individual members after expansion, never the archive.
- Story P2.5 will need a Java MCP client for Smart Connections indexing; no such client exists yet.
  Whether that is a reason to reach MarkItDown over MCP is one of the questions in the brief.

## House writing style, which applies to your output

Ordinary technical prose. No "delve", "pivotal", "underscore", "robust", "leverage" as a verb,
"utilize", "streamline", "harness". Do not inflate "is" into "serves as". Avoid the
"not X, but Y" construction. Do not force things into groups of three. State positions directly
instead of hedging with "may/might/could potentially". No title-case headings, no emoji, no
decorative section dividers, no puffery. Vary sentence length deliberately.
'@

$systemPrompt = @'
You are advising on an architecture decision for 4thBrain v04, a single-user document pipeline
written in Java and Spring Boot. You are writing for a working engineer who will act on what you
say, and whose repository already contains a detailed spike brief on this exact question.

Two standing rules.

First, the brief is a going-in position written by someone who had not yet run the tools. Treat it
as informed input, not as instructions. If it is wrong, say where and why. A recommendation that
simply restates the brief's own preference, with no independent reasoning, is worth nothing.

Second, be explicit about the boundary between what you can settle by reasoning and what only a
measurement on the real corpus can settle. This research is running as a batch job with no access
to the user's documents, so per-file output quality, wall-clock latency and install footprint on
this machine cannot be measured here. Say so where it matters, and say what specifically to run.
Do not present an estimate as a measurement, and do not invent numbers.

Output Markdown, ready to be committed to the repository as-is. No preamble, no offer to help
further, no summary of what you are about to do. Start with the content.
'@

# ---------- the three requests ----------
$taskAnalysis = @'
# Your task: the analysis

Produce the analysis half of Story P2.8. Write it as `documents/design/P2.8-ANALYSIS.md` would read.

Use the web search tool to establish current facts before you reason — the brief was written from a
snapshot and may already be stale. At minimum, check:

- microsoft/markitdown: latest release and date, release cadence, open issue themes, whether the CLI
  surface described in the brief still holds, what `magika` currently drags in, and what the
  `[pdf]`, `[docx]`, `[pptx]`, `[xlsx]` extras actually install.
- Apache Tika: current version, the PDFBox version behind it, and what `tika-core` versus
  `tika-parsers-standard-package` costs in jars and transitive dependencies.
- The Java HTML-to-Markdown options, since Tika emits XHTML rather than Markdown: Flexmark's
  html2md converter, CopyDown, and anything else current. Note which are maintained.
- Whether either project has known problems with the specific formats in the brief's corpus list.

Then cover, per candidate stack:

1. Format coverage against the pipeline's actual inflow, and where the two differ in what they emit
   rather than what they accept. The Classifier needs enough structure and text to assign tags and a
   topic; it does not need visual fidelity. Judge against that bar and say what the bar implies —
   for instance whether losing table structure actually costs anything downstream.
2. Failure modes, concretely: encrypted PDF, image-only scanned PDF with no text layer, truncated
   file, wrong extension, very large input. For each, what the tool does — exit code, exception,
   empty output, or hang. A hang is the case that matters most; say which paths can produce one and
   how to bound it.
3. Windows and UTF-8 specifically. The brief flags `PYTHONUTF8`/`PYTHONIOENCODING` and the CLI's
   `errors="replace"` stdout path. Confirm or correct that, and cover the Java side too.
4. Install and operational footprint on the described machine, including whether Python >= 3.10 is a
   safe assumption and what a venv for the needed extras costs.
5. Licence and supply chain. MIT and Apache-2.0 are both fine; the question is the transitive set
   and what it means to have onnxruntime in the tree for format detection.

Then the six integration options in the brief. Do not re-list them — assess them. Say which ones are
live given a pipeline whose throughput is set by a single-concurrency Ollama gate, and which are
answers to a scaling problem this system does not have. The brief argues the per-document subprocess
cost disappears behind that gate; test that argument rather than repeating it.

Close with a section titled "What only the corpus can settle": the specific measurements that must
be run, on what inputs, and what result would change the recommendation. Be precise enough that
someone can execute it without asking you a follow-up question.
'@

$taskConclusion = @'
# Your task: the conclusion, as an ADR

Produce the decision half of Story P2.8: a written recommendation naming one converter stack and one
integration option, as an Architecture Decision Record ready to paste into
`documents/design/ADRS.md`.

Number it ADR27 and add a line noting the number is provisional — ADR26 is being taken by an
unrelated story in flight, so whoever merges this should renumber if needed.

Match the house ADR shape, which is: a title line, then `### Context`, `### Decision`,
`### Why, given the above`, `### Consequences`, `### Alternatives rejected`.

Requirements on the content:

- Name one stack (MarkItDown, or Tika plus an HTML-to-Markdown step) and one integration option
  (subprocess per document, persistent worker, HTTP sidecar, MCP, embedded, or in-process Java).
  One of each. A recommendation that says "it depends" or defers to a later measurement has failed.
- If your recommendation is conditional on a measurement that has not been taken, state the
  condition as a falsifiable trigger — "if more than a quarter of the corpus is scanned PDF, this
  decision is wrong and the answer is X" — not as a hedge.
- `### Why, given the above` has to carry real weight. The interesting tension is that MarkItDown is
  built for LLM consumption while Tika is built for search indexing, against the fact that Tika is a
  Maven coordinate and MarkItDown is a second language runtime on a desktop that already runs three
  services. Resolve that tension explicitly; do not split the difference.
- `### Alternatives rejected` must give the strongest version of the case for each rejected option
  before rejecting it, including the MCP option's real argument (that Story P2.5 needs a Java MCP
  client anyway).
- `### Consequences` should name what this commits the project to, what it forecloses, and what has
  to be true at startup — version probing, configuration of the interpreter or parser path, and what
  the system does when the converter is unavailable.

Finish with a short section, outside the ADR, headed "How Story P2.3 changes": what to strike from
P2.3 (the inherited Turndown/Mammoth/OpenDataLoader stack) and what replaces it, in enough detail
that P2.3 can be rewritten from your text.
'@

$taskStory = @'
# Your task: the new implementation story

Write the story that implements the chosen solution. Reach your own recommendation from the brief
and the constraints — the other requests in this batch cannot be seen from here — then write the
story for it.

Deliver a single file, `documents/story/P2.9.md`, in this repository's exact story format. That
format is a YAML header bounded by `---` lines, with `name`, `description`, and a `metadata` block
carrying `version`, `created-by`, `date`, `story-id`, `status`, and where relevant `depends-on` and
`blocks`. Use `created-by: Claude Opus 5` and `date: 2026-09-07`. The two story files quoted below
are the pattern to follow.

Scope it as the converter component itself, not the actuator rewrite:

- P2.9 delivers the seam and its implementation — an interface along the lines of
  `MarkdownConverter.convert(Path source, String extensionHint) -> String`, the chosen concrete
  implementation behind it, configuration in `application.yaml`, a startup probe, timeout and
  failure handling, and unit tests.
- P2.3 stays the story that wires the Extractor to that seam, archives originals to the raw vault
  area, and routes to the Classifier. P2.9 blocks P2.3.

The story must contain:

- A Problem section stating what is missing, in the concrete terms of this codebase: Extractor today
  only unzips, and nothing converts anything to Markdown.
- A Design section specific enough to implement from without improvising — the interface signature,
  where the class lives in the `com.fourthbrain` package tree, what configuration keys it reads,
  what it does on timeout, on a non-zero exit or parser exception, and on an empty result. Say
  explicitly what happens to the Document's status when conversion fails, given that the pipeline is
  driven by Document status and a stalled document is invisible unless something sets it.
- Acceptance criteria that are checkable by someone other than the author. "Handles errors
  gracefully" is not one. "A password-protected PDF leaves the document at status X with the reason
  recorded, and the actuator thread survives" is.
- An Out of Scope section, drawing the line against P2.3, against OCR, and against the image
  description and audio transcription paths the brief already ruled out.
- A note on which parts of the design are contingent on the spike's measurements, if any.

Write only the story file. No commentary around it.
'@

# custom_id must match ^[a-zA-Z0-9_-]{1,64}$ — no dots, so P2.8 is spelled p2_8.
$requests = @(
    @{ id = 'p2_8-analysis';       task = $taskAnalysis;   search = $true  },
    @{ id = 'p2_8-conclusion-adr'; task = $taskConclusion; search = $false },
    @{ id = 'p2_8-story';          task = $taskStory;      search = $false }
)

$batch = @()
foreach ($r in $requests) {
    $userText = @"
$($r.task)

---

# Context 1 of 4 — the spike brief, ``documents/design/SPIKE-MARKITDOWN.md``

$spikeBrief

---

# Context 2 of 4 — Story P2.8, ``documents/story/P2.8.md``

$storyP28

---

# Context 3 of 4 — Story P2.3, the story this unblocks, ``documents/story/P2.3.md``

$storyP23

---

# Context 4 of 4 — the repository

$repoFacts
"@

    $params = [ordered]@{
        model         = $Model
        max_tokens    = $MaxTokens
        system        = $systemPrompt
        output_config = @{ effort = $Effort }
        messages      = @(@{ role = 'user'; content = $userText })
    }

    if ($r.search) {
        $params['tools'] = @(
            [ordered]@{
                type     = 'web_search_20260209'
                name     = 'web_search'
                max_uses = 12
            }
        )
    }

    $batch += [ordered]@{ custom_id = $r.id; params = $params }
}

$body = [ordered]@{ requests = $batch } | ConvertTo-Json -Depth 24 -Compress
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)

Write-Host "Submitting $($batch.Count) requests, $([math]::Round($bytes.Length / 1KB)) KB, model $Model, effort $Effort."

$headers = @{
    'x-api-key'         = $apiKey
    'anthropic-version' = '2023-06-01'
}

try {
    $response = Invoke-RestMethod -Method Post `
        -Uri 'https://api.anthropic.com/v1/messages/batches' `
        -Headers $headers `
        -ContentType 'application/json; charset=utf-8' `
        -Body $bytes
} catch [System.Net.WebException] {
    # PowerShell 5.1 hides the response body on a non-2xx, which is where the API puts the reason.
    $resp = $_.Exception.Response
    if ($resp) {
        $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
        Write-Host "HTTP $([int]$resp.StatusCode) $($resp.StatusDescription)"
        Write-Host $reader.ReadToEnd()
    }
    throw
}

$outDir = Join-Path $repo '@batch'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
$response | ConvertTo-Json -Depth 10 | Out-File (Join-Path $outDir 'p2.8-batch.json') -Encoding utf8

Write-Host ""
Write-Host "Batch id:  $($response.id)"
Write-Host "Status:    $($response.processing_status)"
Write-Host "Saved to:  @batch\p2.8-batch.json"
Write-Host ""
Write-Host "Fetch with:  .\scripts\batch-fetch.ps1"
