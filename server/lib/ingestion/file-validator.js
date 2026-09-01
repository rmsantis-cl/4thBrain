const path = require("path");

// Per ADR14 + Story 1.2: text/plain, text/markdown are directly indexable.
// text/html bypasses Story 1.1's direct copy path and goes to Story 1.2's
// sanitization executor (html-sanitize-executor.js, registered under 'convert'
// in job-executors.js).
const INDEXABLE_MIME_TYPES = new Set(["text/plain", "text/markdown"]);
const INDEXABLE_EXTENSIONS = new Set([".txt", ".md", ".markdown"]);

/**
 * Classifies a staged job_file as directly indexable (Story 1.1's scope) or
 * not (Story 1.2's scope, not yet implemented). mimeType is the primary
 * signal; the extension is a fallback for callers that never resolved a MIME
 * type (e.g. raw-dir-writer's writeUrl(), which stages a .txt placeholder
 * with mimeType: null).
 */
function classify(jobFile) {
  if (!jobFile || !jobFile.path) {
    return { kind: "unsupported", reason: "job_file has no path" };
  }

  const mimeType = (jobFile.mime_type || "").toLowerCase();
  if (INDEXABLE_MIME_TYPES.has(mimeType)) {
    return { kind: "indexable", reason: `mime_type '${mimeType}' is directly indexable` };
  }

  const ext = path.extname(jobFile.path).toLowerCase();
  if (!jobFile.mime_type && INDEXABLE_EXTENSIONS.has(ext)) {
    return { kind: "indexable", reason: `no mime_type; extension '${ext}' is directly indexable` };
  }

  return {
    kind: "unsupported",
    reason: jobFile.mime_type
      ? `mime_type '${jobFile.mime_type}' requires transcoding (Story 1.2, not yet implemented)`
      : `extension '${ext}' requires transcoding (Story 1.2, not yet implemented)`,
  };
}

function isIndexable(jobFile) {
  return classify(jobFile).kind === "indexable";
}

module.exports = { classify, isIndexable, INDEXABLE_MIME_TYPES, INDEXABLE_EXTENSIONS };
