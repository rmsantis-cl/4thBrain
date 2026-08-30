// Mocked for Story 6.4 — scripted replies, no Ollama call. Story 6.5 replaces
// this handler's body with a real openai-SDK call against config.ollamaBaseUrl.
// See ui/plan.md.
const express = require("express");

const router = express.Router();

const CANNED_REPLIES = [
  "That's a mocked reply — Story 6.5 will wire this up to a real local Ollama call.",
  "I'm just a scripted stand-in for now. Ask me anything and I'll say something equally canned.",
  "Once Story 6.5 lands, this panel will actually talk to llama3.2 over Ollama's local endpoint.",
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

router.post("/api/chat/llama", express.json(), async (req, res) => {
  await delay(600);
  const reply = CANNED_REPLIES[Math.floor(Math.random() * CANNED_REPLIES.length)];
  res.json({ reply });
});

module.exports = router;
