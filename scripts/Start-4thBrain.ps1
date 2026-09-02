<#
.SYNOPSIS
4thBrain complete system startup orchestrator (Story 7.2, ADR20).

.DESCRIPTION
Master boot script for Windows that coordinates:
  1. Ollama startup in WSL2 (via wsl-init.sh)
  2. Node.js server startup (via server/bootstrap.js)
  3. MCP server startup (via bootstrap.js subprocess)
  4. Port availability verification
  5. Health checks for all services
  6. Graceful shutdown cleanup

.PARAMETER Action
  "start" — start all services
  "stop" — stop all services
  "status" — show status of all services
  "restart" — stop and then start all services

.PARAMETER NoWait
  If present, don't wait for health checks before returning; useful for scripting.

.EXAMPLE
  .\scripts\Start-4thBrain.ps1 start
  .\scripts\Start-4thBrain.ps1 stop
  .\scripts\Start-4thBrain.ps1 status
  .\scripts\Start-4thBrain.ps1 start -NoWait

.NOTES
  Requires PowerShell 5.1+ and WSL2 (for Ollama).
  Structured logging output matches batch/worker.js and server/bootstrap.js patterns.
#>

param(
    [Parameter(Position = 0)]
    [ValidateSet("start", "stop", "status", "restart")]
    [string]$Action = "start",

    [switch]$NoWait
)

$ErrorActionPreference = "Stop"

# Paths
$RepoRoot = Split-Path -Parent $PSScriptRoot
$ServerDir = Join-Path $RepoRoot "server"
$ScriptsDir = $PSScriptRoot
$PortsConfigFile = Join-Path $ScriptsDir "4thbrain-ports.json"
$WslInitScript = Join-Path $ScriptsDir "wsl-init.sh"
$ServerPidFile = Join-Path $ServerDir ".4thbrain-server.pid"
$ManagedPidsFile = Join-Path $ServerDir ".4thbrain-managed-pids"

# Log file paths
$BootLog = Join-Path $ServerDir "bootstrap.log"
$ShutdownLog = Join-Path $ServerDir "shutdown.log"

# Service ports from config (expected, not enforced here)
$OllamaPort = 11434
$NodeServerPort = 3000
$NodeServerHost = "127.0.0.1"

# Structured logging function (PowerShell analog to batch/worker.js)
function Log-JsonEvent {
    param(
        [string]$Level = "info",
        [string]$Component = "bootstrap.ps1",
        [string]$Event,
        [hashtable]$Details = @{}
    )

    $entry = @{
        timestamp  = (Get-Date -AsUTC -Format "o")
        component  = $Component
        level      = $Level
        event      = $Event
    }

    foreach ($key in $Details.Keys) {
        $entry[$key] = $Details[$key]
    }

    $json = $entry | ConvertTo-Json -Compress
    Write-Host $json
}

# Get or track a process by PID file
function Get-TrackedServerProcess {
    if (-not (Test-Path $ServerPidFile)) { return $null }
    $procId = Get-Content $ServerPidFile -Raw | ForEach-Object { $_.Trim() }
    if (-not $procId) { return $null }

    $running = Get-Process | Where-Object { $_.Id -eq [int]$procId -and $_.ProcessName -eq "node" }
    return $running
}

# Check if port is available
function Test-PortAvailable {
    param([int]$Port, [string]$Host = "127.0.0.1")

    $tcpClient = New-Object System.Net.Sockets.TcpClient
    try {
        $tcpClient.Connect($Host, $Port)
        $tcpClient.Close()
        return $false  # Port is in use
    } catch {
        return $true   # Port is free
    } finally {
        $tcpClient.Dispose()
    }
}

# Test if Ollama endpoint is responsive
function Test-OllamaHealthy {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:${OllamaPort}/api/tags" `
            -TimeoutSec 3 -ErrorAction Stop -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            return $true
        }
    } catch {
        return $false
    }
}

# Test if Node.js server is responsive
function Test-NodeServerHealthy {
    try {
        $response = Invoke-WebRequest -Uri "http://${NodeServerHost}:${NodeServerPort}/" `
            -TimeoutSec 3 -ErrorAction Stop -UseBasicParsing
        return $true
    } catch {
        return $false
    }
}

# START action: orchestrate full boot sequence
function Invoke-StartServices {
    Log-JsonEvent -Event "boot_started" -Details @{
        node_version = (node --version)
        platform     = $PSVersionTable.Platform
    }

    # Step 1: Start Ollama in WSL2 (via wsl-init.sh)
    Log-JsonEvent -Component "bootstrap.wsl" -Event "wsl_init_starting"

    if (-not (Test-Path $WslInitScript)) {
        Log-JsonEvent -Level "error" -Component "bootstrap.wsl" -Event "wsl_init_failed" `
            -Details @{ error = "wsl-init.sh not found at $WslInitScript" }
        exit 1
    }

    # Run WSL2 init script
    $wslInitOutput = wsl --exec bash -c ("cat """ + $WslInitScript + """ | bash") 2>&1
    $wslInitOutput | ForEach-Object { Write-Host $_ }

    if ($LASTEXITCODE -ne 0) {
        Log-JsonEvent -Level "error" -Component "bootstrap.wsl" -Event "wsl_init_failed" `
            -Details @{ exit_code = $LASTEXITCODE }
        exit 1
    }

    Log-JsonEvent -Component "bootstrap.wsl" -Event "wsl_init_completed"

    # Step 2: Verify port availability before starting Node server
    Log-JsonEvent -Component "bootstrap.server" -Event "port_check_starting" `
        -Details @{ port = $NodeServerPort; host = $NodeServerHost }

    if (-not (Test-PortAvailable -Port $NodeServerPort -Host $NodeServerHost)) {
        Log-JsonEvent -Level "error" -Component "bootstrap.server" -Event "port_check_failed" `
            -Details @{ port = $NodeServerPort; error = "Port in use" }
        exit 1
    }

    Log-JsonEvent -Component "bootstrap.server" -Event "port_check_passed" `
        -Details @{ port = $NodeServerPort; host = $NodeServerHost }

    # Step 3: Start Node.js server (via bootstrap.js, which handles MCP startup)
    Log-JsonEvent -Component "bootstrap.server" -Event "server_startup_starting"

    $serverProc = Start-Process -FilePath "node" -ArgumentList "bootstrap.js" `
        -WorkingDirectory $ServerDir `
        -RedirectStandardOutput $BootLog `
        -RedirectStandardError ($BootLog + ".err") `
        -WindowStyle Hidden -PassThru

    if (-not $serverProc) {
        Log-JsonEvent -Level "error" -Component "bootstrap.server" -Event "server_startup_failed" `
            -Details @{ error = "Failed to spawn Node process" }
        exit 1
    }

    Set-Content -Path $ServerPidFile -Value $serverProc.Id -Encoding utf8
    Log-JsonEvent -Component "bootstrap.server" -Event "server_process_spawned" `
        -Details @{ pid = $serverProc.Id; log = $BootLog }

    # Step 4: Wait for Node server to be healthy (unless -NoWait)
    if (-not $NoWait) {
        Log-JsonEvent -Component "bootstrap.server" -Event "server_health_check_starting" `
            -Details @{ timeout_seconds = 30 }

        $healthCheckCount = 0
        $maxHealthChecks = 30
        while ($healthCheckCount -lt $maxHealthChecks) {
            Start-Sleep -Milliseconds 500
            $healthCheckCount++

            if (Test-NodeServerHealthy) {
                Log-JsonEvent -Component "bootstrap.server" -Event "server_health_check_passed" `
                    -Details @{ attempt = $healthCheckCount; port = $NodeServerPort }
                break
            }

            if ($healthCheckCount -eq $maxHealthChecks) {
                Log-JsonEvent -Level "error" -Component "bootstrap.server" -Event "server_health_check_failed" `
                    -Details @{ attempts = $maxHealthChecks; port = $NodeServerPort }
                Stop-Process -Id $serverProc.Id -Force -ErrorAction SilentlyContinue
                exit 1
            }
        }
    }

    Log-JsonEvent -Component "bootstrap" -Event "boot_completed" `
        -Details @{
            ollama_port     = $OllamaPort
            node_port       = $NodeServerPort
            node_pid        = $serverProc.Id
            bootstrap_log   = $BootLog
        }

    Write-Host "`n4thBrain services started successfully!"
    Write-Host "  Node.js server: http://${NodeServerHost}:${NodeServerPort}"
    Write-Host "  Ollama: http://localhost:${OllamaPort}"
    Write-Host "  Logs: $BootLog"
}

# STOP action: graceful shutdown
function Invoke-StopServices {
    Log-JsonEvent -Event "shutdown_started" | Tee-Object -FilePath $ShutdownLog -Append

    # Stop Node.js server
    $proc = Get-TrackedServerProcess
    if ($proc) {
        Log-JsonEvent -Component "bootstrap.server" -Event "stopping_node_server" `
            -Details @{ pid = $proc.Id } | Tee-Object -FilePath $ShutdownLog -Append

        Stop-Process -Id $proc.Id -Force
        Remove-Item $ServerPidFile -Force -ErrorAction SilentlyContinue

        Log-JsonEvent -Component "bootstrap.server" -Event "node_server_stopped" `
            -Details @{ pid = $proc.Id } | Tee-Object -FilePath $ShutdownLog -Append
    } else {
        Write-Warning "No running Node.js server process found."
    }

    # WSL2/Ollama remains running for other processes; don't forcefully stop it
    Log-JsonEvent -Event "shutdown_completed" `
        -Details @{ shutdown_log = $ShutdownLog } | Tee-Object -FilePath $ShutdownLog -Append
    Write-Host "4thBrain services stopped."
}

# STATUS action: report service health
function Invoke-StatusServices {
    Write-Host "4thBrain Service Status"
    Write-Host "========================"

    # Check Ollama
    Write-Host "`nOllama (WSL2 Port $OllamaPort):"
    if (Test-OllamaHealthy) {
        Write-Host "  Status: RUNNING ✓"
        try {
            $tags = Invoke-WebRequest -Uri "http://localhost:${OllamaPort}/api/tags" `
                -TimeoutSec 3 -UseBasicParsing | ConvertFrom-Json
            if ($tags.models) {
                Write-Host "  Models: $($tags.models | ForEach-Object { $_.name } | Join-String -Separator ', ')"
            }
        } catch {
            Write-Host "  (could not fetch model list)"
        }
    } else {
        Write-Host "  Status: NOT RUNNING ✗"
    }

    # Check Node.js Server
    Write-Host "`nNode.js Server (Port $NodeServerPort):"
    $nodeProc = Get-TrackedServerProcess
    if ($nodeProc) {
        Write-Host "  Status: RUNNING ✓ (PID $($nodeProc.Id))"
        if (Test-NodeServerHealthy) {
            Write-Host "  Health: RESPONDING ✓"
        } else {
            Write-Host "  Health: NOT RESPONDING ✗"
        }
        Write-Host "  Logs: $BootLog"
    } else {
        Write-Host "  Status: NOT RUNNING ✗"
    }

    # Check MCP Server (running as subprocess of Node)
    Write-Host "`nMCP Server (stdio subprocess):"
    if ($nodeProc) {
        Write-Host "  Status: RUNNING (as child of Node.js PID $($nodeProc.Id)) ✓"
        Write-Host "  (Check $BootLog for MCP startup events)"
    } else {
        Write-Host "  Status: NOT RUNNING (Node.js server not active) ✗"
    }
}

# Route to appropriate action
switch ($Action) {
    "start" {
        Invoke-StartServices
    }
    "stop" {
        Invoke-StopServices
    }
    "status" {
        Invoke-StatusServices
    }
    "restart" {
        Invoke-StopServices
        Start-Sleep -Seconds 2
        Invoke-StartServices
    }
    default {
        Write-Error "Unknown action: $Action"
        exit 1
    }
}
