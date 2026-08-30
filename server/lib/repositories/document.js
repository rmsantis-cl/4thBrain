const { ValidationError } = require("./errors");
const { assertExists } = require("./helpers");

const COLUMNS = "id, name, uri_location, mime_type, charset, status, created, updated, topic";

class DocumentRepository {
  constructor(db) {
    this.db = db;
  }

  get(id) {
    return this.db.prepare(`SELECT ${COLUMNS} FROM document WHERE id = ?`).get(id);
  }

  list() {
    return this.db.prepare(`SELECT ${COLUMNS} FROM document ORDER BY id`).all();
  }

  create(name, uriLocation, mimeType, charset, status, topic) {
    if (!name) throw new ValidationError("name is required");
    if (!uriLocation) throw new ValidationError("uri_location is required");
    if (!status) throw new ValidationError("status is required");

    assertExists(this.db, "status", "name", status, "status");
    if (topic) assertExists(this.db, "classification", "name", topic, "topic classification");

    this.db
      .prepare("INSERT INTO document (name, uri_location, mime_type, charset, status, topic) VALUES (?, ?, ?, ?, ?, ?)")
      .run(name, uriLocation, mimeType || null, charset || null, status, topic || null);
    const id = this.db.prepare("SELECT last_insert_rowid() as id").get().id;
    return this.get(id);
  }

  update(id, name, uriLocation, mimeType, charset, status, topic) {
    if (!id) throw new ValidationError("id is required");
    if (status) assertExists(this.db, "status", "name", status, "status");
    if (topic) assertExists(this.db, "classification", "name", topic, "topic classification");

    this.db
      .prepare(
        "UPDATE document SET name = ?, uri_location = ?, mime_type = ?, charset = ?, status = ?, topic = ?, updated = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?"
      )
      .run(name || null, uriLocation || null, mimeType || null, charset || null, status || null, topic || null, id);
    return this.get(id);
  }

  /** Narrow status-only transition, for pipeline stages that only change lifecycle state. */
  setStatus(id, status) {
    if (!id) throw new ValidationError("id is required");
    if (!status) throw new ValidationError("status is required");
    assertExists(this.db, "status", "name", status, "status");

    this.db
      .prepare("UPDATE document SET status = ?, updated = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?")
      .run(status, id);
    return this.get(id);
  }

  remove(id) {
    this.db.prepare("DELETE FROM document WHERE id = ?").run(id);
  }
}

module.exports = DocumentRepository;
