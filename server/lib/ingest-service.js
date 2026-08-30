const { createRepositories } = require("./repositories");
const { withTransaction } = require("./repositories/tx");
const { getDatabase } = require("../db/init");

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
  return withTransaction(db, (txDb) => {
    const repos = createRepositories(txDb);

    // Create or get tags
    const tagNames = parseTags(tags);
    tagNames.forEach((tagName) => {
      repos.tag.upsert(tagName);
    });

    // Create document
    const document = repos.document.create({
      name,
      uriLocation,
      mimeType,
      charset,
      status: "New",
      topic: null
    });

    // Link tags to document
    tagNames.forEach((tagName) => {
      repos.document_tag.link(document.id, tagName);
    });

    // Create job
    const job = repos.job.create("ingest", document.id);

    return job.id;
  });
}

module.exports = { createIngestJob, parseTags };
