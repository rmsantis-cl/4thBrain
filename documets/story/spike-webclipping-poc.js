// Proof-of-concept for documets/story/spike-webclipping.md — NOT application
// code, not wired into server/ or batch/. Demonstrates the recommended stack:
//   - Playwright (fetch/render layer, HTML only)
//   - Mozilla Readability + jsdom (main-content extraction from rendered HTML)
//   - Turndown (HTML -> Markdown)
//   - OpenDataLoader PDF (@opendataloader/pdf) for PDF -> Markdown, per ADR19
//     (registered 2026-08-30, replacing pdf-parse project-wide). In production
//     this runs inside server/lib/ingestion/transcode-executor.js, not Clipper
//     code directly — see the spike doc's "Integration Path" — but it's
//     exercised directly here since the POC's job is to prove the library,
//     not the wiring.
// Fully local: no cloud API calls, no outbound cost (ADR12). OpenDataLoader's
// default mode used here is its deterministic local mode, not hybrid AI mode
// (which needs a separate backend process) — also ADR12-compliant, but out
// of scope for this spike.
//
// Standalone / runnable: this file has no repo dependency other than its own
// require()s. It was run with the packages below installed (plus
// Playwright's Chromium browser, already provisioned at the repo root for
// the UI test suite, and a local Java 11+ runtime, required by
// @opendataloader/pdf) and its real console output pasted into
// documets/story/spike-webclipping.md as evidence — see "Deliverable 3" there.
//
//   npm install playwright jsdom @mozilla/readability turndown @opendataloader/pdf
//
// Run: node spike-webclipping-poc.js

const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");
const { JSDOM } = require("jsdom");
const { Readability } = require("@mozilla/readability");
const TurndownService = require("turndown");
const { convert: convertPdf } = require("@opendataloader/pdf");

const turndown = new TurndownService({ headingStyle: "atx" });

// One URL per required diversity case: news article, blog post, PDF,
// documentation page, plain Markdown file. All fetched live at POC-run time
// on 2026-08-30; see the spike doc's changelog if any go stale later.
const URLS = [
  { label: "news article", url: "https://www.bbc.com/news/articles/cx2z72x5z1po" },
  { label: "blog post", url: "https://joelonsoftware.com/2000/04/06/things-you-should-never-do-part-i/" },
  { label: "PDF", url: "https://arxiv.org/pdf/1706.03762" },
  { label: "documentation page", url: "https://nodejs.org/api/fs.html" },
  { label: "plain markdown file", url: "https://raw.githubusercontent.com/microsoft/playwright/main/README.md" },
];

/**
 * Strategy detection mirrors transcode-executor.js's detectStrategy(): sniff
 * Content-Type (and fall back to extension) before deciding how to handle a
 * URL, rather than always spinning up a browser page. Cheap resources (PDF,
 * plain text/Markdown) never touch Playwright at all.
 */
async function detectStrategy(url) {
  let contentType = "";
  try {
    const head = await fetch(url, { method: "HEAD", redirect: "follow" });
    contentType = (head.headers.get("content-type") || "").toLowerCase();
  } catch {
    // Some hosts are fine with HEAD; if HEAD itself fails outright, fall
    // through to extension-based sniffing below.
  }

  const ext = url.split("?")[0].toLowerCase();
  if (contentType.includes("application/pdf") || ext.endsWith(".pdf")) return "pdf";
  if (contentType.includes("text/markdown") || ext.endsWith(".md")) return "markdown-passthrough";
  if (contentType.startsWith("text/plain") || contentType.startsWith("text/x-")) return "markdown-passthrough";
  return "html";
}

async function clipPdf(url) {
  // OpenDataLoader PDF (ADR19) takes file paths, not buffers/URLs, and writes
  // its output to disk rather than returning it — download to a scratch dir,
  // convert, then read the result back.
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "webclip-pdf-"));
  const pdfPath = path.join(workDir, "source.pdf");
  fs.writeFileSync(pdfPath, buffer);

  await convertPdf([pdfPath], { outputDir: workDir, format: "markdown" });

  const markdown = fs.readFileSync(path.join(workDir, "source.md"), "utf-8");
  const imagesDir = path.join(workDir, "source_images");
  const imageCount = fs.existsSync(imagesDir) ? fs.readdirSync(imagesDir).length : 0;
  return { title: null, markdown: markdown.trim(), imageCount };
}

async function clipMarkdownPassthrough(url) {
  const res = await fetch(url);
  const text = await res.text();
  return { title: null, markdown: text.trim(), imageCount: 0 };
}

async function clipHtml(browser, url) {
  const page = await browser.newPage();
  // "networkidle" looked ideal on paper but proved unreliable against real
  // sites in testing: pages with persistent analytics/ad/websocket
  // connections (most news sites) never go fully idle and the goto() call
  // times out. "domcontentloaded" + a short settle delay for
  // client-hydrated content is what production-grade clippers (and
  // Playwright's own docs) actually recommend — see spike doc "Lessons from
  // the POC run".
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1500);
  const html = await page.content();
  await page.close();

  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();

  if (!article) {
    // Degraded fallback: Readability couldn't identify a main-content region
    // (e.g. a non-article page). Turndown the whole body rather than
    // returning nothing — matches transcode-executor.js's "never leave a job
    // permanently unresolved" philosophy.
    const bodyMarkdown = turndown.turndown(dom.window.document.body.innerHTML);
    return { title: dom.window.document.title || null, markdown: bodyMarkdown, imageCount: 0, degraded: true };
  }

  const imageCount = (article.content.match(/<img\b/gi) || []).length;
  const markdown = turndown.turndown(article.content);
  return { title: article.title, markdown, imageCount, degraded: false };
}

async function clipOne(browser, url) {
  const strategy = await detectStrategy(url);
  let result;
  if (strategy === "pdf") result = await clipPdf(url);
  else if (strategy === "markdown-passthrough") result = await clipMarkdownPassthrough(url);
  else result = await clipHtml(browser, url);
  return { url, strategy, ...result };
}

async function main() {
  const browser = await chromium.launch();
  try {
    for (const { label, url } of URLS) {
      console.log(`\n=== ${label}: ${url} ===`);
      try {
        const r = await clipOne(browser, url);
        console.log(`strategy: ${r.strategy}${r.degraded ? " (degraded fallback)" : ""}`);
        console.log(`title: ${r.title || "(none)"}`);
        console.log(`markdown length: ${r.markdown.length} chars`);
        console.log(`embedded <img> count: ${r.imageCount}`);
        console.log(`--- first 500 chars ---\n${r.markdown.slice(0, 500)}`);
      } catch (err) {
        console.log(`FAILED: ${err.message}`);
      }
    }
  } finally {
    await browser.close();
  }
}

main();
