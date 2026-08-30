const fs = require("fs");
const path = require("path");

const PARAMS_FILE = path.join(__dirname, "..", "params.json");

function loadParams() {
  const raw = fs.readFileSync(PARAMS_FILE, "utf-8");
  return JSON.parse(raw);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function buildConfig() {
  const params = loadParams();

  const rawDir = params.raw_dir;
  const rawDirInbox = path.join(rawDir, "inbox");
  const rawDirClipping = path.join(rawDir, "clipping");
  const vaultDirIncoming = path.join(params.vault_dir, "incoming");
  ensureDir(rawDirInbox);
  ensureDir(rawDirClipping);
  ensureDir(vaultDirIncoming);

  return {
    vaultDir: params.vault_dir,
    vaultDirIncoming,
    smartEnvDir: params.smart_env_dir,
    rawDir,
    rawDirInbox,
    rawDirClipping,
    port: params.server_port,
    bindHost: params.server_bind_host,
    ollamaBaseUrl: params.ollama_base_url,
    ollamaChatModel: params.ollama_chat_model,
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
