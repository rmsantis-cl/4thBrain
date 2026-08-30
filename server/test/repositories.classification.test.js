<<<<<<< HEAD
const test = require("node:test");
const assert = require("node:assert/strict");
const { createTestDb } = require("./helpers/test-db");
const ClassificationRepository = require("../lib/repositories/classification");

test("ClassificationRepository.create does not reference a description column (regression for Bug 2)", () => {
  const db = createTestDb();
  const repo = new ClassificationRepository(db);
  const row = repo.create("Personal", null);
  assert.equal(row.name, "Personal");
  assert.equal(row.parent, null);
});

test("ClassificationRepository supports the hierarchical parent relationship", () => {
  const db = createTestDb();
  const repo = new ClassificationRepository(db);
  repo.create("Personal", null);
  const child = repo.create("Health", "Personal");
  assert.equal(child.parent, "Personal");
});

test("ClassificationRepository.create rejects a non-existent parent", () => {
  const db = createTestDb();
  const repo = new ClassificationRepository(db);
  assert.throws(() => repo.create("Health", "NoSuchParent"), /parent classification not found/);
});

test("the seeded system directory roles from schema.sql are queryable", () => {
  const db = createTestDb();
  const repo = new ClassificationRepository(db);
  const vaultDir = repo.get("VAULT_DIR");
  const vaultIncoming = repo.get("VAULT_INCOMMING");
  assert.ok(vaultDir);
  assert.equal(vaultIncoming.parent, "VAULT_DIR");
});
=======
const test = require("node:test");
const assert = require("node:assert/strict");
const { createTestDb } = require("./helpers/test-db");
const ClassificationRepository = require("../lib/repositories/classification");

test("ClassificationRepository.create does not reference a description column (regression for Bug 2)", () => {
  const db = createTestDb();
  const repo = new ClassificationRepository(db);
  const row = repo.create("Personal", null);
  assert.equal(row.name, "Personal");
  assert.equal(row.parent, null);
});

test("ClassificationRepository supports the hierarchical parent relationship", () => {
  const db = createTestDb();
  const repo = new ClassificationRepository(db);
  repo.create("Personal", null);
  const child = repo.create("Health", "Personal");
  assert.equal(child.parent, "Personal");
});

test("ClassificationRepository.create rejects a non-existent parent", () => {
  const db = createTestDb();
  const repo = new ClassificationRepository(db);
  assert.throws(() => repo.create("Health", "NoSuchParent"), /parent classification not found/);
});

test("the seeded system directory roles from schema.sql are queryable", () => {
  const db = createTestDb();
  const repo = new ClassificationRepository(db);
  const vaultDir = repo.get("VAULT_DIR");
  const vaultIncoming = repo.get("VAULT_INCOMMING");
  assert.ok(vaultDir);
  assert.equal(vaultIncoming.parent, "VAULT_DIR");
});
>>>>>>> v03-eth
