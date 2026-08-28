function withTransaction(db, fn) {
  try {
    db.exec("BEGIN");
    const result = fn(db);
    db.exec("COMMIT");
    return result;
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch (rollbackErr) {
      console.error("Rollback failed:", rollbackErr.message);
    }
    throw err;
  }
}

module.exports = { withTransaction };
