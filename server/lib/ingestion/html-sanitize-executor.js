const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const { Readability } = require("@mozilla/readability");
const TurndownService = require("turndown");
const { createRepositories } = require("../repositories");
const { withTransaction } = require("../repositories/tx");
const { archiveToVaultRaw } = require("./vault-writer");
const { resolveDestination } = require("./path-resolver");

const HTML_MIME = "text/html";
const HTML_EXTENSIONS = new Set([".html", ".htm"]);

const turndown = new TurndownService({ headingStyle: "atx" });

/**
 * True if this job_file is HTML — the same signal file-validator.js used to
 * call directly "indexable" before this story closed that gap. Mirrors
 * file-validator's mime-type-primary / extension-fallback pattern so a
 * staged file with no resolved mime_type (e.g. relocated by url-relocator.js)
 * still gets routed here by extension.
 */
function isHtml(jobFile) {
  const mimeType = (jobFile.mime_type || "").toLowerCase();
  if (mimeType === HTML_MIME) return true;
  if (!jobFile.mime_type) {
    const ext = path.extname(jobFile.path || "").toLowerCase();
    return HTML_EXTENSIONS.has(ext);
  }
  return false;
}

function stemOf(name) {
  const ext = path.extname(name);
  return ext ? name.slice(0, -ext.length) : name;
}

/**
 * Extracts clean Markdown from raw HTML, per spike-webclipping.md's
 * recommended stack minus the fetch/render layer: Mozilla Readability +
 * jsdom (main-content isolation, stripping nav/ads/script/style/comments)
 * and Turndown (HTML -> Markdown). This executor sanitizes HTML that is
 * already staged on disk — Playwright navigation is the spike's separate
 * "fetch a live URL" concern (not-yet-built Clipper work, see story-1.2.md's
 * "Known limitations"), not needed to sanitize content that has already
 * arrived.
 *
 * Readability can return null on a page with no clearly identifiable
 * "article" region (e.g. a UI mockup/style guide rather than a prose page).
 * Falls back to Turndown-on-the-whole-<body> in that case, matching
 * transcode-executor.js's "never leave a job permanently unresolved"
 * philosophy — degraded output (nav/sidebar chrome included) beats no
 * output at all.
 */
function sanitizeHtml(html) {
  const dom = new JSDOM(html);
  const article = new Readability(dom.window.document).parse();

  if (!article) {
    const body = dom.window.document.body;
    const markdown = turndown.turndown(body ? body.innerHTML : "");
    return { title: dom.window.document.title || null, markdown, degraded: true };
  }

  const markdown = turndown.turndown(article.content);
  return { title: article.title || null, markdown, degraded: false };
}

/**
 * True if this executor can process the given job right now. Registered
 * alongside transcode-executor.js under the 'convert' job_type (see
 * batch/job-executors.js's composite dispatcher for 'convert') — this one
 * claims staged HTML, transcode-executor.js claims everything else (PDF,
 * .docx, archive-only binaries).
 */
function canHandle(db, job) {
  if (!job || job.job_type !== "convert") return false;
  const repos = createRepositories(db);
  const files = repos.job_file.listForJob(job.id);
  if (files.length === 0) return false;
  return isHtml(files[0]);
}

/**
 * Executes a 'convert' job whose staged file is HTML — Story 1.2's closing
 * gap: file-validator.js used to classify text/html as directly "indexable"
 * and let it bypass sanitization entirely via ingest-executor.js's
 * byte-for-byte copy path (Story 1.1). Sanitizes via sanitizeHtml() above,
 * archives the raw original to $VAULT_DIR/raw (matching
 * transcode-executor.js's PDF/DOCX provenance pattern), and writes the
 * extracted Markdown into $VAULT_DIR/incoming with a source_raw frontmatter
 * field pointing at the archived original.
 *
 * Same job-lifecycle contract as the other executors: succeed (return a
 * result) or throw (a real failure, e.g. missing source file) — the caller
 * (worker) owns job.status transitions.
 *
 * Like the other executors, only the first job_file per job is processed —
 * no current caller produces multi-file jobs.
 */
function execute(db, job, cfg) {
  const files = createRepositories(db).job_file.listForJob(job.id);
  if (files.length === 0) {
    throw new Error(`job ${job.id} has no job_file records to process`);
  }
  const jobFile = files[0];

  if (!fs.existsSync(jobFile.path)) {
    throw new Error(`source file does not exist: ${jobFile.path}`);
  }

  const html = fs.readFileSync(jobFile.path, "utf-8");
  const { title, markdown, degraded } = sanitizeHtml(html);

  const archivedPath = archiveToVaultRaw(jobFile.path, cfg, jobFile.name);

  const sanitizedName = `${stemOf(jobFile.name)}.md`;
  const destPath = resolveDestination(cfg.vaultDirIncoming, sanitizedName);
  const frontmatter = `---\nsource_raw: ${archivedPath}\ntranscoded_from: text/html\n---\n\n`;
  const heading = title ? `# ${title}\n\n` : "";
  fs.writeFileSync(destPath, frontmatter + heading + markdown.trim() + "\n", "utf-8");

  return withTransaction(db, (txDb) => {
    const repos = createRepositories(txDb);

    const document = repos.document.get(job.document_id);
    if (document) {
      repos.document.update(
        document.id,
        document.name,
        destPath,
        "text/markdown",
        "utf-8",
        "Processing",
        document.topic
      );
    }

    repos.job_file.update(
      jobFile.id,
      jobFile.name,
      destPath,
      "text/markdown",
      path.dirname(destPath),
      jobFile.job_id,
      "filed",
      jobFile.lock_by_PID
    );

    return { documentId: job.document_id, sourcePath: jobFile.path, destPath, archivedPath, strategy: "html", degraded };
  });
}

module.exports = { canHandle, execute, sanitizeHtml, isHtml };
