const test = require("node:test");
const assert = require("node:assert/strict");
const { createTestDb } = require("./helpers/test-db");
const { createRepositories } = require("../lib/repositories");
const statusRouter = require("../routes/status");

test("POST /api/status returns job counts and failed job list", () => {
  const db = createTestDb();
  const repos = createRepositories(db);

  // Create some jobs with different statuses
  const job1 = repos.job.create("ingest", "New", null);
  const job2 = repos.job.create("ingest", "New", null);
  repos.job.markRunning(job2.id);
  const job3 = repos.job.create("classify", "New", null);
  repos.job.markFailed(job3.id, "Failed to classify: unknown topic");

  // Mock request/response
  const req = {
    app: {
      locals: {
        config: { vaultDir: "/nonexistent" }, // smart-connections will fail, which is expected
        repositories: repos,
      },
    },
  };

  let responseData = null;
  const res = {
    json: function (data) {
      responseData = data;
    },
  };

  // Call the route handler
  statusRouter.stack.forEach((layer) => {
    if (layer.route && layer.route.path === "/api/status") {
      layer.route.stack[1].handle(req, res);
    }
  });

  assert.ok(responseData, "should return JSON response");
  assert.ok(responseData.jobs, "should include jobs object");
  assert.ok(responseData.jobs.counts, "should include job counts");
  assert.equal(responseData.jobs.counts.pending, 1, "should count New jobs as pending");
  assert.equal(responseData.jobs.counts.active, 1, "should count Running jobs as active");
  assert.equal(responseData.jobs.counts.failed, 1, "should count Failed jobs");
  assert.ok(Array.isArray(responseData.jobs.failed), "should return failed jobs as array");
  assert.equal(responseData.jobs.failed.length, 1, "should include 1 failed job");
  assert.equal(responseData.jobs.failed[0].id, job3.id, "should include correct job id");
  assert.equal(
    responseData.jobs.failed[0].reason,
    "Failed to classify: unknown topic",
    "should include error_message as reason"
  );
});

test("POST /api/status/retry/:id re-queues a Failed job", () => {
  const db = createTestDb();
  const repos = createRepositories(db);

  const doc = repos.document.create("test.txt", "/path/test.txt", "text/plain", "utf-8", "New", null);
  const job = repos.job.create("ingest", "New", doc.id);
  repos.job.markRunning(job.id);
  repos.job.markFailed(job.id, "Test error");

  // Verify job is Failed
  assert.equal(repos.job.get(job.id).status, "Failed");

  // Mock request/response for retry endpoint
  const req = {
    params: { id: String(job.id) },
    app: {
      locals: {
        repositories: repos,
      },
    },
  };

  let responseData = null;
  const res = {
    status: function (code) {
      this._statusCode = code;
      return this;
    },
    json: function (data) {
      responseData = data;
    },
  };

  // Call retry endpoint
  statusRouter.stack.forEach((layer) => {
    if (layer.route && layer.route.path === "/api/status/retry/:id") {
      layer.route.stack[1].handle(req, res);
    }
  });

  assert.ok(responseData, "should return JSON response");
  assert.equal(responseData.status, "New", "should reset job to New status for retry");
  assert.equal(responseData.start_date, null, "should clear start_date");
  assert.equal(responseData.end_date, null, "should clear end_date");
});

test("POST /api/status/retry/:id returns 404 if job not found", () => {
  const db = createTestDb();
  const repos = createRepositories(db);

  const req = {
    params: { id: "99999" },
    app: {
      locals: {
        repositories: repos,
      },
    },
  };

  let responseData = null;
  let statusCode = null;
  const res = {
    status: function (code) {
      statusCode = code;
      return this;
    },
    json: function (data) {
      responseData = data;
    },
  };

  // Call retry endpoint with non-existent job
  statusRouter.stack.forEach((layer) => {
    if (layer.route && layer.route.path === "/api/status/retry/:id") {
      layer.route.stack[1].handle(req, res);
    }
  });

  assert.equal(statusCode, 404, "should return 404 status");
  assert.ok(responseData.error, "should return error message");
});

test("POST /api/status/retry/:id returns 400 if job id is invalid", () => {
  const db = createTestDb();
  const repos = createRepositories(db);

  const req = {
    params: { id: "not-a-number" },
    app: {
      locals: {
        repositories: repos,
      },
    },
  };

  let responseData = null;
  let statusCode = null;
  const res = {
    status: function (code) {
      statusCode = code;
      return this;
    },
    json: function (data) {
      responseData = data;
    },
  };

  // Call retry endpoint with invalid job id
  statusRouter.stack.forEach((layer) => {
    if (layer.route && layer.route.path === "/api/status/retry/:id") {
      layer.route.stack[1].handle(req, res);
    }
  });

  assert.equal(statusCode, 400, "should return 400 status");
  assert.ok(responseData.error, "should return error message");
});

test("POST /api/status shows error_message for failed jobs", () => {
  const db = createTestDb();
  const repos = createRepositories(db);

  // Create a job with a specific error message
  const job = repos.job.create("convert", "New", null);
  repos.job.markRunning(job.id);
  repos.job.markFailed(job.id, "Source file does not exist: /path/to/missing.pdf");

  const req = {
    app: {
      locals: {
        config: { vaultDir: "/nonexistent" },
        repositories: repos,
      },
    },
  };

  let responseData = null;
  const res = {
    json: function (data) {
      responseData = data;
    },
  };

  // Call status endpoint
  statusRouter.stack.forEach((layer) => {
    if (layer.route && layer.route.path === "/api/status") {
      layer.route.stack[1].handle(req, res);
    }
  });

  assert.ok(responseData.jobs.failed.length > 0, "should have failed jobs");
  const failedJob = responseData.jobs.failed.find((j) => j.id === job.id);
  assert.ok(failedJob, "should include the failed job");
  assert.equal(
    failedJob.reason,
    "Source file does not exist: /path/to/missing.pdf",
    "should include the specific error_message"
  );
});
