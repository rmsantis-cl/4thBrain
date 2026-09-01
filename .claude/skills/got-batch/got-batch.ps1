#!/usr/bin/env pwsh
param(
    [Parameter(Mandatory=$true)]
    [string]$FriendlyId,

    [switch]$Retrieve
)

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

# Look up real batch ID from BATCH_TRACKER.md
function Get-RealBatchId {
    param([string]$FriendlyId)

    $trackerPath = "documets/BATCH_TRACKER.md"
    if (-not (Test-Path $trackerPath)) {
        Write-Error "BATCH_TRACKER.md not found"
        exit 1
    }

    $content = Get-Content $trackerPath -Raw
    $lines = $content -split "`n"

    foreach ($line in $lines) {
        # Escape special regex characters in the friendly ID
        $escapedId = [regex]::Escape($FriendlyId)
        if ($line -match "^\|\s*$escapedId\s*\|") {
            # Extract API ID from HTML comment at end of line
            if ($line -match "<!-- API ID: (msgbatch_[a-zA-Z0-9]+) -->") {
                return $matches[1]
            }
        }
    }

    Write-Error "Friendly ID '$FriendlyId' not found in BATCH_TRACKER.md"
    exit 1
}

# Get the real batch ID
$realBatchId = Get-RealBatchId -FriendlyId $FriendlyId

# Validate API key
$apiKey = $env:ANTHROPIC_API_KEY
if (-not $apiKey) {
    Write-Error "ANTHROPIC_API_KEY environment variable not set"
    exit 1
}

# Query Batch API
$headers = @{
    "x-api-key" = $apiKey
    "anthropic-version" = "2023-06-01"
}

try {
    Write-Host "Checking batch status for '$FriendlyId'..." -ForegroundColor Cyan

    $response = Invoke-RestMethod `
        -Uri "https://api.anthropic.com/v1/messages/batches/$realBatchId" `
        -Method GET `
        -Headers $headers

    $status = $response.processing_status
    $requestCounts = $response.request_counts
    $createdAt = $response.created_at
    $expiresAt = $response.expires_at

    # Determine display status
    $displayStatus = $status
    if ($status -eq "ended") {
        $displayStatus = "finish"
    } elseif ($status -in @("queued", "processing")) {
        $displayStatus = "active"
    }

    Write-Host "Status: $displayStatus" -ForegroundColor Yellow
    if ($requestCounts.processing -gt 0 -or $requestCounts.queued -gt 0) {
        Write-Host "Progress: Completed: $($requestCounts.succeeded), Failed: $($requestCounts.failed), Processing: $($requestCounts.processing), Queued: $($requestCounts.queued)" -ForegroundColor Gray
    }
    if ($createdAt) {
        Write-Host "Created: $createdAt" -ForegroundColor Gray
    }
    if ($expiresAt -and $displayStatus -eq "active") {
        Write-Host "Expires: $expiresAt" -ForegroundColor Gray
    }

    # Update BATCH_TRACKER.md
    $trackerPath = "documets/BATCH_TRACKER.md"
    $nowTimestamp = Get-EstTimestamp

    if (Test-Path $trackerPath) {
        $content = Get-Content $trackerPath -Raw
        $lines = $content -split "`n"

        # Find and update the row for this friendly ID
        $updated = $false
        $escapedId = [regex]::Escape($FriendlyId)
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match "^\|\s*$escapedId\s*\|") {
                # Parse the existing row
                $parts = $lines[$i] -split "\|" | ForEach-Object { $_.Trim() }
                # Format: | Friendly ID | Description | Submitted | Completed | Status | Last Checked | <!-- API ID: ... -->

                if ($parts.Count -ge 7) {
                    $description = $parts[2]
                    $submitted = $parts[3]
                    # Extract API ID comment
                    $apiIdMatch = $lines[$i] | Select-String -Pattern "<!-- API ID: (msgbatch_[a-zA-Z0-9]+) -->"
                    $apiIdComment = if ($apiIdMatch) { "<!-- API ID: $($apiIdMatch.Matches[0].Groups[1].Value) -->" } else { "" }

                    $completed = if ($displayStatus -eq "finish") { $nowTimestamp } else { $parts[4] }

                    # Rebuild the row
                    $lines[$i] = "| $FriendlyId | $description | $submitted | $completed | $displayStatus | $nowTimestamp | $apiIdComment"
                    $updated = $true
                    break
                }
            }
        }

        if ($updated) {
            $newContent = $lines -join "`n"
            Set-Content $trackerPath -Value $newContent -NoNewline
            Write-Host "`n✓ BATCH_TRACKER.md updated" -ForegroundColor Green
        } else {
            Write-Host "`nWarning: Batch ID not found in BATCH_TRACKER.md" -ForegroundColor Yellow
        }
    } else {
        Write-Error "BATCH_TRACKER.md not found"
        exit 1
    }

    # Handle result retrieval
    if ($Retrieve) {
        if ($displayStatus -eq "finish") {
            Write-Host "`nRetrieving batch results..." -ForegroundColor Cyan

            # Sanitize friendly ID for filename (replace spaces/special chars)
            $filenameSafeId = $FriendlyId -replace '[^a-zA-Z0-9_-]', '_'
            $resultsPath = "batch-results-${filenameSafeId}.jsonl"

            # Fetch raw bytes and decode as UTF-8 explicitly -- Invoke-RestMethod's automatic
            # response-encoding detection mangles non-ASCII characters (em-dashes, smart quotes)
            # in the response body. The endpoint returns JSONL (one JSON object per line, one
            # per request in the batch), so save it as-is rather than round-tripping through
            # PowerShell objects.
            $resultsUri = "https://api.anthropic.com/v1/messages/batches/$realBatchId/results"
            $webRequest = [System.Net.WebRequest]::Create($resultsUri)
            $webRequest.Headers.Add("x-api-key", $apiKey)
            $webRequest.Headers.Add("anthropic-version", "2023-06-01")
            $webResponse = $webRequest.GetResponse()
            $responseStream = $webResponse.GetResponseStream()
            $memStream = New-Object System.IO.MemoryStream
            $responseStream.CopyTo($memStream)
            $rawText = [System.Text.Encoding]::UTF8.GetString($memStream.ToArray())
            $webResponse.Close()

            $fullResultsPath = Join-Path (Get-Location).Path $resultsPath
            [System.IO.File]::WriteAllText($fullResultsPath, $rawText, (New-Object System.Text.UTF8Encoding($false)))

            Write-Host "Results saved to: $resultsPath" -ForegroundColor Green
            Write-Host "`nExtract message content from the results file to review." -ForegroundColor Gray
        } else {
            Write-Host "Job not yet complete (status: $displayStatus). Check back later." -ForegroundColor Yellow
            Write-Host "Rerun with --retrieve flag once job is finished:" -ForegroundColor Gray
            Write-Host "  /got-batch '$FriendlyId' --retrieve" -ForegroundColor Gray
        }
    } else {
        Write-Host "`nTo retrieve results when complete, run:" -ForegroundColor Gray
        Write-Host "  /got-batch '$FriendlyId' --retrieve" -ForegroundColor Gray
    }

    exit 0

} catch {
    Write-Error "Failed to check batch status: $_"
    exit 1
}
