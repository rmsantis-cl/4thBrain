const fs = require("fs");
const os = require("os");
const path = require("path");
const { createRepositories } = require("../repositories");
const { withTransaction } = require("../repositories/tx");
const { archiveToVaultRaw } = require("./vault-writer");
const { resolveDestination } = require("./path-resolver");

const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Which transcoding strategy applies to a staged binary job_file, per ADR14 /
 * Story 1.2. Two formats get real text extraction: PDF via OpenDataLoader PDF
 * (ADR19 — shells out to a bundled Java CLI) and .docx via mammoth (pure-JS).
 * Everything else Story 1.2 doesn't have a text extractor for — images
 * included, since OCR/vision-model extraction is Story 2.1/EP2 territory, not
 * this story's — falls back to "archive-only": the original is still archived
 * to $VAULT_DIR/raw and a minimal reference stub still lands in
 * $VAULT_DIR/incoming (so the file is discoverable and its acceptance
 * criteria about incoming/raw placement hold), it just carries no extracted
 * body text. This keeps every 'convert' job resolvable — none are left
 * permanently stuck in 'New' the way they were before this story existed.
 */
function detectStrategy(jobFile) {
  const mimeType = (jobFile.mime_type || "").toLowerCase();
  const ext = path.extname(jobFile.path || "").toLowerCase();

  if (mimeType === PDF_MIME || ext === ".pdf") return "pdf";
  if (mimeType === DOCX_MIME || ext === ".docx") return "docx";
  return "archive-only";
}

/**
 * PDF text extraction via OpenDataLoader PDF (ADR19, replacing pdf-parse).
 * convert() shells out to a bundled Java CLI and writes output files to
 * outputDir rather than returning extracted text directly, so this reads the
 * resulting .md file back in. Requires a Java 11+ JRE on the host (the npm
 * package's own runtime dependency, not something this repo adds) — a
 * convert() call rejects if 'java' isn't on PATH or the PDF can't be parsed;
 * either way transcodeBody()'s catch degrades to the archive-only stub.
 */
async function extractPdfText(sourcePath) {
  const { convert } = require("@opendataloader/pdf");
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "4thbrain-odl-pdf-"));
  try {
    await convert([sourcePath], { outputDir, format: "markdown,json" });
    const mdPath = path.join(outputDir, `${stemOf(path.basename(sourcePath))}.md`);
    return fs.readFileSync(mdPath, "utf-8");
  } finally {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
}

async function extractDocxText(sourcePath) {
  const mammoth = require("mammoth");
  const result = await mammoth.extractRawText({ path: sourcePath });
  return result.value;
}

/** Best-effort transcode step. Returns plain text/Markdown body, or null if
 *  this strategy has no extractable text (archive-only) or extraction failed
 *  on a malformed file — either way we still archive+stub rather than fail
 *  the whole job over unreadable binary content. */
async function transcodeBody(strategy, sourcePath) {
  try {
    if (strategy === "pdf") return await extractPdfText(sourcePath);
    if (strategy === "docx") return await extractDocxText(sourcePath);
    return null;
  } catch (err) {
    return null;
  }
}

function stemOf(name) {
  const ext = path.extname(name);
  return ext ? name.slice(0, -ext.length) : name;
}

/**
 * True if this executor can process the given job right now. Mirrors
 * ingest-executor.js's contract: checked before the job is claimed, so a job
 * with no staged file yet is left 'New' rather than claimed and failed.
 * Every 'convert' job with at least one job_file is handleable — see
 * detectStrategy()'s "archive-only" fallback.
 */
function canHandle(db, job) {
  if (!job || job.job_type !== "convert") return false;
  const repos = createRepositories(db);
  const files = repos.job_file.listForJob(job.id);
  return files.length > 0;
}

/**
 * Executes a 'convert' job (Story 1.2, ADR14): archives the original binary
 * to $VAULT_DIR/raw, transcodes it (PDF/DOCX get real text extraction; every
 * other binary format gets an archive-only reference stub — see
 * detectStrategy()), and writes the transcoded Markdown into
 * $VAULT_DIR/incoming referencing the archived original's location.
 *
 * Same job-lifecycle contract as ingest-executor.js: succeed (return a
 * result) or throw (a real failure, e.g. missing source file) — the caller
 * (worker) owns job.status transitions. Unlike ingest-executor.js this is
 * async (OpenDataLoader PDF/mammoth are Promise-based); batch/worker.js
 * awaits it.
 *
 * Like ingest-executor.js, only the first job_file per job is processed —
 * no current caller produces multi-file jobs.
 */
async function execute(db, job, cfg) {
  const files = createRepositories(db).job_file.listForJob(job.id);
  if (files.length === 0) {
    throw new Error(`job ${job.id} has no job_file records to process`);
  }
  const jobFile = files[0];

  if (!fs.existsSync(jobFile.path)) {
    throw new Error(`source file does not exist: ${jobFile.path}`);
  }

  const strategy = detectStrategy(jobFile);
  const body = await transcodeBody(strategy, jobFile.path);

  const archivedPath = archiveToVaultRaw(jobFile.path, cfg, jobFile.name);

  const transcodedName = `${stemOf(jobFile.name)}.md`;
  const destPath = resolveDestination(cfg.vaultDirIncoming, transcodedName);
  const frontmatter = `---\nsource_raw: ${archivedPath}\ntranscoded_from: ${jobFile.mime_type || "unknown"}\n---\n\n`;
  const content = frontmatter + (body !== null ? body : `_No text could be extracted from this file — original archived at ${archivedPath}._\n`);
  fs.writeFileSync(destPath, content, "utf-8");

  return withTransaction(db, (txDb) => {
    const repos = createRepositories(txDb);

    const document = repos.document.get(job.document_id);
    if (document) {
      repos.document.update(
        document.id,
        document.name,
        destPath,
        "text/markdown",
        "utf-8",
        "Processing",
        document.topic
      );
    }

    repos.job_file.update(
      jobFile.id,
      jobFile.name,
      destPath,
      "text/markdown",
      path.dirname(destPath),
      jobFile.job_id,
      "filed",
      jobFile.lock_by_PID
    );

    // Per Ingestion-State-Diagram.md: BinaryPath --> BinaryExtract --> RAGIndexing.
    // Hand off immediately to the index executor (see ingest-executor.js for
    // the same handoff on the text path — Bug 101).
    const nextJob = repos.job.create("index", "New", job.document_id, job.id);

    return { documentId: job.document_id, sourcePath: jobFile.path, destPath, archivedPath, strategy, next: "index", nextJobId: nextJob.id };
  });
}

module.exports = { canHandle, execute, detectStrategy };
