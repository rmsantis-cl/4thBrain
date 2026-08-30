<<<<<<< HEAD
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { createTestDb } = require("./helpers/test-db");
const { createTestCfg, cleanupTestCfg } = require("./helpers/test-cfg");
const { createIngestJob } = require("../lib/ingest-service");
const { createRepositories } = require("../lib/repositories");
const ingestExecutor = require("../lib/ingestion/ingest-executor");

function stageAndCreateJob(db, cfg, { fileName, content, mimeType, charset = "utf-8", tags }) {
  const sourcePath = path.join(cfg.rawDirInbox, fileName);
  fs.writeFileSync(sourcePath, content, "utf-8");
  const jobId = createIngestJob(db, { name: fileName, uriLocation: sourcePath, mimeType, charset, tags });
  const repos = createRepositories(db);
  return { jobId, job: repos.job.get(jobId), sourcePath };
}

test("canHandle is true for a job whose staged file is text/markdown", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const { job } = stageAndCreateJob(db, cfg, { fileName: "note.md", content: "# Hi", mimeType: "text/markdown" });
    assert.equal(ingestExecutor.canHandle(db, job), true);
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("canHandle is false for a job whose staged file is a binary format (Story 1.2's scope)", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const { job } = stageAndCreateJob(db, cfg, { fileName: "doc.pdf", content: "%PDF-1.4 fake", mimeType: "application/pdf" });
    assert.equal(ingestExecutor.canHandle(db, job), false);
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("canHandle is false for a non-'ingest' job_type", () => {
  const db = createTestDb();
  const repos = createRepositories(db);
  const job = repos.job.create("classify", "New", null, null);
  assert.equal(ingestExecutor.canHandle(db, job), false);
});

test("execute() copies the file to vault/incoming, updates document, and updates job_file — end to end", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const content = "---\ntitle: My Note\n---\nHello world";
    const { job, sourcePath } = stageAndCreateJob(db, cfg, { fileName: "note.md", content, mimeType: "text/markdown" });

    const result = ingestExecutor.execute(db, job, cfg);

    assert.equal(result.destPath, path.join(cfg.vaultDirIncoming, "note.md"));
    assert.equal(fs.readFileSync(result.destPath, "utf-8"), content, "content must be preserved exactly, frontmatter included");

    const repos = createRepositories(db);
    const doc = repos.document.get(job.document_id);
    assert.equal(doc.status, "Processing");
    assert.equal(doc.uri_location, result.destPath);

    const [jobFile] = repos.job_file.listForJob(job.id);
    assert.equal(jobFile.status, "filed");
    assert.equal(jobFile.path, result.destPath);

    // The original staged file is untouched by this story (no move/delete —
    // that's out of scope; only the vault copy is Story 1.1's job).
    assert.ok(fs.existsSync(sourcePath));
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("execute() throws (does not silently no-op) for a non-indexable file", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const { job } = stageAndCreateJob(db, cfg, { fileName: "doc.pdf", content: "fake pdf", mimeType: "application/pdf" });
    assert.throws(() => ingestExecutor.execute(db, job, cfg), /not indexable/);
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("execute() throws if the job has no job_file records", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const repos = createRepositories(db);
    const doc = repos.document.create("orphan.md", "/nowhere", "text/markdown", "utf-8", "New", null);
    const job = repos.job.create("ingest", "New", doc.id, null);

    assert.throws(() => ingestExecutor.execute(db, job, cfg), /no job_file records/);
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("frontmatter and unicode content survive the copy exactly", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const content = "---\ntitle: café ☕\ntags: [日本語]\n---\n\nBody with emoji 🎉 and\ttabs.\n";
    const { job } = stageAndCreateJob(db, cfg, { fileName: "unicode.md", content, mimeType: "text/markdown" });

    const result = ingestExecutor.execute(db, job, cfg);
    assert.equal(fs.readFileSync(result.destPath, "utf-8"), content);
  } finally {
    cleanupTestCfg(cfg);
  }
});
=======
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { createTestDb } = require("./helpers/test-db");
const { createTestCfg, cleanupTestCfg } = require("./helpers/test-cfg");
const { createIngestJob } = require("../lib/ingest-service");
const { createRepositories } = require("../lib/repositories");
const ingestExecutor = require("../lib/ingestion/ingest-executor");

function stageAndCreateJob(db, cfg, { fileName, content, mimeType, charset = "utf-8", tags }) {
  const sourcePath = path.join(cfg.rawDirInbox, fileName);
  fs.writeFileSync(sourcePath, content, "utf-8");
  const jobId = createIngestJob(db, { name: fileName, uriLocation: sourcePath, mimeType, charset, tags });
  const repos = createRepositories(db);
  return { jobId, job: repos.job.get(jobId), sourcePath };
}

test("canHandle is true for a job whose staged file is text/markdown", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const { job } = stageAndCreateJob(db, cfg, { fileName: "note.md", content: "# Hi", mimeType: "text/markdown" });
    assert.equal(ingestExecutor.canHandle(db, job), true);
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("canHandle is false for a job whose staged file is a binary format (Story 1.2's scope)", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const { job } = stageAndCreateJob(db, cfg, { fileName: "doc.pdf", content: "%PDF-1.4 fake", mimeType: "application/pdf" });
    assert.equal(ingestExecutor.canHandle(db, job), false);
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("canHandle is false for a non-'ingest' job_type", () => {
  const db = createTestDb();
  const repos = createRepositories(db);
  const job = repos.job.create("classify", "New", null, null);
  assert.equal(ingestExecutor.canHandle(db, job), false);
});

test("execute() copies the file to vault/incoming, updates document, and updates job_file — end to end", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const content = "---\ntitle: My Note\n---\nHello world";
    const { job, sourcePath } = stageAndCreateJob(db, cfg, { fileName: "note.md", content, mimeType: "text/markdown" });

    const result = ingestExecutor.execute(db, job, cfg);

    assert.equal(result.destPath, path.join(cfg.vaultDirIncoming, "note.md"));
    assert.equal(fs.readFileSync(result.destPath, "utf-8"), content, "content must be preserved exactly, frontmatter included");

    const repos = createRepositories(db);
    const doc = repos.document.get(job.document_id);
    assert.equal(doc.status, "Processing");
    assert.equal(doc.uri_location, result.destPath);

    const [jobFile] = repos.job_file.listForJob(job.id);
    assert.equal(jobFile.status, "filed");
    assert.equal(jobFile.path, result.destPath);

    // The original staged file is untouched by this story (no move/delete —
    // that's out of scope; only the vault copy is Story 1.1's job).
    assert.ok(fs.existsSync(sourcePath));
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("execute() throws (does not silently no-op) for a non-indexable file", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const { job } = stageAndCreateJob(db, cfg, { fileName: "doc.pdf", content: "fake pdf", mimeType: "application/pdf" });
    assert.throws(() => ingestExecutor.execute(db, job, cfg), /not indexable/);
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("execute() throws if the job has no job_file records", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const repos = createRepositories(db);
    const doc = repos.document.create("orphan.md", "/nowhere", "text/markdown", "utf-8", "New", null);
    const job = repos.job.create("ingest", "New", doc.id, null);

    assert.throws(() => ingestExecutor.execute(db, job, cfg), /no job_file records/);
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("frontmatter and unicode content survive the copy exactly", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const content = "---\ntitle: café ☕\ntags: [日本語]\n---\n\nBody with emoji 🎉 and\ttabs.\n";
    const { job } = stageAndCreateJob(db, cfg, { fileName: "unicode.md", content, mimeType: "text/markdown" });

    const result = ingestExecutor.execute(db, job, cfg);
    assert.equal(fs.readFileSync(result.destPath, "utf-8"), content);
  } finally {
    cleanupTestCfg(cfg);
  }
});
>>>>>>> v03-eth
