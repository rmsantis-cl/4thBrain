#!/usr/bin/env pwsh
param(
    [Parameter(Mandatory=$true)]
    [string]$FriendlyId,

    [switch]$Retrieve
)

# Get the directory where this script is located
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Build arguments for Python script
$pythonArgs = @(
    (Join-Path $scriptDir "got_batch_api.py"),
    $FriendlyId
)

if ($Retrieve) {
    $pythonArgs += "--retrieve"
}

# Call Python script
python @pythonArgs
exit $LASTEXITCODE
