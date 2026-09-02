const ingestExecutor = require("../server/lib/ingestion/ingest-executor");
const transcodeExecutor = require("../server/lib/ingestion/transcode-executor");
const htmlSanitizeExecutor = require("../server/lib/ingestion/html-sanitize-executor");
const classificationExecutor = require("../server/lib/ingestion/classification-executor");
const indexExecutor = require("../vault/index-executor");

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
 * 'classify' (Story 2.1) processes documents already in $VAULT_DIR/incoming,
 * inferring tags and topic/subtopic via Ollama, then moving the file to its
 * final vault location.
 *
 * 'index' (Story 3.1) triggers vault change detection and Smart Connections
 * status verification. The vault watcher detects new/modified notes; the
 * Smart Connections plugin (Obsidian) handles actual re-indexing.
 */
const executors = {
  ingest: ingestExecutor,
  convert: {
    canHandle: (db, job) => htmlSanitizeExecutor.canHandle(db, job) || transcodeExecutor.canHandle(db, job),
    execute: (db, job, cfg) => htmlSanitizeExecutor.canHandle(db, job)
      ? htmlSanitizeExecutor.execute(db, job, cfg)
      : transcodeExecutor.execute(db, job, cfg),
  },
  classify: classificationExecutor,
  index: indexExecutor,
};

module.exports = { executors };
