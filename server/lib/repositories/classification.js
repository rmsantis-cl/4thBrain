const { ValidationError, NotFoundError } = require("./errors");
const { assertExists } = require("./helpers");

class ClassificationRepository {
  constructor(db) {
    this.db = db;
  }

  get(name) {
    return this.db.prepare("SELECT name, parent FROM classification WHERE name = ?").get(name);
  }

  list() {
    return this.db.prepare("SELECT name, parent FROM classification ORDER BY name").all();
  }

  create(name, parent = null) {
    if (!name) throw new ValidationError("name is required");
    if (parent) assertExists(this.db, "classification", "name", parent, "parent classification");
    try {
      this.db.prepare("INSERT INTO classification (name, parent) VALUES (?, ?)").run(name, parent || null);
      return this.get(name);
    } catch (err) {
      if (err.message.includes("UNIQUE constraint failed")) {
        throw new ValidationError(`classification '${name}' already exists`);
      }
      throw err;
    }
  }

  update(name, parent = null) {
    if (!name) throw new ValidationError("name is required");
    if (parent) assertExists(this.db, "classification", "name", parent, "parent classification");
    this.db.prepare("UPDATE classification SET parent = ? WHERE name = ?").run(parent || null, name);
    return this.get(name);
  }

  upsert(name, parent = null) {
    if (!name) throw new ValidationError("name is required");
    const existing = this.get(name);
    if (existing) {
      if (parent && existing.parent !== parent) {
        return this.update(name, parent);
      }
      return existing;
    }
    return this.create(name, parent);
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
