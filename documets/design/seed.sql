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
