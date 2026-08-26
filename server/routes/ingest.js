// Mocked for Story 6.4 — no real writes into $RAW_DIR yet. Story 6.1 replaces
// these with server/lib/raw-dir-writer.js (or equivalent) doing real I/O.
// See ui/plan.md for the real-vs-mocked breakdown.
const express = require("express");
const multer = require("multer");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function fakeJobId() {
  return "mock-" + Math.random().toString(36).slice(2, 10);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

router.post("/api/ingest/file", upload.single("file"), async (req, res) => {
  await delay(500);
  if (!req.file) {
    return res.status(400).json({ error: "no file provided" });
  }
  res.json({
    jobId: fakeJobId(),
    message: `received "${req.file.originalname}" (${req.file.size} bytes) — not written to disk (mocked)`,
  });
});

router.post("/api/ingest/text", express.json(), async (req, res) => {
  await delay(400);
  const text = (req.body && req.body.text) || "";
  res.json({
    jobId: fakeJobId(),
    message: `received ${text.length} characters of text — not written to disk (mocked)`,
  });
});

router.post("/api/ingest/url", express.json(), async (req, res) => {
  await delay(400);
  const url = (req.body && req.body.url) || "";
  res.json({
    jobId: fakeJobId(),
    message: `received "${url}" — not staged to $RAW_DIR/clipping (mocked)`,
  });
});

module.exports = router;
