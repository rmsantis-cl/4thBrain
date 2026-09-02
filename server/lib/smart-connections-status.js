/**
 * Story 3.1 (task 3.1-C) — Smart Connections indexing-state reader.
 *
 * JS port of vault/check_smart_connections_status.py — see that file's docstring
 * for the full explanation of current/missing/skipped/unexpected terminology
 * (matches Smart Connections' own in-app "Smart Environment" panel). This port
 * returns structured data instead of printing, for the /api/status route and for
 * any Story 3.1 code that needs to know whether a note made it into the index.
 *
 * Design basis: `documets/story/spike-3.2.md`.
 *
 * The `.ajson` files are NOT valid JSON documents despite the extension. Each is
 * an append-only log of `"key": {...},` fragments, one per line, with the same
 * key rewritten every time Smart Connections re-saves that item — so the file
 * has to be read line by line and reduced last-write-wins. A line whose value is
 * literally `null` is a tombstone (the item was removed from the collection);
 * the last write for a key decides whether it exists at all. Measured on the
 * live vault 2026-09-02: 225 lines → 97 distinct keys → 57 live sources, with 71
 * keys rewritten at least once and 41 tombstone lines. Parsing the file as JSON,
 * or taking the first write per key, gives wrong answers on all three counts.
 */
const fs = require("fs");
const path = require("path");

/**
 * Reduce an append-only `.ajson` log to its final state.
 * Returns `{ key: value }` including `null` tombstone values — callers decide
 * whether a tombstone means "gone" (it does, for collections) so that this stays
 * a faithful representation of the log rather than a lossy one.
 */
function parseAjson(filePath) {
  const entries = {};
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    if (line.endsWith(",")) line = line.slice(0, -1);

    const sepIndex = line.indexOf(": ");
    if (sepIndex === -1) continue;
    const rawKey = line.slice(0, sepIndex);
    const rawValue = line.slice(sepIndex + 2);
    let key;
    try {
      key = JSON.parse(rawKey);
    } catch {
      continue;
    }
    try {
      // Last write wins: a later line for the same key overwrites the earlier one.
      entries[key] = JSON.parse(rawValue);
    } catch {
      continue;
    }
  }
  return entries;
}

function loadEnvSettings(config) {
  const envPath = path.join(config.vaultDir, config.smartEnvDir, "smart_env.json");
  return JSON.parse(fs.readFileSync(envPath, "utf-8"));
}

function loadSources(config) {
  const ajsonPath = path.join(config.vaultDir, config.smartEnvDir, "smart_sources", "smart_sources.ajson");
  const entries = parseAjson(ajsonPath);
  const sources = {};
  for (const [key, value] of Object.entries(entries)) {
    if (key.startsWith("smart_sources:") && value !== null) {
      sources[key.slice("smart_sources:".length)] = value;
    }
  }
  return sources;
}

function isEmbedded(embedding) {
  const defaultModels = (embedding || {}).default || {};
  return Object.values(defaultModels).some((model) => model && model.at);
}

function skipReason(size, minChars, itemPath, fileExclusions, folderExclusions) {
  if (size !== undefined && size !== null && size < minChars) {
    return `Below minimum size (${size} chars, minimum is ${minChars})`;
  }
  for (const pattern of (fileExclusions || "").split(",").map((p) => p.trim()).filter(Boolean)) {
    if (itemPath.toLowerCase().includes(pattern.toLowerCase())) {
      return `Matches file exclusion pattern '${pattern}'`;
    }
  }
  for (const pattern of (folderExclusions || "").split(",").map((p) => p.trim()).filter(Boolean)) {
    if (itemPath.toLowerCase().includes(pattern.toLowerCase())) {
      return `Matches folder exclusion pattern '${pattern}'`;
    }
  }
  return "Excluded under current embedding policy (reason not decodable from stored data)";
}

function classifySource(entry, env) {
  const minChars = env.smart_sources.min_chars;
  const fileExclusions = env.smart_sources.file_exclusions || "";
  const folderExclusions = env.smart_sources.folder_exclusions || "";
  const size = (entry.last_import || {}).size;
  const itemPath = entry.path || "";
  const eligible = size === undefined || size === null || size >= minChars;

  const embedded = isEmbedded(entry.embedding || {});
  if (embedded && eligible) return { status: "current", reason: null };
  if (embedded && !eligible) {
    return { status: "unexpected", reason: skipReason(size, minChars, itemPath, fileExclusions, folderExclusions) };
  }
  if (!eligible) {
    return { status: "skipped", reason: skipReason(size, minChars, itemPath, fileExclusions, folderExclusions) };
  }
  return { status: "missing", reason: null };
}

function classifyBlocks(entry, env) {
  const minChars = env.smart_blocks.min_chars;
  const results = [];
  const blocksData = entry.blocks_data || {};
  for (const [key, block] of Object.entries(blocksData)) {
    const size = block.size;
    const shouldEmbed = block.should_embed !== false;
    const embedded = isEmbedded(block.embedding || {});
    if (embedded && shouldEmbed) {
      results.push({ key, status: "current", reason: null });
    } else if (embedded && !shouldEmbed) {
      results.push({ key, status: "unexpected", reason: skipReason(size, minChars, key, "", "") });
    } else if (!shouldEmbed) {
      results.push({ key, status: "skipped", reason: skipReason(size, minChars, key, "", "") });
    } else {
      results.push({ key, status: "missing", reason: null });
    }
  }
  return results;
}

function summarize(config) {
  const env = loadEnvSettings(config);
  const sources = loadSources(config);

  const sourceCounts = { current: 0, missing: 0, skipped: 0, unexpected: 0 };
  const blockCounts = { current: 0, missing: 0, skipped: 0, unexpected: 0 };
  const skippedSources = [];

  for (const [itemPath, entry] of Object.entries(sources)) {
    const { status, reason } = classifySource(entry, env);
    sourceCounts[status] += 1;
    if (status === "skipped" || status === "unexpected") {
      skippedSources.push({ path: itemPath, status, reason });
    }
    for (const block of classifyBlocks(entry, env)) {
      blockCounts[block.status] += 1;
    }
  }

  return {
    sources: { total: Object.keys(sources).length, ...sourceCounts },
    blocks: { total: Object.values(blockCounts).reduce((a, b) => a + b, 0), ...blockCounts },
    skippedSources,
  };
}

/**
 * Per-note lookup by vault-relative path (e.g. "incoming/note.md").
 * Returns `{ found: false }` for a note Smart Connections has never scanned —
 * which is different from "scanned and skipped", so callers can tell the two apart.
 */
function lookup(config, notePath) {
  const env = loadEnvSettings(config);
  const sources = loadSources(config);
  const entry = sources[notePath];
  if (!entry) {
    return { found: false, path: notePath, status: "not-found", reason: null };
  }
  const { status, reason } = classifySource(entry, env);
  const result = { found: true, path: notePath, status, reason };
  if (status === "current") {
    // `embedding` is always present for a "current" item (that's what makes it
    // current), but guard anyway — the .ajson is written by another process.
    result.embeddedWith = (entry.embedding || {}).default || null;
  }
  return result;
}

/**
 * Total number of notes Smart Connections holds a current embedding for.
 * Source-level, not block-level: per ADR21 a note counts as indexed when its
 * whole-note embedding is current, regardless of how many of its blocks were
 * skipped for being under the block `min_chars` threshold.
 */
function indexedCount(config) {
  return summarize(config).sources.current;
}

/**
 * Notes that did not make it into the index, with the reason.
 * Per Spike 3.2 (user direction) "skipped" is what this project reports as
 * failed to index; "unexpected" (a vector exists for an item that is no longer
 * eligible) is included too, since it also means the index disagrees with the
 * current policy. "missing" is excluded — that is pending, not failed.
 */
function listFailed(config) {
  return summarize(config).skippedSources;
}

module.exports = { summarize, lookup, indexedCount, listFailed, parseAjson };
