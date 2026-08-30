const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { createTestDb } = require("../../server/test/helpers/test-db");
const { createTestCfg, cleanupTestCfg } = require("../../server/test/helpers/test-cfg");
const { createRepositories } = require("../../server/lib/repositories");
const { createIngestJob } = require("../../server/lib/ingest-service");
const { runCycle } = require("../worker");

function silentLog() {}

test("end-to-end: a New ingest job for a markdown file is completed by one sweep", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const sourcePath = path.join(cfg.rawDirInbox, "note.md");
    fs.writeFileSync(sourcePath, "# Hello\n\nBody.");
    const jobId = createIngestJob(db, { name: "note.md", uriLocation: sourcePath, mimeType: "text/markdown", charset: "utf-8", tags: null });

    const summary = runCycle(db, cfg, { log: silentLog });

    assert.equal(summary.attempted, 1);
    assert.equal(summary.completed, 1);
    assert.equal(summary.failed, 0);

    const repos = createRepositories(db);
    const job = repos.job.get(jobId);
    assert.equal(job.status, "Completed");
    assert.ok(job.start_date);
    assert.ok(job.end_date);

    const doc = repos.document.get(job.document_id);
    assert.equal(doc.status, "Processing");
    assert.ok(fs.existsSync(doc.uri_location));
    assert.equal(fs.readFileSync(doc.uri_location, "utf-8"), "# Hello\n\nBody.");
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("a job whose file needs transcoding (no executor yet) is skipped, not failed", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const sourcePath = path.join(cfg.rawDirInbox, "scan.pdf");
    fs.writeFileSync(sourcePath, "%PDF-1.4 fake content");
    const jobId = createIngestJob(db, { name: "scan.pdf", uriLocation: sourcePath, mimeType: "application/pdf", charset: null, tags: null });

    const summary = runCycle(db, cfg, { log: silentLog });

    assert.equal(summary.attempted, 0);
    assert.equal(summary.skipped, 1);
    assert.equal(summary.failed, 0);

    const repos = createRepositories(db);
    const job = repos.job.get(jobId);
    assert.equal(job.status, "New", "should remain New — not stranded in Running, not wrongly marked Failed");
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("a job whose source file has since been deleted is marked Failed, not left Running", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const sourcePath = path.join(cfg.rawDirInbox, "gone.md");
    fs.writeFileSync(sourcePath, "temporary");
    const jobId = createIngestJob(db, { name: "gone.md", uriLocation: sourcePath, mimeType: "text/markdown", charset: "utf-8", tags: null });
    fs.unlinkSync(sourcePath); // simulate the file vanishing between staging and the sweep

    const summary = runCycle(db, cfg, { log: silentLog });

    assert.equal(summary.attempted, 1);
    assert.equal(summary.failed, 1);
    assert.equal(summary.completed, 0);

    const repos = createRepositories(db);
    const job = repos.job.get(jobId);
    assert.equal(job.status, "Failed");
    assert.ok(job.end_date);
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("processes multiple pending jobs in one sweep, respecting jobLimit", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    for (let i = 0; i < 3; i++) {
      const p = path.join(cfg.rawDirInbox, `note-${i}.md`);
      fs.writeFileSync(p, `note ${i}`);
      createIngestJob(db, { name: `note-${i}.md`, uriLocation: p, mimeType: "text/markdown", charset: "utf-8", tags: null });
    }

    const summary = runCycle(db, cfg, { jobLimit: 2, log: silentLog });
    assert.equal(summary.attempted, 2, "jobLimit should cap this sweep to 2 jobs");

    const repos = createRepositories(db);
    const stillNew = repos.job.listByStatus("New");
    assert.equal(stillNew.length, 1, "the third job should remain for the next sweep");
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("runs orphan cleanup as part of the sweep", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const repos = createRepositories(db);
    const orphan = repos.job.create("ingest", "New", null, null);
    repos.job.markRunning(orphan.id);
    db.prepare("UPDATE job SET start_date = ? WHERE id = ?").run("2000-01-01T00:00:00.000Z", orphan.id);

    const summary = runCycle(db, cfg, { log: silentLog });
    assert.equal(summary.orphanedJobsFailed, 1);

    const reloaded = repos.job.get(orphan.id);
    assert.equal(reloaded.status, "Failed");
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("an empty queue is a no-op sweep, not an error", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const summary = runCycle(db, cfg, { log: silentLog });
    assert.deepEqual(summary, { attempted: 0, completed: 0, failed: 0, skipped: 0, orphanedJobsFailed: 0, staleLocksCleared: 0 });
  } finally {
    cleanupTestCfg(cfg);
  }
});
