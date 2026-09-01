#!/usr/bin/env pwsh
param(
    [Parameter(Mandatory=$true)]
    [string]$TaskDescription
)

# Friendly ID generator
function New-FriendlyBatchId {
    $adjectives = @(
        "Quantum", "Crystalline", "Enlightened", "Ethereal", "Luminous",
        "Spirited", "Valiant", "Serene", "Cosmic", "Mythic",
        "Phoenix", "Shadow", "Thunder", "Velvet", "Midnight",
        "Emerald", "Golden", "Silver", "Ancient", "Mystic",
        "Swift", "Daring", "Brilliant", "Bold", "Radiant"
    )

    $nouns = @(
        "Encoder", "Messenger", "Scribe", "Architect", "Guardian",
        "Sage", "Weaver", "Voyager", "Chronicler", "Sentinel",
        "Oracle", "Beacon", "Nexus", "Catalyst", "Harmonizer",
        "Curator", "Conductor", "Artificer", "Luminary", "Transmitter",
        "Translator", "Awakening", "Ascension", "Quest", "Journey"
    )

    $adj = $adjectives | Get-Random
    $noun = $nouns | Get-Random
    $num = Get-Random -Minimum 1 -Maximum 1000

    return "$adj $noun #$num"
}

# Convert current time to EST ISO 8601 format
function Get-EstTimestamp {
    $utcNow = [System.DateTime]::UtcNow
    $estZone = [System.TimeZoneInfo]::FindSystemTimeZoneById("Eastern Standard Time")
    $estTime = [System.TimeZoneInfo]::ConvertTime($utcNow, $estZone)

    # Determine offset (EDT is -04:00, EST is -05:00)
    if ($estZone.IsDaylightSavingTime($estTime)) {
        $offset = "-04:00"
    } else {
        $offset = "-05:00"
    }

    return $estTime.ToString("yyyy-MM-ddTHH:mm:ss") + $offset
}

# Load API key from environment, ~/.env.ps1, or ~/.env
$apiKey = $env:ANTHROPIC_API_KEY

if (-not $apiKey) {
    $envPsPath = "$env:USERPROFILE\.env.ps1"
    if (Test-Path $envPsPath) {
        & $envPsPath
        $apiKey = $env:ANTHROPIC_API_KEY
    }
}

if (-not $apiKey) {
    $envPath = "$env:USERPROFILE\.env"
    if (Test-Path $envPath) {
        $envContent = Get-Content $envPath -Raw
        if ($envContent -match 'ANTHROPIC_API_KEY\s*=\s*(.+)') {
            $apiKey = $matches[1].Trim().Trim('"').Trim("'")
        }
    }
}

if (-not $apiKey) {
    Write-Error "ANTHROPIC_API_KEY not found in environment or config files"
    exit 1
}

# Load batch template
$templatePath = "documets/batch-tool.txt"
if (-not (Test-Path $templatePath)) {
    Write-Error "batch-tool.txt not found at $templatePath"
    exit 1
}

$template = Get-Content $templatePath -Raw
$batchPrompt = $template -replace '\$\{task description\}', $TaskDescription

# Append repo-specific guardrails
$guardrails = @"

---

[REPOSITORY GUARDRAILS - NON-NEGOTIABLE]

This repository requires:

1. **design-before-implementation** (.claude/rules/design-before-implementation.md): Before writing/editing application code, confirm it traces to an existing Epic+Story (documets/design/Project 4thBrain.md) and a design artifact sufficient to implement from. If either is missing, do not implement around the gap -- log a Design Debt entry in documets/DESIGN-DEBT.md instead.

2. **No destructive git commands** (git commit, git push, git reset --hard, etc.) unless the task description explicitly asks. Leave finished work as uncommitted changes.

3. **PowerShell only** (.claude/rules/shell.md): Use PowerShell for all shell operations, not Bash or DOS syntax.

4. **Version checking**: Before modifying existing files, check if the v03 branch has a different/more-current version via 'git diff v03 -- <path>'. If v03 looks more current (especially in server/lib/repositories/, server/lib/ingest-service.js, or schema-adjacent files), pull it in with 'git show v03:<path> > <path>' instead of re-deriving your own fix.

Proceed with the task above, applying these constraints.
"@

$fullPrompt = $batchPrompt + $guardrails

# Create Batch API request
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$customId = "batch-${timestamp}"

$requestObject = @{
    custom_id = $customId
    params = @{
        model = "claude-opus-5"
        messages = @(
            @{
                role = "user"
                content = $fullPrompt
            }
        )
        max_tokens = 4096
    }
}

# Build batch submission payload with requests array
$batchPayload = @{
    requests = @($requestObject)
}

$bodyJson = ($batchPayload | ConvertTo-Json -Depth 10)

# Force UTF-8 byte encoding -- Invoke-RestMethod mangles non-ASCII characters
# (smart quotes, em-dashes) in string bodies into invalid UTF-8 surrogates otherwise.
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($bodyJson)

# Submit to Batch API
$headers = @{
    "x-api-key" = $apiKey
    "anthropic-version" = "2023-06-01"
}

try {
    Write-Host "Submitting batch job..." -ForegroundColor Cyan

    $response = Invoke-RestMethod `
        -Uri "https://api.anthropic.com/v1/messages/batches" `
        -Method POST `
        -Headers $headers `
        -ContentType "application/json; charset=utf-8" `
        -Body $bodyBytes

    if (-not $response.id) {
        Write-Error "Batch API response missing id field"
        exit 1
    }

    $realBatchId = $response.id
    $friendlyId = New-FriendlyBatchId
    $processingStatus = $response.processing_status
    $queuedCount = $response.request_counts.queued
    $submitTimestamp = Get-EstTimestamp

    Write-Host "Batch submitted successfully" -ForegroundColor Green
    Write-Host "Friendly ID: $friendlyId" -ForegroundColor Yellow
    Write-Host "Status: $processingStatus" -ForegroundColor Gray
    Write-Host "Requests queued: $queuedCount" -ForegroundColor Gray

    # Update BATCH_TRACKER.md
    $trackerPath = "documets/BATCH_TRACKER.md"

    if (Test-Path $trackerPath) {
        $content = Get-Content $trackerPath -Raw
        # Format: | Friendly ID | Description | Submitted (EST) | Completed (EST) | Status | Last Checked (EST) | <!-- API ID: msgbatch_* -->
        $newRow = "| $friendlyId | $TaskDescription | $submitTimestamp | — | active | $submitTimestamp | <!-- API ID: $realBatchId -->"
        $updated = $content.TrimEnd() + "`n$newRow`n"
        Set-Content $trackerPath -Value $updated -NoNewline
    } else {
        Write-Error "BATCH_TRACKER.md not found"
        exit 1
    }

    Write-Host "`nBatch tracking updated in BATCH_TRACKER.md" -ForegroundColor Green
    Write-Host "To check status later, run: /got-batch '$friendlyId'" -ForegroundColor Gray

    exit 0

} catch {
    Write-Error "Batch submission failed: $_"
    exit 1
}
