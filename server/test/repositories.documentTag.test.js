const test = require("node:test");
const assert = require("node:assert/strict");
const { createTestDb } = require("./helpers/test-db");
const DocumentTagRepository = require("../lib/repositories/documentTag");
const DocumentRepository = require("../lib/repositories/document");
const TagRepository = require("../lib/repositories/tag");

function seedDocumentAndTag(db, tagName = "recipe") {
  const doc = new DocumentRepository(db).create("note.md", "/raw/note.md", "text/markdown", "utf-8", "New", null);
  const tag = new TagRepository(db).create(tagName);
  return { doc, tag };
}

test("DocumentTagRepository.link then listForDocument returns the linked tag name (regression: unbound query param)", () => {
  const db = createTestDb();
  const repo = new DocumentTagRepository(db);
  const { doc, tag } = seedDocumentAndTag(db);

  repo.link(doc.id, tag.name);

  assert.deepEqual(repo.listForDocument(doc.id), [tag.name]);
});

test("DocumentTagRepository.listForDocument only returns tags for the given document", () => {
  const db = createTestDb();
  const repo = new DocumentTagRepository(db);
  const docRepo = new DocumentRepository(db);
  const tagRepo = new TagRepository(db);

  const docA = docRepo.create("a.md", "/raw/a.md", null, null, "New", null);
  const docB = docRepo.create("b.md", "/raw/b.md", null, null, "New", null);
  const tagA = tagRepo.create("tag-a");
  const tagB = tagRepo.create("tag-b");

  repo.link(docA.id, tagA.name);
  repo.link(docB.id, tagB.name);

  assert.deepEqual(repo.listForDocument(docA.id), [tagA.name]);
  assert.deepEqual(repo.listForDocument(docB.id), [tagB.name]);
});

test("DocumentTagRepository.link rejects a nonexistent document", () => {
  const db = createTestDb();
  const repo = new DocumentTagRepository(db);
  const tag = new TagRepository(db).create("recipe");

  assert.throws(() => repo.link(999, tag.name), /document not found/);
});

test("DocumentTagRepository.link rejects a nonexistent tag", () => {
  const db = createTestDb();
  const repo = new DocumentTagRepository(db);
  const doc = new DocumentRepository(db).create("note.md", "/raw/note.md", null, null, "New", null);

  assert.throws(() => repo.link(doc.id, "no-such-tag"), /tag not found/);
});

test("DocumentTagRepository.link rejects an inactive tag", () => {
  const db = createTestDb();
  const repo = new DocumentTagRepository(db);
  const tagRepo = new TagRepository(db);
  const { doc, tag } = seedDocumentAndTag(db);
  tagRepo.remove(tag.name); // end-dates the tag, active = 0

  assert.throws(() => repo.link(doc.id, tag.name), /not active/);
});

test("DocumentTagRepository.link rejects a duplicate link", () => {
  const db = createTestDb();
  const repo = new DocumentTagRepository(db);
  const { doc, tag } = seedDocumentAndTag(db);

  repo.link(doc.id, tag.name);

  assert.throws(() => repo.link(doc.id, tag.name), /already has tag/);
});

test("DocumentTagRepository.unlink removes the association", () => {
  const db = createTestDb();
  const repo = new DocumentTagRepository(db);
  const { doc, tag } = seedDocumentAndTag(db);

  repo.link(doc.id, tag.name);
  assert.deepEqual(repo.listForDocument(doc.id), [tag.name]);

  repo.unlink(doc.id, tag.name);
  assert.deepEqual(repo.listForDocument(doc.id), []);
});
