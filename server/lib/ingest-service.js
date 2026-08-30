const path = require("path");
const { createRepositories } = require("./repositories");
const { withTransaction } = require("./repositories/tx");
const { getDatabase } = require("../db/init");
const fileValidator = require("./ingestion/file-validator");

function parseTags(raw) {
  if (!raw) return [];
  return [...new Set(
    String(raw)
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  )];
}

function createIngestJob(db, { name, uriLocation, mimeType, charset, tags }) {
  if (!uriLocation) throw new Error("uriLocation is required");

  return withTransaction(db, (txDb) => {
    const repos = createRepositories(txDb);

    // Create or get tags
    const tagNames = parseTags(tags);
    tagNames.forEach((tagName) => {
      repos.tag.upsert(tagName);
    });

    // Create document — uri_location is the staged raw-dir path until a
    // later stage (Story 1.1's ingest executor) moves it into the vault.
    const document = repos.document.create(name, uriLocation, mimeType, charset, "New", null);

    // Link tags to document
    tagNames.forEach((tagName) => {
      repos.document_tag.link(document.id, tagName);
    });

    // Story 1.2: files that need transcoding (per file-validator's classification)
    // are queued as job_type 'convert' instead of 'ingest', so the worker
    // (Story 4.1) routes them to transcode-executor.js rather than
    // ingest-executor.js, which only handles directly-indexable text/md/html.
    const classification = fileValidator.classify({ path: uriLocation, mime_type: mimeType });
    const jobType = classification.kind === "indexable" ? "ingest" : "convert";
    const job = repos.job.create(jobType, "New", document.id);

    // Record the staged file the job should act on. Without this, a worker
    // (Story 4.1) picking up the job has no queryable path to process.
    const fileName = path.basename(uriLocation);
    repos.job_file.create(fileName, uriLocation, mimeType, path.dirname(uriLocation), job.id, "staged", null);

    return job.id;
  });
}

module.exports = { createIngestJob, parseTags };
