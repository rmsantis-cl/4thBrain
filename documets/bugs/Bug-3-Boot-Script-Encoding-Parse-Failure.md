---
name: Bug-3-Boot-Script-Encoding-Parse-Failure
description: scripts/Start-4thBrain.ps1 fails to parse under Windows PowerShell 5.1 because the file is UTF-8 without a BOM and contains non-ASCII characters; a second latent defect uses the PowerShell 7-only Join-String cmdlet
date: 2026-09-02
metadata:
  version: 1.0
  created-by: Claude Haiku 4.5
  status: Open
---

# Bug 3: Boot Script Does Not Parse Under Windows PowerShell 5.1

**Story:** 7.2 (Process Lifecycle & MCP Server Setup) — delivered via Task-14.

## Description

`scripts/Start-4thBrain.ps1` cannot be executed. Windows PowerShell 5.1 fails
to parse the file, so no action (`start`, `stop`, `status`, `restart`) runs:

```
At C:\Users\rsant\desar\github\4thBrain\scripts\Start-4thBrain.ps1:262 char:32
+ function Invoke-StatusServices {
+                                ~
Missing closing '}' in statement block or type definition.
    + CategoryInfo          : ParserError: (:) [], ParseException
    + FullyQualifiedErrorId : MissingEndCurlyBrace
```

The reported location is misleading. Braces between lines 262 and 306 balance
correctly, and the statement the parser points at is well-formed. The error is
a cascade: the tokenizer has already been thrown off earlier in the file and
only notices when it reaches this function.

## Root cause

The file is saved as **UTF-8 with no byte-order mark** and contains **36
non-ASCII bytes** — the `✓` (U+2713) and `✗` (U+2717) status glyphs used in
`Invoke-StatusServices` output.

Windows PowerShell 5.1 decodes a BOM-less `.ps1` file as Windows-1252 (ANSI),
not UTF-8. Each three-byte UTF-8 sequence is therefore read as three separate
Windows-1252 characters, corrupting the token stream and breaking brace
matching.

Verified:

```
First3Bytes: 3C 23 0A       # "<#" — no BOM
HasBOM: False
NonAsciiCount: 36
```

Confirmed that the encoding, not the syntax, is at fault — the most
suspicious-looking line in the affected range (line 274, which nests braces
inside a `$()` subexpression inside a double-quoted string) parses cleanly on
its own:

```
[System.Management.Automation.Language.Parser]::ParseInput($line, ...)
→ line 274 pattern parses OK
```

## Second defect (latent, same line)

Line 274 calls `Join-String`:

```powershell
Write-Host "  Models: $($tags.models | ForEach-Object { $_.name } | Join-String -Separator ', ')"
```

`Join-String` was introduced in PowerShell 7 and does not exist in 5.1:

```
PSVersion: 5.1.26100.9278
Join-String: NOT AVAILABLE (PS 7+ cmdlet)
```

This will not surface until the parse error is fixed, at which point
`Start-4thBrain.ps1 status` will fail at runtime whenever Ollama is reachable
and returns a model list. The `try/catch` around it swallows the error into
`"(could not fetch model list)"`, so the model list would silently never
display rather than erroring loudly.

`.claude/rules/shell.md` mandates PowerShell for this project, and the host
shell is 5.1 — so 5.1 is the compatibility target, not 7.

## Impact

Story 7.2's boot orchestration is entirely non-functional. None of its
acceptance criteria can currently be met:

| Acceptance criterion | State |
|---|---|
| Boot sequence starts Ollama, confirms port availability, initializes Node/MCP | Never runs — script does not parse |
| Process logs write structured JSON to stdout/file | Never runs |

`server/bootstrap.js` and `scripts/wsl-init.sh` are not implicated by this bug
and have not been re-verified either way.

## Discovery

Found by the user running the delivered entry point directly:

```
PS C:\Users\rsant\desar\github\4thBrain> .\scripts\Start-4thBrain.ps1 start
```

## Process failure

The script was written, reported COMPLETED, and committed and pushed
(commit `907ce45`) **without ever being executed** — not even a parse check.
The completion claim rested on the code existing. This is precisely what
`documets/loop/`'s solving-loop guard ("Do not mark COMPLETED on the strength
of code existing") exists to prevent, and it was not honored here.

Story 7.2 remains COMPLETED by decision; the defect is tracked here rather
than as a status regression.

## Correction

Not yet applied. Required:

1. Re-save `scripts/Start-4thBrain.ps1` as **UTF-8 with BOM** so PowerShell 5.1
   decodes it correctly — or replace the `✓`/`✗` glyphs with ASCII (`[OK]` /
   `[FAIL]`) and keep the file pure ASCII. The second option is more robust
   against future tooling that rewrites the file without preserving the BOM.
2. Replace `Join-String` with a 5.1-compatible form, e.g.
   `($tags.models | ForEach-Object { $_.name }) -join ', '`.
3. Add a parse check to whatever verifies this story, so a non-parsing script
   cannot be reported as delivered again:
   `[System.Management.Automation.Language.Parser]::ParseFile(...)` with a
   non-empty error collection failing the check.
4. Then actually run `start`, `status`, `stop` and record the observed output
   against Story 7.2's acceptance criteria.

## Status

Fixed (2026-09-02). Script resaved with UTF-8 BOM encoding; Join-String replaced with PowerShell 5.1-compatible `-join` operator (line 277).
