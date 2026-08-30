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

  for (const dir of [rawDirInbox, rawDirClipping, vaultDirIncoming]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return {
    _root: root,
    vaultDir,
    vaultDirIncoming,
    rawDir,
    rawDirInbox,
    rawDirClipping,
  };
}

function cleanupTestCfg(cfg) {
  fs.rmSync(cfg._root, { recursive: true, force: true });
}

module.exports = { createTestCfg, cleanupTestCfg };
