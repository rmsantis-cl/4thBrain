const test = require("node:test");
const assert = require("node:assert/strict");
const { createTestDb } = require("../../server/test/helpers/test-db");
const { createRepositories } = require("../../server/lib/repositories");
const { cleanupOrphans } = require("../cleanup");

function silentLog() {} // suppress structured log noise in test output

test("does nothing when there are no Running jobs and no locked files", () => {
  const db = createTestDb();
  const result = cleanupOrphans(db, { log: silentLog });
  assert.deepEqual(result, { failedJobs: [], clearedLocks: [] });
});

test("marks a Running job older than the timeout as Failed", () => {
  const db = createTestDb();
  const repos = createRepositories(db);
  const job = repos.job.create("ingest", "New", null, null);
  repos.job.markRunning(job.id);

  // Backdate start_date well past any reasonable timeout.
  db.prepare("UPDATE job SET start_date = ? WHERE id = ?").run("2000-01-01T00:00:00.000Z", job.id);

  const result = cleanupOrphans(db, { runningTimeoutMs: 1000, log: silentLog });
  assert.deepEqual(result.failedJobs, [job.id]);

  const reloaded = repos.job.get(job.id);
  assert.equal(reloaded.status, "Failed");
  assert.ok(reloaded.end_date);
});

test("leaves a recently-started Running job alone", () => {
  const db = createTestDb();
  const repos = createRepositories(db);
  const job = repos.job.create("ingest", "New", null, null);
  repos.job.markRunning(job.id); // start_date = now

  const result = cleanupOrphans(db, { runningTimeoutMs: 60 * 60 * 1000, log: silentLog });
  assert.deepEqual(result.failedJobs, []);

  const reloaded = repos.job.get(job.id);
  assert.equal(reloaded.status, "Running");
});

test("clears a job_file lock held by a dead PID", () => {
  const db = createTestDb();
  const repos = createRepositories(db);
  const job = repos.job.create("ingest", "New", null, null);
  const jobFile = repos.job_file.create("f.txt", "/x/f.txt", "text/plain", "/x", job.id, "processing", 999999);

  const result = cleanupOrphans(db, { log: silentLog });
  assert.deepEqual(result.clearedLocks, [jobFile.id]);

  const reloaded = repos.job_file.get(jobFile.id);
  assert.equal(reloaded.lock_by_PID, null);
});

test("leaves a job_file lock held by a live PID alone", () => {
  const db = createTestDb();
  const repos = createRepositories(db);
  const job = repos.job.create("ingest", "New", null, null);
  const jobFile = repos.job_file.create("f.txt", "/x/f.txt", "text/plain", "/x", job.id, "processing", process.pid);

  const result = cleanupOrphans(db, { log: silentLog });
  assert.deepEqual(result.clearedLocks, []);

  const reloaded = repos.job_file.get(jobFile.id);
  assert.equal(reloaded.lock_by_PID, process.pid);
});

test("ignores a Running job with a null start_date rather than throwing", () => {
  const db = createTestDb();
  const repos = createRepositories(db);
  const job = repos.job.create("ingest", "New", null, null);
  // Force status=Running without going through markRunning, so start_date stays null.
  db.prepare("UPDATE job SET status = 'Running' WHERE id = ?").run(job.id);

  assert.doesNotThrow(() => cleanupOrphans(db, { log: silentLog }));
});
