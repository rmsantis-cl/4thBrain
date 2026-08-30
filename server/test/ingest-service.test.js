<<<<<<< HEAD
const test = require("node:test");
const assert = require("node:assert/strict");
const { createTestDb } = require("./helpers/test-db");
const { createIngestJob, parseTags } = require("../lib/ingest-service");

test("createIngestJob succeeds end-to-end (regression for Bug 2: previously threw 'no such column: description')", () => {
  const db = createTestDb();
  const jobId = createIngestJob(db, {
    name: "note.txt",
    uriLocation: "/raw/inbox/note.txt",
    mimeType: "text/plain",
    charset: "utf-8",
    tags: "personal, ideas",
  });

  assert.equal(typeof jobId, "number");

  const job = db.prepare("SELECT * FROM job WHERE id = ?").get(jobId);
  assert.equal(job.job_type, "ingest");
  assert.equal(job.status, "New");

  const doc = db.prepare("SELECT * FROM document WHERE id = ?").get(job.document_id);
  assert.equal(doc.name, "note.txt");
  assert.equal(doc.uri_location, "/raw/inbox/note.txt");
  assert.equal(doc.status, "New");

  const tags = db.prepare("SELECT tag_name FROM document_tag WHERE document_id = ? ORDER BY tag_name").all(doc.id).map((r) => r.tag_name);
  assert.deepEqual(tags, ["ideas", "personal"]);
});

test("createIngestJob creates a job_file record pointing at the staged path (previously missing entirely)", () => {
  const db = createTestDb();
  const jobId = createIngestJob(db, {
    name: "note.txt",
    uriLocation: "/raw/inbox/note.txt",
    mimeType: "text/plain",
    charset: "utf-8",
    tags: null,
  });

  const jobFile = db.prepare("SELECT * FROM job_file WHERE job_id = ?").get(jobId);
  assert.ok(jobFile, "expected a job_file row for this job");
  assert.equal(jobFile.path, "/raw/inbox/note.txt");
  assert.equal(jobFile.name, "note.txt");
  assert.equal(jobFile.directory, "/raw/inbox");
});

test("createIngestJob works with no tags", () => {
  const db = createTestDb();
  const jobId = createIngestJob(db, { name: "x.txt", uriLocation: "/raw/x.txt", mimeType: null, charset: null, tags: undefined });
  assert.equal(typeof jobId, "number");
});

test("createIngestJob validates uriLocation before opening a transaction", () => {
  const db = createTestDb();
  assert.throws(() => createIngestJob(db, { name: "x.txt", uriLocation: "", mimeType: null, charset: null, tags: null }), /uriLocation is required/);
  const count = db.prepare("SELECT COUNT(*) as c FROM document").get().c;
  assert.equal(count, 0);
});

test("createIngestJob rolls back the whole transaction if a later step fails (tag insert isn't left behind)", () => {
  const db = createTestDb();
  // Tags are upserted first, then document.create() fails (missing name) —
  // proves withTransaction actually rolls back the earlier tag insert
  // rather than leaving a partial, inconsistent write behind.
  assert.throws(() => createIngestJob(db, { name: "", uriLocation: "/raw/x.txt", mimeType: null, charset: null, tags: "orphan-tag" }));

  const tagCount = db.prepare("SELECT COUNT(*) as c FROM tag WHERE name = 'orphan-tag'").get().c;
  assert.equal(tagCount, 0, "tag insert should have been rolled back along with the failed document.create()");
});

test("parseTags dedupes, trims, and drops empties", () => {
  assert.deepEqual(parseTags("a, b ,a,, c"), ["a", "b", "c"]);
  assert.deepEqual(parseTags(""), []);
  assert.deepEqual(parseTags(null), []);
});
=======
const test = require("node:test");
const assert = require("node:assert/strict");
const { createTestDb } = require("./helpers/test-db");
const { createIngestJob, parseTags } = require("../lib/ingest-service");

test("createIngestJob succeeds end-to-end (regression for Bug 2: previously threw 'no such column: description')", () => {
  const db = createTestDb();
  const jobId = createIngestJob(db, {
    name: "note.txt",
    uriLocation: "/raw/inbox/note.txt",
    mimeType: "text/plain",
    charset: "utf-8",
    tags: "personal, ideas",
  });

  assert.equal(typeof jobId, "number");

  const job = db.prepare("SELECT * FROM job WHERE id = ?").get(jobId);
  assert.equal(job.job_type, "ingest");
  assert.equal(job.status, "New");

  const doc = db.prepare("SELECT * FROM document WHERE id = ?").get(job.document_id);
  assert.equal(doc.name, "note.txt");
  assert.equal(doc.uri_location, "/raw/inbox/note.txt");
  assert.equal(doc.status, "New");

  const tags = db.prepare("SELECT tag_name FROM document_tag WHERE document_id = ? ORDER BY tag_name").all(doc.id).map((r) => r.tag_name);
  assert.deepEqual(tags, ["ideas", "personal"]);
});

test("createIngestJob creates a job_file record pointing at the staged path (previously missing entirely)", () => {
  const db = createTestDb();
  const jobId = createIngestJob(db, {
    name: "note.txt",
    uriLocation: "/raw/inbox/note.txt",
    mimeType: "text/plain",
    charset: "utf-8",
    tags: null,
  });

  const jobFile = db.prepare("SELECT * FROM job_file WHERE job_id = ?").get(jobId);
  assert.ok(jobFile, "expected a job_file row for this job");
  assert.equal(jobFile.path, "/raw/inbox/note.txt");
  assert.equal(jobFile.name, "note.txt");
  assert.equal(jobFile.directory, "/raw/inbox");
});

test("createIngestJob works with no tags", () => {
  const db = createTestDb();
  const jobId = createIngestJob(db, { name: "x.txt", uriLocation: "/raw/x.txt", mimeType: null, charset: null, tags: undefined });
  assert.equal(typeof jobId, "number");
});

test("createIngestJob validates uriLocation before opening a transaction", () => {
  const db = createTestDb();
  assert.throws(() => createIngestJob(db, { name: "x.txt", uriLocation: "", mimeType: null, charset: null, tags: null }), /uriLocation is required/);
  const count = db.prepare("SELECT COUNT(*) as c FROM document").get().c;
  assert.equal(count, 0);
});

test("createIngestJob rolls back the whole transaction if a later step fails (tag insert isn't left behind)", () => {
  const db = createTestDb();
  // Tags are upserted first, then document.create() fails (missing name) —
  // proves withTransaction actually rolls back the earlier tag insert
  // rather than leaving a partial, inconsistent write behind.
  assert.throws(() => createIngestJob(db, { name: "", uriLocation: "/raw/x.txt", mimeType: null, charset: null, tags: "orphan-tag" }));

  const tagCount = db.prepare("SELECT COUNT(*) as c FROM tag WHERE name = 'orphan-tag'").get().c;
  assert.equal(tagCount, 0, "tag insert should have been rolled back along with the failed document.create()");
});

test("parseTags dedupes, trims, and drops empties", () => {
  assert.deepEqual(parseTags("a, b ,a,, c"), ["a", "b", "c"]);
  assert.deepEqual(parseTags(""), []);
  assert.deepEqual(parseTags(null), []);
});
>>>>>>> v03-eth
