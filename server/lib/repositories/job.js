const { ValidationError } = require("./errors");
const { assertExists } = require("./helpers");

class JobRepository {
  constructor(db) {
    this.db = db;
  }

  get(id) {
    return this.db.prepare("SELECT id, job_type, status, document_id, parent_job_id, start_date, end_date FROM job WHERE id = ?").get(id);
  }

  list(limit = null) {
    const sql = "SELECT id, job_type, status, document_id, parent_job_id, start_date, end_date FROM job ORDER BY id";
    if (limit) {
      return this.db.prepare(sql + " LIMIT ?").all(limit);
    }
    return this.db.prepare(sql).all();
  }

  listNew(limit) {
    return this.db.prepare("SELECT id, job_type, status, document_id, parent_job_id, start_date, end_date FROM job WHERE status = 'New' ORDER BY id LIMIT ?").all(limit);
  }

  create(jobType, documentId = null, parentJobId = null) {
    if (!jobType) throw new ValidationError("job_type is required");

    assertExists(this.db, "job_type", "name", jobType, "job_type");
    if (documentId) assertExists(this.db, "document", "id", documentId, "document");
    if (parentJobId) assertExists(this.db, "job", "id", parentJobId, "parent_job");

    this.db.prepare("INSERT INTO job (job_type, status, document_id, parent_job_id) VALUES (?, ?, ?, ?)").run(jobType, "New", documentId || null, parentJobId || null);
    const id = this.db.prepare("SELECT last_insert_rowid() as id").get().id;
    return this.get(id);
  }

  createChild(jobType, documentId, parentJobId) {
    return this.create(jobType, documentId, parentJobId);
  }

  markRunning(id) {
    if (!id) throw new ValidationError("id is required");

    this.db.prepare("UPDATE job SET status = 'Running', start_date = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(id);
    return this.get(id);
  }

  markCompleted(id) {
    if (!id) throw new ValidationError("id is required");

    this.db.prepare("UPDATE job SET status = 'Completed', end_date = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(id);
    return this.get(id);
  }

  markFailed(id) {
    if (!id) throw new ValidationError("id is required");

    this.db.prepare("UPDATE job SET status = 'Failed', end_date = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(id);
    return this.get(id);
  }

  update(id, { jobType, documentId, parentJobId } = {}) {
    if (!id) throw new ValidationError("id is required");

    if (jobType) assertExists(this.db, "job_type", "name", jobType, "job_type");
    if (documentId) assertExists(this.db, "document", "id", documentId, "document");
    if (parentJobId) assertExists(this.db, "job", "id", parentJobId, "parent_job");

    const updates = [];
    const values = [];

    if (jobType !== undefined) {
      updates.push("job_type = ?");
      values.push(jobType);
    }
    if (documentId !== undefined) {
      updates.push("document_id = ?");
      values.push(documentId);
    }
    if (parentJobId !== undefined) {
      updates.push("parent_job_id = ?");
      values.push(parentJobId);
    }

    if (updates.length > 0) {
      values.push(id);
      this.db.prepare(`UPDATE job SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    }

    return this.get(id);
  }

  remove(id) {
    this.db.prepare("DELETE FROM job WHERE id = ?").run(id);
  }
}

module.exports = JobRepository;
