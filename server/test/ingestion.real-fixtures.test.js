const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createTestDb } = require("./helpers/test-db");
const { createTestCfg, cleanupTestCfg } = require("./helpers/test-cfg");
const { createWatcher } = require("../lib/ingestion/watcher");
const { createRepositories } = require("../lib/repositories");
const ingestExecutor = require("../lib/ingestion/ingest-executor");

// Fixtures under server/test/fixtures/ are byte-for-byte copies of real files
// already produced/consumed by this repository (a real story doc with real
// YAML frontmatter, a real plaintext process note, and a real rendered HTML
// sample from the UI style exploration) — not synthetic "hello world"
// strings. The point of this file is to exercise Story 1.1's actual pipeline
// (watcher -> ingest-executor -> vault-writer) against content that looks
// like what this project really ingests, closing the real-sample gap flagged
// in documets/PLAN-30-08-2026-EP1-Completion.md's Story 1.1 section.
const FIXTURES_DIR = path.join(__dirname, "fixtures");

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

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

/**
 * Drives one real fixture file through the full Story 1.1 pipeline the same
 * way it would happen outside the web form: the watcher notices it appear in
 * $RAW_DIR/inbox, registers a job, and the ingest executor copies it
 * byte-for-byte into $VAULT_DIR/incoming.
 */
async function runFixtureThroughPipeline(db, cfg, fixtureFileName) {
  const fixturePath = path.join(FIXTURES_DIR, fixtureFileName);
  const originalBytes = fs.readFileSync(fixturePath);

  const stagedPath = path.join(cfg.rawDirInbox, fixtureFileName);
  const created = [];
  const watcher = createWatcher(cfg, db, { onJobCreated: (jobId, filePath) => created.push({ jobId, filePath }) });
  try {
    await waitForReady(watcher);
    fs.copyFileSync(fixturePath, stagedPath);
    await waitUntil(() => created.length === 1);
  } finally {
    watcher.close();
  }

  const repos = createRepositories(db);
  const job = repos.job.get(created[0].jobId);
  assert.equal(
    ingestExecutor.canHandle(db, job),
    true,
    `watcher-created job for real fixture ${fixtureFileName} should be handled by Story 1.1's ingest executor`
  );

  const result = ingestExecutor.execute(db, job, cfg);
  const destBytes = fs.readFileSync(result.destPath);

  return { originalBytes, destBytes, destPath: result.destPath, job, repos };
}

test("real story-1.1.md fixture (actual YAML frontmatter from this repo) survives watcher -> ingest-executor byte-for-byte", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const { originalBytes, destBytes, destPath, job, repos } = await runFixtureThroughPipeline(db, cfg, "story-1.1-sample.md");

    assert.equal(destPath, path.join(cfg.vaultDirIncoming, "story-1.1-sample.md"));
    assert.equal(sha256(destBytes), sha256(originalBytes), "vault copy must be byte-for-byte identical to the real fixture");

    const content = destBytes.toString("utf-8");
    assert.match(content, /^---\r?\nname: story-1\.1\r?\n/, "real YAML frontmatter delimiter/fields must survive the copy unmodified");
    assert.match(content, /description: Working notes for Story 1\.1 - Direct Structured Vault Ingestion/);
    assert.match(content, /metadata:\r?\n {2}version: 2\.0/);
    assert.match(content, /## Status/, "real body content past the frontmatter must survive too");

    const doc = repos.document.get(job.document_id);
    assert.equal(doc.status, "Processing");
    assert.equal(doc.uri_location, destPath);

    const [jobFile] = repos.job_file.listForJob(job.id);
    assert.equal(jobFile.status, "filed");
    assert.equal(jobFile.path, destPath);
    assert.equal(jobFile.mime_type, "text/markdown", "watcher should classify the real .md fixture via mime-types");
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("real OriginalProcess.txt fixture (actual plaintext doc from this repo) survives watcher -> ingest-executor byte-for-byte", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const { originalBytes, destBytes, destPath, job, repos } = await runFixtureThroughPipeline(db, cfg, "original-process-sample.txt");

    assert.equal(destPath, path.join(cfg.vaultDirIncoming, "original-process-sample.txt"));
    assert.equal(sha256(destBytes), sha256(originalBytes), "vault copy must be byte-for-byte identical to the real fixture");

    const content = destBytes.toString("utf-8");
    assert.match(content, /1\. Ingestion & Initial Routing/);
    assert.match(content, /WebClipper fetches external content/);
    assert.match(content, /5\. Classification & Final Storage/);

    const doc = repos.document.get(job.document_id);
    assert.equal(doc.status, "Processing");
    assert.equal(doc.uri_location, destPath);

    const [jobFile] = repos.job_file.listForJob(job.id);
    assert.equal(jobFile.status, "filed");
    assert.equal(jobFile.path, destPath);
    assert.equal(jobFile.mime_type, "text/plain", "watcher should classify the real .txt fixture via mime-types");
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("real styles/claude-style/sample-v1.html fixture (actual rendered HTML from this repo) survives watcher -> ingest-executor byte-for-byte", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const { originalBytes, destBytes, destPath, job, repos } = await runFixtureThroughPipeline(db, cfg, "claude-style-sample.html");

    assert.equal(destPath, path.join(cfg.vaultDirIncoming, "claude-style-sample.html"));
    assert.equal(sha256(destBytes), sha256(originalBytes), "vault copy must be byte-for-byte identical to the real fixture");

    const content = destBytes.toString("utf-8");
    assert.match(content, /^<!DOCTYPE html>/, "real doctype must survive the copy unmodified");
    assert.match(content, /<title>Claude\.ai-inspired — Chat Sample<\/title>/);
    assert.match(content, /--coral: #c96442;/, "real embedded CSS from the style sample must survive, not just the markup shell");

    const doc = repos.document.get(job.document_id);
    assert.equal(doc.status, "Processing");
    assert.equal(doc.uri_location, destPath);

    const [jobFile] = repos.job_file.listForJob(job.id);
    assert.equal(jobFile.status, "filed");
    assert.equal(jobFile.path, destPath);
    assert.equal(jobFile.mime_type, "text/html", "watcher should classify the real .html fixture via mime-types");
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("all three real fixture types land in vault/incoming independently in one run, correct document/job rows per file", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  const fixtures = ["story-1.1-sample.md", "original-process-sample.txt", "claude-style-sample.html"];
  const created = [];
  const watcher = createWatcher(cfg, db, { onJobCreated: (jobId, filePath) => created.push({ jobId, filePath }) });
  try {
    await waitForReady(watcher);

    for (const fixtureFileName of fixtures) {
      fs.copyFileSync(path.join(FIXTURES_DIR, fixtureFileName), path.join(cfg.rawDirInbox, fixtureFileName));
    }
    await waitUntil(() => created.length === fixtures.length);

    const repos = createRepositories(db);
    const destPaths = new Set();
    for (const { jobId } of created) {
      const job = repos.job.get(jobId);
      const result = ingestExecutor.execute(db, job, cfg);
      destPaths.add(result.destPath);

      const originalBytes = fs.readFileSync(path.join(FIXTURES_DIR, path.basename(result.destPath)));
      const destBytes = fs.readFileSync(result.destPath);
      assert.equal(sha256(destBytes), sha256(originalBytes), `${path.basename(result.destPath)} must survive byte-for-byte alongside the other real fixtures`);
    }

    assert.equal(destPaths.size, fixtures.length, "each real fixture should land at its own distinct path, no collisions");

    const documentCount = db.prepare("SELECT COUNT(*) as c FROM document").get().c;
    const jobCount = db.prepare("SELECT COUNT(*) as c FROM job").get().c;
    const filedCount = db.prepare("SELECT COUNT(*) as c FROM job_file WHERE status = 'filed'").get().c;
    assert.equal(documentCount, fixtures.length);
    assert.equal(jobCount, fixtures.length);
    assert.equal(filedCount, fixtures.length);
  } finally {
    watcher.close();
    cleanupTestCfg(cfg);
  }
});
