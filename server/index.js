const express = require("express");
const { buildConfig, checkOllamaReachable } = require("./config");
const { getDatabase } = require("./db/init");

const chatPageRoute = require("./routes/chat-page");
const ingestRoutes = require("./routes/ingest");
const statusRoute = require("./routes/status");
const chatLlamaRoute = require("./routes/chat-llama");

const config = buildConfig();
const app = express();

// Initialize SQLite database (Story 7.3)
const db = getDatabase();
app.locals.db = db;

app.use(chatPageRoute);
app.use(ingestRoutes);
app.use(statusRoute);
app.use(chatLlamaRoute);

app.listen(config.port, config.bindHost, async () => {
  console.log(`4thBrain (Story 7.3 DB + Story 6.4 UI) — http://${config.bindHost}:${config.port}/chat`);
  const reachable = await checkOllamaReachable(config);
  if (!reachable) {
    console.warn(
      `Ollama not reachable at ${config.ollamaBaseUrl} — harmless for this pass, everything is mocked.`
    );
  }
});
