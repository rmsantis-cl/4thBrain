<<<<<<< HEAD
const sqlite = require("node:sqlite");
const fs = require("fs");
const path = require("path");

const SCHEMA_PATH = path.join(__dirname, "..", "..", "..", "documets", "design", "schema.sql");

/** In-memory database built fresh from the live schema.sql for each test —
 *  keeps tests honest against schema drift instead of a hand-maintained
 *  test fixture that could quietly diverge from the real thing. */
function createTestDb() {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  const db = new sqlite.DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(schema);
  return db;
}

module.exports = { createTestDb };
=======
const sqlite = require("node:sqlite");
const fs = require("fs");
const path = require("path");

const SCHEMA_PATH = path.join(__dirname, "..", "..", "..", "documets", "design", "schema.sql");

/** In-memory database built fresh from the live schema.sql for each test —
 *  keeps tests honest against schema drift instead of a hand-maintained
 *  test fixture that could quietly diverge from the real thing. */
function createTestDb() {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  const db = new sqlite.DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(schema);
  return db;
}

module.exports = { createTestDb };
>>>>>>> v03-eth
