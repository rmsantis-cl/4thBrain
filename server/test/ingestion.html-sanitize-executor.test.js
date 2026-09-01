const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { canHandle, execute, sanitizeHtml, isHtml } = require("../lib/ingestion/html-sanitize-executor");
const { createRepositories } = require("../lib/repositories");
const { createTestDb } = require("./helpers/test-db");
const { createTestCfg, cleanupTestCfg } = require("./helpers/test-cfg");

const FIXTURE_DIR = path.join(__dirname, "fixtures");


test("sanitizeHtml extracts and cleans main article content from a realistic web page", () => {
  const html = fs.readFileSync(path.join(FIXTURE_DIR, "web-clip-sample.html"), "utf-8");
  const result = sanitizeHtml(html);

  assert(result.title, "should extract article title");
  assert(result.markdown.length > 0, "should produce non-empty markdown");
  assert(!result.markdown.includes("SUBSCRIBE NOW"), "should exclude ad banners");
  assert(!result.markdown.includes("Popular this week"), "should exclude sidebar");
  assert(!result.markdown.includes("gtag"), "should exclude scripts");
  assert(!result.markdown.includes("font-family"), "should exclude inline styles");
  assert(result.markdown.includes("Local-First Note Systems"), "should preserve article heading");
  assert(result.markdown.includes("Sanitizing that content down"), "should preserve article body");
  assert(!result.degraded, "should use full Readability extraction, not degraded fallback");
});

test("sanitizeHtml falls back to body extraction when Readability finds no article", () => {
  // A page with only a form (no article-like content) — Readability should return null
  const html = "<html><head><title>Login</title></head><body><form><input name='user'><button>Sign In</button></form></body></html>";
  const result = sanitizeHtml(html);

  assert.strictEqual(result.title, "Login", "should extract title");
  assert(result.markdown.length > 0, "should produce non-empty markdown even in degraded mode");
  assert(result.degraded, "should flag degraded mode when Readability returns null");
  // In degraded mode, the extracted content includes the raw body (form markup)
  assert(result.markdown.includes("Sign In") || result.markdown.includes("Sign"), "should include body content in fallback");
});

test("sanitizeHtml handles empty body gracefully", () => {
  const html = "<html><head><title>Empty</title></head><body></body></html>";
  const result = sanitizeHtml(html);

  assert.strictEqual(result.title, "Empty", "should extract title");
  assert.strictEqual(result.markdown.trim(), "", "should produce empty markdown for empty body");
  assert(result.degraded, "should flag degraded mode");
});

test("sanitizeHtml handles HTML with no body tag", () => {
  const html = "<html><head><title>NoBody</title><body></html>";
  const result = sanitizeHtml(html);

  assert.strictEqual(result.title, "NoBody", "should extract title");
  assert(result.degraded, "should flag degraded mode");
});

test("isHtml identifies HTML by mime_type", () => {
  assert(isHtml({ mime_type: "text/html", path: "file.txt" }), "text/html mime_type should be HTML");
  assert(isHtml({ mime_type: "TEXT/HTML", path: "file.txt" }), "should be case-insensitive");
  assert(!isHtml({ mime_type: "application/pdf", path: "file.html" }), "non-HTML mime_type should not be HTML, even if .html extension");
});

test("isHtml falls back to extension when mime_type is missing", () => {
  assert(isHtml({ mime_type: null, path: "/raw/file.html" }), ".html extension with no mime_type should be HTML");
  assert(isHtml({ mime_type: null, path: "/raw/file.htm" }), ".htm extension with no mime_type should be HTML");
  assert(!isHtml({ mime_type: null, path: "/raw/file.txt" }), ".txt extension should not be HTML");
  assert(!isHtml({ mime_type: null, path: "/raw/file.pdf" }), ".pdf extension should not be HTML");
});

test("canHandle returns true for convert jobs with HTML file", () => {
  const db = createTestDb();
  const repos = createRepositories(db);
  const sourceFile = path.join(os.tmpdir(), `test-${Date.now()}.html`);
  fs.writeFileSync(sourceFile, "<html></html>", "utf-8");

  const doc = repos.document.create("test.html", sourceFile, "text/html", "utf-8", "New", null);
  const job = repos.job.create("convert", "New", doc.id, null);
  repos.job_file.create("test.html", sourceFile, "text/html", sourceFile, job.id);

  assert(canHandle(db, job), "should return true for convert job with HTML file");

  fs.rmSync(sourceFile, { force: true });
});

test("canHandle returns false for non-convert jobs", () => {
  const db = createTestDb();
  const repos = createRepositories(db);
  const sourceFile = path.join(os.tmpdir(), `test-${Date.now()}.html`);
  fs.writeFileSync(sourceFile, "<html></html>", "utf-8");

  const doc = repos.document.create("test.html", sourceFile, "text/html", "utf-8", "New", null);
  const job = repos.job.create("ingest", "New", doc.id);
  repos.job_file.create("test.html", sourceFile, "text/html", sourceFile, job.id);

  assert(!canHandle(db, job), "should return false for ingest job");

  fs.rmSync(sourceFile, { force: true });
});

test("canHandle returns false when job has no files", () => {
  const db = createTestDb();
  const repos = createRepositories(db);
  const doc = repos.document.create("orphan", "/nonexistent/path", "text/html", "utf-8", "New", null);
  const job = repos.job.create("convert", "New", doc.id);

  assert(!canHandle(db, job), "should return false when job has no job_file records");
});

test("execute sanitizes HTML, archives the original, and writes Markdown with provenance", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  const repos = createRepositories(db);
  const sourceFile = path.join(cfg.rawDirInbox, "test.html");
  const html = "<html><head><title>Test Article</title></head><body>" +
    "<nav>Navigation</nav>" +
    "<article><h1>Test Article</h1><p>This is the content.</p></article>" +
    "</body></html>";
  fs.writeFileSync(sourceFile, html, "utf-8");

  const doc = repos.document.create("test.html", sourceFile, "text/html", "utf-8", "New", null);
  const job = repos.job.create("convert", "New", doc.id, null);
  repos.job_file.create("test.html", sourceFile, "text/html", sourceFile, job.id);

  const result = execute(db, job, cfg);

  assert(result.documentId, "should return document ID");
  assert(result.destPath, "should return destination path");
  assert(result.archivedPath, "should return archived path");
  assert.strictEqual(result.strategy, "html", "should indicate html strategy");

  assert(fs.existsSync(result.destPath), "should write sanitized file to incoming");
  const sanitizedContent = fs.readFileSync(result.destPath, "utf-8");
  assert(sanitizedContent.includes("---"), "should include frontmatter");
  assert(sanitizedContent.includes("source_raw:"), "should include source_raw field");
  assert(sanitizedContent.includes("transcoded_from: text/html"), "should document HTML source");
  assert(sanitizedContent.includes("# Test Article"), "should preserve article heading");
  assert(sanitizedContent.includes("This is the content"), "should preserve article body");
  assert(!sanitizedContent.includes("Navigation"), "should exclude nav content");

  assert(fs.existsSync(result.archivedPath), "should archive original HTML");
  const archivedContent = fs.readFileSync(result.archivedPath, "utf-8");
  assert.strictEqual(archivedContent, html, "archived content should match original");

  cleanupTestCfg(cfg);
});

test("execute throws when source file does not exist", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  const repos = createRepositories(db);
  const doc = repos.document.create("missing.html", "/nonexistent/file.html", "text/html", "utf-8", "New", null);
  const job = repos.job.create("convert", "New", doc.id);
  repos.job_file.create("missing.html", "/nonexistent/file.html", "text/html", "/nonexistent/file.html", job.id);

  assert.throws(
    () => execute(db, job, cfg),
    /source file does not exist/,
    "should throw when source file is missing"
  );

  cleanupTestCfg(cfg);
});

test("execute throws when job has no files", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  const repos = createRepositories(db);
  const doc = repos.document.create("orphan", "/some/path", "text/html", "utf-8", "New", null);
  const job = repos.job.create("convert", "New", doc.id);

  assert.throws(
    () => execute(db, job, cfg),
    /has no job_file records/,
    "should throw when job has no files"
  );

  cleanupTestCfg(cfg);
});
