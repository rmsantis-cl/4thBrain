const express = require("express");
const multer = require("multer");
const rawDirWriter = require("../lib/raw-dir-writer");
const { createIngestJob } = require("../lib/ingest-service");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/api/ingest/file", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "no file provided" });
  }
  try {
    const cfg = req.app.locals.config;
    if (!cfg || !cfg.rawDirInbox) {
      console.error("Config missing rawDirInbox:", cfg);
      return res.status(500).json({ error: "config missing rawDirInbox" });
    }
    const written = rawDirWriter.writeFile(
      { buffer: req.file.buffer, originalName: req.file.originalname },
      cfg
    );
    if (!written || !written.path) {
      console.error("writeFile returned incomplete:", written);
      return res.status(500).json({ error: "writeFile failed" });
    }
    const jobId = createIngestJob(req.app.locals.db, {
      name: req.file.originalname,
      uriLocation: written.path,
      mimeType: written.mimeType,
      charset: written.charset,
      tags: req.body && req.body.tags,
    });
    if (!jobId) {
      console.error("createIngestJob returned no jobId");
      return res.status(500).json({ error: "job creation failed" });
    }
    res.json({
      jobId,
      message: `staged "${req.file.originalname}" (${req.file.size} bytes) to ${written.path}`,
    });
  } catch (err) {
    console.error("File ingestion error:", err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/ingest/text", express.json(), async (req, res) => {
  const text = (req.body && req.body.text) || "";
  if (!text.trim()) {
    return res.status(400).json({ error: "no text provided" });
  }
  try {
    const cfg = req.app.locals.config;
    if (!cfg || !cfg.rawDirInbox) {
      console.error("Config missing rawDirInbox:", cfg);
      return res.status(500).json({ error: "config missing rawDirInbox" });
    }
    const written = rawDirWriter.writeText({ text }, cfg);
    if (!written || !written.path) {
      console.error("writeText returned incomplete:", written);
      return res.status(500).json({ error: "writeText failed" });
    }
    const jobId = createIngestJob(req.app.locals.db, {
      name: `text-${Date.now()}`,
      uriLocation: written.path,
      mimeType: written.mimeType,
      charset: written.charset,
      tags: req.body && req.body.tags,
    });
    if (!jobId) {
      console.error("createIngestJob returned no jobId");
      return res.status(500).json({ error: "job creation failed" });
    }
    res.json({
      jobId,
      message: `staged ${text.length} characters of text to ${written.path}`,
    });
  } catch (err) {
    console.error("Text ingestion error:", err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/ingest/url", express.json(), async (req, res) => {
  const url = (req.body && req.body.url) || "";
  if (!url.trim()) {
    return res.status(400).json({ error: "no url provided" });
  }
  try {
    const cfg = req.app.locals.config;
    if (!cfg || !cfg.rawDirClipping) {
      console.error("Config missing rawDirClipping:", cfg);
      return res.status(500).json({ error: "config missing rawDirClipping" });
    }
    const written = rawDirWriter.writeUrl({ url }, cfg);
    if (!written || !written.path) {
      console.error("writeUrl returned incomplete:", written);
      return res.status(500).json({ error: "writeUrl failed" });
    }
    const jobId = createIngestJob(req.app.locals.db, {
      name: url,
      uriLocation: written.path,
      mimeType: written.mimeType,
      charset: written.charset,
      tags: req.body && req.body.tags,
    });
    if (!jobId) {
      console.error("createIngestJob returned no jobId");
      return res.status(500).json({ error: "job creation failed" });
    }
    res.json({
      jobId,
      message: `staged "${url}" to ${written.path}`,
    });
  } catch (err) {
    console.error("URL ingestion error:", err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
