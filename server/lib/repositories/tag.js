const { ValidationError } = require("./errors");

class TagRepository {
  constructor(db) {
    this.db = db;
  }

  get(name) {
    return this.db.prepare("SELECT name, start_date, end_date, active FROM tag WHERE name = ?").get(name);
  }

  list() {
    return this.db.prepare("SELECT name, start_date, end_date, active FROM tag ORDER BY name").all();
  }

  create(name) {
    if (!name) throw new ValidationError("name is required");
    try {
      this.db.prepare("INSERT INTO tag (name, active) VALUES (?, 1)").run(name);
      return this.get(name);
    } catch (err) {
      if (err.message.includes("UNIQUE constraint failed")) {
        throw new ValidationError(`tag '${name}' already exists`);
      }
      throw err;
    }
  }

  update(name) {
    if (!name) throw new ValidationError("name is required");
    const existing = this.get(name);
    if (!existing) throw new ValidationError(`tag '${name}' does not exist`);
    return this.get(name);
  }

  remove(name) {
    this.db.prepare("UPDATE tag SET end_date = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), active = 0 WHERE name = ?").run(name);
  }

  upsert(name) {
    if (!name) throw new ValidationError("name is required");
    const existing = this.get(name);
    if (existing) {
      if (!existing.active) {
        this.db.prepare("UPDATE tag SET active = 1, end_date = NULL WHERE name = ?").run(name);
      }
      return this.get(name);
    }
    return this.create(name);
  }
}

module.exports = TagRepository;
