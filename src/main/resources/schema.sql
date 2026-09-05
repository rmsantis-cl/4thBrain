-- SQLite Schema for 4thBrain v04
-- Initialized on Spring Boot startup via DataSource DDL auto

CREATE TABLE IF NOT EXISTS document (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path VARCHAR(512),
    name VARCHAR(256),
    extension VARCHAR(32),
    mime_type VARCHAR(128),
    content TEXT,
    topic VARCHAR(256),
    status VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tag (
    name VARCHAR(256) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_tag (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    tag_name VARCHAR(256) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES document(id),
    FOREIGN KEY (tag_name) REFERENCES tag(name)
);

CREATE INDEX IF NOT EXISTS idx_document_status ON document(status);
CREATE INDEX IF NOT EXISTS idx_document_tag_document_id ON document_tag(document_id);
CREATE INDEX IF NOT EXISTS idx_document_tag_tag_name ON document_tag(tag_name);
