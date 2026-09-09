# Checks an Anthropic message batch and, once it has ended, writes each result to its own Markdown
# file under @batch/. One shot by default; -Wait polls until the batch ends or -TimeoutMinutes
# runs out.
#
# Defaults to the batch id recorded by scripts/batch-p2.8-submit.ps1.
#
# Auth: ANTHROPIC_API_KEY if set, otherwise ~/.anthropic/api-key. The key is never printed.

[CmdletBinding()]
param(
    [string]$BatchId,
    [string]$IdFile = '@batch\p2.8-batch.json',
    [string]$OutDir = '@batch',
    [switch]$Wait,
    [int]$IntervalSeconds = 60,
    [int]$TimeoutMinutes = 90
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot

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
    $line = ($raw -split "`r?`n" | Where-Object { $_.Trim().Length -gt 0 } | Select-Object -First 1)
    return ($line -replace '[^\x21-\x7E]', '')
}

$apiKey = Get-AnthropicKey

if ([string]::IsNullOrWhiteSpace($BatchId)) {
    $p = Join-Path $repo $IdFile
    if (-not (Test-Path $p)) { throw "No batch id given and $IdFile does not exist." }
    $BatchId = (Get-Content $p -Raw | ConvertFrom-Json).id
}

$headers = @{
    'x-api-key'         = $apiKey
    'anthropic-version' = '2023-06-01'
}

$uri      = "https://api.anthropic.com/v1/messages/batches/$BatchId"
$deadline = (Get-Date).AddMinutes($TimeoutMinutes)

Write-Host "Batch $BatchId"

while ($true) {
    $batch = Invoke-RestMethod -Method Get -Uri $uri -Headers $headers
    $c     = $batch.request_counts
    $stamp = (Get-Date).ToString('HH:mm:ss')

    Write-Host ("[{0}] {1} - processing={2} succeeded={3} errored={4} canceled={5} expired={6}" -f `
        $stamp, $batch.processing_status, $c.processing, $c.succeeded, $c.errored, $c.canceled, $c.expired)

    if ($batch.processing_status -eq 'ended') { break }

    if (-not $Wait) {
        Write-Host ''
        Write-Host 'Still processing. Run this again later, or pass -Wait to poll.'
        return
    }

    if ((Get-Date) -ge $deadline) {
        Write-Host ''
        Write-Warning "Gave up after $TimeoutMinutes minutes. The batch is still running; run this again."
        return
    }

    Start-Sleep -Seconds $IntervalSeconds
}

$out = Join-Path $repo $OutDir
if (-not (Test-Path $out)) { New-Item -ItemType Directory -Path $out | Out-Null }

# Results are JSONL, one object per line, in arbitrary order — key by custom_id, never by position.
$nl  = [string][char]10
$raw = Invoke-WebRequest -Method Get -Uri $batch.results_url -Headers $headers -UseBasicParsing
$lines = [System.Text.Encoding]::UTF8.GetString($raw.RawContentStream.ToArray()) -split $nl |
         Where-Object { $_.Trim().Length -gt 0 }

Write-Host ''
foreach ($line in $lines) {
    $r = $line | ConvertFrom-Json
    $id = $r.custom_id

    if ($r.result.type -ne 'succeeded') {
        $why = $r.result.error | ConvertTo-Json -Depth 6 -Compress
        Write-Warning ('{0} : {1} - {2}' -f $id, $r.result.type, $why)
        continue
    }

    $msg  = $r.result.message
    $text = ($msg.content | Where-Object { $_.type -eq 'text' } | ForEach-Object { $_.text }) -join $nl

    $file = Join-Path $out ($id + '.md')
    $text | Out-File $file -Encoding utf8

    $u = $msg.usage
    Write-Host ('{0,-22} {1,6} in / {2,6} out  ->  {3}' -f $id, $u.input_tokens, $u.output_tokens, $file)
}

Write-Host ""
Write-Host "Done. Results are in the $OutDir directory."
