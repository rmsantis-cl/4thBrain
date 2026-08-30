const ingestExecutor = require("../server/lib/ingestion/ingest-executor");
const transcodeExecutor = require("../server/lib/ingestion/transcode-executor");

/**
 * job_type -> executor dispatch table. Each executor exposes:
 *   canHandle(db, job) -> boolean   (checked BEFORE the job is claimed)
 *   execute(db, job, cfg) -> result (throws on failure; may be async)
 *
 * 'ingest' (Story 1.1: text/md/html files) and 'convert' (Story 1.2: binary
 * formats needing transcoding) are registered. 'classify' (Story 2.1) and
 * 'index' (Story 3.1) are valid job_type enum values but have no executor
 * yet — the worker's poll query only looks at registered types, so jobs of
 * those types simply stay 'New' until a later story registers a handler for
 * them. This is deliberate: it keeps jobs visible/queryable instead of
 * silently dropping them or misrepresenting "not yet implemented" as
 * "Failed".
 */
const executors = {
  ingest: ingestExecutor,
  convert: transcodeExecutor,
};

module.exports = { executors };
