/**
 * Story 6.2 — `POST /api/search`, the hybrid keyword + semantic search endpoint.
 *
 * Implements `documets/design/api-search-contract.md` exactly; read that before
 * changing anything here. Keyword half is task 6.2-B (`lib/search/keyword-index.js`,
 * ADR22); the semantic half (task 6.2-C) is blocked on Story 3.1 and reports
 * itself unavailable rather than returning invented scores.
 */
const express = require("express");
const path = require("path");
const { KeywordIndex } = require("../lib/search/keyword-index");
const semanticSearch = require("../lib/search/semantic-search");

const router = express.Router();

const MAX_QUERY_CHARS = 256;
const DEFAULT_LIMIT = 20;
const KEYWORD_WEIGHT = 0.5;
const SEMANTIC_WEIGHT = 0.5;

/** One index per database handle, built lazily on first search. */
function getKeywordIndex(app) {
  if (!app.locals.keywordIndex) {
    const cfg = app.locals.config || {};
    app.locals.keywordIndex = new KeywordIndex(app.locals.db, { vaultDir: cfg.vaultDir });
  }
  return app.locals.keywordIndex;
}

/** Vault-relative, forward-slashed path — the key semantic results will join on. */
function toVaultPath(absolutePath, vaultDir) {
  if (!absolutePath || !vaultDir) return null;
  const relative = path.relative(vaultDir, absolutePath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return relative.split(path.sep).join("/");
}

/** Min-max normalize a backend's scores onto 0..1 within its own result set. */
function normalize(results) {
  if (results.length === 0) return new Map();
  const scores = results.map((r) => r.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const span = max - min;
  return new Map(
    results.map((r) => [r.documentId, span === 0 ? 1 : (r.score - min) / span])
  );
}

router.post("/api/search", express.json(), (req, res) => {
  const startedAt = Date.now();
  const body = req.body || {};

  if (typeof body.query !== "string") {
    return res.status(400).json({ error: "query is required and must be a string" });
  }
  const query = body.query.trim();
  if (query.length === 0) {
    return res.status(400).json({ error: "query must not be empty" });
  }
  if (query.length > MAX_QUERY_CHARS) {
    return res.status(400).json({ error: `query must be ${MAX_QUERY_CHARS} characters or fewer` });
  }

  const limit = Math.min(Math.max(parseInt(body.limit, 10) || DEFAULT_LIMIT, 1), 100);
  const filters = body.filters && typeof body.filters === "object" ? body.filters : {};
  const requested = Array.isArray(body.backends) ? body.backends : ["keyword", "semantic"];

  const backends = {};
  let keywordResults = [];

  if (requested.includes("keyword")) {
    const keywordStartedAt = Date.now();
    try {
      const index = getKeywordIndex(req.app);
      index.sync();
      const outcome = index.search(query, { limit, filters });
      if (outcome.tokens.length === 0) {
        return res.status(400).json({ error: "query contains no searchable terms" });
      }
      keywordResults = outcome.results;
      backends.keyword = {
        status: "ok",
        mode: outcome.mode,
        matched: keywordResults.length,
        tookMs: Date.now() - keywordStartedAt,
      };
    } catch (err) {
      // A hybrid search degrades to the half that worked rather than failing whole.
      backends.keyword = {
        status: "error",
        matched: 0,
        reason: `Keyword search failed: ${err.message}`,
        tookMs: Date.now() - keywordStartedAt,
      };
    }
  }

  let semanticResults = [];
  if (requested.includes("semantic")) {
    const outcome = semanticSearch.search(query, { limit, filters });
    if (outcome.available) {
      semanticResults = outcome.results;
      backends.semantic = { status: "ok", matched: semanticResults.length };
    } else {
      backends.semantic = { status: "unavailable", matched: 0, reason: outcome.reason };
    }
  }

  const usable = Object.values(backends).some((b) => b.status === "ok");
  if (!usable) {
    return res.status(503).json({ error: "no search backend is available", backends });
  }

  const keywordNorm = normalize(keywordResults);
  const semanticNorm = normalize(semanticResults);
  const vaultDir = (req.app.locals.config || {}).vaultDir;

  const merged = new Map();
  for (const hit of keywordResults) {
    merged.set(hit.documentId, {
      documentId: hit.documentId,
      title: hit.title,
      path: hit.path,
      vaultPath: toVaultPath(hit.path, vaultDir),
      snippet: hit.snippet,
      matchedBy: ["keyword"],
      keywordScore: hit.score,
      semanticScore: null,
      topic: hit.topic || null,
      status: hit.status || null,
      mimeType: hit.mimeType || null,
      updated: hit.updated || null,
      score: KEYWORD_WEIGHT * (keywordNorm.get(hit.documentId) || 0),
    });
  }
  for (const hit of semanticResults) {
    const existing = merged.get(hit.documentId);
    const contribution = SEMANTIC_WEIGHT * (semanticNorm.get(hit.documentId) || 0);
    if (existing) {
      existing.matchedBy.push("semantic");
      existing.semanticScore = hit.score;
      existing.score += contribution;
    } else {
      merged.set(hit.documentId, {
        documentId: hit.documentId,
        title: hit.title,
        path: hit.path,
        vaultPath: hit.vaultPath || toVaultPath(hit.path, vaultDir),
        snippet: hit.snippet || "",
        matchedBy: ["semantic"],
        keywordScore: null,
        semanticScore: hit.score,
        topic: hit.topic || null,
        status: hit.status || null,
        mimeType: hit.mimeType || null,
        updated: hit.updated || null,
        score: contribution,
      });
    }
  }

  const results = [...merged.values()]
    .sort((a, b) => b.score - a.score || a.documentId - b.documentId)
    .slice(0, limit);

  res.json({
    query,
    limit,
    tookMs: Date.now() - startedAt,
    backends,
    results,
  });
});

module.exports = router;
