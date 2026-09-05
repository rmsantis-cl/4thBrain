const test = require("node:test");
const assert = require("node:assert/strict");
const { mock } = require("node:test");
const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { createTestDb } = require("../../server/test/helpers/test-db");
const { createTestCfg, cleanupTestCfg } = require("../../server/test/helpers/test-cfg");
const { createRepositories } = require("../../server/lib/repositories");
const { createIngestJob } = require("../../server/lib/ingest-service");
const { runCycle } = require("../worker");

function silentLog() {}

test("Bug 101: an ingested document is handed off through 'index' across consecutive sweeps, without external help", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const sourcePath = path.join(cfg.rawDirInbox, "note.md");
    fs.writeFileSync(sourcePath, "# Hello\n\nEnough body text to clear the too-short threshold.");
    const jobId = createIngestJob(db, { name: "note.md", uriLocation: sourcePath, mimeType: "text/markdown", charset: "utf-8", tags: null });

    // Sweep 1: ingest runs and (per Ingestion-State-Diagram.md's TextPath -->
    // RAGIndexing) hands off by enqueueing an 'index' job — previously
    // nothing ever did this, which was Bug 101's root cause.
    const sweep1 = await runCycle(db, cfg, { log: silentLog });
    assert.equal(sweep1.completed, 1);

    const repos = createRepositories(db);
    const ingestJob = repos.job.get(jobId);
    assert.equal(ingestJob.status, "Completed");

    const jobsForDoc = repos.job.listByDocumentId(ingestJob.document_id);
    assert.equal(jobsForDoc.length, 2, "ingest should have enqueued exactly one follow-on job");
    const indexJob = jobsForDoc.find((j) => j.job_type === "index");
    assert.ok(indexJob, "an 'index' job should exist for this document");
    assert.equal(indexJob.status, "New");

    // Sweep 2: index runs (mocking the watcher/status python scripts so this
    // test doesn't depend on a python install) and, per RAGIndexing -->
    // RouteByResult --> Classify, hands off to 'classify'.
    const spawnMock = mock.method(child_process, "spawnSync", () => ({ stdout: "", stderr: "", status: 0, error: null }));
    let sweep2;
    try {
      sweep2 = await runCycle(db, cfg, { log: silentLog });
    } finally {
      spawnMock.mock.restore();
    }
    assert.equal(sweep2.completed, 1, "the index job should be picked up and completed on the very next sweep, unattended");

    const jobsForDocAfterIndex = repos.job.listByDocumentId(ingestJob.document_id);
    assert.equal(jobsForDocAfterIndex.length, 3, "index should have enqueued exactly one follow-on job");
    const classifyJob = jobsForDocAfterIndex.find((j) => j.job_type === "classify");
    assert.ok(classifyJob, "a 'classify' job should exist for this document — the document is no longer stuck");
    assert.equal(classifyJob.status, "New");

    // Document is still progressing (not the 'Processing'-forever state Bug
    // 101 reported) — classification-executor.js's own tests cover the final
    // hop to 'Indexed'.
    const doc = repos.document.get(ingestJob.document_id);
    assert.equal(doc.status, "Processing");
  } finally {
    cleanupTestCfg(cfg);
  }
});

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
    const job = repos.job.create("ingest", "New", null, null);

    const summary = await runCycle(db, cfg, { log: silentLog, registeredExecutors: {} });

    // Not even fetched as "pending" — this job_type isn't a key in registeredExecutors.
    assert.equal(summary.attempted, 0);
    assert.equal(summary.skipped, 0);

    const reloaded = repos.job.get(job.id);
    assert.equal(reloaded.status, "New");
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("an 'index' job is skipped (not attempted) while its document isn't Processing yet", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const repos = createRepositories(db);
    const doc = repos.document.create("note.md", path.join(cfg.vaultDirIncoming, "note.md"), "text/markdown", "utf-8", "New", null);
    const job = repos.job.create("index", "New", doc.id, null); // Story 1.1's ingest hasn't handed off yet

    const summary = await runCycle(db, cfg, { log: silentLog });

    assert.equal(summary.attempted, 0);
    assert.equal(summary.skipped, 1);

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
    const jobIds = [];
    for (let i = 0; i < 3; i++) {
      const p = path.join(cfg.rawDirInbox, `note-${i}.md`);
      fs.writeFileSync(p, `note ${i}`);
      jobIds.push(createIngestJob(db, { name: `note-${i}.md`, uriLocation: p, mimeType: "text/markdown", charset: "utf-8", tags: null }));
    }

    const summary = await runCycle(db, cfg, { jobLimit: 2, log: silentLog });
    assert.equal(summary.attempted, 2, "jobLimit should cap this sweep to 2 jobs");

    // Bug 101: a completed 'ingest' job now hands off by enqueuing a 'index'
    // job (New) for the same document, so "New" jobs after this sweep are
    // the untouched third ingest job PLUS the two handoff jobs the first
    // two spawned — check the specific job this sweep didn't reach instead
    // of a raw count of everything still 'New'.
    const repos = createRepositories(db);
    const untouched = repos.job.get(jobIds[2]);
    assert.equal(untouched.status, "New", "the third job should remain for the next sweep");
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
    const { snapshot, ...rest } = summary;
    assert.deepEqual(rest, { attempted: 0, completed: 0, failed: 0, skipped: 0, orphanedJobsFailed: 0, staleLocksCleared: 0 });
    assert.ok(snapshot, "Story 10.1: a pre-run snapshot is still taken even on an empty queue");
  } finally {
    cleanupTestCfg(cfg);
  }
});
