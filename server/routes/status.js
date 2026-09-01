// Story 6.3: real Smart Connections indexing status + real job-queue counts,
// replacing the Story 6.4 mock. Smart Connections summary comes from
// server/lib/smart-connections-status.js (a JS port of
// vault/check_smart_connections_status.py, Spike 3.2); job counts/failed list
// come from the job repository (Story 13.3).
const express = require("express");
const smartConnectionsStatus = require("../lib/smart-connections-status");

const router = express.Router();

router.post("/api/status", express.json(), (req, res) => {
  const cfg = req.app.locals.config;
  const jobRepo = req.app.locals.repositories.job;

  let indexing;
  try {
    indexing = smartConnectionsStatus.summarize(cfg);
  } catch (err) {
    // Smart Connections' .smart-env files may not exist yet (fresh vault,
    // indexing never run) — degrade to zeroed counts rather than failing the
    // whole status panel, since the job-queue half is still useful on its own.
    indexing = {
      sources: { total: 0, current: 0, missing: 0, skipped: 0, unexpected: 0 },
      blocks: { total: 0, current: 0, missing: 0, skipped: 0, unexpected: 0 },
      skippedSources: [],
      error: `Smart Connections status unavailable: ${err.message}`,
    };
  }

  const counts = jobRepo.countsByStatus();
  const jobCounts = { active: 0, pending: 0, failed: 0, completed: 0 };
  for (const row of counts) {
    if (row.status === "Running") jobCounts.active = row.count;
    else if (row.status === "New") jobCounts.pending = row.count;
    else if (row.status === "Failed") jobCounts.failed = row.count;
    else if (row.status === "Completed") jobCounts.completed = row.count;
  }

  const failedJobs = jobRepo.listByStatus("Failed").map((job) => ({
    id: job.id,
    jobType: job.job_type,
    documentId: job.document_id,
    endDate: job.end_date,
    // schema.sql's job table has no persisted error-message column (see
    // DESIGN-DEBT.md) — reason text is honest about that gap rather than
    // inventing detail the system doesn't actually capture.
    reason: "No error detail persisted for this job — see server logs.",
  }));

  res.json({
    ...indexing,
    jobs: { counts: jobCounts, failed: failedJobs },
  });
});

router.post("/api/status/retry/:id", express.json(), (req, res) => {
  const jobRepo = req.app.locals.repositories.job;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "invalid job id" });
  }

  const retried = jobRepo.retry(id);
  if (!retried) {
    return res.status(404).json({ error: `job ${id} not found, or not currently Failed` });
  }
  res.json(retried);
});

module.exports = router;
