const test = require("node:test");
const assert = require("node:assert/strict");
const { createTestDb } = require("./helpers/test-db");
const TagRepository = require("../lib/repositories/tag");

test("TagRepository.create does not reference a description column (regression for Bug 2)", () => {
  const db = createTestDb();
  const repo = new TagRepository(db);
  const tag = repo.create("recipe");
  assert.equal(tag.name, "recipe");
  assert.equal(tag.active, 1);
  assert.equal(tag.end_date, null);
});

test("TagRepository.upsert creates on first call, reactivates on second after remove()", () => {
  const db = createTestDb();
  const repo = new TagRepository(db);

  const first = repo.upsert("travel");
  assert.equal(first.active, 1);

  repo.remove("travel");
  const removed = repo.get("travel");
  assert.equal(removed.active, 0);
  assert.ok(removed.end_date);

  const reactivated = repo.upsert("travel");
  assert.equal(reactivated.active, 1);
  assert.equal(reactivated.end_date, null);
});

test("TagRepository.create rejects a duplicate name", () => {
  const db = createTestDb();
  const repo = new TagRepository(db);
  repo.create("dup");
  assert.throws(() => repo.create("dup"), /already exists/);
});
