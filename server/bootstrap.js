#!/usr/bin/env node
/**
 * server/bootstrap.js
 *
 * Master boot script for Windows-native Node.js, verifying Ollama (WSL2) and starting services.
 * Implements Story 7.2 (Process Lifecycle & MCP Server Setup) per ADR20.
 *
 * Architecture:
 * - This script runs on Windows (native Node.js, not WSL2)
 * - Ollama runs in WSL2 via systemd; accessible via Windows→WSL2 port forwarding (localhost:11434)
 * - MCP server spawned as a Windows-native child process (direct vault filesystem access)
 * - Express server binds to Windows 127.0.0.1:3000
 *
 * Orchestration sequence:
 * 1. Parse config from params.json
 * 2. Verify Ollama reachability over port-forwarding (http://localhost:11434/api/tags)
 * 3. Verify Node.js port availability (Windows 127.0.0.1:3000)
 * 4. Initialize Express app (server/index.js)
 * 5. Spawn MCP server subprocess (Windows process, non-blocking; continues if fails)
 * 6. Start listening on 127.0.0.1:3000 (Windows)
 * 7. Await shutdown signals (SIGTERM/SIGINT) for graceful cleanup
 *
 * All output is structured JSON to stdout, matching batch/worker.js logging pattern.
 */

const http = require("http");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// Stub for app initialization (will be required below after checks pass)
let app = null;
let server = null;
let mcpProcess = null;
const bootStartTime = Date.now();

/**
 * Structured logging matching Story 4.1's batch/worker.js pattern.
 * All output as JSON to stdout for log aggregation/parsing compatibility.
 */
function log(fields = {}) {
  const defaults = {
    timestamp: new Date().toISOString(),
    component: "bootstrap",
    level: "info",
  };
  console.log(JSON.stringify({ ...defaults, ...fields }));
}

/**
 * Check Ollama reachability via HTTP GET to /api/tags.
 * Returns { ok: boolean, models: string[], duration_ms: number }
 */
async function checkOllama(config) {
  const startTime = Date.now();
  const ollamaUrl = config.ollamaBaseUrl || "http://localhost:11434";

  // params.json sets ollama_base_url to the OpenAI-compatible base
  // (http://localhost:11434/v1) because the chat client uses the openai
  // package. Ollama's native /api/tags does NOT live under /v1 -- requesting
  // it there returns the plain-text body "404 page not found", which then
  // fails JSON.parse. Pick the endpoint that matches the configured base.
  const base = ollamaUrl.replace(/\/+$/, "");
  const probeUrl = /\/v1$/.test(base) ? `${base}/models` : `${base}/api/tags`;
  const timeoutMs = 3000;

  log({
    component: "bootstrap.ollama",
    level: "info",
    event: "ollama_check_started",
    service: "ollama",
    port: 11434,
  });

  return new Promise((resolve) => {
    const req = http.get(probeUrl, { timeout: timeoutMs }, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          // /v1/models returns { data: [{ id }] }; /api/tags returns { models: [{ name }] }
          const models = (parsed.data || parsed.models || []).map(
            (m) => m.id || m.name || m
          );
          const duration = Date.now() - startTime;
          log({
            component: "bootstrap.ollama",
            level: "info",
            event: "ollama_reachable",
            service: "ollama",
            port: 11434,
            models,
            duration_ms: duration,
          });
          resolve({ ok: true, models, duration_ms: duration });
        } catch (err) {
          const duration = Date.now() - startTime;
          log({
            component: "bootstrap.ollama",
            level: "error",
            event: "ollama_check_failed",
            service: "ollama",
            port: 11434,
            error: `Invalid JSON response: ${err.message}`,
            duration_ms: duration,
          });
          resolve({ ok: false, models: [], duration_ms: duration });
        }
      });
    });

    req.on("error", (err) => {
      const duration = Date.now() - startTime;
      log({
        component: "bootstrap.ollama",
        level: "error",
        event: "ollama_check_failed",
        service: "ollama",
        port: 11434,
        error: err.message,
        duration_ms: duration,
      });
      resolve({ ok: false, models: [], duration_ms: duration });
    });

    req.on("timeout", () => {
      req.destroy();
      const duration = Date.now() - startTime;
      log({
        component: "bootstrap.ollama",
        level: "error",
        event: "ollama_check_failed",
        service: "ollama",
        port: 11434,
        error: `Timeout (${timeoutMs}ms) — Ollama not responding`,
        duration_ms: duration,
      });
      resolve({ ok: false, models: [], duration_ms: duration });
    });
  });
}

/**
 * Check Node.js port availability by attempting a test bind.
 * Returns { ok: boolean, error?: string }
 */
async function checkPort(port, host) {
  return new Promise((resolve) => {
    const testServer = http.createServer();
    testServer.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        log({
          component: "bootstrap.server",
          level: "error",
          event: "port_check_failed",
          port,
          host,
          error: `Port ${port} is already in use`,
        });
        resolve({ ok: false, error: `Port ${port} in use` });
      } else {
        log({
          component: "bootstrap.server",
          level: "error",
          event: "port_check_failed",
          port,
          host,
          error: err.message,
        });
        resolve({ ok: false, error: err.message });
      }
    });

    testServer.listen(port, host, () => {
      testServer.close(() => {
        log({
          component: "bootstrap.server",
          level: "info",
          event: "port_check_passed",
          port,
          host,
        });
        resolve({ ok: true });
      });
    });
  });
}

/**
 * Check that config enforces local-only binding (Story 9.1).
 * Returns { ok: boolean, error?: string }
 */
function checkLocalOnlyBinding(config) {
  const bindHost = config.server_bind_host || "127.0.0.1";
  if (bindHost !== "127.0.0.1") {
    const error = `Non-local binding detected: server_bind_host="${bindHost}" (must be "127.0.0.1" per Story 9.1)`;
    log({
      component: "bootstrap.server",
      level: "error",
      event: "local_only_enforcement_failed",
      error,
    });
    return { ok: false, error };
  }
  return { ok: true };
}

/**
 * Spawn MCP server as a child process (stdio-based).
 * MCP server is non-critical; if it fails to start, we log a warning and continue.
 */
async function spawnMcpServer(config) {
  const vaultDir = config.vault_dir || process.env.VAULT_DIR;

  if (!vaultDir || !fs.existsSync(vaultDir)) {
    log({
      component: "bootstrap.mcp",
      level: "warn",
      event: "mcp_startup_skipped",
      reason: "vault_directory_missing_or_not_configured",
    });
    return null;
  }

  try {
    const mcpPath = path.join(__dirname, "..", "vault", "mcp-server.js");
    if (!fs.existsSync(mcpPath)) {
      log({
        component: "bootstrap.mcp",
        level: "warn",
        event: "mcp_startup_skipped",
        reason: "mcp_server_not_found",
        path: mcpPath,
      });
      return null;
    }

    const proc = spawn("node", [mcpPath], {
      cwd: path.join(__dirname, ".."),
      stdio: ["ignore", "pipe", "pipe"],
    });

    log({
      component: "bootstrap.mcp",
      level: "info",
      event: "mcp_server_started",
      pid: proc.pid,
    });

    // Forward MCP server stdout/stderr to our logs as structured JSON
    proc.stdout?.on("data", (data) => {
      const lines = data.toString().split("\n").filter((l) => l.trim());
      lines.forEach((line) => {
        try {
          const parsed = JSON.parse(line);
          log({ component: "bootstrap.mcp", ...parsed });
        } catch {
          log({
            component: "bootstrap.mcp",
            level: "info",
            event: "mcp_stdout",
            message: line,
          });
        }
      });
    });

    proc.stderr?.on("data", (data) => {
      log({
        component: "bootstrap.mcp",
        level: "warn",
        event: "mcp_stderr",
        message: data.toString(),
      });
    });

    proc.on("error", (err) => {
      log({
        component: "bootstrap.mcp",
        level: "error",
        event: "mcp_process_error",
        error: err.message,
        pid: proc.pid,
      });
    });

    proc.on("exit", (code, signal) => {
      log({
        component: "bootstrap.mcp",
        level: "warn",
        event: "mcp_process_exited",
        code,
        signal,
        pid: proc.pid,
      });
    });

    return proc;
  } catch (err) {
    log({
      component: "bootstrap.mcp",
      level: "warn",
      event: "mcp_startup_failed",
      error: err.message,
    });
    return null;
  }
}

/**
 * Graceful shutdown: close server and terminate MCP process.
 */
function shutdown(signal) {
  log({
    component: "bootstrap",
    level: "info",
    event: "shutdown_started",
    signal,
  });

  if (mcpProcess && !mcpProcess.killed) {
    mcpProcess.kill("SIGTERM");
    log({
      component: "bootstrap.mcp",
      level: "info",
      event: "mcp_server_killed",
      pid: mcpProcess.pid,
      signal: "SIGTERM",
    });
  }

  if (server) {
    server.close(() => {
      log({
        component: "bootstrap",
        level: "info",
        event: "shutdown_completed",
        duration_ms: Date.now() - bootStartTime,
      });
      process.exit(0);
    });

    // Force exit after 5 seconds if graceful close takes too long
    setTimeout(() => {
      log({
        component: "bootstrap",
        level: "warn",
        event: "graceful_shutdown_timeout",
        timeout_ms: 5000,
      });
      process.exit(1);
    }, 5000);
  } else {
    process.exit(0);
  }
}

/**
 * Main bootstrap orchestration.
 */
async function bootstrap() {
  try {
    // Step 0: Load config
    const { buildConfig } = require("./config");
    const config = buildConfig();

    log({
      component: "bootstrap",
      level: "info",
      event: "boot_started",
      details: {
        node_version: process.version,
        config_source: "params.json",
      },
    });

    // Step 1: Verify local-only binding configuration
    const bindingCheck = checkLocalOnlyBinding(config);
    if (!bindingCheck.ok) {
      log({
        component: "bootstrap",
        level: "error",
        event: "bootstrap_failed",
        error: bindingCheck.error,
      });
      process.exit(1);
    }

    // Step 2: Check Ollama reachability
    const ollamaCheck = await checkOllama(config);
    if (!ollamaCheck.ok) {
      log({
        component: "bootstrap",
        level: "error",
        event: "bootstrap_failed",
        error: "Ollama service unreachable",
      });
      process.exit(1);
    }

    // Step 3: Check Node.js port availability
    const portCheck = await checkPort(config.port || 3000, config.server_bind_host || "127.0.0.1");
    if (!portCheck.ok) {
      log({
        component: "bootstrap",
        level: "error",
        event: "bootstrap_failed",
        error: portCheck.error,
      });
      process.exit(1);
    }

    // Step 4: Initialize Express app
    app = require("./index.js");
    log({
      component: "bootstrap",
      level: "info",
      event: "express_app_initialized",
    });

    // Step 5: Spawn MCP server (non-blocking)
    mcpProcess = await spawnMcpServer(config);

    // Step 6: Start listening
    const listenHost = config.server_bind_host || "127.0.0.1";
    const listenPort = config.port || 3000;
    server = app.listen(listenPort, listenHost, () => {
      log({
        component: "bootstrap.server",
        level: "info",
        event: "server_listening",
        port: listenPort,
        bind_host: listenHost,
        url: `http://${listenHost}:${listenPort}`,
      });

      const totalDuration = Date.now() - bootStartTime;
      log({
        component: "bootstrap",
        level: "info",
        event: "boot_completed",
        duration_ms: totalDuration,
      });
    });

    // Step 7: Graceful shutdown handlers
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    log({
      component: "bootstrap",
      level: "error",
      event: "bootstrap_failed",
      error: err.message,
    });
    process.exit(1);
  }
}

// Start the bootstrap sequence
bootstrap();
