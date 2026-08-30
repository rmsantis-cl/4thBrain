const path = require("path");
const { createRepositories } = require("../repositories");
const { withTransaction } = require("../repositories/tx");
const fileValidator = require("./file-validator");
const { copyToVaultIncoming } = require("./vault-writer");

/**
 * True if this executor can process the given job right now. The worker
 * (Story 4.1) checks this *before* claiming the job (New -> Running), so a
 * job it can't yet handle (a binary format awaiting Story 1.2's transcoder)
 * is left untouched in 'New' rather than stranded in 'Running' or wrongly
 * marked 'Failed'.
 */
function canHandle(db, job) {
  if (!job || job.job_type !== "ingest") return false;
  const repos = createRepositories(db);
  const files = repos.job_file.listForJob(job.id);
  if (files.length === 0) return false;
  return fileValidator.isIndexable(files[0]);
}

/**
 * Executes an 'ingest' job whose staged file is directly indexable
 * (text/markdown/html, per ADR14): copies it unmodified into
 * $VAULT_DIR/incoming, updates the document's location/status, and updates
 * the job_file record to reflect where the file now lives.
 *
 * Does not touch job.status — the caller (worker) owns job lifecycle
 * transitions, so this function's only contract is: succeed (return a
 * result) or throw (a real failure, e.g. missing source file).
 *
 * Story 1.1 processes the first job_file for a job; a job with multiple
 * files is out of this story's scope (not produced by any current caller —
 * ingest-service.js creates exactly one job_file per job).
 */
function execute(db, job, cfg) {
  return withTransaction(db, (txDb) => {
    const repos = createRepositories(txDb);

    const files = repos.job_file.listForJob(job.id);
    if (files.length === 0) {
      throw new Error(`job ${job.id} has no job_file records to process`);
    }
    const jobFile = files[0];

    const classification = fileValidator.classify(jobFile);
    if (classification.kind !== "indexable") {
      throw new Error(`job ${job.id} file is not indexable: ${classification.reason}`);
    }

    const destPath = copyToVaultIncoming(jobFile.path, cfg, jobFile.name);

    const document = repos.document.get(job.document_id);
    if (document) {
      repos.document.update(
        document.id,
        document.name,
        destPath,
        document.mime_type,
        document.charset,
        "Processing",
        document.topic
      );
    }

    repos.job_file.update(
      jobFile.id,
      jobFile.name,
      destPath,
      jobFile.mime_type,
      path.dirname(destPath),
      jobFile.job_id,
      "filed",
      jobFile.lock_by_PID
    );

    return { documentId: job.document_id, sourcePath: jobFile.path, destPath };
  });
}

module.exports = { canHandle, execute };
