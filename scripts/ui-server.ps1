<#
Launch/stop the 4thBrain UI server (server/index.js, EP6).
Usage:
  .\scripts\ui-server.ps1 start
  .\scripts\ui-server.ps1 stop
  .\scripts\ui-server.ps1 status
#>
param(
    [Parameter(Position = 0)]
    [string]$Action = "start"
)

if ($Action -notin @("start", "stop", "status")) {
    Write-Host "$Action : not recognized, try start/stop/status"
    return
}

$RepoRoot  = Split-Path -Parent $PSScriptRoot
$ServerDir = Join-Path $RepoRoot "server"
$PidFile   = Join-Path $ServerDir ".ui-server.pid"
$OutLog    = Join-Path $ServerDir "ui-server.out.log"
$ErrLog    = Join-Path $ServerDir "ui-server.err.log"

function Get-TrackedProcess {
    # Cross-checks the stored PID against the live process list (by PID and
    # process name) rather than trusting the PID file alone — a stale file
    # could point at a PID since reused by an unrelated process.
    if (-not (Test-Path $PidFile)) { return $null }
    $procId = Get-Content $PidFile -Raw | ForEach-Object { $_.Trim() }
    if (-not $procId) { return $null }

    $running = Get-Process | Where-Object { $_.Id -eq [int]$procId -and $_.ProcessName -eq "node" }
    return $running
}

switch ($Action) {
    "start" {
        $existing = Get-TrackedProcess
        if ($existing) {
            Write-Warning "UI server is already running (PID $($existing.Id)). Not starting a second instance."
            return
        }

        # Admin panel (server/routes/admin-db.js) is gated on NODE_ENV=development;
        # without it, /admin/db/api/* returns a 403 page and the table list stays empty.
        $env:NODE_ENV = "development"

        $proc = Start-Process -FilePath "node" -ArgumentList "index.js" `
            -WorkingDirectory $ServerDir `
            -RedirectStandardOutput $OutLog `
            -RedirectStandardError $ErrLog `
            -WindowStyle Hidden -PassThru

        Set-Content -Path $PidFile -Value $proc.Id -Encoding utf8
        Write-Host "UI server started (PID $($proc.Id)). Logs: $OutLog / $ErrLog"
    }

    "stop" {
        $proc = Get-TrackedProcess
        if (-not $proc) {
            Write-Warning "UI server is not running. Nothing to stop."
            if (Test-Path $PidFile) { Remove-Item $PidFile -Force }
            return
        }

        Stop-Process -Id $proc.Id -Force
        Remove-Item $PidFile -Force
        Write-Host "UI server stopped (PID $($proc.Id))."
    }

    "status" {
        $proc = Get-TrackedProcess
        if ($proc) {
            Write-Host "UI server running (PID $($proc.Id))."
        } else {
            Write-Host "UI server is not running."
        }
    }
}
