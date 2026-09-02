/**
 * Story 6.2 task 6.2-B — the keyword half of hybrid search.
 *
 * Contract: `documets/design/api-search-contract.md`. Decision: ADR22.
 *
 * The `document` table stores metadata only — never note content — so keyword
 * search over it alone could match names and paths but could not produce the
 * snippets Story 6.2's acceptance criterion requires. This module therefore
 * keeps a *derived* index of document bodies read from each document's
 * `uri_location`, in the same SQLite file, and searches that. Every row in it is
 * reconstructible from `document` plus the files on disk, which is why it is
 * created here at runtime rather than living in `documets/design/schema.sql`
 * (see ADR22 and DESIGN-DEBT item 7).
 *
 * Primary backend is FTS5 (ranking via `bm25()`, snippets via `snippet()`).
 * A `LIKE` scan over the same stored bodies is the documented fallback for a
 * runtime without FTS5; it is a degraded mode, and `mode` says which ran.
 */
const fs = require("fs");
const path = require("path");

/** Longest file body indexed, per the contract's freshness guards. */
const MAX_BODY_BYTES = 1024 * 1024;
/** Tokens of context either side of a match in an FTS5 snippet. */
const SNIPPET_TOKENS = 20;
/** Snippet length for the LIKE fallback, which has no snippet() to lean on. */
const FALLBACK_SNIPPET_CHARS = 220;

const TEXT_MIME_PREFIXES = ["text/"];
const TEXT_MIME_EXACT = new Set([
  "application/json",
  "application/xml",
  "application/xhtml+xml",
  "application/markdown",
  "application/x-yaml",
]);
const TEXT_EXTENSIONS = new Set([
  ".md",
  ".markdown",
  ".txt",
  ".text",
  ".html",
  ".htm",
  ".json",
  ".csv",
  ".yaml",
  ".yml",
  ".xml",
  ".log",
]);

function isTextDocument(doc) {
  const mime = (doc.mime_type || "").toLowerCase();
  if (mime) {
    if (TEXT_MIME_PREFIXES.some((p) => mime.startsWith(p))) return true;
    if (TEXT_MIME_EXACT.has(mime)) return true;
    return false;
  }
  return TEXT_EXTENSIONS.has(path.extname(doc.uri_location || "").toLowerCase());
}

/**
 * Split free-text into search tokens. Users type prose, never FTS5 operator
 * syntax, so everything that is not a word character is a separator — which is
 * also what makes an FTS5 syntax error impossible to trigger from user input.
 */
function tokenize(query) {
  return String(query || "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}_]+/u)
    .filter((t) => t.length > 0);
}

/** Rebuild the query as quoted FTS5 terms, implicitly AND-ed. */
function toMatchExpression(tokens) {
  return tokens.map((t) => `"${t.replace(/"/g, '""')}"`).join(" ");
}

function nowIso() {
  return new Date().toISOString();
}

/** Build a plain-text snippet around the first token hit, for the LIKE fallback. */
function buildSnippet(body, tokens) {
  if (!body) return "";
  const haystack = body.toLowerCase();
  let at = -1;
  for (const token of tokens) {
    const found = haystack.indexOf(token);
    if (found !== -1 && (at === -1 || found < at)) at = found;
  }
  if (at === -1) at = 0;
  const start = Math.max(0, at - Math.floor(FALLBACK_SNIPPET_CHARS / 3));
  const end = Math.min(body.length, start + FALLBACK_SNIPPET_CHARS);
  const slice = body.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${slice}${end < body.length ? "…" : ""}`;
}

class KeywordIndex {
  /**
   * @param {object} db      node:sqlite DatabaseSync handle
   * @param {object} options `{ vaultDir, readFile }` — `readFile` is injectable
   *                         so tests do not need real files on disk.
   */
  constructor(db, options = {}) {
    this.db = db;
    this.vaultDir = options.vaultDir || null;
    this.readFile = options.readFile || defaultReadFile;
    this.mode = this.#createTables();
  }

  #createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS document_index_state (
        document_id INTEGER PRIMARY KEY,
        doc_updated TEXT,
        indexed_at  TEXT NOT NULL
      )
    `);
    try {
      this.db.exec(
        "CREATE VIRTUAL TABLE IF NOT EXISTS document_fts USING fts5(name, path, body)"
      );
      return "fts5";
    } catch {
      // No FTS5 in this SQLite build — documented degraded mode (ADR22).
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS document_search (
          document_id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          path TEXT NOT NULL,
          body TEXT NOT NULL DEFAULT ''
        )
      `);
      return "like";
    }
  }

  #deleteRows(documentId) {
    if (this.mode === "fts5") {
      this.db.prepare("DELETE FROM document_fts WHERE rowid = ?").run(documentId);
    } else {
      this.db.prepare("DELETE FROM document_search WHERE document_id = ?").run(documentId);
    }
    this.db.prepare("DELETE FROM document_index_state WHERE document_id = ?").run(documentId);
  }

  #insertRow(doc, body) {
    if (this.mode === "fts5") {
      this.db
        .prepare("INSERT INTO document_fts(rowid, name, path, body) VALUES (?, ?, ?, ?)")
        .run(doc.id, doc.name || "", doc.uri_location || "", body);
    } else {
      this.db
        .prepare("INSERT INTO document_search(document_id, name, path, body) VALUES (?, ?, ?, ?)")
        .run(doc.id, doc.name || "", doc.uri_location || "", body);
    }
    this.db
      .prepare("INSERT INTO document_index_state(document_id, doc_updated, indexed_at) VALUES (?, ?, ?)")
      .run(doc.id, doc.updated || null, nowIso());
  }

  /**
   * Bring the index in line with the `document` table. Only documents that are
   * new, or whose `updated` moved since they were indexed, are re-read from
   * disk; rows for deleted documents are dropped. Each document is its own short
   * transaction-free set of statements, per ADR17's brief-transaction rule.
   *
   * @returns {{indexed:number, removed:number, unchanged:number, unreadable:number}}
   */
  sync() {
    const documents = this.db
      .prepare("SELECT id, name, uri_location, mime_type, updated FROM document")
      .all();
    const state = new Map(
      this.db
        .prepare("SELECT document_id, doc_updated FROM document_index_state")
        .all()
        .map((row) => [row.document_id, row.doc_updated])
    );

    const stats = { indexed: 0, removed: 0, unchanged: 0, unreadable: 0 };
    const live = new Set();

    for (const doc of documents) {
      live.add(doc.id);
      const known = state.has(doc.id);
      if (known && state.get(doc.id) === (doc.updated || null)) {
        stats.unchanged += 1;
        continue;
      }

      let body = "";
      if (isTextDocument(doc)) {
        try {
          body = this.readFile(doc.uri_location);
        } catch {
          // Moved, locked, or gone — index name/path only rather than failing
          // the caller's search over one unreadable file.
          stats.unreadable += 1;
          body = "";
        }
      }

      if (known) this.#deleteRows(doc.id);
      this.#insertRow(doc, body);
      stats.indexed += 1;
    }

    for (const documentId of state.keys()) {
      if (!live.has(documentId)) {
        this.#deleteRows(documentId);
        stats.removed += 1;
      }
    }

    return stats;
  }

  /**
   * Run a keyword search. Returns raw per-backend hits — merging with the
   * semantic backend and normalizing scores is the route's job, per the contract.
   *
   * @param {string} query
   * @param {{limit?:number, filters?:{topic?:string,status?:string,mimeType?:string}}} opts
   * @returns {{mode:string, tokens:string[], results:Array}}
   */
  search(query, opts = {}) {
    const tokens = tokenize(query);
    if (tokens.length === 0) return { mode: this.mode, tokens, results: [] };

    const limit = Math.min(Math.max(parseInt(opts.limit, 10) || 20, 1), 100);
    const filters = opts.filters || {};
    const where = [];
    const params = [];
    if (filters.topic) {
      where.push("d.topic = ?");
      params.push(filters.topic);
    }
    if (filters.status) {
      where.push("d.status = ?");
      params.push(filters.status);
    }
    if (filters.mimeType) {
      where.push("d.mime_type = ?");
      params.push(filters.mimeType);
    }

    const rows =
      this.mode === "fts5"
        ? this.#searchFts(tokens, where, params, limit)
        : this.#searchLike(tokens, where, params, limit);

    return { mode: this.mode, tokens, results: rows };
  }

  #searchFts(tokens, where, params, limit) {
    const sql = `
      SELECT d.id            AS documentId,
             d.name          AS name,
             d.uri_location  AS path,
             d.topic         AS topic,
             d.status        AS status,
             d.mime_type     AS mimeType,
             d.updated       AS updated,
             snippet(document_fts, 2, '', '', '…', ${SNIPPET_TOKENS}) AS snippet,
             bm25(document_fts) AS rank
      FROM document_fts f
      JOIN document d ON d.id = f.rowid
      WHERE document_fts MATCH ?
        ${where.length ? `AND ${where.join(" AND ")}` : ""}
      ORDER BY rank, d.id
      LIMIT ?
    `;
    const rows = this.db
      .prepare(sql)
      .all(toMatchExpression(tokens), ...params, limit);

    return rows.map((row) => ({
      documentId: row.documentId,
      title: row.name,
      path: row.path,
      topic: row.topic,
      status: row.status,
      mimeType: row.mimeType,
      updated: row.updated,
      // snippet() returns '' when the matched column has no text (a non-text
      // document matched on its name) — fall back to the title so the card is
      // never blank.
      snippet: row.snippet || row.name || "",
      // bm25() is negative and lower-is-better; flip it so higher-is-better,
      // which is what the contract's `keywordScore` promises.
      score: -row.rank,
    }));
  }

  #searchLike(tokens, where, params, limit) {
    const likeClauses = tokens.map(() => "(s.body LIKE ? OR s.name LIKE ? OR s.path LIKE ?)");
    const likeParams = [];
    for (const token of tokens) {
      const pattern = `%${token.replace(/[%_]/g, "")}%`;
      likeParams.push(pattern, pattern, pattern);
    }

    const sql = `
      SELECT s.document_id  AS documentId,
             s.name         AS name,
             s.path         AS path,
             s.body         AS body,
             d.topic        AS topic,
             d.status       AS status,
             d.mime_type    AS mimeType,
             d.updated      AS updated
      FROM document_search s
      JOIN document d ON d.id = s.document_id
      WHERE ${likeClauses.join(" AND ")}
        ${where.length ? `AND ${where.join(" AND ")}` : ""}
      ORDER BY s.document_id
    `;
    const rows = this.db.prepare(sql).all(...likeParams, ...params);

    // No bm25() here, so score on raw term frequency — enough to rank, and
    // honestly labelled as the degraded mode by `mode: "like"`.
    return rows
      .map((row) => {
        const haystack = `${row.name} ${row.path} ${row.body}`.toLowerCase();
        let score = 0;
        for (const token of tokens) {
          score += haystack.split(token).length - 1;
        }
        return {
          documentId: row.documentId,
          title: row.name,
          path: row.path,
          topic: row.topic,
          status: row.status,
          mimeType: row.mimeType,
          updated: row.updated,
          snippet: buildSnippet(row.body, tokens) || row.name || "",
          score,
        };
      })
      .sort((a, b) => b.score - a.score || a.documentId - b.documentId)
      .slice(0, limit);
  }
}

function defaultReadFile(filePath) {
  const handle = fs.openSync(filePath, "r");
  try {
    const { size } = fs.fstatSync(handle);
    const length = Math.min(size, MAX_BODY_BYTES);
    const buffer = Buffer.alloc(length);
    fs.readSync(handle, buffer, 0, length, 0);
    return buffer.toString("utf-8");
  } finally {
    fs.closeSync(handle);
  }
}

module.exports = { KeywordIndex, tokenize, toMatchExpression, isTextDocument, MAX_BODY_BYTES };
