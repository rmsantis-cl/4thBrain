const crypto = require("crypto");

function parseTags(raw) {
  if (!raw) return [];
  return [...new Set(
    String(raw)
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  )];
}

function upsertTag(db, name) {
  db.prepare("INSERT OR IGNORE INTO tag (id, name) VALUES (?, ?)").run(crypto.randomUUID(), name);
  return db.prepare("SELECT id FROM tag WHERE name = ?").get(name).id;
}

function createIngestJob(db, { name, uriLocation, mimeType, charset, tags }) {
  const now = new Date().toISOString();
  const documentId = crypto.randomUUID();
  const jobId = crypto.randomUUID();

  db.prepare(
    `INSERT INTO document (id, name, uri_location, mime_type, charset, status_id, created, updated)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
  ).run(documentId, name, uriLocation, mimeType || null, charset || null, now, now);

  for (const tagName of parseTags(tags)) {
    const tagId = upsertTag(db, tagName);
    db.prepare(
      "INSERT OR IGNORE INTO document_tag (document_id, tag_id) VALUES (?, ?)"
    ).run(documentId, tagId);
  }

  db.prepare(
    `INSERT INTO job (id, job_type_id, start_date, status)
     VALUES (?, 1, ?, 'New')`
  ).run(jobId, now);

  db.prepare(
    `INSERT INTO job_document (id, job_id, doc_id, process_id, status)
     VALUES (?, ?, ?, '1', 'New')`
  ).run(crypto.randomUUID(), jobId, documentId);

  return jobId;
}

module.exports = { createIngestJob, parseTags };
