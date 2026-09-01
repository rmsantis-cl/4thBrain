const sqlite = require("node:sqlite");
const fs = require("fs");
const path = require("path");

// Import the actual code
const { createRepositories } = require("./server/lib/repositories");

// Create test db with schema
const schema = fs.readFileSync("documets/design/schema.sql", "utf-8");
const db = new sqlite.DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON");
db.exec(schema);

// Create repositories like the test does
const repos = createRepositories(db);

try {
  console.log("1. Creating a document...");
  const doc = repos.document.create("test.html", "/tmp/test.html", "text/html", "utf-8", "New", null);
  console.log("Document created:", doc);

  const docId = doc.id;
  console.log("Document id:", docId);

  console.log("2. Creating a job...");
  const job = repos.job.create("convert", "New", docId, null);
  console.log("Job created:", job);

  console.log("SUCCESS: All operations completed");
} catch (e) {
  console.error("ERROR:", e.message);
  console.error("Code:", e.code);
  console.error("Stack:", e.stack);
}
