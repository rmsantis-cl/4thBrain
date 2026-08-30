<<<<<<< HEAD
const test = require("node:test");
const assert = require("node:assert/strict");
const { createTestDb } = require("./helpers/test-db");
const DocumentRepository = require("../lib/repositories/document");

test("DocumentRepository.create persists all schema columns and defaults timestamps", () => {
  const db = createTestDb();
  const repo = new DocumentRepository(db);

  const doc = repo.create("note.md", "/raw/inbox/note.md", "text/markdown", "utf-8", "New", null);

  assert.equal(doc.name, "note.md");
  assert.equal(doc.uri_location, "/raw/inbox/note.md");
  assert.equal(doc.mime_type, "text/markdown");
  assert.equal(doc.charset, "utf-8");
  assert.equal(doc.status, "New");
  assert.equal(doc.topic, null);
  assert.ok(doc.created, "created should be auto-populated");
  assert.ok(doc.updated, "updated should be auto-populated");
});

test("DocumentRepository.create rejects missing name", () => {
  const db = createTestDb();
  const repo = new DocumentRepository(db);
  assert.throws(() => repo.create(null, "/x", null, null, "New", null), /name is required/);
});

test("DocumentRepository.create rejects missing uri_location", () => {
  const db = createTestDb();
  const repo = new DocumentRepository(db);
  assert.throws(() => repo.create("x.txt", null, null, null, "New", null), /uri_location is required/);
});

test("DocumentRepository.create rejects an unknown status (not just wrong case)", () => {
  const db = createTestDb();
  const repo = new DocumentRepository(db);
  assert.throws(() => repo.create("x.txt", "/x", null, null, "new", null), /status not found: new/);
});

test("DocumentRepository.setStatus updates status and bumps updated timestamp", async () => {
  const db = createTestDb();
  const repo = new DocumentRepository(db);
  const doc = repo.create("x.txt", "/raw/x.txt", "text/plain", "utf-8", "New", null);

  await new Promise((r) => setTimeout(r, 5)); // ensure a distinguishable timestamp
  const updated = repo.setStatus(doc.id, "Processing");

  assert.equal(updated.status, "Processing");
  assert.notEqual(updated.updated, doc.updated);
});

test("DocumentRepository.get returns undefined for a missing id", () => {
  const db = createTestDb();
  const repo = new DocumentRepository(db);
  assert.equal(repo.get(999), undefined);
});

test("DocumentRepository.list returns documents ordered by id", () => {
  const db = createTestDb();
  const repo = new DocumentRepository(db);
  repo.create("a.txt", "/a", null, null, "New", null);
  repo.create("b.txt", "/b", null, null, "New", null);

  const rows = repo.list();
  assert.equal(rows.length, 2);
  assert.ok(rows[0].id < rows[1].id);
});
=======
const test = require("node:test");
const assert = require("node:assert/strict");
const { createTestDb } = require("./helpers/test-db");
const DocumentRepository = require("../lib/repositories/document");

test("DocumentRepository.create persists all schema columns and defaults timestamps", () => {
  const db = createTestDb();
  const repo = new DocumentRepository(db);

  const doc = repo.create("note.md", "/raw/inbox/note.md", "text/markdown", "utf-8", "New", null);

  assert.equal(doc.name, "note.md");
  assert.equal(doc.uri_location, "/raw/inbox/note.md");
  assert.equal(doc.mime_type, "text/markdown");
  assert.equal(doc.charset, "utf-8");
  assert.equal(doc.status, "New");
  assert.equal(doc.topic, null);
  assert.ok(doc.created, "created should be auto-populated");
  assert.ok(doc.updated, "updated should be auto-populated");
});

test("DocumentRepository.create rejects missing name", () => {
  const db = createTestDb();
  const repo = new DocumentRepository(db);
  assert.throws(() => repo.create(null, "/x", null, null, "New", null), /name is required/);
});

test("DocumentRepository.create rejects missing uri_location", () => {
  const db = createTestDb();
  const repo = new DocumentRepository(db);
  assert.throws(() => repo.create("x.txt", null, null, null, "New", null), /uri_location is required/);
});

test("DocumentRepository.create rejects an unknown status (not just wrong case)", () => {
  const db = createTestDb();
  const repo = new DocumentRepository(db);
  assert.throws(() => repo.create("x.txt", "/x", null, null, "new", null), /status not found: new/);
});

test("DocumentRepository.setStatus updates status and bumps updated timestamp", async () => {
  const db = createTestDb();
  const repo = new DocumentRepository(db);
  const doc = repo.create("x.txt", "/raw/x.txt", "text/plain", "utf-8", "New", null);

  await new Promise((r) => setTimeout(r, 5)); // ensure a distinguishable timestamp
  const updated = repo.setStatus(doc.id, "Processing");

  assert.equal(updated.status, "Processing");
  assert.notEqual(updated.updated, doc.updated);
});

test("DocumentRepository.get returns undefined for a missing id", () => {
  const db = createTestDb();
  const repo = new DocumentRepository(db);
  assert.equal(repo.get(999), undefined);
});

test("DocumentRepository.list returns documents ordered by id", () => {
  const db = createTestDb();
  const repo = new DocumentRepository(db);
  repo.create("a.txt", "/a", null, null, "New", null);
  repo.create("b.txt", "/b", null, null, "New", null);

  const rows = repo.list();
  assert.equal(rows.length, 2);
  assert.ok(rows[0].id < rows[1].id);
});
>>>>>>> v03-eth
