const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { copyToVaultIncoming } = require("../lib/ingestion/vault-writer");
const { createTestCfg, cleanupTestCfg } = require("./helpers/test-cfg");

test("copies file content byte-for-byte, including frontmatter, unmodified", () => {
  const cfg = createTestCfg();
  try {
    const content = "---\ntitle: Test Note\ntags: [a, b]\n---\n\n# Heading\n\nBody text with weird chars: café, 日本語, \t tabs.\n";
    const sourcePath = path.join(cfg.rawDirInbox, "note.md");
    fs.writeFileSync(sourcePath, content, "utf-8");

    const destPath = copyToVaultIncoming(sourcePath, cfg, "note.md");

    assert.equal(destPath, path.join(cfg.vaultDirIncoming, "note.md"));
    assert.equal(fs.readFileSync(destPath, "utf-8"), content);
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("throws if the source file doesn't exist", () => {
  const cfg = createTestCfg();
  try {
    assert.throws(() => copyToVaultIncoming(path.join(cfg.rawDirInbox, "missing.md"), cfg, "missing.md"), /source file does not exist/);
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("a second file with the same desired name lands alongside the first, not overwriting it", () => {
  const cfg = createTestCfg();
  try {
    const src1 = path.join(cfg.rawDirInbox, "a.txt");
    const src2 = path.join(cfg.rawDirInbox, "b.txt");
    fs.writeFileSync(src1, "first content");
    fs.writeFileSync(src2, "second content");

    const dest1 = copyToVaultIncoming(src1, cfg, "note.txt");
    const dest2 = copyToVaultIncoming(src2, cfg, "note.txt");

    assert.notEqual(dest1, dest2);
    assert.equal(fs.readFileSync(dest1, "utf-8"), "first content");
    assert.equal(fs.readFileSync(dest2, "utf-8"), "second content");
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("preserves binary content exactly (not just text)", () => {
  const cfg = createTestCfg();
  try {
    const bytes = Buffer.from([0x00, 0xff, 0x10, 0x8a, 0x00, 0x01]);
    const sourcePath = path.join(cfg.rawDirInbox, "blob.dat");
    fs.writeFileSync(sourcePath, bytes);

    const destPath = copyToVaultIncoming(sourcePath, cfg, "blob.dat");
    assert.deepEqual(fs.readFileSync(destPath), bytes);
  } finally {
    cleanupTestCfg(cfg);
  }
});
