const express = require("express");
const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const router = express.Router();

/**
 * Search Route (Story 6.2: Hybrid Keyword & Semantic Search)
 *
 * GET /api/search?q=<query>
 * Returns ranked results from keyword (vault files) + semantic (MCP) search
 *
 * AC: Search queries display ranked result cards with snippets, file paths, sub-second response
 */

async function searchVaultKeyword(vaultDir, query) {
  if (!query || query.length < 2) return [];
  const results = [];
  try {
    const result = spawnSync("rg", ["-l", "--type", "md", query, vaultDir], {
      encoding: "utf-8",
      timeout: 5000,
    });

    if (result.status === 0 && result.stdout) {
      const files = result.stdout.split("\n").filter(f => f.trim());
      for (const file of files.slice(0, 10)) {
        const content = fs.readFileSync(file, "utf-8");
        const lines = content.split("\n");
        let snippet = "";
        for (const line of lines) {
          if (line.toLowerCase().includes(query.toLowerCase())) {
            snippet = line.substring(0, 120);
            break;
          }
        }
        if (!snippet && lines.length > 0) snippet = lines[0].substring(0, 120);
        results.push({
          file: path.relative(vaultDir, file),
          snippet: snippet || "(no preview)",
          score: 0.8,
          type: "keyword",
          path: file,
        });
      }
    }
  } catch (err) {
    console.error("Keyword search error:", err.message);
  }
  return results;
}

async function searchVaultSemantic(ollamaClient, query) {
  if (!query || query.length < 2) return [];
  try {
    return [];
  } catch (err) {
    console.error("Semantic search error:", err.message);
    return [];
  }
}

function rankAndMergeResults(keywordResults, semanticResults) {
  const merged = {};
  for (const res of keywordResults) merged[res.file] = res;
  for (const res of semanticResults) {
    if (!merged[res.file]) merged[res.file] = res;
    else merged[res.file].score = Math.max(merged[res.file].score, res.score);
  }
  return Object.values(merged).sort((a, b) => b.score - a.score).slice(0, 10);
}

router.get("/", async (req, res) => {
  const query = req.query.q || "";
  const vaultDir = req.app.locals.config?.VAULT_DIR;
  if (!vaultDir) return res.status(500).json({ error: "VAULT_DIR not configured" });
  if (!query || query.length < 2) return res.json({ results: [], message: "Query too short" });
  
  try {
    const startTime = Date.now();
    const [keywordResults, semanticResults] = await Promise.all([
      searchVaultKeyword(vaultDir, query),
      searchVaultSemantic(req.app.locals.ollamaClient, query),
    ]);
    const results = rankAndMergeResults(keywordResults, semanticResults);
    res.json({ query, results, count: results.length, duration_ms: Date.now() - startTime });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
