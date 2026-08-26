// Mocked for Story 6.4 — canned sample data, same shape server/lib/smart-connections-status.js
// returns, so Story 6.3 can swap the body of this handler for a real call without
// touching the client. See ui/plan.md.
const express = require("express");

const router = express.Router();

const MOCK_STATUS = {
  sources: { total: 31, current: 30, missing: 0, skipped: 1, unexpected: 0 },
  blocks: { total: 1045, current: 325, missing: 0, skipped: 720, unexpected: 0 },
  skippedSources: [
    {
      path: "AI/Claude/Claude Test receipt.md",
      status: "skipped",
      reason: "Below minimum size (96 chars, minimum is 200) — mocked sample from Spike 3.2",
    },
  ],
};

router.post("/api/status", express.json(), (req, res) => {
  res.json(MOCK_STATUS);
});

module.exports = router;
