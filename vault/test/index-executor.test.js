const test = require("node:test");
const assert = require("node:assert/strict");
const { mock } = require("node:test");
const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { createTestDb } = require("../../server/test/helpers/test-db");
const { createTestCfg, cleanupTestCfg } = require("../../server/test/helpers/test-cfg");
const { createRepositories } = require("../../server/lib/repositories");
const indexExecutor = require("../index-executor");

/** Stages a document + 'index' job in state Processing, with a real file on
 *  disk at uri_location — the precondition ingest/convert leave behind, per
 *  Ingestion-State-Diagram.md's TMP_DIR/BinaryExtract --> RAGIndexing. */
function stageIndexJob(db, cfg, { name = "note.md", content = "Some indexable content, long enough." } = {}) {
  const repos = createRepositories(db);
  const filePath = path.join(cfg.vaultDirIncoming, name);
  fs.writeFileSync(filePath, content, "utf-8");
  const doc = repos.document.create(name, filePath, "text/markdown", "utf-8", "Processing", null);
  const job = repos.job.create("index", "New", doc.id, null);
  return { doc, job, filePath };
}

test("canHandle is false for a non-'index' job_type", () => {
  const db = createTestDb();
  assert.equal(indexExecutor.canHandle(db, { job_type: "ingest" }), false);
});

test("canHandle is false when the document isn't in Processing state yet", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const repos = createRepositories(db);
    const doc = repos.document.create("note.md", path.join(cfg.vaultDirIncoming, "note.md"), "text/markdown", "utf-8", "New", null);
    const job = repos.job.create("index", "New", doc.id, null);
    assert.equal(indexExecutor.canHandle(db, job), false);
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("canHandle is false when the document's file is missing from disk", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const repos = createRepositories(db);
    const doc = repos.document.create("gone.md", path.join(cfg.vaultDirIncoming, "gone.md"), "text/markdown", "utf-8", "Processing", null);
    const job = repos.job.create("index", "New", doc.id, null);
    assert.equal(indexExecutor.canHandle(db, job), false);
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("canHandle is true once the document is Processing with its file staged", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const { job } = stageIndexJob(db, cfg);
    assert.equal(indexExecutor.canHandle(db, job), true);
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("execute() routes text-too-short content to VAULT_NOTES (Archived), without enqueuing a classify job", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const { doc, job } = stageIndexJob(db, cfg, { content: "hi" });

    const result = await indexExecutor.execute(db, job, cfg);

    assert.match(result.next, /VAULT_NOTES/);
    const repos = createRepositories(db);
    assert.equal(repos.document.get(doc.id).status, "Archived");
    assert.equal(repos.job.listByDocumentId(doc.id).length, 1, "no classify job should have been enqueued");
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("execute() routes an unreadable/failing watcher run to VAULT_RAW (document marked Failed) and rethrows", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const { doc, job } = stageIndexJob(db, cfg);

    // Force the watcher spawn to fail deterministically, without depending
    // on a real python install — mirrors "fail unreadable" in RouteByResult.
    const spawnMock = mock.method(child_process, "spawnSync", () => ({
      stdout: "",
      stderr: "boom",
      status: 1,
      error: null,
    }));
    try {
      await assert.rejects(() => indexExecutor.execute(db, job, cfg), /Vault change watcher failed/);
    } finally {
      spawnMock.mock.restore();
    }

    const repos = createRepositories(db);
    assert.equal(repos.document.get(doc.id).status, "Failed");
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("execute() hands off to a 'classify' job on success, per RAGIndexing --> RouteByResult --> Classify", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const { doc, job } = stageIndexJob(db, cfg);

    const spawnMock = mock.method(child_process, "spawnSync", () => ({
      stdout: "ok\n",
      stderr: "",
      status: 0,
      error: null,
    }));
    let result;
    try {
      result = await indexExecutor.execute(db, job, cfg);
    } finally {
      spawnMock.mock.restore();
    }

    assert.equal(result.next, "classify");
    assert.equal(result.documentId, doc.id);
    assert.ok(result.nextJobId);

    const repos = createRepositories(db);
    const childJob = repos.job.get(result.nextJobId);
    assert.equal(childJob.job_type, "classify");
    assert.equal(childJob.document_id, doc.id);
    assert.equal(childJob.parent_job_id, job.id);
    // Document stays 'Processing' — classification-executor.js is the stage
    // that sets the terminal 'Indexed' status (VAULT_TREE).
    assert.equal(repos.document.get(doc.id).status, "Processing");
  } finally {
    cleanupTestCfg(cfg);
  }
});
