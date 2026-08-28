const { ValidationError } = require("./errors");
const { assertExists } = require("./helpers");

class DocumentRepository {
  constructor(db) {
    this.db = db;
  }

  get(id) {
    return this.db.prepare("SELECT id, status, topic, created_date, ingestion_notes FROM document WHERE id = ?").get(id);
  }

  list() {
    return this.db.prepare("SELECT id, status, topic, created_date, ingestion_notes FROM document ORDER BY id").all();
  }

  create(status, topic, ingestionNotes) {
    if (!status) throw new ValidationError("status is required");
    assertExists(this.db, "status", "name", status, "status");
    if (topic) assertExists(this.db, "classification", "name", topic, "topic classification");

    this.db.prepare("INSERT INTO document (status, topic, ingestion_notes) VALUES (?, ?, ?)").run(status, topic || null, ingestionNotes || null);
    const id = this.db.prepare("SELECT last_insert_rowid() as id").get().id;
    return this.get(id);
  }

  update(id, status, topic, ingestionNotes) {
    if (!id) throw new ValidationError("id is required");
    if (status) assertExists(this.db, "status", "name", status, "status");
    if (topic) assertExists(this.db, "classification", "name", topic, "topic classification");

    this.db.prepare("UPDATE document SET status = ?, topic = ?, ingestion_notes = ? WHERE id = ?").run(status || null, topic || null, ingestionNotes || null, id);
    return this.get(id);
  }

  remove(id) {
    this.db.prepare("DELETE FROM document WHERE id = ?").run(id);
  }
}

module.exports = DocumentRepository;
