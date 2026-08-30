const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { resolveDestination } = require("../lib/ingestion/path-resolver");
const { createTestCfg, cleanupTestCfg } = require("./helpers/test-cfg");

test("resolves a plain destination when there's no collision", () => {
  const cfg = createTestCfg();
  try {
    const dest = resolveDestination(cfg.vaultDirIncoming, "note.md");
    assert.equal(dest, path.join(cfg.vaultDirIncoming, "note.md"));
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("appends -2, -3, ... on collision instead of overwriting", () => {
  const cfg = createTestCfg();
  try {
    fs.writeFileSync(path.join(cfg.vaultDirIncoming, "note.md"), "first");
    fs.writeFileSync(path.join(cfg.vaultDirIncoming, "note-2.md"), "second");

    const dest = resolveDestination(cfg.vaultDirIncoming, "note.md");
    assert.equal(dest, path.join(cfg.vaultDirIncoming, "note-3.md"));
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("strips directory components from the desired name (path traversal protection)", () => {
  const cfg = createTestCfg();
  try {
    const dest = resolveDestination(cfg.vaultDirIncoming, "../../etc/passwd");
    assert.equal(dest, path.join(cfg.vaultDirIncoming, "passwd"));
    assert.ok(dest.startsWith(cfg.vaultDirIncoming));
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("rejects an empty or dot-only desired name", () => {
  const cfg = createTestCfg();
  try {
    assert.throws(() => resolveDestination(cfg.vaultDirIncoming, ""));
    assert.throws(() => resolveDestination(cfg.vaultDirIncoming, "."));
    assert.throws(() => resolveDestination(cfg.vaultDirIncoming, ".."));
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("a file with no extension still gets a usable collision suffix", () => {
  const cfg = createTestCfg();
  try {
    fs.writeFileSync(path.join(cfg.vaultDirIncoming, "README"), "x");
    const dest = resolveDestination(cfg.vaultDirIncoming, "README");
    assert.equal(dest, path.join(cfg.vaultDirIncoming, "README-2"));
  } finally {
    cleanupTestCfg(cfg);
  }
});
