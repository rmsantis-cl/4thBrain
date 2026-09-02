const { createRepositories } = require("../server/lib/repositories");
const { isProcessAlive } = require("./lock-manager");

const DEFAULT_RUNNING_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour, per the Story 4.1 plan

/**
 * Orphan cleanup, run at the end of every worker sweep:
 *
 * 1. Jobs stuck in 'Running' longer than runningTimeoutMs are marked
 *    'Failed'. This only happens if a prior worker process died mid-job
 *    (crash, OOM kill) without going through the normal
 *    markCompleted/markFailed path — under normal operation (single sweep
 *    per invocation, ADR9/ADR10) a job's Running window is the duration of
 *    one executor call, not an inter-sweep gap.
 * 2. job_file rows with a lock_by_PID naming a process that's no longer
 *    alive have their lock cleared. No current executor sets lock_by_PID
 *    (Story 1.1's ingest executor is a single brief transaction — ADR17 —
 *    with no separate OS-level file lock window), so this is a no-op today.
 *    It's kept because job_file.lock_by_PID exists precisely for a future
 *    long-running executor (e.g. Story 1.2's transcoding step) to use, and
 *    an untested cleanup path is worse than a currently-idle one.
 *
 * The job table's error_message column (added in Story 6.3) captures the
 * reason a job was marked Failed. This cleanup function stores the orphan
 * timeout reason in that column (see DESIGN-DEBT #5).
 */
function cleanupOrphans(db, { runningTimeoutMs = DEFAULT_RUNNING_TIMEOUT_MS, log = defaultLog } = {}) {
  const repos = createRepositories(db);
  const now = Date.now();
  const result = { failedJobs: [], clearedLocks: [] };

  const runningJobs = repos.job.listByStatus("Running");
  for (const job of runningJobs) {
    if (!job.start_date) continue;
    const startedAt = Date.parse(job.start_date);
    if (Number.isNaN(startedAt)) continue;
    if (now - startedAt > runningTimeoutMs) {
      const errorMessage = `Job orphaned (running timeout: started ${job.start_date}, timeout ${runningTimeoutMs}ms)`;
      repos.job.markFailed(job.id, errorMessage);
      result.failedJobs.push(job.id);
      log({ level: "warn", component: "batch.cleanup", event: "orphaned_job_failed", jobId: job.id, startDate: job.start_date, error: errorMessage });
    }
  }

  const lockedFiles = repos.job_file.listLocked();
  for (const jobFile of lockedFiles) {
    if (!isProcessAlive(jobFile.lock_by_PID)) {
      repos.job_file.clearLock(jobFile.id);
      result.clearedLocks.push(jobFile.id);
      log({ level: "warn", component: "batch.cleanup", event: "stale_lock_cleared", jobFileId: jobFile.id, pid: jobFile.lock_by_PID });
    }
  }

  return result;
}

function defaultLog(entry) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...entry }));
}

module.exports = { cleanupOrphans, DEFAULT_RUNNING_TIMEOUT_MS };
