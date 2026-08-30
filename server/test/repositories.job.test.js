const test = require("node:test");
const assert = require("node:assert/strict");
const { createTestDb } = require("./helpers/test-db");
const JobRepository = require("../lib/repositories/job");

test("JobRepository.create defaults start_date/end_date to null", () => {
  const db = createTestDb();
  const repo = new JobRepository(db);
  const job = repo.create("ingest", "New", null, null);

  assert.equal(job.job_type, "ingest");
  assert.equal(job.status, "New");
  assert.equal(job.start_date, null);
  assert.equal(job.end_date, null);
});

test("JobRepository.markRunning stamps start_date and only transitions from New", () => {
  const db = createTestDb();
  const repo = new JobRepository(db);
  const job = repo.create("ingest", "New", null, null);

  const running = repo.markRunning(job.id);
  assert.equal(running.status, "Running");
  assert.ok(running.start_date, "start_date should be stamped");

  // A second markRunning call must be a no-op (already Running, not New) —
  // this is the guard against two workers double-claiming the same job.
  const secondAttempt = repo.markRunning(job.id);
  assert.equal(secondAttempt, null);
});

test("JobRepository.markCompleted stamps end_date", () => {
  const db = createTestDb();
  const repo = new JobRepository(db);
  const job = repo.create("ingest", "New", null, null);
  repo.markRunning(job.id);

  const completed = repo.markCompleted(job.id);
  assert.equal(completed.status, "Completed");
  assert.ok(completed.end_date);
});

test("JobRepository.markFailed stamps end_date", () => {
  const db = createTestDb();
  const repo = new JobRepository(db);
  const job = repo.create("ingest", "New", null, null);
  repo.markRunning(job.id);

  const failed = repo.markFailed(job.id);
  assert.equal(failed.status, "Failed");
  assert.ok(failed.end_date);
});

test("JobRepository.listPending filters by status and job_type, respects limit", () => {
  const db = createTestDb();
  const repo = new JobRepository(db);
  const j1 = repo.create("ingest", "New", null, null);
  const j2 = repo.create("ingest", "New", null, null);
  repo.create("classify", "New", null, null); // different type, should be excluded
  const j4 = repo.create("ingest", "New", null, null);
  repo.markRunning(j2.id); // no longer New, should be excluded

  const pending = repo.listPending(["ingest"], "New", 10);
  const ids = pending.map((j) => j.id);
  assert.deepEqual(ids, [j1.id, j4.id]);
});

test("JobRepository.listPending returns [] for an empty job_type list", () => {
  const db = createTestDb();
  const repo = new JobRepository(db);
  repo.create("ingest", "New", null, null);
  assert.deepEqual(repo.listPending([], "New", 10), []);
});

test("JobRepository.listByStatus", () => {
  const db = createTestDb();
  const repo = new JobRepository(db);
  const j1 = repo.create("ingest", "New", null, null);
  repo.markRunning(j1.id);
  repo.create("ingest", "New", null, null);

  const running = repo.listByStatus("Running");
  assert.equal(running.length, 1);
  assert.equal(running[0].id, j1.id);
});

test("JobRepository.create rejects an unknown job_type", () => {
  const db = createTestDb();
  const repo = new JobRepository(db);
  assert.throws(() => repo.create("not-a-real-type", "New", null, null), /job_type not found/);
});
