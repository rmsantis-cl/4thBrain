const { ValidationError, NotFoundError } = require("./errors");
const { assertExists } = require("./helpers");

class DocumentTagRepository {
  constructor(db) {
    this.db = db;
  }

  listForDocument(documentId) {
    return this.db.prepare("SELECT tag_name FROM document_tag WHERE document_id = ?").all(documentId).map(row => row.tag_name);
  }

  link(documentId, tagName) {
    if (!documentId) throw new ValidationError("documentId is required");
    if (!tagName) throw new ValidationError("tagName is required");

    assertExists(this.db, "document", "id", documentId, "document");
    assertExists(this.db, "tag", "name", tagName, "tag");

    const tag = this.db.prepare("SELECT active FROM tag WHERE name = ?").get(tagName);
    if (!tag || !tag.active) throw new ValidationError(`tag '${tagName}' is not active`);

    try {
      this.db.prepare("INSERT INTO document_tag (document_id, tag_name) VALUES (?, ?)").run(documentId, tagName);
    } catch (err) {
      if (err.message.includes("UNIQUE constraint failed")) {
        throw new ValidationError(`document ${documentId} already has tag '${tagName}'`);
      }
      throw err;
    }
  }

  unlink(documentId, tagName) {
    if (!documentId) throw new ValidationError("documentId is required");
    if (!tagName) throw new ValidationError("tagName is required");

    this.db.prepare("DELETE FROM document_tag WHERE document_id = ? AND tag_name = ?").run(documentId, tagName);
  }
}

module.exports = DocumentTagRepository;
