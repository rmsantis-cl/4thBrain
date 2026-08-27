const express = require("express");
const { buildConfig, checkOllamaReachable } = require("./config");
const { getDatabase } = require("./db/init");

const chatPageRoute = require("./routes/chat-page");
const ingestRoutes = require("./routes/ingest");
const statusRoute = require("./routes/status");
const chatLlamaRoute = require("./routes/chat-llama");
const adminDbRoute = require("./routes/admin-db");

const config = buildConfig();
const app = express();
app.locals.config = config;

// Middleware
app.use(express.json());

// Initialize SQLite database (Story 7.3)
const db = getDatabase();
app.locals.db = db;

app.use(chatPageRoute);
app.use(ingestRoutes);
app.use(statusRoute);
app.use(chatLlamaRoute);
app.use("/admin/db", adminDbRoute);

app.listen(config.port, config.bindHost, async () => {
  console.log(`4thBrain (Story 7.3 DB + Story 6.4 UI + Story 13.1 Admin) — http://${config.bindHost}:${config.port}/chat`);
  console.log(`   Admin panel: http://${config.bindHost}:${config.port}/admin/db (requires NODE_ENV=development)`);
  const reachable = await checkOllamaReachable(config);
  if (!reachable) {
    console.warn(
      `Ollama not reachable at ${config.ollamaBaseUrl} — harmless for this pass, everything is mocked.`
    );
  }
});
