/**
 * Story 6.2 task 6.2-C — the semantic half of hybrid search. NOT IMPLEMENTED.
 *
 * Contract: `documets/design/api-search-contract.md`.
 *
 * This is a declared-but-unavailable backend, not a mock: it returns no results
 * and says why, so `POST /api/search` reports `semantic.status: "unavailable"`
 * and every result card carries `semanticScore: null`. It deliberately does not
 * fabricate scores from the keyword backend — that would make an unbuilt feature
 * look built.
 *
 * Blocked on Story 3.1 (Smart Connections Vector Indexing Pipeline): there is no
 * pipeline yet that keeps `.smart-env` embeddings current for newly-filed notes,
 * and the MCP server that would answer similarity queries is Story 7.2's to
 * start. `server/lib/smart-connections-status.js` (task 3.1-C) already reads
 * indexing state from `.smart-env`, so when 6.2-C is picked up the shape below
 * is what it fills in — results keyed by `vaultPath`, which is the same key that
 * module's `lookup()` takes.
 */

const UNAVAILABLE_REASON =
  "Semantic search is not implemented yet — Story 6.2 task 6.2-C, blocked on Story 3.1 (Smart Connections vector indexing pipeline).";

/**
 * @returns {{available:boolean, reason:string, results:Array}}
 */
function search() {
  return { available: false, reason: UNAVAILABLE_REASON, results: [] };
}

module.exports = { search, UNAVAILABLE_REASON };
