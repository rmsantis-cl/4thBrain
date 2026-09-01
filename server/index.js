const express = require("express");
const { buildConfig, checkOllamaReachable } = require("./config");
const { getDatabase } = require("./db/init");
const { createRepositories } = require("./lib/repositories");
const { createWatcher } = require("./lib/ingestion/watcher");
const { localOnlyMiddleware } = require("./middleware/local-only");

const chatPageRoute = require("./routes/chat-page");
const ingestRoutes = require("./routes/ingest");
const statusRoute = require("./routes/status");
const chatLlamaRoute = require("./routes/chat-llama");
const adminPageRoute = require("./routes/admin-page");
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

// Watch $RAW_DIR/inbox for files that appear outside the web ingestion form
// (Story 1.1). Never previously wired to a runtime entry point — watcher.js
// existed and was fully tested (server/test/ingestion.watcher.test.js) but
// nothing called createWatcher() outside of tests, so files dropped directly
// into rawDirInbox were never picked up by the running server. Wiring it in
// here uses only the already-designed/tested module (ADR14 + story-1.1.md);
// no new ingestion logic is introduced.
app.locals.watcher = createWatcher(config, db, {
  onJobCreated: (jobId, filePath) =>
    console.log(JSON.stringify({ level: "info", component: "ingestion.watcher", event: "job_created", jobId, filePath })),
  onSkipped: (filePath, reason) =>
    console.log(JSON.stringify({ level: "info", component: "ingestion.watcher", event: "add_skipped", filePath, reason })),
  onError: (err, filePath) =>
    console.error(JSON.stringify({ level: "error", component: "ingestion.watcher", event: "add_failed", filePath, error: err.message })),
});

app.get("/", (req, res) => res.redirect(302, "/chat"));

// Story 9.1 — Local-only access enforcement
// Protect sensitive endpoints (ingestion, admin, API) from non-local access.
app.use(chatPageRoute);
app.use(localOnlyMiddleware, ingestRoutes);
app.use(localOnlyMiddleware, statusRoute);
app.use(localOnlyMiddleware, chatLlamaRoute);
app.use(localOnlyMiddleware, adminPageRoute);
app.use("/admin/db", localOnlyMiddleware, adminDbRoute);
app.use("/api/tables", localOnlyMiddleware, apiTablesRouter);
app.use("/api/docs", localOnlyMiddleware, apiDocsRouter);

app.listen(config.port, config.bindHost, async () => {
  console.log(`4thBrain — http://${config.bindHost}:${config.port}/chat`);
  console.log(`   Admin menu: http://${config.bindHost}:${config.port}/admin (dev-only)`);
  console.log(`   Admin tables: http://${config.bindHost}:${config.port}/admin/db (dev-only)`);
  console.log(`   REST API: http://${config.bindHost}:${config.port}/api/tables (dev-only)`);
  console.log(`   API docs: http://${config.bindHost}:${config.port}/api/docs (dev-only)`);
  const reachable = await checkOllamaReachable(config);
  if (!reachable) {
    console.warn(
      `Ollama not reachable at ${config.ollamaBaseUrl} — harmless for this pass, everything is mocked.`
    );
  }
});
