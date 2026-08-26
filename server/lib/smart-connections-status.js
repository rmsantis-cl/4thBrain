/**
 * JS port of vault/check_smart_connections_status.py — see that file's docstring
 * for the full explanation of current/missing/skipped/unexpected terminology
 * (matches Smart Connections' own in-app "Smart Environment" panel). This port
 * returns structured data instead of printing, for the /api/status route.
 */
const fs = require("fs");
const path = require("path");

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

function lookup(config, notePath) {
  const env = loadEnvSettings(config);
  const sources = loadSources(config);
  const entry = sources[notePath];
  if (!entry) {
    return { found: false };
  }
  const { status, reason } = classifySource(entry, env);
  const result = { found: true, path: notePath, status, reason };
  if (status === "current") {
    result.embeddedWith = entry.embedding.default;
  }
  return result;
}

module.exports = { summarize, lookup };
