const fs = require("fs");
const path = require("path");

const PARAMS_FILE = process.env.FOURTHBRAIN_PARAMS_FILE
  ? path.resolve(process.env.FOURTHBRAIN_PARAMS_FILE)
  : path.join(__dirname, "..", "params.json");

function loadParams() {
  const raw = fs.readFileSync(PARAMS_FILE, "utf-8");
  return JSON.parse(raw);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function buildConfig() {
  // Fail-loud guard: if running under test harness, isolation env vars must be present
  if (process.env.FOURTHBRAIN_TEST_HARNESS) {
    if (!process.env.FOURTHBRAIN_PARAMS_FILE || !process.env.FOURTHBRAIN_DB_PATH) {
      throw new Error(
        "Test harness marker detected (FOURTHBRAIN_TEST_HARNESS=1) but isolation env vars are missing. " +
        "Both FOURTHBRAIN_PARAMS_FILE and FOURTHBRAIN_DB_PATH must be set to protect the real vault/DB."
      );
    }
  }

  const params = loadParams();

  const rawDir = params.raw_dir;
  const rawDirInbox = path.join(rawDir, "inbox");
  const rawDirClipping = path.join(rawDir, "clipping");
  const tmpDir = rawDirInbox; // TMP_DIR alias per the plan
  const vaultIncomingDir = path.join(params.vault_dir, "incoming");
  const vaultRawDir = path.join(params.vault_dir, "raw");
  ensureDir(rawDirInbox);
  ensureDir(rawDirClipping);
  ensureDir(vaultIncomingDir);
  ensureDir(vaultRawDir);

  return {
    vaultDir: params.vault_dir,
    vaultIncomingDir,
    vaultRawDir,
    smartEnvDir: params.smart_env_dir,
    rawDir,
    rawDirInbox,
    rawDirClipping,
    tmpDir,
    port: process.env.FOURTHBRAIN_PORT_OVERRIDE
      ? Number(process.env.FOURTHBRAIN_PORT_OVERRIDE)
      : params.server_port,
    bindHost: params.server_bind_host,
    ollamaBaseUrl: params.ollama_base_url,
    ollamaChatModel: params.ollama_chat_model,
    threadCount: params.thread_count ?? 1,
    jobPollIntervalMs: params.job_poll_interval_ms ?? 5000,
    logLevel: (params.log_level || "info").toLowerCase(),
    smartConnectionsPollIntervalMs: params.smart_connections_poll_interval_ms ?? 3000,
    smartConnectionsPollTimeoutMs: params.smart_connections_poll_timeout_ms ?? 60000,
  };
}

async function checkOllamaReachable(config) {
  try {
    const res = await fetch(config.ollamaBaseUrl.replace(/\/v1\/?$/, "") + "/api/tags");
    return res.ok;
  } catch (err) {
    return false;
  }
}

module.exports = { buildConfig, checkOllamaReachable };
