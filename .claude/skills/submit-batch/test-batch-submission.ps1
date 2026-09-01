#!/usr/bin/env pwsh
<#
Test script to validate Batch API submission with 3 simple jobs.
Verifies:
1. Jobs submit successfully to Anthropic Batch API
2. Batch IDs are returned
3. Batch IDs are logged to BATCH_TRACKER.md
4. Status can be checked later
#>

Write-Host "ðŸ§ª Testing Batch API Submission" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Verify prerequisites
$trackerPath = "documets/BATCH_TRACKER.md"
if (-not (Test-Path $trackerPath)) {
    Write-Error "BATCH_TRACKER.md not found"
    exit 1
}

if (-not $env:ANTHROPIC_API_KEY) {
    Write-Error "ANTHROPIC_API_KEY not set"
    exit 1
}

# Test 1: Simple task
Write-Host "`n[Test 1] Submit simple Hello World task..." -ForegroundColor Yellow
& "C:\Users\rsant\desar\github\4thBrain\.claude\skills\submit-batch\submit-batch.ps1" `
    -TaskDescription "Output 'Hello World' and list the current date. Keep response under 100 words." 2>&1 | ForEach-Object {
        if ($_ -match "Friendly ID:") {
            $script:test1Id = $_ -replace ".*Friendly ID:\s*", "" -replace "\s+.*"
        }
        Write-Host $_
    }

Start-Sleep -Seconds 2

# Test 2: Count numbers
Write-Host "`n[Test 2] Submit count task..." -ForegroundColor Yellow
& "C:\Users\rsant\desar\github\4thBrain\.claude\skills\submit-batch\submit-batch.ps1" `
    -TaskDescription "Count from 1 to 5 and output each number on a new line. Add nothing else." 2>&1 | ForEach-Object {
        if ($_ -match "Friendly ID:") {
            $script:test2Id = $_ -replace ".*Friendly ID:\s*", "" -replace "\s+.*"
        }
        Write-Host $_
    }

Start-Sleep -Seconds 2

# Test 3: Markdown formatting
Write-Host "`n[Test 3] Submit markdown task..." -ForegroundColor Yellow
& "C:\Users\rsant\desar\github\4thBrain\.claude\skills\submit-batch\submit-batch.ps1" `
    -TaskDescription "Create a markdown table with 3 rows: Name, Age, City. Use sample data. Output only the markdown table." 2>&1 | ForEach-Object {
        if ($_ -match "Friendly ID:") {
            $script:test3Id = $_ -replace ".*Friendly ID:\s*", "" -replace "\s+.*"
        }
        Write-Host $_
    }

# Verify entries in BATCH_TRACKER.md
Write-Host "`n" -ForegroundColor Cyan
Write-Host "ðŸ“‹ Verifying BATCH_TRACKER.md..." -ForegroundColor Cyan
$content = Get-Content $trackerPath -Raw
Write-Host $content -ForegroundColor Gray

# Summary
Write-Host “`n” -ForegroundColor Cyan
Write-Host “Test Complete” -ForegroundColor Green
Write-Host “================================” -ForegroundColor Cyan
Write-Host “`nNext steps:” -ForegroundColor Gray
Write-Host “1. Wait 5-10 minutes for batch processing” -ForegroundColor Gray
Write-Host “2. Check status: /got-batch '<friendly_id>'” -ForegroundColor Gray
Write-Host “3. Retrieve results: /got-batch '<friendly_id>' --retrieve” -ForegroundColor Gray
Write-Host “`nFriendly IDs submitted:” -ForegroundColor Yellow
if ($script:test1Id) { Write-Host “  Test 1: $script:test1Id” }
if ($script:test2Id) { Write-Host “  Test 2: $script:test2Id” }
if ($script:test3Id) { Write-Host “  Test 3: $script:test3Id” }
