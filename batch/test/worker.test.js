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

test("end-to-end: a New ingest job for a markdown file is completed by one sweep", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const sourcePath = path.join(cfg.rawDirInbox, "note.md");
    fs.writeFileSync(sourcePath, "# Hello\n\nBody.");
    const jobId = createIngestJob(db, { name: "note.md", uriLocation: sourcePath, mimeType: "text/markdown", charset: "utf-8", tags: null });

    const summary = await runCycle(db, cfg, { log: silentLog });

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

// Story 1.2: a PDF now gets job_type 'convert' at creation (ingest-service.js
// classifies via file-validator) and transcode-executor.js handles it — it no
// longer sits stuck as an 'ingest' job nothing can claim. See
// ingestion.transcode-executor.test.js for the transcoding behavior itself;
// this is just the end-to-end wiring through one worker sweep.
test("end-to-end: a New convert job for a PDF is completed by one sweep (Story 1.2)", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const sourcePath = path.join(cfg.rawDirInbox, "scan.pdf");
    fs.writeFileSync(sourcePath, "%PDF-1.4 fake content, not a real PDF");
    const jobId = createIngestJob(db, { name: "scan.pdf", uriLocation: sourcePath, mimeType: "application/pdf", charset: null, tags: null });

    const repos = createRepositories(db);
    assert.equal(repos.job.get(jobId).job_type, "convert", "a non-indexable MIME type should be queued as 'convert', not 'ingest'");

    const summary = await runCycle(db, cfg, { log: silentLog });

    // pdf-parse can't extract text from this fake fixture, so transcode-executor
    // falls back to its archive-only strategy — job still completes, it just
    // doesn't produce extracted text (see transcode-executor.test.js for the
    // real-PDF-text-extraction case).
    assert.equal(summary.attempted, 1);
    assert.equal(summary.completed, 1);
    assert.equal(summary.failed, 0);

    const job = repos.job.get(jobId);
    assert.equal(job.status, "Completed");

    const doc = repos.document.get(job.document_id);
    assert.equal(doc.status, "Processing");
    assert.ok(fs.existsSync(doc.uri_location), "transcoded output should exist in $VAULT_DIR/incoming");
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("a convert job with no job_file record is skipped, not failed (canHandle guards against missing files)", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const repos = createRepositories(db);
    const job = repos.job.create("convert", "New", null, null); // no job_file attached

    const summary = await runCycle(db, cfg, { log: silentLog });

    assert.equal(summary.attempted, 0);
    assert.equal(summary.skipped, 1);
    assert.equal(summary.failed, 0);

    const reloaded = repos.job.get(job.id);
    assert.equal(reloaded.status, "New", "should remain New — not stranded in Running, not wrongly marked Failed");
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("a job whose job_type has no registered executor at all is left untouched", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const repos = createRepositories(db);
    const job = repos.job.create("classify", "New", null, null); // Story 2.1 — no executor registered yet

    const summary = await runCycle(db, cfg, { log: silentLog });

    // Not even fetched as "pending" — 'classify' isn't a key in registeredExecutors.
    assert.equal(summary.attempted, 0);
    assert.equal(summary.skipped, 0);

    const reloaded = repos.job.get(job.id);
    assert.equal(reloaded.status, "New");
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("a job whose source file has since been deleted is marked Failed, not left Running", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const sourcePath = path.join(cfg.rawDirInbox, "gone.md");
    fs.writeFileSync(sourcePath, "temporary");
    const jobId = createIngestJob(db, { name: "gone.md", uriLocation: sourcePath, mimeType: "text/markdown", charset: "utf-8", tags: null });
    fs.unlinkSync(sourcePath); // simulate the file vanishing between staging and the sweep

    const summary = await runCycle(db, cfg, { log: silentLog });

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

test("processes multiple pending jobs in one sweep, respecting jobLimit", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    for (let i = 0; i < 3; i++) {
      const p = path.join(cfg.rawDirInbox, `note-${i}.md`);
      fs.writeFileSync(p, `note ${i}`);
      createIngestJob(db, { name: `note-${i}.md`, uriLocation: p, mimeType: "text/markdown", charset: "utf-8", tags: null });
    }

    const summary = await runCycle(db, cfg, { jobLimit: 2, log: silentLog });
    assert.equal(summary.attempted, 2, "jobLimit should cap this sweep to 2 jobs");

    const repos = createRepositories(db);
    const stillNew = repos.job.listByStatus("New");
    assert.equal(stillNew.length, 1, "the third job should remain for the next sweep");
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("runs orphan cleanup as part of the sweep", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const repos = createRepositories(db);
    const orphan = repos.job.create("ingest", "New", null, null);
    repos.job.markRunning(orphan.id);
    db.prepare("UPDATE job SET start_date = ? WHERE id = ?").run("2000-01-01T00:00:00.000Z", orphan.id);

    const summary = await runCycle(db, cfg, { log: silentLog });
    assert.equal(summary.orphanedJobsFailed, 1);

    const reloaded = repos.job.get(orphan.id);
    assert.equal(reloaded.status, "Failed");
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("an empty queue is a no-op sweep, not an error", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const summary = await runCycle(db, cfg, { log: silentLog });
    assert.deepEqual(summary, { attempted: 0, completed: 0, failed: 0, skipped: 0, orphanedJobsFailed: 0, staleLocksCleared: 0 });
  } finally {
    cleanupTestCfg(cfg);
  }
});
