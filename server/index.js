const express = require("express");
const { buildConfig, checkOllamaReachable } = require("./config");

const chatPageRoute = require("./routes/chat-page");
const ingestRoutes = require("./routes/ingest");
const statusRoute = require("./routes/status");
const chatLlamaRoute = require("./routes/chat-llama");

const config = buildConfig();
const app = express();

app.use(chatPageRoute);
app.use(ingestRoutes);
app.use(statusRoute);
app.use(chatLlamaRoute);

app.listen(config.port, config.bindHost, async () => {
  console.log(`4thBrain UI (Story 6.4, mocked) — http://${config.bindHost}:${config.port}/chat`);
  const reachable = await checkOllamaReachable(config);
  if (!reachable) {
    console.warn(
      `Ollama not reachable at ${config.ollamaBaseUrl} — harmless for this pass, everything is mocked.`
    );
  }
});
