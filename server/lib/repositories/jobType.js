const { ValidationError } = require("./errors");

class JobTypeRepository {
  constructor(db) {
    this.db = db;
  }

  get(name) {
    return this.db.prepare("SELECT name, description FROM job_type WHERE name = ?").get(name);
  }

  list() {
    return this.db.prepare("SELECT name, description FROM job_type ORDER BY name").all();
  }

  create(name, description) {
    if (!name) throw new ValidationError("name is required");
    try {
      this.db.prepare("INSERT INTO job_type (name, description) VALUES (?, ?)").run(name, description || null);
      return this.get(name);
    } catch (err) {
      if (err.message.includes("UNIQUE constraint failed")) {
        throw new ValidationError(`job_type '${name}' already exists`);
      }
      throw err;
    }
  }

  update(name, description) {
    if (!name) throw new ValidationError("name is required");
    this.db.prepare("UPDATE job_type SET description = ? WHERE name = ?").run(description || null, name);
    return this.get(name);
  }

  remove(name) {
    throw new ValidationError("cannot delete a fixed enum value");
  }
}

module.exports = JobTypeRepository;
