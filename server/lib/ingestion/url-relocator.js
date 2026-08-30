const fs = require("fs");
const path = require("path");
const { resolveDestination } = require("./path-resolver");

/**
 * Story 1.2 / ADR14: relocates a staged URL job_file from wherever it landed
 * under $RAW_DIR into $RAW_DIR/clipping "for extraction." This is relocation
 * only, per this story's scope call (see ASSUMPTIONS.md) — actually
 * fetching/scraping the URL's content is separate, not-yet-scoped work; the
 * acceptance criteria only test that the file ends up in $RAW_DIR/clipping.
 *
 * Not wired into the live /api/ingest/url request path: raw-dir-writer.js's
 * writeUrl() already stages new URL submissions directly into
 * cfg.rawDirClipping, so that path already satisfies the acceptance
 * criterion without this function. This module exists for the other arrival
 * path — a URL-type file that lands in $RAW_DIR/inbox some other way (e.g.
 * Story 1.1's watcher, picking up a file dropped outside the web form) and
 * needs relocating after the fact. Uses an actual move (not copy), since
 * source and destination are both pre-vault $RAW_DIR staging — leaving a
 * duplicate behind serves no purpose there the way it does for the vault
 * copy/archive steps.
 *
 * A no-op (returns the current path unchanged) if the file is already inside
 * rawDirClipping — callers don't need to check first.
 */
function relocateToClipping(jobFile, cfg) {
  if (!jobFile || !jobFile.path) {
    throw new Error("job_file has no path to relocate");
  }
  if (!fs.existsSync(jobFile.path)) {
    throw new Error(`source file does not exist: ${jobFile.path}`);
  }

  const clippingRoot = path.resolve(cfg.rawDirClipping);
  const currentDir = path.resolve(path.dirname(jobFile.path));
  if (currentDir === clippingRoot) {
    return jobFile.path;
  }

  const destPath = resolveDestination(cfg.rawDirClipping, jobFile.name || path.basename(jobFile.path));
  fs.renameSync(jobFile.path, destPath);
  return destPath;
}

module.exports = { relocateToClipping };
