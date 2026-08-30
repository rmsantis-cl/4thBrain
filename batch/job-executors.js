const ingestExecutor = require("../server/lib/ingestion/ingest-executor");

/**
 * job_type -> executor dispatch table. Each executor exposes:
 *   canHandle(db, job) -> boolean   (checked BEFORE the job is claimed)
 *   execute(db, job, cfg) -> result (throws on failure)
 *
 * Only 'ingest' is registered today (Story 1.1's scope: text/md/html files).
 * 'convert' (Story 1.2), 'classify' (Story 2.1), and 'index' (Story 3.1) are
 * valid job_type enum values but have no executor yet — the worker's poll
 * query only looks at registered types, so jobs of those types simply stay
 * 'New' until a later story registers a handler for them. This is
 * deliberate: it keeps jobs visible/queryable instead of silently dropping
 * them or misrepresenting "not yet implemented" as "Failed".
 */
const executors = {
  ingest: ingestExecutor,
};

module.exports = { executors };
