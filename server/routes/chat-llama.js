// Story 6.5 — Real local Ollama chat via OpenAI-compatible API.
// Ollama exposes /v1/chat/completions compatible with the OpenAI SDK.
const express = require("express");
const OpenAI = require("openai");

const router = express.Router();

let ollamaClient = null;
let cachedConfig = null;

function initClient(config) {
  if (cachedConfig === config) {
    return ollamaClient;
  }
  cachedConfig = config;
  ollamaClient = new OpenAI({
    apiKey: "ollama", // Ollama doesn't require an API key
    baseURL: config.ollamaBaseUrl.replace(/\/v1\/?$/, ""), // Remove /v1 suffix; OpenAI SDK will add it
  });
  return ollamaClient;
}

router.post("/api/chat/llama", express.json(), async (req, res) => {
  try {
    const { message, history } = req.body;
    const config = require("../config").buildConfig ? require("../config").buildConfig() : global.config;

    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    const client = initClient(config);

    // Build conversation: history + current message
    const messages = history && Array.isArray(history) ? [...history] : [];
    messages.push({ role: "user", content: message });

    const response = await client.chat.completions.create({
      model: config.ollamaChatModel || "llama2",
      messages,
      stream: false,
    });

    const reply = response.choices[0]?.message?.content || "No response from Ollama";
    res.json({ reply });
  } catch (err) {
    console.error("Ollama chat error:", err.message);
    const statusCode = err.code === "ERR_HTTP_REQUEST_TIMEOUT" || err.message?.includes("ECONNREFUSED") ? 503 : 500;
    res.status(statusCode).json({
      error: statusCode === 503 ? "Ollama service unreachable" : "Error processing chat request",
    });
  }
});

module.exports = router;
