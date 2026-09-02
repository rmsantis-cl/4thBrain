// Story 3.1 (task 3.1-C) — tests for the .ajson indexing-state reader.
// Design basis: documets/story/spike-3.2.md. The fixture below deliberately
// reproduces the three properties of a real .ajson file that a naive JSON.parse
// would get wrong: it is not a JSON document, the same key is rewritten several
// times (last write wins), and a `null` value is a tombstone.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const scs = require("../lib/smart-connections-status");

const ENV_SETTINGS = {
  smart_sources: { min_chars: 200, file_exclusions: "Untitled", folder_exclusions: "" },
  smart_blocks: { embed_blocks: true, min_chars: 200 },
};

function embedded(at = 1786897137226) {
  return { history: [], default: { mf_ccarbz: { file: "mf_ccarbz", file_i: 0, at } } };
}

function source(p, size, opts = {}) {
  return {
    class_name: "SmartSource",
    path: p,
    last_import: { size, mtime: 1, at: 1, hash: "h" },
    embedding: opts.embedded ? embedded() : { history: [], default: {} },
    blocks_data: opts.blocks || {},
  };
}

function block(size, shouldEmbed, isEmbedded) {
  return {
    size,
    should_embed: shouldEmbed,
    embedding: isEmbedded ? embedded() : { history: [], default: {} },
  };
}

/** Writes a throwaway vault with a .smart-env in it; returns a config object. */
function makeVault(lines) {
  const vaultDir = fs.mkdtempSync(path.join(os.tmpdir(), "b4-smart-env-"));
  const envDir = path.join(vaultDir, ".smart-env");
  fs.mkdirSync(path.join(envDir, "smart_sources"), { recursive: true });
  fs.writeFileSync(path.join(envDir, "smart_env.json"), JSON.stringify(ENV_SETTINGS));
  fs.writeFileSync(path.join(envDir, "smart_sources", "smart_sources.ajson"), lines.join("\n"));
  return { vaultDir, smartEnvDir: ".smart-env" };
}

function line(key, value) {
  return `${JSON.stringify(key)}: ${JSON.stringify(value)},`;
}

test("parseAjson reduces an append-only log last-write-wins", () => {
  const vault = makeVault([
    line("smart_sources:a.md", source("a.md", 100)),
    line("smart_sources:a.md", source("a.md", 900, { embedded: true })),
    line("smart_sources:b.md", source("b.md", 900, { embedded: true })),
    line("smart_sources:b.md", null),
    "",
    "not a key/value line at all",
  ]);
  const entries = scs.parseAjson(
    path.join(vault.vaultDir, ".smart-env", "smart_sources", "smart_sources.ajson")
  );

  assert.equal(Object.keys(entries).length, 2, "one entry per distinct key, not per line");
  assert.equal(entries["smart_sources:a.md"].last_import.size, 900, "later write overwrites earlier");
  assert.equal(entries["smart_sources:b.md"], null, "tombstone is preserved as null");
});

test("summarize classifies sources current/missing/skipped/unexpected", () => {
  const vault = makeVault([
    // current: over min_chars and embedded
    line("smart_sources:big.md", source("big.md", 900, { embedded: true })),
    // skipped: under min_chars, never embedded
    line("smart_sources:tiny.md", source("tiny.md", 51)),
    // missing: eligible but not embedded yet
    line("smart_sources:pending.md", source("pending.md", 900)),
    // unexpected: embedded, then shrank below min_chars
    line("smart_sources:shrank.md", source("shrank.md", 900, { embedded: true })),
    line("smart_sources:shrank.md", source("shrank.md", 12, { embedded: true })),
    // tombstoned: must not be counted at all
    line("smart_sources:deleted.md", source("deleted.md", 900, { embedded: true })),
    line("smart_sources:deleted.md", null),
  ]);

  const summary = scs.summarize(vault);
  assert.deepEqual(summary.sources, {
    total: 4,
    current: 1,
    missing: 1,
    skipped: 1,
    unexpected: 1,
  });

  const paths = summary.skippedSources.map((s) => s.path).sort();
  assert.deepEqual(paths, ["shrank.md", "tiny.md"]);
  const tiny = summary.skippedSources.find((s) => s.path === "tiny.md");
  assert.match(tiny.reason, /Below minimum size \(51 chars, minimum is 200\)/);
});

test("summarize counts blocks separately from sources", () => {
  const vault = makeVault([
    line(
      "smart_sources:notes.md",
      source("notes.md", 900, {
        embedded: true,
        blocks: {
          "#intro": block(900, true, true),
          "#tiny": block(40, false, false),
          "#alsotiny": block(20, false, false),
          "#pending": block(900, true, false),
        },
      })
    ),
  ]);

  const summary = scs.summarize(vault);
  assert.equal(summary.sources.current, 1);
  assert.deepEqual(summary.blocks, { total: 4, current: 1, missing: 1, skipped: 2, unexpected: 0 });
});

test("indexedCount reports current sources only", () => {
  const vault = makeVault([
    line("smart_sources:a.md", source("a.md", 900, { embedded: true })),
    line("smart_sources:b.md", source("b.md", 900, { embedded: true })),
    line("smart_sources:c.md", source("c.md", 20)),
    line("smart_sources:d.md", source("d.md", 900)),
  ]);
  assert.equal(scs.indexedCount(vault), 2);
});

test("listFailed reports skipped and unexpected notes with reasons", () => {
  const vault = makeVault([
    line("smart_sources:ok.md", source("ok.md", 900, { embedded: true })),
    line("smart_sources:tiny.md", source("tiny.md", 10)),
    line("smart_sources:Untitled.md", source("Untitled.md", 900)),
  ]);

  const failed = scs.listFailed(vault);
  // "Untitled.md" is eligible by size, so it is "missing", not "skipped" — the
  // stored size is what Smart Connections keys eligibility off, and the file
  // exclusion pattern only shows up in the reason text for already-skipped items.
  assert.equal(failed.length, 1);
  assert.equal(failed[0].path, "tiny.md");
  assert.equal(failed[0].status, "skipped");
  assert.match(failed[0].reason, /Below minimum size/);
});

test("lookup finds a note by vault-relative path", () => {
  const vault = makeVault([
    line("smart_sources:sub/dir/note.md", source("sub/dir/note.md", 900, { embedded: true })),
    line("smart_sources:sub/dir/small.md", source("sub/dir/small.md", 9)),
  ]);

  const found = scs.lookup(vault, "sub/dir/note.md");
  assert.equal(found.found, true);
  assert.equal(found.status, "current");
  assert.equal(found.reason, null);
  assert.ok(found.embeddedWith, "current notes report which model embedded them");

  const small = scs.lookup(vault, "sub/dir/small.md");
  assert.equal(small.status, "skipped");
  assert.match(small.reason, /Below minimum size/);
});

test("lookup distinguishes never-scanned from scanned-and-skipped", () => {
  const vault = makeVault([line("smart_sources:a.md", source("a.md", 900, { embedded: true }))]);
  const missing = scs.lookup(vault, "nope.md");
  assert.equal(missing.found, false);
  assert.equal(missing.status, "not-found");
});

test("lookup ignores a tombstoned note", () => {
  const vault = makeVault([
    line("smart_sources:gone.md", source("gone.md", 900, { embedded: true })),
    line("smart_sources:gone.md", null),
  ]);
  assert.equal(scs.lookup(vault, "gone.md").found, false);
});
