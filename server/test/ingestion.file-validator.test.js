const test = require("node:test");
const assert = require("node:assert/strict");
const { classify, isIndexable } = require("../lib/ingestion/file-validator");

test("text/plain, text/markdown, text/html are indexable", () => {
  for (const mimeType of ["text/plain", "text/markdown", "text/html"]) {
    assert.equal(isIndexable({ path: "/x/note", mime_type: mimeType }), true, mimeType);
  }
});

test("MIME check is case-insensitive", () => {
  assert.equal(isIndexable({ path: "/x/note", mime_type: "Text/Markdown" }), true);
});

test("a binary mime_type is not indexable, even with a misleading extension", () => {
  assert.equal(isIndexable({ path: "/x/fake.txt", mime_type: "application/pdf" }), false);
});

test("application/pdf is not indexable", () => {
  const result = classify({ path: "/x/doc.pdf", mime_type: "application/pdf" });
  assert.equal(result.kind, "unsupported");
  assert.match(result.reason, /Story 1.2/);
});

test("null mime_type falls back to extension for .md/.txt/.html", () => {
  assert.equal(isIndexable({ path: "/x/note.md", mime_type: null }), true);
  assert.equal(isIndexable({ path: "/x/note.txt", mime_type: null }), true);
  assert.equal(isIndexable({ path: "/x/note.html", mime_type: null }), true);
  assert.equal(isIndexable({ path: "/x/note.htm", mime_type: null }), true);
});

test("null mime_type with an unrecognized extension is not indexable", () => {
  assert.equal(isIndexable({ path: "/x/note.docx", mime_type: null }), false);
});

test("a job_file with no path is unsupported, not a crash", () => {
  assert.equal(isIndexable({ path: null, mime_type: "text/plain" }), false);
  assert.equal(isIndexable(null), false);
});
