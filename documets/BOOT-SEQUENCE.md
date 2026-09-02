---
name: BOOT-SEQUENCE
description: Complete boot sequence design, orchestration patterns, and operational procedures for 4thBrain
date: 2026-09-02
metadata:
  version: 1.0
  created-by: Claude Code
---

# 4thBrain Boot Sequence

Operational guide for starting, stopping, and monitoring all 4thBrain services (Ollama, Node.js server, MCP server). Implements Story 7.2 (Process Lifecycle & MCP Server Setup) per ADR20.

---

## Quick Start

### Start all services (Windows)

```powershell
cd C:\Users\<username>\desar\github\4thBrain
.\scripts\Start-4thBrain.ps1 start
```

Expected output:
```
{"timestamp":"2026-09-02T...","component":"bootstrap","level":"info","event":"boot_started",...}
{"timestamp":"2026-09-02T...","component":"bootstrap.wsl","level":"info","event":"wsl_init_started",...}
...
4thBrain services started successfully!
  Node.js server: http://127.0.0.1:3000
  Ollama: http://localhost:11434
  Logs: C:\Users\...\server\bootstrap.log
```

### Stop all services

```powershell
.\scripts\Start-4thBrain.ps1 stop
```

### Check service status

```powershell
.\scripts\Start-4thBrain.ps1 status
```

### Restart all services

```powershell
.\scripts\Start-4thBrain.ps1 restart
```

---

## Service Architecture & Port Mapping

### Port Configuration

See `scripts/4thbrain-ports.json` for authoritative port/host/protocol mapping.

| Service | Host | Port | Protocol | Location | Purpose |
|---------|------|------|----------|----------|---------|
| **Ollama** | localhost | 11434 | HTTP | WSL2 (Fedora) | Local LLM inference (story-7.1) — auto-started via systemd |
| **Node.js Server** | 127.0.0.1 | 3000 | HTTP | Windows (localhost) | Web UI, ingestion API, admin panel (story-6.1, 13.1, 13.3) — local-only access enforced (story-9.1) |
| **MCP Server** | — | — | stdio | Windows (subprocess) | Vault vector indexing (story-7.2, 3.1) — runs as child process of Node.js server |

### Port Forwarding (WSL2 ↔ Windows)

Windows can access WSL2's port 11434 automatically via `localhost:11434` thanks to `.wslconfig` port forwarding (configured during story-7.1). No manual routing needed.

**Verification:**
```powershell
# Test Ollama reachability from Windows
Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing
```

---

## Boot Orchestration Sequence

### Timeline (Typical: 2–3 seconds end-to-end)

```
Time 0ms:        .\Start-4thBrain.ps1 start invoked
                 │
                 ├─ Log: boot_started (PowerShell wrapper)
                 │
Time 50ms:       ├─ Execute WSL2 init script (scripts/wsl-init.sh)
                 │  │  Check Ollama installed
                 │  │  Start Ollama systemd service
                 │  │  Wait for http://localhost:11434/api/tags (max 30s)
                 │  │  Log: ollama_endpoint_ready
                 │
Time 350ms:      ├─ PowerShell verifies port 3000 available (test bind)
                 │  │  Log: port_check_passed
                 │
Time 400ms:      ├─ Spawn Node.js process: node server/bootstrap.js
                 │  │  (bootstrap.js inherits orchestration from this point)
                 │
Time 450ms:      ├─ bootstrap.js checks Ollama reachability (http://localhost:11434/api/tags)
                 │  │  Log: ollama_reachable
                 │
Time 500ms:      ├─ bootstrap.js verifies port 3000 available
                 │  │  Log: port_check_passed
                 │
Time 550ms:      ├─ bootstrap.js initializes Express app (server/index.js)
                 │  │  Load SQLite database (story-7.3)
                 │  │  Load repositories (story-13.3)
                 │  │  Set up route handlers
                 │
Time 600ms:      ├─ bootstrap.js spawns MCP server subprocess
                 │  │  Verify vault directory exists
                 │  │  Spawn: node vault/mcp-server.js
                 │  │  Log: mcp_server_started (PID)
                 │
Time 650ms:      ├─ bootstrap.js calls app.listen(3000, '127.0.0.1')
                 │  │  Express server accepts connections
                 │  │  Log: server_listening (port, bind_host)
                 │
Time 700ms:      ├─ bootstrap.js logs boot_completed (total duration)
                 │
Time 800ms:      ├─ PowerShell wrapper health-checks Node server
                 │  │  GET http://127.0.0.1:3000/ (redirect to /chat)
                 │  │  Log: server_health_check_passed
                 │
Time 900ms:      └─ PowerShell wrapper returns successfully
                   All services running; ready to accept requests
```

### Orchestration Components

#### 1. PowerShell Wrapper (`scripts/Start-4thBrain.ps1`)

**Responsibilities:**
- Coordinate WSL2 startup via wsl-init.sh
- Verify port 3000 availability before spawning Node.js
- Spawn and track Node.js bootstrap process
- Wait for server health (GET /) before returning
- Log all events as structured JSON

**Actions:** start, stop, status, restart
**Logs:** `server/bootstrap.log`, `server/shutdown.log`

#### 2. WSL2 Init Script (`scripts/wsl-init.sh`)

**Responsibilities (run inside WSL2 via `wsl --exec bash -c "..."`)**
- Check Ollama installed
- Start/enable Ollama systemd service
- Wait for http://localhost:11434/api/tags (30s max, fail-fast)
- Output structured JSON logs to stdout
- Exit 0 on success, 1 on failure

**Invoked by:** PowerShell wrapper
**Logs:** stdout (captured by PowerShell and written to bootstrap.log)

#### 3. Node.js Bootstrap Script (`server/bootstrap.js`)

**Responsibilities:**
- Parse config from `server/config.js` (which reads `params.json`)
- Verify local-only binding (127.0.0.1, per story-9.1)
- Check Ollama reachability (HTTP GET to /api/tags)
- Check port 3000 availability (test bind)
- Initialize Express app (server/index.js)
- Spawn MCP server subprocess
- Start listening on 127.0.0.1:3000
- Await SIGTERM/SIGINT for graceful shutdown
- Output structured JSON logs to stdout

**Entry point:** `node server/bootstrap.js`
**Also invoked by:** `npm start` (after updating package.json)
**Logs:** stdout (captured by PowerShell and written to bootstrap.log)

#### 4. MCP Server Subprocess (`vault/mcp-server.js`, if exists)

**Responsibilities:**
- Run as a child process spawned by bootstrap.js
- Expose Smart Connections vector index for story-3.1 consumers
- Communicate via stdio (Model Context Protocol)
- Log all events as structured JSON to stdout
- Exit gracefully on SIGTERM from parent

**Spawned by:** bootstrap.js in step 5
**Lifecycle:** Terminated by bootstrap.js on shutdown (SIGTERM)
**Status:** Non-critical; if fails to start, bootstrap continues

---

## Structured Logging Format

All boot events are logged as **JSON to stdout** (no text, no multiline). Format matches `batch/worker.js` pattern (story-4.1) and ADR11 (structured logging).

### Log Entry Schema

```javascript
{
  timestamp: string,      // ISO 8601 UTC ("2026-09-02T12:34:56.789Z")
  component: string,      // "bootstrap" | "bootstrap.ps1" | "bootstrap.wsl" | "bootstrap.ollama" | "bootstrap.server" | "bootstrap.mcp"
  level: string,          // "info" | "warn" | "error"
  event: string,          // Event name ("boot_started", "ollama_reachable", "server_listening", etc.)
  // Optional fields (context-dependent):
  error?: string,         // Error message if level="error"
  port?: number,          // Service port
  host?: string,          // Bind host
  pid?: number,           // Process ID
  models?: string[],      // List of Ollama models (if fetched)
  duration_ms?: number,   // Elapsed time for a check
  details?: object,       // Additional structured context
  service?: string        // "ollama" | "node" | "mcp"
}
```

### Example Log Stream

```json
{"timestamp":"2026-09-02T12:34:56.123Z","component":"bootstrap.ps1","level":"info","event":"boot_started","node_version":"v18.17.0","platform":"Win32"}
{"timestamp":"2026-09-02T12:34:56.200Z","component":"bootstrap.wsl","level":"info","event":"wsl_init_starting"}
{"timestamp":"2026-09-02T12:34:56.450Z","component":"wsl-init","level":"info","event":"ollama_found","path":"/usr/bin/ollama"}
{"timestamp":"2026-09-02T12:34:56.500Z","component":"wsl-init","level":"info","event":"ollama_service_started"}
{"timestamp":"2026-09-02T12:34:57.200Z","component":"wsl-init","level":"info","event":"ollama_endpoint_ready","models":"llama3.2:3b,neural-chat:7b"}
{"timestamp":"2026-09-02T12:34:57.300Z","component":"bootstrap.wsl","level":"info","event":"wsl_init_completed"}
{"timestamp":"2026-09-02T12:34:57.400Z","component":"bootstrap.server","level":"info","event":"port_check_starting","port":3000,"host":"127.0.0.1"}
{"timestamp":"2026-09-02T12:34:57.450Z","component":"bootstrap.server","level":"info","event":"port_check_passed","port":3000,"host":"127.0.0.1"}
{"timestamp":"2026-09-02T12:34:57.500Z","component":"bootstrap.server","level":"info","event":"server_process_spawned","pid":12345,"log":"C:\\...\\bootstrap.log"}
{"timestamp":"2026-09-02T12:34:57.600Z","component":"bootstrap","level":"info","event":"boot_started","node_version":"v18.17.0","config_source":"params.json"}
{"timestamp":"2026-09-02T12:34:57.650Z","component":"bootstrap.ollama","level":"info","event":"ollama_check_started","port":11434}
{"timestamp":"2026-09-02T12:34:57.900Z","component":"bootstrap.ollama","level":"info","event":"ollama_reachable","models":["llama3.2:3b","neural-chat:7b"],"duration_ms":250}
{"timestamp":"2026-09-02T12:34:57.950Z","component":"bootstrap.server","level":"info","event":"port_check_passed","port":3000,"host":"127.0.0.1"}
{"timestamp":"2026-09-02T12:34:58.050Z","component":"bootstrap","level":"info","event":"express_app_initialized"}
{"timestamp":"2026-09-02T12:34:58.100Z","component":"bootstrap.mcp","level":"info","event":"mcp_server_started","pid":12346}
{"timestamp":"2026-09-02T12:34:58.200Z","component":"bootstrap.server","level":"info","event":"server_listening","port":3000,"bind_host":"127.0.0.1","url":"http://127.0.0.1:3000"}
{"timestamp":"2026-09-02T12:34:58.950Z","component":"bootstrap.server","level":"info","event":"server_health_check_passed","attempt":1,"port":3000}
{"timestamp":"2026-09-02T12:34:58.950Z","component":"bootstrap","level":"info","event":"boot_completed","duration_ms":891,"ollama_port":11434,"node_port":3000}
```

### Parsing/Monitoring Logs

All logs are valid JSON, one entry per line. Parse with:

```powershell
# Parse and filter errors
Get-Content .\server\bootstrap.log | ConvertFrom-Json | Where-Object { $_.level -eq "error" }

# Extract only events for a specific component
Get-Content .\server\bootstrap.log | ConvertFrom-Json | Where-Object { $_.component -like "bootstrap.ollama*" }

# Get summary (total duration, service PIDs)
(Get-Content .\server\bootstrap.log | ConvertFrom-Json)[-1]
```

---

## Error Scenarios & Recovery

### Scenario 1: Ollama Unreachable

**Symptoms:**
- PowerShell script fails with `wsl_init_failed`
- bootstrap.log contains: `{"event":"ollama_check_failed",...}`
- Node.js server never starts (bootstrap exits with code 1)

**Cause:**
- Ollama not installed in WSL2
- Ollama systemd service failed
- WSL2 not running or misconfigured

**Recovery:**
```powershell
# Check Ollama status in WSL2
wsl systemctl status ollama.service

# If not running, restart it
wsl systemctl restart ollama.service

# Verify reachability
Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing

# Try boot again
.\scripts\Start-4thBrain.ps1 start
```

**Manual WSL2 Ollama Install (if needed):**
```bash
# Inside WSL2 (Fedora)
wsl
sudo curl -fsSL https://ollama.ai/install.sh | sh
systemctl enable --now ollama.service
systemctl status ollama.service
```

### Scenario 2: Port 3000 Already in Use

**Symptoms:**
- PowerShell script returns: `port_check_failed: Port in use`
- bootstrap.log contains: `{"event":"port_check_failed","port":3000,...}`

**Cause:**
- Old Node.js process still running
- Another application bound to port 3000

**Recovery:**
```powershell
# Stop existing 4thBrain server
.\scripts\Start-4thBrain.ps1 stop

# Verify port is free
Get-NetTCPConnection | Where-Object { $_.LocalPort -eq 3000 }

# If still occupied, force-kill the offending process
Get-Process -Name node | Stop-Process -Force

# Try boot again
.\scripts\Start-4thBrain.ps1 start
```

### Scenario 3: MCP Server Fails to Start

**Symptoms:**
- bootstrap.log contains: `{"event":"mcp_startup_failed",...}` or `{"event":"mcp_startup_skipped",...}`
- Node.js server continues running normally

**Cause:**
- vault/mcp-server.js doesn't exist yet (story-3.1 not implemented)
- Vault directory ($VAULT_DIR) not configured or missing
- MCP server crashed during startup

**Recovery:**
- MCP server startup is **non-critical**; it doesn't block the main server
- Check bootstrap.log for exact reason (search for `"component":"bootstrap.mcp"`)
- If vault directory missing, ensure `params.json` has valid `vault_dir` path
- If mcp-server.js missing, implement story-3.1

```powershell
# View MCP-specific events
Get-Content .\server\bootstrap.log | ConvertFrom-Json | Where-Object { $_.component -like "bootstrap.mcp*" }
```

### Scenario 4: Node.js Server Health Check Fails

**Symptoms:**
- PowerShell script exits: `server_health_check_failed`
- bootstrap.log shows server process spawned, but GET / never responds
- Likely the server crashed during initialization

**Recovery:**
```powershell
# Read the full bootstrap.log for errors
Get-Content .\server\bootstrap.log

# Check server/index.js for initialization errors
# Common issues: database corruption, missing route handlers

# Try manual startup for diagnostics
cd .\server
npm start
# Watch console output; Ctrl+C to stop
```

---

## Manual Startup (Development/Debugging)

If you prefer to start services manually (bypassing the orchestration script):

### Manual: Start Ollama only

```powershell
wsl systemctl start ollama.service
wsl systemctl status ollama.service
```

### Manual: Start Node.js server only

```powershell
cd .\server
npm start
# or
node bootstrap.js
```

Bootstrap will perform checks and fail if Ollama unreachable or port in use.

### Manual: Start MCP server only (for testing)

```powershell
cd .\vault
node mcp-server.js
```

---

## Graceful Shutdown

The boot scripts implement graceful shutdown:

1. **Normal case (via PowerShell):**
   ```powershell
   .\scripts\Start-4thBrain.ps1 stop
   ```
   - Sends SIGTERM to Node.js process
   - Bootstrap.js receives SIGTERM and:
     - Logs `shutdown_started`
     - Sends SIGTERM to MCP subprocess
     - Closes Express server (drains in-flight requests)
     - Logs `shutdown_completed`
     - Exits with code 0

2. **Emergency stop (Ctrl+C in PowerShell):**
   - PowerShell cancels the wait-for-health-check loop
   - Node.js process continues running in background
   - Use `.\scripts\Start-4thBrain.ps1 stop` to clean up

3. **Force kill:**
   ```powershell
   Get-Process -Name node | Stop-Process -Force
   ```
   - Abrupt, not recommended (may leave uncommitted DB transactions)
   - Use graceful stop instead

---

## Configuration

### Changing Ports

**Node.js server port:** Edit `server/config.js`, update `port` value (default 3000)
- Must restart Node.js server for changes to take effect
- Also update bootstrap.js and scripts if port changes

**Ollama port:** Edit `.wslconfig` in Windows home directory (port-forwarding rule)
- Built into WSL2 infrastructure; not directly configurable per app
- Contact WSL2 docs for advanced port forwarding

### Changing Bind Host

**Node.js server bind host:** Edit `server/config.js`, update `server_bind_host` (default 127.0.0.1)
- **Warning:** Changing from 127.0.0.1 violates story-9.1 local-only enforcement
- Bootstrap.js will reject non-local binding; don't do this in production

### Timeout Tuning

**Ollama health check timeout:** Edit `scripts/wsl-init.sh`, change `timeout_per_attempt=1` (seconds)
- Increase if Ollama is slow to respond on this machine

**Node server health check timeout:** Edit `scripts/Start-4thBrain.ps1`, change `TimeoutSec 3` (seconds)

---

## Integration with CI/CD & Automation

### Unattended Boot via Windows Task Scheduler

Schedule `Start-4thBrain.ps1 start -NoWait` to start services on Windows startup:

```powershell
# Create scheduled task (run once as admin)
$taskName = "4thBrain-AutoStart"
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -WindowStyle Hidden -File C:\path\to\scripts\Start-4thBrain.ps1 -NoWait start"
$trigger = New-ScheduledTaskTrigger -AtStartup
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -RunLevel Highest
```

### Continuous Operation via PM2 or Supervisor

Wrap `npm start` (which calls bootstrap.js) with a process manager:

```bash
# Install PM2 (Windows)
npm install -g pm2

# Start with PM2
pm2 start "npm start" --cwd "C:\path\to\server" --name "4thbrain"

# Monitor
pm2 monit

# View logs
pm2 logs 4thbrain

# Stop
pm2 stop 4thbrain
```

---

## Related Stories & ADRs

- **Story 7.1 (COMPLETED):** WSL2 runtime & Ollama systemd setup — foundation
- **Story 9.1 (COMPLETED):** Local-only access enforcement — enforced by bootstrap checks
- **Story 3.1 (READY):** Smart Connections vector indexing — consumes MCP endpoint
- **ADR20:** Complete boot sequence design (this doc implements it)
- **ADR11:** Structured JSON logging pattern

---

## Changelog

- **2026-09-02:** Created BOOT-SEQUENCE.md as Task-14 implementation artifact. Documents boot orchestration (PowerShell wrapper → WSL2 init → bootstrap.js → MCP server), port mapping, timeline, logging format, error recovery procedures, manual startup, graceful shutdown, and CI/CD integration patterns. Implements ADR20 design for story-7.2.
