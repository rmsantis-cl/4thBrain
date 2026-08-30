const path = require("path");
const { createRepositories } = require("../server/lib/repositories");
const { cleanupOrphans } = require("./cleanup");
const { executors } = require("./job-executors");
const lockManager = require("./lock-manager");

const DEFAULT_JOB_LIMIT = 10;
const DEFAULT_LOCK_FILE = path.join(__dirname, ".worker.lock");

function defaultLog(entry) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), component: "batch.worker", ...entry }));
}

/**
 * Runs exactly one sweep: fetch pending jobs for every registered job_type,
 * attempt each, then run orphan cleanup. Does not loop or sleep — Story 4.1
 * is a "Background Sweep" (its own name), invoked periodically by an
 * external scheduler (systemd timer / cron), not a long-running daemon that
 * polls in-process. This is a deliberate deviation from the earlier
 * story-4.1-plan.md draft's "while(true) { ...; sleep(DELTA) }" sketch —
 * see documets/story/story-4.1.md, "Design decisions", for the reasoning.
 *
 * Concurrency=1 (ADR10) is enforced by the caller acquiring the file lock
 * before calling runCycle, not by anything in this function — runCycle
 * itself has no opinion about locking, which keeps it trivially testable.
 */
async function runCycle(db, cfg, { jobLimit = DEFAULT_JOB_LIMIT, log = defaultLog, registeredExecutors = executors } = {}) {
  const repos = createRepositories(db);
  const summary = { attempted: 0, completed: 0, failed: 0, skipped: 0 };

  const jobTypes = Object.keys(registeredExecutors);
  const pending = repos.job.listPending(jobTypes, "New", jobLimit);

  for (const job of pending) {
    const executor = registeredExecutors[job.job_type];

    if (!executor.canHandle(db, job)) {
      summary.skipped += 1;
      log({ level: "info", event: "job_skipped", jobId: job.id, jobType: job.job_type, reason: "canHandle() returned false" });
      continue;
    }

    const claimed = repos.job.markRunning(job.id);
    if (!claimed) {
      // Lost a race to claim this job (shouldn't happen under the
      // single-instance lock, but markRunning is written to be safe if it
      // ever does — see JobRepository.markRunning).
      summary.skipped += 1;
      log({ level: "warn", event: "job_claim_race", jobId: job.id });
      continue;
    }

    summary.attempted += 1;
    log({ level: "info", event: "job_started", jobId: job.id, jobType: job.job_type });

    try {
      // await, not a bare call: transcode-executor.js (Story 1.2) needs
      // real async I/O (pdf-parse/mammoth are Promise-based), unlike
      // ingest-executor.js's synchronous copy. Awaiting a plain (non-Promise)
      // return value is a no-op, so this stays compatible with every
      // executor written before this one.
      const result = await executor.execute(db, claimed, cfg);
      repos.job.markCompleted(job.id);
      summary.completed += 1;
      log({ level: "info", event: "job_completed", jobId: job.id, jobType: job.job_type, result });
    } catch (err) {
      repos.job.markFailed(job.id);
      summary.failed += 1;
      log({ level: "error", event: "job_failed", jobId: job.id, jobType: job.job_type, error: err.message });
    }
  }

  const cleanupResult = cleanupOrphans(db, { log });
  summary.orphanedJobsFailed = cleanupResult.failedJobs.length;
  summary.staleLocksCleared = cleanupResult.clearedLocks.length;

  return summary;
}

/** Real entrypoint: acquires the concurrency=1 lock, runs one sweep against
 *  the real database/config, releases the lock. Exits 0 whether or not work
 *  was found — "another instance is already running" is not an error. */
async function main() {
  const { buildConfig } = require("../server/config");
  const { getDatabase } = require("../server/db/init");

  const lockFilePath = process.env.WORKER_LOCK_FILE || DEFAULT_LOCK_FILE;
  const lock = lockManager.acquire(lockFilePath);
  if (!lock) {
    defaultLog({ level: "info", event: "sweep_skipped", reason: "another worker instance holds the lock" });
    return;
  }

  const cfg = buildConfig();
  const db = getDatabase();
  try {
    const summary = await runCycle(db, cfg);
    defaultLog({ level: "info", event: "sweep_completed", summary });
  } finally {
    db.close();
    lock.release();
  }
}

if (require.main === module) {
  main().catch((err) => {
    defaultLog({ level: "error", event: "sweep_crashed", error: err.message });
    process.exitCode = 1;
  });
}

module.exports = { runCycle, main, DEFAULT_LOCK_FILE };
