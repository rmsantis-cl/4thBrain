// Proof-of-concept for documets/story/spike-webclipping.md — NOT application code.
// Demonstrates the recommended stack: Playwright (fetch/render) + Mozilla
// Readability (content extraction) + Turndown (HTML -> Markdown), fully local,
// no cloud API calls (ADR12-compliant).

const { chromium } = require("playwright");
const { JSDOM } = require("jsdom");
const { Readability } = require("@mozilla/readability");
const TurndownService = require("turndown");

const turndown = new TurndownService({ headingStyle: "atx" });

const URLS = [
  "https://en.wikipedia.org/wiki/Web_scraping",
  "https://quotes.toscrape.com/js/",
  "https://raw.githubusercontent.com/spider-rs/spider/main/README.md",
];

async function clipOne(browser, url) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
  const html = await page.content();
  await page.close();

  const contentType = /<html[\s>]/i.test(html) ? "html" : "text";
  if (contentType === "text") {
    return { url, title: null, markdown: html.trim(), extractionMode: "raw-text-passthrough" };
  }

  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();
  if (!article) {
    return { url, title: null, markdown: null, extractionMode: "readability-failed" };
  }

  const markdown = turndown.turndown(article.content);
  return { url, title: article.title, markdown, extractionMode: "readability+turndown" };
}

async function main() {
  const browser = await chromium.launch();
  try {
    for (const url of URLS) {
      console.log(`\n=== ${url} ===`);
      try {
        const result = await clipOne(browser, url);
        console.log(`mode: ${result.extractionMode}`);
        if (result.title) console.log(`title: ${result.title}`);
        console.log(`markdown (first 400 chars):\n${(result.markdown || "").slice(0, 400)}`);
      } catch (err) {
        console.log(`FAILED: ${err.message}`);
      }
    }
  } finally {
    await browser.close();
  }
}

main();
