const ingestExecutor = require("../server/lib/ingestion/ingest-executor");
const transcodeExecutor = require("../server/lib/ingestion/transcode-executor");
const htmlSanitizeExecutor = require("../server/lib/ingestion/html-sanitize-executor");

/**
 * job_type -> executor dispatch table. Each executor exposes:
 *   canHandle(db, job) -> boolean   (checked BEFORE the job is claimed)
 *   execute(db, job, cfg) -> result (throws on failure; may be async)
 *
 * 'ingest' (Story 1.1: text/md files) and 'convert' (Story 1.2: binary
 * formats needing transcoding, including HTML sanitization per
 * html-sanitize-executor.js) are registered. Within 'convert', jobs are
 * dispatched by canHandle() precedence: html-sanitize-executor claims HTML
 * files first, transcode-executor claims everything else (PDF, .docx,
 * archive-only binaries).
 *
 * 'classify' (Story 2.1) and 'index' (Story 3.1) are valid job_type enum
 * values but have no executor yet — the worker's poll query only looks at
 * registered types, so jobs of those types simply stay 'New' until a later
 * story registers a handler for them. This is deliberate: it keeps jobs
 * visible/queryable instead of silently dropping them or misrepresenting
 * "not yet implemented" as "Failed".
 */
const executors = {
  ingest: ingestExecutor,
  convert: {
    canHandle: (db, job) => htmlSanitizeExecutor.canHandle(db, job) || transcodeExecutor.canHandle(db, job),
    execute: (db, job, cfg) => htmlSanitizeExecutor.canHandle(db, job)
      ? htmlSanitizeExecutor.execute(db, job, cfg)
      : transcodeExecutor.execute(db, job, cfg),
  },
};

module.exports = { executors };
