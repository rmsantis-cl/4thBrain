const StatusRepository = require("./status");
const JobStatusRepository = require("./jobStatus");
const JobTypeRepository = require("./jobType");
const ClassificationRepository = require("./classification");
const TagRepository = require("./tag");
const DocumentRepository = require("./document");
const DocumentTagRepository = require("./documentTag");
const JobRepository = require("./job");
const JobFileRepository = require("./jobFile");

function createRepositories(db) {
  return {
    status: new StatusRepository(db),
    job_status: new JobStatusRepository(db),
    job_type: new JobTypeRepository(db),
    classification: new ClassificationRepository(db),
    tag: new TagRepository(db),
    document: new DocumentRepository(db),
    document_tag: new DocumentTagRepository(db),
    job: new JobRepository(db),
    job_file: new JobFileRepository(db),
  };
}

module.exports = { createRepositories };
