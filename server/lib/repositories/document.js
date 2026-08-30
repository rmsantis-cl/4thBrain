const { ValidationError } = require("./errors");
const { assertExists } = require("./helpers");

class DocumentRepository {
  constructor(db) {
    this.db = db;
  }

  get(id) {
    return this.db.prepare("SELECT id, name, uri_location, mime_type, charset, status, created, updated, topic, parent, author FROM document WHERE id = ?").get(id);
  }

  list(limit = null) {
    const sql = "SELECT id, name, uri_location, mime_type, charset, status, created, updated, topic, parent, author FROM document ORDER BY id";
    if (limit) {
      return this.db.prepare(sql + " LIMIT ?").all(limit);
    }
    return this.db.prepare(sql).all();
  }

  listChildren(parentId) {
    return this.db.prepare("SELECT id, name, uri_location, mime_type, charset, status, created, updated, topic, parent, author FROM document WHERE parent = ? ORDER BY id").all(parentId);
  }

  create({ name, uriLocation, mimeType, charset, status, topic = null, parent = null, author = null }) {
    if (!name) throw new ValidationError("name is required");
    if (!uriLocation) throw new ValidationError("uriLocation is required");
    if (!status) throw new ValidationError("status is required");

    assertExists(this.db, "status", "name", status, "status");
    if (topic) assertExists(this.db, "classification", "name", topic, "topic classification");
    if (parent) assertExists(this.db, "document", "id", parent, "parent document");

    this.db.prepare(
      "INSERT INTO document (name, uri_location, mime_type, charset, status, topic, parent, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(name, uriLocation, mimeType || null, charset || null, status, topic, parent, author);

    const id = this.db.prepare("SELECT last_insert_rowid() as id").get().id;
    return this.get(id);
  }

  update(id, { status, topic, parent, author } = {}) {
    if (!id) throw new ValidationError("id is required");

    if (status) assertExists(this.db, "status", "name", status, "status");
    if (topic) assertExists(this.db, "classification", "name", topic, "topic classification");
    if (parent) assertExists(this.db, "document", "id", parent, "parent document");

    const updates = [];
    const values = [];

    if (status !== undefined) {
      updates.push("status = ?");
      values.push(status);
    }
    if (topic !== undefined) {
      updates.push("topic = ?");
      values.push(topic);
    }
    if (parent !== undefined) {
      updates.push("parent = ?");
      values.push(parent);
    }
    if (author !== undefined) {
      updates.push("author = ?");
      values.push(author);
    }

    if (updates.length > 0) {
      updates.push("updated = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");
      values.push(id);

      this.db.prepare(`UPDATE document SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    }

    return this.get(id);
  }

  updateStatus(id, status) {
    if (!id) throw new ValidationError("id is required");
    if (!status) throw new ValidationError("status is required");

    assertExists(this.db, "status", "name", status, "status");

    this.db.prepare("UPDATE document SET status = ?, updated = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(status, id);
    return this.get(id);
  }

  remove(id) {
    this.db.prepare("DELETE FROM document WHERE id = ?").run(id);
  }
}

module.exports = DocumentRepository;
