param(
    [Parameter(Mandatory=$true)][string]$Task,
    [string]$LogName = $Task,
    # Extra gradle arguments, e.g. -Extra @('--tests','*ActuatorManagerTest')
    [string[]]$Extra = @()
)

$root = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $root '@logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

$logFile = Join-Path $logDir "v04-$LogName.log"
$exitCodeFile = Join-Path $logDir 'exit-codes.txt'

& "$root\gradlew.bat" $Task @Extra --stacktrace 2>&1 | Tee-Object -FilePath $logFile
$exitCode = $LASTEXITCODE

$lines = @()
if (Test-Path $exitCodeFile) {
    $lines = Get-Content $exitCodeFile | Where-Object { $_ -notmatch "^$Task=" }
}
$lines + "$Task=$exitCode" | Set-Content $exitCodeFile

exit $exitCode
