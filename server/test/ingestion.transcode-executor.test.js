const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { createTestDb } = require("./helpers/test-db");
const { createTestCfg, cleanupTestCfg } = require("./helpers/test-cfg");
const { createIngestJob } = require("../lib/ingest-service");
const { createRepositories } = require("../lib/repositories");
const transcodeExecutor = require("../lib/ingestion/transcode-executor");

const MAMMOTH_FIXTURE = path.join(__dirname, "..", "node_modules", "mammoth", "test", "test-data", "single-paragraph.docx");

function stageAndCreateJob(db, cfg, { fileName, content, mimeType, charset = null, tags }) {
  const sourcePath = path.join(cfg.rawDirInbox, fileName);
  if (Buffer.isBuffer(content)) {
    fs.writeFileSync(sourcePath, content);
  } else {
    fs.writeFileSync(sourcePath, content, "utf-8");
  }
  const jobId = createIngestJob(db, { name: fileName, uriLocation: sourcePath, mimeType, charset, tags });
  const repos = createRepositories(db);
  return { jobId, job: repos.job.get(jobId), sourcePath };
}

test("detectStrategy classifies pdf/docx by MIME type", () => {
  assert.equal(transcodeExecutor.detectStrategy({ path: "x.bin", mime_type: "application/pdf" }), "pdf");
  assert.equal(
    transcodeExecutor.detectStrategy({ path: "x.bin", mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
    "docx"
  );
});

test("detectStrategy falls back to file extension when mime_type is absent", () => {
  assert.equal(transcodeExecutor.detectStrategy({ path: "scan.PDF", mime_type: null }), "pdf");
  assert.equal(transcodeExecutor.detectStrategy({ path: "letter.docx", mime_type: null }), "docx");
});

test("detectStrategy falls back to archive-only for images and any other unrecognized binary format", () => {
  assert.equal(transcodeExecutor.detectStrategy({ path: "photo.png", mime_type: "image/png" }), "archive-only");
  assert.equal(transcodeExecutor.detectStrategy({ path: "archive.zip", mime_type: "application/zip" }), "archive-only");
});

test("canHandle is true for a convert job with a staged file, regardless of format", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const { job } = stageAndCreateJob(db, cfg, { fileName: "photo.png", content: Buffer.from([0x89, 0x50, 0x4e, 0x47]), mimeType: "image/png" });
    assert.equal(job.job_type, "convert");
    assert.equal(transcodeExecutor.canHandle(db, job), true);
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("canHandle is false for a non-'convert' job_type", () => {
  const db = createTestDb();
  const repos = createRepositories(db);
  const job = repos.job.create("ingest", "New", null, null);
  assert.equal(transcodeExecutor.canHandle(db, job), false);
});

test("canHandle is false for a convert job with no job_file records", () => {
  const db = createTestDb();
  const repos = createRepositories(db);
  const job = repos.job.create("convert", "New", null, null);
  assert.equal(transcodeExecutor.canHandle(db, job), false);
});

test("execute() extracts real text from a .docx and archives the original", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const docxBytes = fs.readFileSync(MAMMOTH_FIXTURE);
    const { job } = stageAndCreateJob(db, cfg, {
      fileName: "report.docx",
      content: docxBytes,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const result = await transcodeExecutor.execute(db, job, cfg);

    assert.equal(result.strategy, "docx");
    assert.equal(result.destPath, path.join(cfg.vaultDirIncoming, "report.md"));
    const written = fs.readFileSync(result.destPath, "utf-8");
    assert.match(written, /Walking on imported air/, "extracted text should land in the transcoded .md");
    assert.match(written, /^---\nsource_raw: /, "transcoded file should reference the archived original's location");

    assert.equal(result.archivedPath, path.join(cfg.vaultDirRaw, "report.docx"));
    assert.ok(fs.existsSync(result.archivedPath), "original binary should be archived to $VAULT_DIR/raw");
    assert.deepEqual(fs.readFileSync(result.archivedPath), docxBytes, "archived original must be byte-identical");

    const repos = createRepositories(db);
    const doc = repos.document.get(job.document_id);
    assert.equal(doc.status, "Processing");
    assert.equal(doc.uri_location, result.destPath);
    assert.equal(doc.mime_type, "text/markdown");

    const [jobFile] = repos.job_file.listForJob(job.id);
    assert.equal(jobFile.status, "filed");
    assert.equal(jobFile.path, result.destPath);
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("execute() falls back to an archive-only stub when a PDF can't actually be parsed, rather than failing the job", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const { job } = stageAndCreateJob(db, cfg, { fileName: "scan.pdf", content: "%PDF-1.4 not a real pdf body", mimeType: "application/pdf" });

    const result = await transcodeExecutor.execute(db, job, cfg);

    assert.equal(result.strategy, "pdf");
    const written = fs.readFileSync(result.destPath, "utf-8");
    assert.match(written, /No text could be extracted/, "unparseable content should degrade to a reference stub, not throw");
    assert.ok(fs.existsSync(result.archivedPath), "the original should still be archived even when extraction fails");
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("execute() archives an image with a reference-only stub (no text extraction attempted)", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const { job } = stageAndCreateJob(db, cfg, { fileName: "photo.png", content: pngBytes, mimeType: "image/png" });

    const result = await transcodeExecutor.execute(db, job, cfg);

    assert.equal(result.strategy, "archive-only");
    assert.equal(result.destPath, path.join(cfg.vaultDirIncoming, "photo.md"));
    assert.deepEqual(fs.readFileSync(result.archivedPath), pngBytes);
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("execute() throws if the job has no job_file records", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const repos = createRepositories(db);
    const doc = repos.document.create("orphan.pdf", "/nowhere", "application/pdf", null, "New", null);
    const job = repos.job.create("convert", "New", doc.id, null);

    await assert.rejects(() => transcodeExecutor.execute(db, job, cfg), /no job_file records/);
  } finally {
    cleanupTestCfg(cfg);
  }
});

test("execute() throws if the source file no longer exists", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const { job, sourcePath } = stageAndCreateJob(db, cfg, { fileName: "gone.pdf", content: "%PDF-1.4 x", mimeType: "application/pdf" });
    fs.unlinkSync(sourcePath);

    await assert.rejects(() => transcodeExecutor.execute(db, job, cfg), /does not exist/);
  } finally {
    cleanupTestCfg(cfg);
  }
});
