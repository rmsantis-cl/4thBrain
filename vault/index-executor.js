const fs = require("fs");
const child_process = require("child_process");
const path = require("path");
const { createRepositories } = require("../server/lib/repositories");
const { withTransaction } = require("../server/lib/repositories/tx");

/**
 * Index Executor (Story 3.1: Smart Connections Vector Indexing)
 *
 * Executes 'index' jobs by triggering the vault change watcher and querying
 * Smart Connections indexing status. The watcher detects file changes; the
 * Smart Connections plugin (running in Obsidian) handles actual re-indexing.
 * This executor orchestrates detection and status verification.
 *
 * Per Ingestion-State-Diagram.md's RAGIndexing -> RouteByResult, the outcome
 * of this stage decides what happens next (Bug 101 — previously this executor
 * never wrote back to the document/job tables at all, so nothing downstream
 * of 'index' ever ran):
 *   - index success  -> Choice --> Classify: enqueue a 'classify' job.
 *   - text too short -> Choice --> VAULT_NOTES: terminal, document Archived.
 *   - fail/unreadable -> Choice --> VAULT_RAW: terminal, document Failed
 *     (mirrors the job the worker also marks Failed on a thrown error).
 *
 * AC1: Modified or created notes are automatically scanned and indexed
 * AC2: Embeddings stored locally in .smart-env without cloud calls
 */

const pythonPath = process.platform === "win32" ? "python" : "python3";

// Below this many non-whitespace characters, RAGIndexing's diagram branch is
// "text too short" (VAULT_NOTES) rather than a genuine indexing candidate.
const MIN_INDEXABLE_LENGTH = 20;

/**
 * Gated like the other actuators (ingest-executor.js, classification-executor.js):
 * only claim an 'index' job once its document exists, is in 'Processing'
 * (the output state of ingest/convert), and its file is actually on disk.
 */
function canHandle(db, job) {
  if (!job || job.job_type !== "index") return false;
  const repos = createRepositories(db);
  const doc = repos.document.get(job.document_id);
  if (!doc || doc.status !== "Processing") return false;
  if (!doc.uri_location || !fs.existsSync(doc.uri_location)) return false;
  return true;
}

/**
 * Execute index job:
 * 1. Run vault-change-watcher to detect new/modified notes
 * 2. Query Smart Connections status to verify indexing state
 * 3. Route the document per the diagram's RouteByResult branch and hand off
 *    (or terminate) accordingly.
 */
async function execute(db, job, cfg) {
  const repos = createRepositories(db);
  const doc = repos.document.get(job.document_id);
  if (!doc) {
    throw new Error(`document ${job.document_id} not found`);
  }

  const content = fs.readFileSync(doc.uri_location, "utf-8");
  if (content.trim().length < MIN_INDEXABLE_LENGTH) {
    // RouteByResult: Choice --> VAULT_NOTES ("too short") — terminal, no
    // further job. Archived matches schema.sql's "processing complete and
    // no longer active" semantics; short-circuits before spawning the
    // watcher/status scripts since there's nothing meaningful to index.
    return withTransaction(db, (txDb) => {
      createRepositories(txDb).document.setStatus(doc.id, "Archived");
      return {
        documentId: doc.id,
        sourcePath: doc.uri_location,
        destPath: doc.uri_location,
        next: "VAULT_NOTES (terminal — text too short to index)",
      };
    });
  }

  const vaultDir = cfg.VAULT_DIR;
  const vaultModule = path.join(cfg.projectRoot || __dirname, "..", "vault");

  let watcherOutput = "";
  let statusOutput = "";

  try {
    // Step 1: Run vault change watcher
    const watcherScript = path.join(vaultModule, "vault-change-watcher.py");
    const watcherResult = child_process.spawnSync(pythonPath, [watcherScript, "--vault-dir", vaultDir], {
      encoding: "utf-8",
      timeout: 30000,
      stdio: ["inherit", "pipe", "pipe"],
    });

    watcherOutput = watcherResult.stdout || "";
    const watcherError = watcherResult.stderr || "";

    if (watcherResult.error) {
      throw new Error(`Watcher spawn failed: ${watcherResult.error.message}`);
    }
    if (watcherResult.status !== 0) {
      throw new Error(`Watcher exited with status ${watcherResult.status}: ${watcherError}`);
    }

    // Step 2: Query Smart Connections status (advisory — a failure here
    // doesn't fail the whole 'index' job, indexing may still be pending)
    const statusScript = path.join(vaultModule, "check_smart_connections_status.py");
    const statusResult = child_process.spawnSync(pythonPath, [statusScript], {
      encoding: "utf-8",
      timeout: 30000,
      stdio: ["inherit", "pipe", "pipe"],
    });
    statusOutput = statusResult.stdout || "";
    if (statusResult.error) {
      console.warn(`Status check spawn failed: ${statusResult.error.message}`);
    }
  } catch (err) {
    // RouteByResult: Choice --> VAULT_RAW ("fail unreadable") — terminal.
    // The worker also marks the job Failed; mark the document Failed too so
    // a stuck-document trace shows the same outcome at both levels.
    withTransaction(db, (txDb) => {
      createRepositories(txDb).document.setStatus(doc.id, "Failed");
    });
    throw new Error(`Vault change watcher failed: ${err.message}`);
  }

  // RouteByResult: Choice --> Classify ("index success"). Hand off to
  // Story 2.1's classification executor (Bug 101).
  return withTransaction(db, (txDb) => {
    const txRepos = createRepositories(txDb);
    const nextJob = txRepos.job.create("classify", "New", doc.id, job.id);
    return {
      documentId: doc.id,
      sourcePath: doc.uri_location,
      destPath: doc.uri_location,
      next: "classify",
      nextJobId: nextJob.id,
      watcher_output: watcherOutput.split("\n").filter((l) => l.trim()),
      status_output: statusOutput.split("\n").filter((l) => l.trim()),
    };
  });
}

module.exports = {
  canHandle,
  execute,
};
