let running = false;

function startJobQueuePoller({ db, repos, config, handlers, logger }) {
  let intervalHandle = setInterval(() => pollOnce(), config.jobPollIntervalMs);

  async function pollOnce() {
    if (running) return;
    running = true;

    try {
      const jobs = repos.job.listNew(config.threadCount);

      for (const job of jobs) {
        const document = repos.document.get(job.document_id);
        const log = logger.forDocument(document.id, job.id);

        log.info(
          "actuator_start",
          `${job.job_type} starting for document ${document.id} ("${document.name}"), status=${document.status}`,
          { id: document.id, name: document.name, status: document.status }
        );

        repos.job.markRunning(job.id);

        try {
          const handler = handlers[job.job_type];
          if (!handler) {
            throw new Error(`job_type "${job.job_type}" handler not implemented`);
          }
          await handler({ job, document, repos, cfg: config, logger });
          repos.job.markCompleted(job.id);

          const after = repos.document.get(document.id);
          log.info(
            "actuator_end",
            `${job.job_type} completed for document ${after.id} ("${after.name}"), status=${after.status}`,
            { id: after.id, name: after.name, status: after.status }
          );
        } catch (err) {
          repos.job.markFailed(job.id);
          const after = repos.document.get(document.id);
          log.error(
            "actuator_end",
            `${job.job_type} failed for document ${after.id} ("${after.name}"), status=${after.status}: ${err.message}`,
            { id: after.id, name: after.name, status: after.status }
          );
        }
      }
    } catch (err) {
      logger.error("poller_error", `Job queue poller encountered an error: ${err.message}`, {});
    } finally {
      running = false;
    }
  }

  return {
    stop: () => clearInterval(intervalHandle),
  };
}

module.exports = { startJobQueuePoller };
