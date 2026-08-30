const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { createTestDb } = require("./helpers/test-db");
const { createTestCfg, cleanupTestCfg } = require("./helpers/test-cfg");
const { createWatcher } = require("../lib/ingestion/watcher");
const { createIngestJob } = require("../lib/ingest-service");

function waitUntil(conditionFn, { timeoutMs = 5000, intervalMs = 25 } = {}) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (conditionFn()) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error("waitUntil: timed out waiting for condition"));
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}

function waitForReady(watcher) {
  return new Promise((resolve) => watcher._chokidar.on("ready", resolve));
}

test("watcher registers a job for a file dropped directly into rawDirInbox", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  const created = [];
  const watcher = createWatcher(cfg, db, { onJobCreated: (jobId, filePath) => created.push({ jobId, filePath }) });
  try {
    await waitForReady(watcher);

    const filePath = path.join(cfg.rawDirInbox, "dropped.md");
    fs.writeFileSync(filePath, "# Dropped note");

    await waitUntil(() => created.length === 1);
    assert.equal(created[0].filePath, filePath);

    const jobFile = db.prepare("SELECT * FROM job_file WHERE job_id = ?").get(created[0].jobId);
    assert.equal(jobFile.path, filePath);
  } finally {
    watcher.close();
    cleanupTestCfg(cfg);
  }
});

test("watcher picks up a file that was already sitting in rawDirInbox before it started", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  const filePath = path.join(cfg.rawDirInbox, "preexisting.txt");
  fs.writeFileSync(filePath, "already here");

  const created = [];
  const watcher = createWatcher(cfg, db, { onJobCreated: (jobId, fp) => created.push({ jobId, filePath: fp }) });
  try {
    await waitUntil(() => created.length === 1);
    assert.equal(created[0].filePath, filePath);
  } finally {
    watcher.close();
    cleanupTestCfg(cfg);
  }
});

test("watcher does NOT double-register a file the web form already staged (dedup via job_file.findByPath)", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();

  // Simulate what routes/ingest.js does: raw-dir-writer stages the file,
  // then ingest-service registers it synchronously — before the watcher
  // ever sees the filesystem event.
  const filePath = path.join(cfg.rawDirInbox, "from-web-form.txt");
  fs.writeFileSync(filePath, "submitted via the form");
  const originalJobId = createIngestJob(db, { name: "from-web-form.txt", uriLocation: filePath, mimeType: "text/plain", charset: "utf-8", tags: null });

  const created = [];
  const skipped = [];
  const watcher = createWatcher(cfg, db, {
    onJobCreated: (jobId, fp) => created.push({ jobId, filePath: fp }),
    onSkipped: (fp, reason) => skipped.push({ filePath: fp, reason }),
  });
  try {
    await waitForReady(watcher);
    await waitUntil(() => skipped.length === 1, { timeoutMs: 2000 }).catch(() => {}); // best-effort — the file was seen during initial scan

    assert.equal(created.length, 0, "the watcher must not create a second job for an already-tracked file");

    const jobCount = db.prepare("SELECT COUNT(*) as c FROM job").get().c;
    assert.equal(jobCount, 1, "only the original web-form job should exist");

    const fileCount = db.prepare("SELECT COUNT(*) as c FROM job_file WHERE path = ?").get(filePath).c;
    assert.equal(fileCount, 1);
  } finally {
    watcher.close();
    cleanupTestCfg(cfg);
  }
});

test("close() stops the watcher from reacting to further files", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  const created = [];
  const watcher = createWatcher(cfg, db, { onJobCreated: (jobId, fp) => created.push(fp) });
  await waitForReady(watcher);
  await watcher.close();

  fs.writeFileSync(path.join(cfg.rawDirInbox, "after-close.txt"), "should be ignored");
  await new Promise((r) => setTimeout(r, 400)); // give a closed watcher a chance to misbehave, if it were going to

  assert.equal(created.length, 0);
  cleanupTestCfg(cfg);
});
