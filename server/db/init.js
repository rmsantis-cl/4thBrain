const sqlite = require("node:sqlite");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "..", "4thbrain-metadata.db");

function initDatabase() {
  const schemaPath = path.join(__dirname, "..", "..", "documets", "design", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");

  const db = new sqlite.DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(schema);

  console.log(`SQLite database initialized at: ${dbPath}`);
  return db;
}

function getDatabase() {
  const db = new sqlite.DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON");

  // Check if schema needs to be applied (bootstrap check for empty database)
  const tableCount = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'").get().count;
  if (tableCount === 0) {
    const schemaPath = path.join(__dirname, "..", "..", "documets", "design", "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf-8");
    db.exec(schema);
    console.log(`SQLite schema applied at: ${dbPath}`);
  }

  return db;
}

module.exports = { initDatabase, getDatabase, dbPath };
