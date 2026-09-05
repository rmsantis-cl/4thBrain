const path = require("path");
const chokidar = require("chokidar");
const mime = require("mime-types");
const { createRepositories } = require("../repositories");
const { createIngestJob } = require("../ingest-service");

/**
 * Watches cfg.rawDirInbox for files that appear outside the web ingestion
 * form (Story 6.1) — e.g. dropped in directly, or synced there by some other
 * tool — and registers them the same way Story 6.1's form does: a
 * document + job(type=ingest) + job_file record via createIngestJob().
 *
 * Files the web form already staged are skipped: raw-dir-writer.js writes
 * into this same directory and ingest-service.js registers them
 * synchronously within the HTTP request, so without a dedup check this
 * watcher would create a second, duplicate job for the same file the moment
 * it saw the 'add' event. job_file.findByPath() is the dedup key.
 *
 * ignoreInitial is false on purpose: a file already sitting in rawDirInbox
 * when the server starts (e.g. dropped while the process was down) should
 * still be picked up, not silently ignored until its next write.
 *
 * Returns { close() } — callers (server boot, tests) must call close() to
 * release the underlying fs watch.
 */
function createWatcher(cfg, db, { onJobCreated, onError, onSkipped } = {}) {
  const watcher = chokidar.watch(cfg.rawDirInbox, {
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 50,
    },
  });

  watcher.on("add", (filePath) => {
    try {
      const absPath = path.resolve(filePath);
      const repos = createRepositories(db);

      const existing = repos.job_file.findByPath(absPath);
      if (existing) {
        if (onSkipped) onSkipped(absPath, "already tracked by job_file " + existing.id);
        return;
      }

      const name = path.basename(absPath);
      const mimeType = mime.lookup(absPath) || null;

      const jobId = createIngestJob(db, {
        name,
        uriLocation: absPath,
        mimeType,
        charset: mimeType ? "utf-8" : null,
        tags: undefined,
      });

      if (onJobCreated) onJobCreated(jobId, absPath);
    } catch (err) {
      if (onError) onError(err, filePath);
      else console.error(JSON.stringify({ level: "error", component: "ingestion.watcher", event: "add_failed", filePath, error: err.message }));
    }
  });

  watcher.on("error", (err) => {
    if (onError) onError(err, null);
    else console.error(JSON.stringify({ level: "error", component: "ingestion.watcher", event: "watch_error", error: err.message }));
  });

  return {
    close: () => watcher.close(),
    _chokidar: watcher, // exposed for tests that need to await 'ready'
  };
}

module.exports = { createWatcher };
