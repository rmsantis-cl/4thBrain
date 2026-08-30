const { ValidationError } = require("./errors");
const { assertExists } = require("./helpers");

const COLUMNS = "id, job_type, document_id, start_date, end_date, status, parent_job_id";
const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

class JobRepository {
  constructor(db) {
    this.db = db;
  }

  get(id) {
    return this.db.prepare(`SELECT ${COLUMNS} FROM job WHERE id = ?`).get(id);
  }

  list() {
    return this.db.prepare(`SELECT ${COLUMNS} FROM job ORDER BY id`).all();
  }

  /** Jobs in a given status for a given job_type, oldest (by id — no created_at column) first. */
  listPending(jobTypes, status = "New", limit = 10) {
    if (!Array.isArray(jobTypes) || jobTypes.length === 0) return [];
    const placeholders = jobTypes.map(() => "?").join(", ");
    return this.db
      .prepare(`SELECT ${COLUMNS} FROM job WHERE status = ? AND job_type IN (${placeholders}) ORDER BY id LIMIT ?`)
      .all(status, ...jobTypes, limit);
  }

  listByStatus(status) {
    return this.db.prepare(`SELECT ${COLUMNS} FROM job WHERE status = ? ORDER BY id`).all(status);
  }

  create(jobType, status, documentId, parentJobId) {
    if (!jobType) throw new ValidationError("job_type is required");
    if (!status) throw new ValidationError("status is required");

    assertExists(this.db, "job_type", "name", jobType, "job_type");
    assertExists(this.db, "job_status", "name", status, "status");
    if (documentId) assertExists(this.db, "document", "id", documentId, "document");
    if (parentJobId) assertExists(this.db, "job", "id", parentJobId, "parent_job");

    this.db
      .prepare("INSERT INTO job (job_type, status, document_id, parent_job_id) VALUES (?, ?, ?, ?)")
      .run(jobType, status, documentId || null, parentJobId || null);
    const id = this.db.prepare("SELECT last_insert_rowid() as id").get().id;
    return this.get(id);
  }

  update(id, jobType, status, documentId, parentJobId) {
    if (!id) throw new ValidationError("id is required");
    if (jobType) assertExists(this.db, "job_type", "name", jobType, "job_type");
    if (status) assertExists(this.db, "job_status", "name", status, "status");
    if (documentId) assertExists(this.db, "document", "id", documentId, "document");
    if (parentJobId) assertExists(this.db, "job", "id", parentJobId, "parent_job");

    this.db
      .prepare("UPDATE job SET job_type = ?, status = ?, document_id = ?, parent_job_id = ? WHERE id = ?")
      .run(jobType || null, status || null, documentId || null, parentJobId || null, id);
    return this.get(id);
  }

  /** Transition New -> Running, stamping start_date. Only applies from status='New' to avoid a double-pickup race. */
  markRunning(id) {
    if (!id) throw new ValidationError("id is required");
    const result = this.db
      .prepare(`UPDATE job SET status = 'Running', start_date = ${NOW} WHERE id = ? AND status = 'New'`)
      .run(id);
    if (result.changes === 0) return null; // already claimed by another worker, or not New
    return this.get(id);
  }

  markCompleted(id) {
    if (!id) throw new ValidationError("id is required");
    this.db.prepare(`UPDATE job SET status = 'Completed', end_date = ${NOW} WHERE id = ?`).run(id);
    return this.get(id);
  }

  markFailed(id) {
    if (!id) throw new ValidationError("id is required");
    this.db.prepare(`UPDATE job SET status = 'Failed', end_date = ${NOW} WHERE id = ?`).run(id);
    return this.get(id);
  }

  remove(id) {
    this.db.prepare("DELETE FROM job WHERE id = ?").run(id);
  }
}

module.exports = JobRepository;
