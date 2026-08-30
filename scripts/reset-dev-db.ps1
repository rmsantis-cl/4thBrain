# Development database cleanup script
# Drops all tables from 4thbrain-metadata.db after optional backup

param(
    [switch]$NoBackup,
    [string]$DbPath = ".\server\4thbrain-metadata.db"
)

# Resolve paths
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$dbFile = Join-Path $repoRoot $DbPath
$backupDir = Join-Path $repoRoot ".backup"

# Verify database exists
if (-not (Test-Path $dbFile)) {
    Write-Host "Error: Database file not found at $dbFile" -ForegroundColor Red
    exit 1
}

Write-Host "4thBrain Development Database Cleanup" -ForegroundColor Cyan
Write-Host "Database: $dbFile" -ForegroundColor Gray
Write-Host ""

# Backup prompt
if (-not $NoBackup) {
    $backupChoice = Read-Host "Backup database before dropping tables? (Y/n)"

    if ($backupChoice -ne "n" -and $backupChoice -ne "N") {
        # Create backup directory if it doesn't exist
        if (-not (Test-Path $backupDir)) {
            New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
            Write-Host "Created backup directory: $backupDir" -ForegroundColor Gray
        }

        # Create timestamped backup
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backupFile = Join-Path $backupDir "4thbrain-metadata_$timestamp.db"
        Copy-Item -Path $dbFile -Destination $backupFile
        Write-Host "Backup created: $backupFile" -ForegroundColor Green
        Write-Host ""
    }
}

# Drop all tables
Write-Host "Dropping all tables..." -ForegroundColor Yellow

# Get list of all tables
$sqlitePath = if (Get-Command sqlite3 -ErrorAction SilentlyContinue) { "sqlite3" } else { $null }

if (-not $sqlitePath) {
    Write-Host "Error: sqlite3 command not found. Please install SQLite." -ForegroundColor Red
    exit 1
}

# Get all tables
$tables = & $sqlitePath $dbFile "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"

if ($tables) {
    $tableList = $tables -split "`n" | Where-Object { $_ -match '\S' }

    if ($tableList) {
        Write-Host "Found tables to drop: $($tableList -join ', ')" -ForegroundColor Gray

        # Drop each table
        foreach ($table in $tableList) {
            & $sqlitePath $dbFile "DROP TABLE [$table];"
        }

        Write-Host "All tables dropped successfully." -ForegroundColor Green
    } else {
        Write-Host "No tables found to drop." -ForegroundColor Yellow
    }
} else {
    Write-Host "No tables found to drop." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Database cleanup complete!" -ForegroundColor Cyan
