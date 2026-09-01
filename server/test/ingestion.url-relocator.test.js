const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { createTestCfg, cleanupTestCfg } = require("./helpers/test-cfg");
const { relocateToClipping } = require("../lib/ingestion/url-relocator");

test("relocateToClipping moves a staged file from $RAW_DIR/inbox into $RAW_DIR/clipping", () => {
  const cfg = createTestCfg();
  try {
    const sourcePath = path.join(cfg.rawDirInbox, "https-example-com.txt");
    fs.writeFileSync(sourcePath, "https://example.com/article", "utf-8");

    const destPath = relocateToClipping({ name: "https-example-com.txt", path: sourcePath }, cfg);

    assert.equal(destPath, path.join(cfg.rawDirClipping, "https-example-com.txt"));
    assert.ok(fs.existsSync(destPath));
    assert.ok(!fs.existsSync(sourcePath), "source should be moved, not copied — no duplicate left behind in inbox");
    assert.equal(fs.readFileSync(destPath, "utf-8"), "https://example.com/article");
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("relocateToClipping resolves a name collision instead of overwriting", () => {
  const cfg = createTestCfg();
  try {
    fs.writeFileSync(path.join(cfg.rawDirClipping, "link.txt"), "existing", "utf-8");
    const sourcePath = path.join(cfg.rawDirInbox, "link.txt");
    fs.writeFileSync(sourcePath, "new one", "utf-8");

    const destPath = relocateToClipping({ name: "link.txt", path: sourcePath }, cfg);

    assert.equal(destPath, path.join(cfg.rawDirClipping, "link-2.txt"));
    assert.equal(fs.readFileSync(path.join(cfg.rawDirClipping, "link.txt"), "utf-8"), "existing", "the pre-existing clipping must be untouched");
    assert.equal(fs.readFileSync(destPath, "utf-8"), "new one");
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("relocateToClipping is a no-op if the file is already inside rawDirClipping", () => {
  const cfg = createTestCfg();
  try {
    const alreadyThere = path.join(cfg.rawDirClipping, "already.txt");
    fs.writeFileSync(alreadyThere, "content", "utf-8");

    const destPath = relocateToClipping({ name: "already.txt", path: alreadyThere }, cfg);

    assert.equal(destPath, alreadyThere);
    assert.ok(fs.existsSync(alreadyThere));
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("relocateToClipping throws if the source file does not exist", () => {
  const cfg = createTestCfg();
  try {
    const missing = path.join(cfg.rawDirInbox, "missing.txt");
    assert.throws(() => relocateToClipping({ name: "missing.txt", path: missing }, cfg), /does not exist/);
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("relocateToClipping throws if job_file has no path", () => {
  const cfg = createTestCfg();
  try {
    assert.throws(() => relocateToClipping({ name: "x.txt" }, cfg), /no path to relocate/);
    assert.throws(() => relocateToClipping(null, cfg), /no path to relocate/);
  } finally {
    cleanupTestCfg(cfg);
  }
});
