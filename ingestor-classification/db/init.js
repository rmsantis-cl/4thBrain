const sqlite = require("node:sqlite");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "..", "b4hdb.sqlit3");

function initDatabase() {
  const schemaPath = path.join(__dirname, "..", "..", "documets", "design", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");

  const db = new sqlite.DatabaseSync(dbPath);
  db.exec(schema);

  console.log(`SQLite database initialized at: ${dbPath}`);
  return db;
}

function getDatabase() {
  if (!fs.existsSync(dbPath)) {
    return initDatabase();
  }
  return new sqlite.DatabaseSync(dbPath);
}

module.exports = { initDatabase, getDatabase, dbPath };
