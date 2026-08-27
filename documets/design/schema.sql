-- SQLite schema for 4thBrain metadata storage (7 classes)
-- Source: documets/design/classes.md (Story 12.1, EP12)
-- Date: 2026-08-26
-- UUIDs stored as TEXT; timestamps as ISO-8601 UTC text; all FKs indexed

CREATE TABLE status (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE job_type (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE process (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  environment TEXT
);

CREATE TABLE classification (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES classification(id)
);

CREATE TABLE document (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  uri_location TEXT NOT NULL,
  mime_type TEXT,
  charset TEXT,
  status_id INTEGER NOT NULL REFERENCES status(id),
  created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  topic_id TEXT REFERENCES classification(id)
);

CREATE TABLE tag (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE document_tag (
  document_id TEXT NOT NULL REFERENCES document(id),
  tag_id TEXT NOT NULL REFERENCES tag(id),
  PRIMARY KEY (document_id, tag_id)
);

CREATE TABLE job (
  id TEXT PRIMARY KEY,
  job_type_id TEXT NOT NULL REFERENCES job_type(id),
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL,
  parent_job_id TEXT REFERENCES job(id)
);

CREATE TABLE job_document (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES job(id),
  doc_id TEXT NOT NULL REFERENCES document(id),
  process_id TEXT NOT NULL REFERENCES process(id),
  pid TEXT,
  status TEXT NOT NULL
);

-- Indexes on all foreign keys for query performance
CREATE INDEX idx_document_status ON document(status_id);
CREATE INDEX idx_document_topic ON document(topic_id);
CREATE INDEX idx_classification_parent ON classification(parent_id);
CREATE INDEX idx_job_type ON job(job_type_id);
CREATE INDEX idx_job_parent ON job(parent_job_id);
CREATE INDEX idx_job_document_job ON job_document(job_id);
CREATE INDEX idx_job_document_doc ON job_document(doc_id);
CREATE INDEX idx_job_document_process ON job_document(process_id);
CREATE INDEX idx_document_tag_tag ON document_tag(tag_id);

-- Seed the fixed status enumeration
INSERT INTO status (id, name, description) VALUES
  (1, 'New', 'Document captured but not yet processed.'),
  (2, 'Processing', 'Document is being sanitized, transcoded, or classified.'),
  (3, 'Indexed', 'Document has been filed into the vault and indexed for search.'),
  (4, 'Failed', 'Processing failed and requires attention.'),
  (5, 'Archived', 'Document processing complete and no longer active.');
insert into job_type(id, name, description)
values
(1, 'ingest', 'ingest document'),
(2, 'convert', 'convert document to text'),
(3, 'classify', 'classify document'),
(4, 'index', 'index document');
insert into classification(id, name, parent_id)
values
(1, 'top', null),
(2, 'AI', 1);
insert into process(id, name, description, environment)
values
('1', 'ingest', 'stage submitted content into $RAW_DIR', 'node');
