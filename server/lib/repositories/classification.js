const { ValidationError, NotFoundError } = require("./errors");
const { assertExists } = require("./helpers");

class ClassificationRepository {
  constructor(db) {
    this.db = db;
  }

  get(name) {
    return this.db.prepare("SELECT name, parent, description FROM classification WHERE name = ?").get(name);
  }

  list() {
    return this.db.prepare("SELECT name, parent, description FROM classification ORDER BY name").all();
  }

  create(name, parent, description) {
    if (!name) throw new ValidationError("name is required");
    if (parent) assertExists(this.db, "classification", "name", parent, "parent classification");
    try {
      this.db.prepare("INSERT INTO classification (name, parent, description) VALUES (?, ?, ?)").run(name, parent || null, description || null);
      return this.get(name);
    } catch (err) {
      if (err.message.includes("UNIQUE constraint failed")) {
        throw new ValidationError(`classification '${name}' already exists`);
      }
      throw err;
    }
  }

  update(name, parent, description) {
    if (!name) throw new ValidationError("name is required");
    if (parent) assertExists(this.db, "classification", "name", parent, "parent classification");
    this.db.prepare("UPDATE classification SET parent = ?, description = ? WHERE name = ?").run(parent || null, description || null, name);
    return this.get(name);
  }

  remove(name) {
    const childCount = this.db.prepare("SELECT COUNT(*) as count FROM classification WHERE parent = ?").get(name).count;
    const docCount = this.db.prepare("SELECT COUNT(*) as count FROM document WHERE topic = ?").get(name).count;
    if (childCount > 0 || docCount > 0) {
      throw new ValidationError(`cannot delete classification '${name}': has children or document references`);
    }
    this.db.prepare("DELETE FROM classification WHERE name = ?").run(name);
  }
}

module.exports = ClassificationRepository;
