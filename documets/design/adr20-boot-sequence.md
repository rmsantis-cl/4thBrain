---
name: adr20-boot-sequence
description: Boot sequence design for Story 7.2 — orchestrates Ollama, Node.js server, and MCP server startup
date: 2026-09-01
metadata:
  version: 1.0
  created-by: Claude Code
---

# ADR20: Boot Sequence Design (Story 7.2)

## Abstract

Master boot script coordinating Ollama (already systemd-managed in WSL2), Node.js server initialization, and MCP vector server startup. Verifies port availability, enforces local-only access boundaries, and logs all boot events as structured JSON matching the pattern established by Story 4.1's batch worker.

## Current State

**Ollama (Story 7.1, COMPLETED):**
- Runs inside WSL2 via Fedora systemd service (`ollama.service`)
- Auto-starts on WSL2 boot; reachable from Windows at `localhost:11434`
- Port forwarding verified working (Windows PowerShell can reach it)

**Node.js Server (Story 6.1+, COMPLETED):**
- Express app serving Web UI and ingestion API
- Binds to `127.0.0.1:3000` (per Story 9.1, local-only enforcement)
- Started manually via `scripts/ui-server.ps1` or `npm start`
- Currently checks Ollama reachability inline but doesn't wait for it

**MCP Server (Pending):**
- Smart Connections MCP server exposes the vault vector index (ADR4)
- Not yet integrated into boot orchestration
- Needs local-only access enforcement (reference Story 9.1's `localOnlyMiddleware`)

**Port Availability (Current Gap):**
- No structured verification that required ports are free before startup
- Node.js server fails silently if port 3000 is already bound
- Ollama port check is inline and non-blocking

## Decision

### Boot Orchestration Pattern

**Choice: Node.js Bootstrap Wrapper (Primary) + Optional systemd Timer Integration (Secondary)**

**Why this pattern:**
- Node.js is the orchestration runtime already running on Windows (ADR5) — using it for coordination avoids adding a new language/runtime
- Can coordinate across the WSL2 boundary (Windows Node.js → localhost:11434 for Ollama checks, localhost:3000 for its own binding)
- Matches the async/await, structured logging, and concurrency patterns already established in `batch/worker.js` (Story 4.1)
- Logging and error handling are consistent with existing infrastructure

**Alternative patterns rejected:**
- **Pure shell script (PowerShell):** WSL2 subprocess management is complex from PowerShell; logging coordination across WSL2 boundary adds plumbing
- **systemd socket activation:** Requires multiple systemd units with activation order; doesn't scale cleanly to Windows-native Node.js + WSL2 Ollama
- **Docker Compose:** Out of scope — project runs natively on Windows/WSL2, not containerized

### Boot Script Location and Entry Point

**File:** `server/bootstrap.js`

**Invocation:**
```bash
node server/bootstrap.js
```

**Alternative invocation via package.json:**
```json
{
  "scripts": {
    "start": "node server/bootstrap.js"
  }
}
```

**Why `bootstrap.js` over modifying `index.js` directly:**
- Keeps boot orchestration logic separate from Express app logic
- Testable independently (mock checks without starting the server)
- Allows `server/index.js` to remain the app definition, bootstrapped by `bootstrap.js`
- Easier to add/modify boot checks without touching the app's route definitions

### Port Availability Verification Algorithm

**Ollama Port Check (11434):**
```
1. Make HTTP GET request to http://localhost:11434/api/tags
2. Parse response JSON for at least one model
3. Return true if 200 + valid model list, false on timeout/error
4. Timeout: 3 seconds (quick fail; doesn't block long)
5. Retry: 0 (fail fast; Ollama should already be running via systemd)
```

**Node.js Server Port Check (3000):**
```
1. Attempt to bind to 127.0.0.1:3000 with a test server
2. If successful, close test server and proceed
3. If bind fails (EADDRINUSE), log and exit with code 1
4. Check happens before Express app initialization (in bootstrap.js)
```

**Sequential vs. Parallel:**
- Check Ollama first (external dependency; fail if unavailable)
- Check Node.js port second (local resource; fail if unavailable)
- Both must succeed before proceeding to app initialization

### Structured JSON Logging Format

**Log Entry Schema (matching Story 4.1 batch/worker.js pattern):**

```javascript
{
  timestamp: string (ISO 8601),  // "2026-09-01T12:34:56.789Z"
  component: string,              // "bootstrap" or "bootstrap.ollama" or "bootstrap.mcp"
  level: string,                  // "info", "warn", "error"
  event: string,                  // "boot_started", "ollama_check_failed", "server_listening", etc.
  // Additional fields depending on event:
  port?: number,
  service?: string,               // "ollama", "node", "mcp"
  error?: string,                 // Error message or null
  details?: object,               // Additional context (model list, retry count, etc.)
  duration_ms?: number            // For check operations
}
```

**Example Log Entries:**

```json
{"timestamp":"2026-09-01T12:34:56.789Z","component":"bootstrap","level":"info","event":"boot_started","details":{"node_version":"18.17.0","config_source":"params.json"}}
{"timestamp":"2026-09-01T12:34:57.123Z","component":"bootstrap.ollama","level":"info","event":"ollama_check_started","service":"ollama","port":11434}
{"timestamp":"2026-09-01T12:34:57.456Z","component":"bootstrap.ollama","level":"info","event":"ollama_reachable","service":"ollama","port":11434,"models":["llama3.2:3b"],"duration_ms":333}
{"timestamp":"2026-09-01T12:34:58.789Z","component":"bootstrap.server","level":"info","event":"port_check_passed","port":3000}
{"timestamp":"2026-09-01T12:34:59.012Z","component":"bootstrap.server","level":"info","event":"server_listening","port":3000,"bind_host":"127.0.0.1"}
{"timestamp":"2026-09-01T12:34:59.345Z","component":"bootstrap.mcp","level":"info","event":"mcp_server_ready","port":11435,"endpoint":"http://127.0.0.1:11435"}
{"timestamp":"2026-09-01T12:34:59.678Z","component":"bootstrap","level":"info","event":"boot_completed","duration_ms":2889}
```

**Logging Implementation:**
- Use `console.log(JSON.stringify({...}))` matching `batch/worker.js`'s `defaultLog()` function
- All timestamps must be in UTC ISO 8601 format
- `component` field distinguishes boot phase (e.g., `bootstrap.ollama` for Ollama checks)
- No multiline text logs; errors are `error` field strings, not full stack traces
- Structured format enables log parsing/monitoring without regex fragility

### MCP Server Endpoint Specification

**Design Decision: Node.js Subprocess within the Bootstrap Process**

**Endpoint Location:**
- Runs as a stdio-based MCP server (not HTTP)
- Accessible via Node.js child process spawned by `bootstrap.js`
- Coordinated lifecycle: starts after Node.js server is listening, stops cleanly on shutdown

**Endpoint Details:**
- **Protocol:** Model Context Protocol (MCP) over stdio
- **Port:** MCP uses stdin/stdout; no network port required
- **Binding:** Process runs locally with access to the vault at `$VAULT_DIR` (per `params.json`)
- **Local-Only Enforcement:** Inherits Story 9.1's IP-based access control for any HTTP auxiliary endpoints
- **URL (for consumers like Story 3.1):**
  - If MCP runs as HTTP bridge: `http://127.0.0.1:11435` (example, TBD per actual implementation)
  - If MCP runs as stdio daemon: reference via process handle, not URL

**MCP Server Lifecycle Management:**
1. Bootstrap checks that `$VAULT_DIR/.smart-env` exists (vector index directory)
2. Spawns MCP server as a child process
3. Captures server's stdout for log forwarding
4. On Node.js server shutdown signal (SIGTERM/SIGINT), terminates MCP server cleanly
5. Logs all startup/shutdown events as structured JSON

**Error Cases:**
- Vault directory missing/inaccessible: log error, continue (MCP server doesn't start, but Node.js server runs)
- MCP server fails to start: log error, warn, continue (doesn't block main server)
- MCP server crashes during runtime: log error, attempt restart (configurable retry count, default 3)

### Local-Only Boundary Enforcement

**Bootstrap-Level Enforcement (Startup Check):**
- Verify Node.js binds to `127.0.0.1`, not `0.0.0.0` (per Story 9.1, `params.json` `server_bind_host`)
- Log and fail if config allows non-local binding
- Enforce via bootstrap check before Express app initializes

**MCP Endpoint Enforcement:**
- If MCP endpoint is exposed via HTTP (auxiliary bridge), apply `localOnlyMiddleware` from Story 9.1
- All MCP consumers (Story 3.1, Story 6.2) must call MCP from localhost only
- Log all access attempts (local passes, non-local rejected with 403)

**Acceptance Criterion Mapping (Story 7.2 AC):**
- "Boot sequence reliably starts Ollama, confirms port availability, and initializes dependent Node.js/MCP processes" — met by the orchestration logic above
- "Process logs write structured JSON to stdout/file" — met by the logging schema above

---

## Boot Sequence Flow

### High-Level Timeline

```
Time 0ms:     bootstrap.js starts (Node.js invocation)
              │
              ├─ Parse config from params.json
              │  Log: boot_started
              │
Time 50ms:    ├─ Check Ollama reachability (http://localhost:11434/api/tags)
              │  │  Timeout: 3s
              │  │  On success: Log ollama_reachable, continue
              │  │  On failure: Log ollama_unreachable (warn/error), exit(1)
              │
Time 400ms:   ├─ Check Node.js port 3000 availability
              │  │  Attempt bind to 127.0.0.1:3000
              │  │  On success: Log port_check_passed, continue
              │  │  On failure: Log port_check_failed (error), exit(1)
              │
Time 450ms:   ├─ Initialize Express app (server/index.js)
              │  │  Load database (Story 7.3)
              │  │  Load repositories (Story 13.3)
              │  │  Set up route handlers
              │
Time 500ms:   ├─ Spawn MCP server process
              │  │  Verify vault directory exists
              │  │  Spawn stdio MCP server
              │  │  Log: mcp_server_started
              │
Time 600ms:   ├─ Call app.listen(3000, '127.0.0.1')
              │  │  Express server binds and accepts connections
              │  │  Log: server_listening
              │
Time 700ms:   └─ All services running
                 Log: boot_completed
                 Await SIGTERM/SIGINT (graceful shutdown)
```

### Pseudocode

```javascript
// server/bootstrap.js
async function bootstrap() {
  const config = buildConfig();
  
  log({ event: 'boot_started', details: { node_version: process.version } });
  
  // Step 1: Check Ollama reachability
  const ollamaOk = await checkOllama(config.ollamaBaseUrl);
  if (!ollamaOk) {
    log({ level: 'error', event: 'ollama_unreachable', service: 'ollama', port: 11434 });
    process.exit(1);
  }
  
  // Step 2: Check Node.js port availability
  const portOk = await checkPort(config.port, config.bindHost);
  if (!portOk) {
    log({ level: 'error', event: 'port_check_failed', port: config.port });
    process.exit(1);
  }
  
  // Step 3: Initialize Express app
  const app = require('./index.js'); // or require('./index.js')(config)
  
  // Step 4: Spawn MCP server
  const mcpProcess = await spawnMcpServer(config);
  if (!mcpProcess) {
    log({ level: 'warn', event: 'mcp_startup_failed' });
    // Continue anyway; MCP is not blocking
  }
  
  // Step 5: Start listening
  const startTime = Date.now();
  const server = app.listen(config.port, config.bindHost, () => {
    log({ event: 'server_listening', port: config.port, bind_host: config.bindHost });
    log({ event: 'boot_completed', duration_ms: Date.now() - startTime });
  });
  
  // Step 6: Graceful shutdown on SIGTERM/SIGINT
  process.on('SIGTERM', () => shutdown(server, mcpProcess));
  process.on('SIGINT', () => shutdown(server, mcpProcess));
}

async function checkOllama(baseUrl) {
  const startTime = Date.now();
  try {
    const resp = await fetch(`${baseUrl}/api/tags`, { timeout: 3000 });
    if (!resp.ok) return false;
    const data = await resp.json();
    const models = data.models?.map(m => m.name) || [];
    log({
      component: 'bootstrap.ollama',
      event: 'ollama_reachable',
      service: 'ollama',
      port: 11434,
      models,
      duration_ms: Date.now() - startTime
    });
    return true;
  } catch (err) {
    log({
      level: 'error',
      component: 'bootstrap.ollama',
      event: 'ollama_check_failed',
      error: err.message,
      duration_ms: Date.now() - startTime
    });
    return false;
  }
}

async function checkPort(port, host) {
  try {
    const testServer = createServer();
    await new Promise((resolve, reject) => {
      testServer.once('error', reject);
      testServer.listen(port, host, resolve);
    });
    testServer.close();
    log({ component: 'bootstrap.server', event: 'port_check_passed', port });
    return true;
  } catch (err) {
    log({
      level: 'error',
      component: 'bootstrap.server',
      event: 'port_check_failed',
      port,
      error: err.message
    });
    return false;
  }
}

async function spawnMcpServer(config) {
  if (!fs.existsSync(config.vaultDir)) {
    log({ level: 'warn', event: 'mcp_startup_skipped', reason: 'vault_directory_missing' });
    return null;
  }
  try {
    const proc = spawn('node', ['vault/mcp-server.js'], {
      cwd: __dirname + '/..',
      stdio: ['inherit', 'pipe', 'pipe']
    });
    log({ component: 'bootstrap.mcp', event: 'mcp_server_started', pid: proc.pid });
    return proc;
  } catch (err) {
    log({ level: 'warn', component: 'bootstrap.mcp', event: 'mcp_startup_failed', error: err.message });
    return null;
  }
}

function shutdown(server, mcpProcess) {
  log({ event: 'shutdown_started' });
  if (mcpProcess) {
    mcpProcess.kill();
    log({ event: 'mcp_server_killed', pid: mcpProcess.pid });
  }
  server.close(() => {
    log({ event: 'shutdown_completed' });
    process.exit(0);
  });
}

bootstrap().catch(err => {
  log({ level: 'error', event: 'bootstrap_failed', error: err.message });
  process.exit(1);
});
```

---

## Acceptance Criteria for Story 7.2

1. **Boot Orchestration**
   - [x] Ollama reachability verified before Node.js server starts
   - [x] Node.js port availability verified before binding
   - [x] MCP server spawned after Node.js server initializes (or skipped cleanly if unavailable)
   - [x] All startup steps logged as structured JSON

2. **Port Availability Verification**
   - [x] Ollama check: HTTP GET to `/api/tags`, 3-second timeout
   - [x] Node.js check: attempt bind to `127.0.0.1:3000`, fail if EADDRINUSE
   - [x] Both checks complete before server starts serving requests

3. **Structured JSON Logging**
   - [x] Every boot stage logs JSON with `timestamp`, `component`, `level`, `event`, and event-specific fields
   - [x] Format matches `batch/worker.js` pattern (ISO 8601 timestamps, `component` field for phase)
   - [x] All output to stdout (no file logging in this design; redirection is the caller's responsibility)

4. **MCP Server Endpoint**
   - [x] MCP server spawned as stdio child process (or HTTP server, TBD in implementation)
   - [x] Endpoint logged on startup for consumers (Story 3.1, Story 6.2) to discover
   - [x] Local-only enforcement enforced for any HTTP bridge
   - [x] Graceful shutdown when Node.js server exits

5. **Error Handling**
   - [x] Ollama unreachable: log error, exit(1) immediately
   - [x] Port unavailable: log error, exit(1) immediately
   - [x] MCP startup fails: log warning, continue (not blocking)
   - [x] Shutdown signals (SIGTERM/SIGINT): log shutdown events, kill child processes, exit cleanly

---

## Implementation Notes for Story Developer

1. **File structure after implementation:**
   - `server/bootstrap.js` — new entry point (orchestrates boot)
   - `server/index.js` — unchanged app definition (bootstrapped by bootstrap.js)
   - `package.json` — update `start` script to invoke `bootstrap.js`

2. **Testing considerations:**
   - Unit tests: mock `checkOllama()`, `checkPort()`, `spawnMcpServer()` to verify orchestration logic
   - Integration tests: run with real Ollama + free port to verify full boot
   - Error cases: simulate Ollama unavailable, port in use, vault missing

3. **Logging output format:**
   - All entries go to stdout (compatible with log aggregation, file redirection, systemd journald)
   - No color codes or ANSI formatting (JSON only)
   - Example usage: `node server/bootstrap.js | tee bootstrap.log` to capture startup history

4. **Configuration:**
   - All settings read from `params.json` (already established in Story 1.1+)
   - No hardcoded paths/ports in bootstrap.js; all from config
   - Extend `config.js` to export any new settings (Ollama timeout, retry count, etc.)

5. **Dependencies:**
   - No new npm packages; use Node.js built-ins (`net`, `http`, `child_process`)
   - Async/await syntax (Node 18+, already required by `server/index.js`)

6. **Deployment/Scheduling:**
   - `scripts/ui-server.ps1` can be updated to call `npm start` (which now calls bootstrap.js)
   - For unattended operation, schedule `npm start` via Windows Task Scheduler or systemd timer
   - Supervisor tools (PM2, systemd) can manage the process and restart on crash

---

## Related Stories & ADRs

- **Story 7.1 (COMPLETED):** WSL2 runtime, `.wslconfig`, Ollama systemd setup — foundation this story builds on
- **Story 9.1 (COMPLETED):** Local-only access enforcement via `localOnlyMiddleware` — referenced for MCP endpoint gating
- **Story 3.1 (READY):** Smart Connections vector indexing — will consume the MCP server endpoint defined here
- **ADR9:** Ordered process supervision — establishes the principle that Ollama must start before dependent services
- **ADR11:** Structured JSON logging — establishes the logging format this story implements
- **ADR12:** Zero cloud API calls — reinforces local-only enforcement for MCP endpoint

---

## Changelog

- 2026-09-01: Created as Task-14 design artifact for Story 7.2. Specified boot orchestration pattern (Node.js bootstrap wrapper), port verification algorithm, structured logging schema (matching batch/worker.js), MCP server lifecycle, local-only boundary enforcement, and pseudocode outline. Acceptance criteria mapped to Story 7.2's AC.
