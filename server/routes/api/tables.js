const express = require("express");
const router = express.Router();
const devOnly = require("../../middleware/dev-only");
const { ValidationError, NotFoundError } = require("../../lib/repositories/errors");

router.use(devOnly);

// Tables the generic /:table dispatcher may serve. document_tag is deliberately
// excluded — it has no list/get/create/update/remove and is only reachable via
// the nested /document/:id/tags routes below.
const GENERIC_TABLES = new Set([
  "status", "job_status", "job_type", "classification",
  "tag", "document", "job", "job_file",
]);

// Generic table routes
router.get("/:table", (req, res, next) => {
  try {
    if (!GENERIC_TABLES.has(req.params.table)) return res.status(404).json({ error: `Table '${req.params.table}' not found` });
    const repo = req.app.locals.repositories[req.params.table];
    const rows = repo.list();
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/:table", (req, res, next) => {
  try {
    if (!GENERIC_TABLES.has(req.params.table)) return res.status(404).json({ error: `Table '${req.params.table}' not found` });
    const repo = req.app.locals.repositories[req.params.table];
    const row = repo.create(...Object.values(req.body));
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

router.get("/:table/:key", (req, res, next) => {
  try {
    if (!GENERIC_TABLES.has(req.params.table)) return res.status(404).json({ error: `Table '${req.params.table}' not found` });
    const repo = req.app.locals.repositories[req.params.table];
    const row = repo.get(isNaN(req.params.key) ? req.params.key : parseInt(req.params.key, 10));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.patch("/:table/:key", (req, res, next) => {
  try {
    if (!GENERIC_TABLES.has(req.params.table)) return res.status(404).json({ error: `Table '${req.params.table}' not found` });
    const repo = req.app.locals.repositories[req.params.table];
    const key = isNaN(req.params.key) ? req.params.key : parseInt(req.params.key, 10);
    const row = repo.update(key, ...Object.values(req.body));
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.delete("/:table/:key", (req, res, next) => {
  try {
    if (!GENERIC_TABLES.has(req.params.table)) return res.status(404).json({ error: `Table '${req.params.table}' not found` });
    const repo = req.app.locals.repositories[req.params.table];
    repo.remove(isNaN(req.params.key) ? req.params.key : parseInt(req.params.key, 10));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Nested document/:id/tags routes
router.get("/document/:id/tags", (req, res, next) => {
  try {
    const docTagRepo = req.app.locals.repositories.document_tag;
    const tags = docTagRepo.listForDocument(parseInt(req.params.id, 10));
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

router.post("/document/:id/tags", (req, res, next) => {
  try {
    const docTagRepo = req.app.locals.repositories.document_tag;
    docTagRepo.link(parseInt(req.params.id, 10), req.body.tag_name);
    res.status(201).json({ message: "Tag linked" });
  } catch (err) {
    next(err);
  }
});

router.delete("/document/:id/tags/:tagName", (req, res, next) => {
  try {
    const docTagRepo = req.app.locals.repositories.document_tag;
    docTagRepo.unlink(parseInt(req.params.id, 10), req.params.tagName);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Error handler
router.use((err, req, res, next) => {
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = router;
