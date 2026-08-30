const { NotFoundError } = require("./errors");

function assertExists(db, table, column, value, label) {
  if (!value) return; // nullable FK
  const result = db.prepare(`SELECT 1 FROM ${table} WHERE ${column} = ?`).get(value);
  if (!result) {
    throw new NotFoundError(`${label} not found: ${value}`);
  }
}

module.exports = { assertExists };
