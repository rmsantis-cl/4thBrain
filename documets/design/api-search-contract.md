---
name: api-search-contract
description: Request/response contract for POST /api/search — the hybrid keyword + semantic search endpoint behind Story 6.2
date: 2026-09-02
metadata:
  version: 1.0
  created-by: Claude Code
---

# `POST /api/search` — endpoint contract

Design artifact for **Story 6.2 (Hybrid Keyword & Semantic Search Interface)**, EP6. Written as task 6.2-A, before any of 6.2-B (keyword backend) or 6.2-E (search UI) was implemented, per `.claude/rules/design-before-implementation.md`. Those two tasks implement against this document; anything they need that is not specified here is a gap to raise, not to improvise.

Related decisions: **ADR22** (FTS5 as the keyword backend, over a derived index), **ADR21** (indexing is measured at source level), **ADR17** (keep SQLite transactions brief), **ADR12** (no outbound cloud calls — both backends are local).

## What the story requires

> Search queries display ranked result cards containing snippets and file paths with sub-second response times.

Three things fall out of that sentence and shape the whole contract:

- **Ranked** — every result carries a comparable score and the response is returned in rank order. The client does not sort.
- **Snippets and file paths** — the response must carry enough text to render a card without a second round trip to read the file.
- **Sub-second** — one request, no client-side fan-out across backends, and no synchronous full reindex on the request path (see *Index freshness*).

## Backends

Search is hybrid: two independent backends, merged into one ranked list.

| Backend | Source | Owner | State as of 2026-09-02 |
|---|---|---|---|
| `keyword` | SQLite FTS5 over a derived index of vault file bodies (ADR22) | Story 6.2 task 6.2-B | Implemented |
| `semantic` | Smart Connections vector index (`.smart-env`) via MCP | Story 6.2 task 6.2-C, blocked on Story 3.1 | **Not implemented** |

The semantic half is *declared but unavailable*. The contract exists for it now so that 6.2-C is a fill-in rather than a redesign, and so the UI can be built against its real shape. Until it lands, the endpoint reports `semantic.status: "unavailable"` with a machine-readable `reason`, and returns keyword-only results.

**The endpoint must never synthesize semantic scores.** A result that only the keyword backend matched carries `semanticScore: null` and `matchedBy: ["keyword"]`. Filling those in with a keyword-derived number would make an unbuilt feature look built.

## Request

`POST /api/search`, `Content-Type: application/json`. Behind `localOnlyMiddleware` (Story 9.1), like every other API route.

```json
{
  "query": "vector indexing",
  "limit": 20,
  "filters": {
    "topic": "AI/Claude",
    "status": "Indexed",
    "mimeType": "text/markdown"
  },
  "backends": ["keyword", "semantic"]
}
```

| Field | Type | Required | Default | Rules |
|---|---|---|---|---|
| `query` | string | yes | — | Trimmed. 1–256 characters after trimming. Free text; the caller never writes FTS5 operator syntax (see *Query handling*). |
| `limit` | integer | no | `20` | 1–100. Clamped, not rejected, when out of range. |
| `filters.topic` | string | no | — | Exact match on `document.topic`. |
| `filters.status` | string | no | — | Exact match on `document.status`. |
| `filters.mimeType` | string | no | — | Exact match on `document.mime_type`. |
| `backends` | string[] | no | all available | Subset of `["keyword","semantic"]`. Naming an unavailable backend is not an error — it reports as unavailable in the response. |

Unknown top-level fields and unknown `filters` keys are ignored rather than rejected, so a newer client cannot break against an older server.

### Query handling

Users type prose, not query syntax. The keyword backend tokenizes the query on non-word characters and rebuilds it as double-quoted FTS5 terms joined implicitly (AND semantics), each internal `"` doubled. `search: "foo AND (bar" ` therefore matches documents containing both `foo` and `bar`, and can never produce an FTS5 syntax error. A query that tokenizes to nothing (all punctuation) is treated as an empty query → `400`.

## Response — `200 OK`

```json
{
  "query": "vector indexing",
  "limit": 20,
  "tookMs": 14,
  "backends": {
    "keyword": { "status": "ok", "mode": "fts5", "matched": 3, "tookMs": 11 },
    "semantic": {
      "status": "unavailable",
      "matched": 0,
      "reason": "Semantic search is not implemented yet — Story 6.2 task 6.2-C, blocked on Story 3.1 (Smart Connections vector indexing pipeline)."
    }
  },
  "results": [
    {
      "documentId": 42,
      "title": "Vector indexing notes.md",
      "path": "C:\\Users\\rsant\\desar\\Local Vault\\Local Vault\\incoming\\Vector indexing notes.md",
      "vaultPath": "incoming/Vector indexing notes.md",
      "snippet": "…the Smart Connections vector index lives under .smart-env and is rebuilt…",
      "score": 4.13,
      "matchedBy": ["keyword"],
      "keywordScore": 4.13,
      "semanticScore": null,
      "topic": "AI/Claude",
      "status": "Indexed",
      "mimeType": "text/markdown",
      "updated": "2026-09-01T18:12:44.031Z"
    }
  ]
}
```

### Result card fields

| Field | Type | Notes |
|---|---|---|
| `documentId` | integer | `document.id`. Stable handle for follow-up calls (`/api/tables/document/:id`). |
| `title` | string | `document.name`. What the card headline shows. |
| `path` | string | Absolute on-disk path (`document.uri_location`) — the "file path" the acceptance criterion asks for. |
| `vaultPath` | string \| null | Path relative to `$VAULT_DIR`, forward-slashed. `null` when the document lives outside the vault. This is the key `smart-connections-status.lookup()` takes, so it is what will join keyword results to semantic ones in 6.2-C. |
| `snippet` | string | **Plain text**, no markup, with `…` marking elision. Rendered with `textContent` by the client, so no HTML escaping contract is needed and no injection surface is created. Empty string when the body could not be read. |
| `score` | number | Merged relevance, higher is better. Rank order of `results` is by descending `score`. |
| `matchedBy` | string[] | Which backends produced this result — `["keyword"]`, `["semantic"]`, or `["keyword","semantic"]`. Drives the per-card provenance chip in the UI. |
| `keywordScore` | number \| null | `-bm25()`, so higher is better. `null` when the keyword backend did not match this document. |
| `semanticScore` | number \| null | Cosine similarity, 0–1, once 6.2-C exists. `null` until then, and `null` for keyword-only hits after that. |
| `topic`, `status`, `mimeType`, `updated` | string \| null | Straight from the `document` row; used for filter chips and card metadata. |

### Backend status block

`backends.<name>.status` is one of:

- `ok` — ran, results included (`matched` may still be 0).
- `unavailable` — not implemented, or its dependency is missing. Carries `reason`. Not an error.
- `error` — implemented and expected to work, but this call failed. Carries `reason`. Not an error either: a hybrid search degrades to the half that worked rather than failing whole.

`keyword.mode` reports `fts5` or `like` so a degraded run is visible rather than silent (ADR22).

### Ranking and merge

Scores from a lexical ranker and a vector ranker are not on the same scale, so they are not added raw. The merge rule:

1. Within each backend, min-max normalize its scores across its own result set to `0..1`.
2. `score = 0.5 * keywordNorm + 0.5 * semanticNorm`, with a missing backend contributing 0.
3. A document matched by both backends is one result with both sub-scores populated and both names in `matchedBy`.
4. Ties break on `documentId` so paging is stable.

While `semantic` is unavailable this reduces to keyword rank order, which is why the weights are stated now rather than left for 6.2-C to invent. The raw per-backend scores stay in the response so the weighting can be re-tuned without changing the contract.

### Index freshness

The keyword index syncs **incrementally on the request path**: before querying, the endpoint re-reads only those documents whose `document.updated` is newer than their recorded index timestamp, plus any not yet indexed at all, and drops rows for documents that no longer exist. When nothing changed this is a single indexed query and costs effectively nothing.

Guards, so freshness can never blow the sub-second budget in a pathological case:

- A single file body is read up to **1 MiB**; beyond that it is truncated (the document is still searchable, its tail is not).
- Non-text documents (per `document.mime_type`) are indexed on name/path only, with an empty body — a PDF's *extracted* text is a separate `document` row created by Story 1.2, and that row is text.
- An unreadable file (moved, locked, permissions) indexes with an empty body and does not fail the request.

If the sync ever stops being cheap enough at the vault sizes this system actually reaches, it moves into Story 4.1's batch worker as an `index` job. That is a relocation, not a contract change.

## Errors

| Status | When | Body |
|---|---|---|
| `400` | `query` missing, not a string, empty after trimming, longer than 256 chars, or tokenizing to nothing | `{ "error": "<what was wrong>" }` |
| `403` | Non-local caller (Story 9.1 middleware) | Middleware's own body |
| `503` | Every requested backend reported `unavailable` or `error` | `{ "error": "...", "backends": { ... } }` — the backend block is included so the client can say *why* |

A backend failing while another succeeds is **not** an error response: it is `200` with that backend marked `error`.

## What this contract does not cover

- Pagination beyond `limit` (no offset/cursor). The acceptance criterion is a ranked card list, not a paged browser. Add it as a follow-up story if a real vault needs it.
- Highlight markup inside snippets. Snippets are plain text by design (see the `snippet` row above); the client may highlight query tokens itself.
- Search across job/tag entities. This endpoint searches documents.
- Saved searches, history, and query suggestions — not in Story 6.2.

## Changelog

- **2026-09-02** — Created as Story 6.2 task 6.2-A, ahead of tasks 6.2-B (keyword backend) and 6.2-E (search UI).
