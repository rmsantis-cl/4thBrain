const sqlite = require("node:sqlite");
const fs = require("fs");
const path = require("path");

// Create test db with schema
const schema = fs.readFileSync("documets/design/schema.sql", "utf-8");
const db = new sqlite.DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON");
db.exec(schema);

// Now try the same operations the test does
try {
  console.log("1. Trying to create a document...");
  db.prepare("INSERT INTO document (name, uri_location, mime_type, charset, status, topic) VALUES (?, ?, ?, ?, ?, ?)")
    .run("test.html", "/tmp/test.html", "text/html", "utf-8", "New", null);

  const docId = db.prepare("SELECT last_insert_rowid() as id").get().id;
  console.log("Document created with id:", docId);

  console.log("2. Trying to create a job...");
  db.prepare("INSERT INTO job (job_type, status, document_id, parent_job_id) VALUES (?, ?, ?, ?)")
    .run("convert", "New", docId, null);

  const jobId = db.prepare("SELECT last_insert_rowid() as id").get().id;
  console.log("Job created with id:", jobId);

  console.log("SUCCESS: All operations completed");
} catch (e) {
  console.error("ERROR:", e.message);
  console.error("Stack:", e.stack);
}
