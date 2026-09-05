const fs = require("fs");
const os = require("os");
const path = require("path");

/** Builds a cfg object shaped like server/config.js's buildConfig() output,
 *  but rooted in a fresh temp directory instead of the real params.json
 *  (which points at a Windows path that doesn't exist on this host). Call
 *  cleanupTestCfg() in a test's `after` hook. */
function createTestCfg() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "4thbrain-test-"));
  const rawDir = path.join(root, "raw");
  const rawDirInbox = path.join(rawDir, "inbox");
  const rawDirClipping = path.join(rawDir, "clipping");
  const vaultDir = path.join(root, "vault");
  const vaultDirIncoming = path.join(vaultDir, "incoming");
  const vaultDirRaw = path.join(vaultDir, "raw");

  for (const dir of [rawDirInbox, rawDirClipping, vaultDirIncoming, vaultDirRaw]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return {
    _root: root,
    vaultDir,
    vaultDirIncoming,
    vaultDirRaw,
    rawDir,
    rawDirInbox,
    rawDirClipping,
    // Uppercase versions (for params.json-style access)
    VAULT_DIR: vaultDir,
    VAULT_INCOMMING: vaultDirIncoming,
    VAULT_RAW: vaultDirRaw,
    DOCUMENT_ROOT: vaultDir,
    TMP_DIR: path.join(root, "tmp"),
    // Ollama config for tests
    ollamaBaseUrl: "http://localhost:11434/v1",
    ollamaChatModel: "llama3.2:3b",
  };
}

function cleanupTestCfg(cfg) {
  fs.rmSync(cfg._root, { recursive: true, force: true });
}

module.exports = { createTestCfg, cleanupTestCfg };
