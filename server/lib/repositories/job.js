const { ValidationError } = require("./errors");
const { assertExists } = require("./helpers");

class JobRepository {
  constructor(db) {
    this.db = db;
  }

  get(id) {
    return this.db.prepare("SELECT id, job_type, status, document_id, parent_job_id, created_date FROM job WHERE id = ?").get(id);
  }

  list() {
    return this.db.prepare("SELECT id, job_type, status, document_id, parent_job_id, created_date FROM job ORDER BY id").all();
  }

  create(jobType, status, documentId, parentJobId) {
    if (!jobType) throw new ValidationError("job_type is required");
    if (!status) throw new ValidationError("status is required");

    assertExists(this.db, "job_type", "name", jobType, "job_type");
    assertExists(this.db, "job_status", "name", status, "status");
    if (documentId) assertExists(this.db, "document", "id", documentId, "document");
    if (parentJobId) assertExists(this.db, "job", "id", parentJobId, "parent_job");

    this.db.prepare("INSERT INTO job (job_type, status, document_id, parent_job_id) VALUES (?, ?, ?, ?)").run(jobType, status, documentId || null, parentJobId || null);
    const id = this.db.prepare("SELECT last_insert_rowid() as id").get().id;
    return this.get(id);
  }

  update(id, jobType, status, documentId, parentJobId) {
    if (!id) throw new ValidationError("id is required");
    if (jobType) assertExists(this.db, "job_type", "name", jobType, "job_type");
    if (status) assertExists(this.db, "job_status", "name", status, "status");
    if (documentId) assertExists(this.db, "document", "id", documentId, "document");
    if (parentJobId) assertExists(this.db, "job", "id", parentJobId, "parent_job");

    this.db.prepare("UPDATE job SET job_type = ?, status = ?, document_id = ?, parent_job_id = ? WHERE id = ?").run(jobType || null, status || null, documentId || null, parentJobId || null, id);
    return this.get(id);
  }

  remove(id) {
    this.db.prepare("DELETE FROM job WHERE id = ?").run(id);
  }
}

module.exports = JobRepository;
