const express = require("express");
const { buildConfig, checkOllamaReachable } = require("./config");
const { getDatabase } = require("./db/init");
const { createRepositories } = require("./lib/repositories");

const chatPageRoute = require("./routes/chat-page");
const ingestRoutes = require("./routes/ingest");
const statusRoute = require("./routes/status");
const chatLlamaRoute = require("./routes/chat-llama");
const adminDbRoute = require("./routes/admin-db");
const apiTablesRouter = require("./routes/api/tables");
const apiDocsRouter = require("./routes/api-docs");

const config = buildConfig();
const app = express();
app.locals.config = config;

// Middleware
app.use(express.json());

// Initialize SQLite database (Story 7.3)
const db = getDatabase();
app.locals.db = db;

// Initialize repositories (Story 13.3)
app.locals.repositories = createRepositories(db);

app.use(chatPageRoute);
app.use(ingestRoutes);
app.use(statusRoute);
app.use(chatLlamaRoute);
app.use("/admin/db", adminDbRoute);
app.use("/api/tables", apiTablesRouter);
app.use("/api/docs", apiDocsRouter);

app.listen(config.port, config.bindHost, async () => {
  console.log(`4thBrain — http://${config.bindHost}:${config.port}/chat`);
  console.log(`   Admin panel: http://${config.bindHost}:${config.port}/admin/db (dev-only)`);
  console.log(`   REST API: http://${config.bindHost}:${config.port}/api/tables (dev-only)`);
  console.log(`   API docs: http://${config.bindHost}:${config.port}/api/docs (dev-only)`);
  const reachable = await checkOllamaReachable(config);
  if (!reachable) {
    console.warn(
      `Ollama not reachable at ${config.ollamaBaseUrl} — harmless for this pass, everything is mocked.`
    );
  }
});
