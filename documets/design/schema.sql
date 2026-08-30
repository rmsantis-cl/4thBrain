-- SQLite schema for 4thBrain metadata storage
-- Source: documets/design/classes.md + Story 12.2 (Schema Redesign, closes Bug 1)
-- Date: 2026-08-28
-- Natural keys (name) on lookup tables (status, job_type, job_status, tag, classification);
-- no UUIDs/generated surrogate keys except document/job/job_file (INTEGER PRIMARY KEY autoincrement).
-- Timestamps stored as ISO-8601 UTC text; all FKs indexed.

CREATE TABLE status (
  name TEXT NOT NULL PRIMARY KEY,
  description TEXT
);

CREATE TABLE job_type (
  name TEXT NOT NULL PRIMARY KEY,
  description TEXT
);

CREATE TABLE classification (
  name TEXT NOT NULL PRIMARY KEY,
  parent TEXT REFERENCES classification(name)
);

CREATE TABLE document (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  uri_location TEXT NOT NULL,
  mime_type TEXT,
  charset TEXT,
  status TEXT NOT NULL REFERENCES status(name),
  created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  topic TEXT REFERENCES classification(name)
);

CREATE TABLE tag (
  name TEXT NOT NULL PRIMARY KEY,
  start_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  end_date TEXT DEFAULT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE document_tag (
  document_id INTEGER NOT NULL REFERENCES document(id),
  tag_name TEXT NOT NULL REFERENCES tag(name),
  PRIMARY KEY (document_id, tag_name)
);

CREATE TABLE job_status (
  name TEXT NOT NULL PRIMARY KEY,
  description TEXT
);

CREATE TABLE job (
  id INTEGER PRIMARY KEY,
  job_type TEXT NOT NULL REFERENCES job_type(name),
  document_id INTEGER REFERENCES document(id),
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL REFERENCES job_status(name),
  parent_job_id INTEGER REFERENCES job(id)
);

CREATE TABLE job_file (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  mime_type TEXT,
  directory TEXT,
  job_id INTEGER REFERENCES job(id),
  status TEXT, -- file status, not job status; not validated for now
  lock_by_PID INTEGER
);

-- Indexes on all foreign keys for query performance
CREATE INDEX idx_document_status ON document(status);
CREATE INDEX idx_document_topic ON document(topic);
CREATE INDEX idx_classification_parent ON classification(parent);
CREATE INDEX idx_document_tag_tag ON document_tag(tag_name);
CREATE INDEX idx_job_type ON job(job_type);
CREATE INDEX idx_job_status ON job(status);
CREATE INDEX idx_job_document ON job(document_id);
CREATE INDEX idx_job_parent ON job(parent_job_id);
CREATE INDEX idx_job_file_job ON job_file(job_id);

-- Seed the fixed status enumeration
INSERT INTO status (name, description) VALUES
  ('New', 'Document captured but not yet processed.'),
  ('Processing', 'Document is being sanitized, transcoded, or classified.'),
  ('Indexed', 'Document has been filed into the vault and indexed for search.'),
  ('Failed', 'Processing failed and requires attention.'),
  ('Archived', 'Document processing complete and no longer active.');

-- Seed the fixed job-status enumeration
INSERT INTO job_status (name, description) VALUES
  ('New', 'Job created but not yet started.'),
  ('Running', 'Job is actively executing.'),
  ('Completed', 'Job finished successfully.'),
  ('Failed', 'Job execution failed and requires attention.');

-- Seed the fixed job-type enumeration
INSERT INTO job_type (name, description) VALUES
  ('ingest', 'ingest document'),
  ('convert', 'convert document to text'),
  ('classify', 'classify document'),
  ('index', 'index document');

-- Seed the known system directory roles (each resolvable via a matching key in params.json)
INSERT INTO classification (name, parent) VALUES
  ('VAULT_DIR', null),
  ('VAULT_RAW', 'VAULT_DIR'),
  ('VAULT_INCOMMING', 'VAULT_DIR'),
  ('DOCUMENT_ROOT', 'VAULT_DIR'),
  ('TMP_DIR', null);
