const { ValidationError } = require("./errors");
const { assertExists } = require("./helpers");

class JobFileRepository {
  constructor(db) {
    this.db = db;
  }

  get(id) {
    return this.db.prepare("SELECT id, name, path, mime_type, directory, job_id, status, lock_by_PID FROM job_file WHERE id = ?").get(id);
  }

  list() {
    return this.db.prepare("SELECT id, name, path, mime_type, directory, job_id, status, lock_by_PID FROM job_file ORDER BY id").all();
  }

  create(name, path, mimeType, directory, jobId, status, lockByPID) {
    if (!name) throw new ValidationError("name is required");
    if (!jobId) throw new ValidationError("job_id is required");

    assertExists(this.db, "job", "id", jobId, "job");

    this.db.prepare("INSERT INTO job_file (name, path, mime_type, directory, job_id, status, lock_by_PID) VALUES (?, ?, ?, ?, ?, ?, ?)").run(name, path || null, mimeType || null, directory || null, jobId, status || null, lockByPID || null);
    const id = this.db.prepare("SELECT last_insert_rowid() as id").get().id;
    return this.get(id);
  }

  update(id, name, path, mimeType, directory, jobId, status, lockByPID) {
    if (!id) throw new ValidationError("id is required");
    if (jobId) assertExists(this.db, "job", "id", jobId, "job");

    this.db.prepare("UPDATE job_file SET name = ?, path = ?, mime_type = ?, directory = ?, job_id = ?, status = ?, lock_by_PID = ? WHERE id = ?").run(name || null, path || null, mimeType || null, directory || null, jobId || null, status || null, lockByPID || null, id);
    return this.get(id);
  }

  remove(id) {
    this.db.prepare("DELETE FROM job_file WHERE id = ?").run(id);
  }
}

module.exports = JobFileRepository;
