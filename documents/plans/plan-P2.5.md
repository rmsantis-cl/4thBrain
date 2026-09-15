---
name: plan-P2.5
description: Execution plan for Story P2.5 (Indexer Real Logic) — a correct vault write in Part A, and Smart Connections indexing behind ADR30 in Part B
date: 2026-09-07
metadata:
  version: 1.0
  created-by: Claude Opus 5
  story: P2.5
  owns: src/main/java/com/fourthbrain/actuators/Indexer.java, SmartConnectionsMonitor.java, the indexer block in application.yaml
  new-adr: ADR30
---

# Plan — P2.5 (Indexer Real Logic)

One of five plans written to run in parallel. See *Parallel safety*. The others are `plan-P1.18.md`,
`plan-P2.1.md`, `plan-P2.2.md` and `plan-P2.4.md`.

**This plan is in two parts and only one of them is unblocked.** Part A is the vault write, which has
design coverage today and fixes two real defects. Part B is Smart Connections indexing, which needs a
decision nobody has taken: the story itself records "P2.5 has unanswered 'how does Java talk to MCP'
question", and ADR28 says explicitly that it "deliberately does not settle how Java speaks MCP — that
is P2.5's question". Part B does not start until ADR30 is written.

Run Part A now. It is worth a merge on its own.

## Step 0 — the design gate, ADR30

**ADR30 is reserved by this plan.** ADR29 belongs to `plan-P2.2.md` and ADR31 to `plan-P2.4.md`.

The question: how does a Java process get a document into Smart Connections' index?

**Run the cheap experiment first.** This mirrors ADR28's trigger 1, which is ten minutes of counting
that can end an argument before it starts. Here it is: put a Markdown file into the vault's indexing
folder by hand, with Obsidian and Smart Connections running, and see whether it turns up in a
semantic search without anything telling it to. Smart Connections is an Obsidian plugin that embeds
the vault; if it watches the vault the way Obsidian does, **writing the file is the trigger** and
there is no MCP call to make. Record the result either way — it is the single fact this ADR turns on.

Options, in the order they should be considered:

| | What it costs |
|---|---|
| **A — no call at all.** The vault write is the trigger; `SmartConnectionsMonitor` becomes a health check that logs whether the indexing folder is inside the configured vault | Nothing. No dependency, no process, no protocol. Fails only if the experiment above shows the plugin does not pick up external writes |
| **B — MCP over stdio, hand-rolled JSON-RPC** | A subprocess, a framing implementation, initialise/tool-call/shutdown, and correlation. ADR28 rejected the same shape for MarkItDown and named the reasons: server lifecycle, tool discovery and error mapping differ per server, and the reusable part is the small part |
| **C — the MCP Java SDK, or Spring AI's MCP client** | A first AI dependency in a build that has none. Buys a maintained transport; still needs the server started, supervised and versioned |
| **D — an HTTP endpoint, if the Smart Connections server exposes one** | Ordinary HTTP the codebase will already be doing for Ollama. Depends entirely on what the installed server actually offers, which nobody has checked |

**Recommendation: run the experiment, expect A, and write ADR30 short.** If A holds, Part B collapses
to a health check and this story finishes in one pass. If it does not, C over B — ADR28's argument
against hand-rolling a protocol applies here unchanged, and it applies more strongly to a server
somebody else maintains.

Whatever is decided, write down **which side of a WSL boundary the vault path is on**, the same way
ADR28 had to. The vault is at `C:\Users\rsant\desar\Local Vault\Local Vault` per
`.claude/rules/scrapper.md`, and `application.yaml` points `vault.path` at `./vault`, a relative path
inside the repository. Those are two different places and one of them is wrong. That mismatch is Part
A's problem too — see step 4.

## Verified state of the tree

Read 2026-09-07 on branch `v04`.

| Claim | Verified |
|---|---|
| `SmartConnectionsMonitor` is an empty class with six unused imports | `SmartConnectionsMonitor.java:22-25` |
| The Indexer "logs to Smart Connections" by writing two INFO lines | `Indexer.java:103-107` |
| The destination file name is the source file name, with no uniqueness handling | `Indexer.java:86` |
| `DatabaseService.move` uses `REPLACE_EXISTING` and no `ATOMIC_MOVE` | `DatabaseService.java:188` |
| The Indexer bails when there is no live copy in its source area | `Indexer.java:71-75` |
| A captured text document has no copy row at all | `IngestionController.java:206-214` |
| `move` already retires the source and records the destination | `DatabaseService.java:194-195` |
| `vault.indexer.source-area: tmp`, documented as becoming `incoming` under P2.3 | `application.yaml:46-49` |
| `vault.path: ./vault` — inside the repository, not the Obsidian vault | `application.yaml:41` |
| `Indexer` imports `LocalDateTime` and `StandardCopyOption` and uses neither | `Indexer.java:15,16` |

Two defects fall out of that table and Part A fixes both.

**Two documents with the same file name collide.** `destPath` is `vaultIndexing.resolve(fileName)`,
and `DatabaseService.move` moves with `REPLACE_EXISTING`. Index `notes.md` twice and the second
overwrites the first on disk while the first's `document_copy` row still points at that path, claiming
to describe a file that is now someone else's content. Nothing errors and nothing logs.

**A typed note never reaches the vault.** It has no `document_copy` row, so `findLive` returns null,
the Indexer warns and returns. Every note captured through the composer stops here today.
`plan-P2.2.md` fixes this upstream by materialising content to a file; Part A step 2 handles it here
as well, so this plan does not depend on that one's merge order.

## Part A — the vault write

### Step 1 — a unique destination name

- Resolve the destination as the source file name, made unique in the indexing directory.
  `IngestionController.newName(Path, String)` is the existing helper with exactly this loop, but
  calling a controller from an actuator is the wrong direction.
- **Use `com.fourthbrain.persistence.VaultNaming`**, a new utility holding that loop.
  `plan-P2.2.md` also introduces it, with the same content — create it byte-identical if that plan has
  not merged, and git resolves the add/add without a conflict. If the two ever differ, take
  `plan-P2.2.md`'s copy.
- Keep the extension: uniqueness goes on the base name (`notes_001.md`), not after the extension.

### Step 2 — documents with no file

When `findLive(docId, sourceArea)` returns null and the document has non-blank `content`, write the
content into the indexing area directly rather than bailing:

- Same naming rule as step 1, `.md`, UTF-8 written explicitly.
- `databaseService.addCopy(doc, VaultArea.INDEXING, path)`.
- Log at INFO that the document was materialised here rather than moved, so the two paths are
  distinguishable in a log.

When there is neither a live copy nor content, keep the current behaviour: warn with the id and the
area, return null.

This makes Part A independent of `plan-P2.2.md`. After both merge, the branch is dead code on the
normal path and still correct — a note materialised by the Ingestor arrives with a `tmp` copy and
takes step 1's path.

### Step 3 — an atomic write

The story asks for "file move operations atomic (no partial writes)", and `DatabaseService.move` does
not offer it. **`DatabaseService` is frozen** (see *Parallel safety*), so the atomic write happens in
the Indexer and the bookkeeping stays in the service:

- Write or copy into the indexing directory as `<name>.part`, then
  `Files.move(part, dest, ATOMIC_MOVE)`. A rename within one directory is atomic on NTFS and on every
  filesystem this will run on. Catch `AtomicMoveNotSupportedException` and fall back to
  `Files.move(part, dest, REPLACE_EXISTING)` with a warning naming the file — the fallback is what
  keeps this working if the vault ever sits on a network share.
- Then `databaseService.addCopy(doc, VaultArea.INDEXING, dest)` and
  `databaseService.retire(sourceCopy)`, in that order. Both are synchronized methods, so this is two
  transactions rather than one; a crash between them leaves two live copies, which reads as "the file
  is in both places" and is the safe direction to be wrong in. `addCopy` first is what makes it the
  safe direction.
- Do not call `DatabaseService.move`. It is `REPLACE_EXISTING` with no atomicity and it is the reason
  step 1's collision is silent.

Half-written files are what this step exists to prevent, and they matter more here than elsewhere: the
indexing folder is watched by something outside this application, and a watcher that reads a file
mid-write embeds half a document.

### Step 4 — configuration and the vault path

**This plan owns a new `indexer:` block plus `smartconnections:`, and nothing else in
`application.yaml`.** Append them; leave `ollama:` (P2.1), `ingestor:` (P2.2) and `classifier:` (P2.4)
alone, and do not reorder the file. `vault.indexer.source-area` already exists and stays where it is.

```yaml
indexer:
  materialise-content: true
smartconnections:
  enabled: false          # flipped by ADR30, Part B
  vault-path: ""          # absolute path to the Obsidian vault; empty means "not configured"
```

**Do not change `vault.path`.** It points at `./vault` inside the repository while the Obsidian vault
lives at `C:\Users\rsant\desar\Local Vault\Local Vault`. Repointing it would move where every stage
writes, from a branch that is supposed to be about the last stage — and BUG-002 already records that
`vault/`, `tmp/` and `data/` are untracked directories nothing creates. Add a startup WARN when
`smartconnections.vault-path` is set and the resolved `vault.indexing` is not underneath it, which
names the mismatch without acting on it, and record the finding in ADR30.

### Step 5 — logging and metadata

- One INFO line per document: id, topic (which `plan-P2.4.md` now sets), source area, destination
  path, bytes.
- No indexing timestamp column is added. `document_copy.created_at` on the `indexing` row already
  records when the document arrived, and `DatabaseService.move`'s `updatedAt` bump is replaced by
  nothing this plan needs. The story's "update document metadata (indexing timestamp, location)" is
  met by the copy row, which is what P1.8 built it for. Say so in the story's closing note rather than
  adding a column.
- Delete the two unused imports at `Indexer.java:15-16` while in the file.

### Step 6 — errors

- `IOException` on the write: log at ERROR with the id, source and destination, return null. Do not
  throw — `Actuator.run` catches it as "Main loop error", which is a worse message for the same
  outcome.
- A source copy row pointing at a file that is gone: ERROR naming both, return null. The row is a
  claim about the disk and the disk is authoritative.
- A destination directory that cannot be created: ERROR naming the path. This is the BUG-002 shape and
  it should read like a configuration problem rather than a bug.

**The document still ends at `indexed` in every one of those cases**, because `Actuator.run` stamps
the participle unconditionally after `doTheThing` returns. That is DD-4 and it is out of scope here;
the loud log is what this plan can offer.

## Part B — Smart Connections

**Blocked on ADR30.** What it contains depends entirely on which option that ADR takes:

- **Under A**, `SmartConnectionsMonitor` gains a `@PostConstruct` check that logs whether
  `smartconnections.vault-path` is configured and whether the indexing directory sits inside it, and
  the Indexer calls nothing. The `logToSmartConnections` method at `Indexer.java:103-107` is deleted
  rather than kept as two INFO lines pretending to be an integration.
- **Under B, C or D**, `SmartConnectionsMonitor` becomes the client: one method taking a path,
  `smartconnections.enabled` gating it, failure logged and swallowed so an unreachable indexer never
  stops a document reaching the vault. The file is written and the call happens after the atomic move
  in step 3, never before.

Either way the Indexer depends on `SmartConnectionsMonitor` and not on a transport, which is the same
seam ADR28 put in front of MarkItDown and for the same reason.

## Verification

**Part A:**

1. `scripts/build-log.ps1 -Task build` compiles.
2. `scripts/build-log.ps1 -Task test` is green with nothing skipped.
3. Boot the app and index two files with the same name: two files in the indexing area with distinct
   names, two live `indexing` copy rows, neither pointing at the other's file.
4. `POST /api/ingest/capture` with `{"text": "..."}`: a `.md` file appears in the indexing area with
   the note's content, UTF-8 intact, and a copy row for it. This is the case that silently does
   nothing today.
5. Delete a file behind a live `tmp` copy row, then index it: one ERROR naming both paths, no stack
   trace from the run loop.
6. Point `vault.indexing` at a path that cannot be created: one ERROR that reads as configuration.
7. `GET /admin/db`: every indexed document has exactly one live `indexing` copy and no live copy in
   its source area.

**Tests.** New `IndexerTest`, following `IngestorRoutingTest`'s style — real objects, captured Logback
output, `@TempDir` for `vault.indexing` and the source area:

- Two documents whose files share a name get distinct destinations.
- A content-only document is materialised and gains an `indexing` copy.
- The source copy is retired and the destination copy is live, in that order.
- A missing source file logs at ERROR and returns null.
- A non-ASCII note round-trips byte-for-byte.
- No `.part` file survives a successful index.

**Part B** has no verification until ADR30 exists.

## Parallel safety

**Owns:** `Indexer.java`, `SmartConnectionsMonitor.java`, the new `indexer:` and `smartconnections:`
blocks in `application.yaml`, and `IndexerTest`.

**Shares:** `com.fourthbrain.persistence.VaultNaming` with `plan-P2.2.md`, byte-identical, that plan
authoritative.

**Must not touch:** `Actuator.java` (frozen across all five plans — DD-1 and DD-4 live there),
`DatabaseService.java` (step 3 is written the way it is specifically to avoid changing it),
`Ingestor.java` (P2.2), `Classifier.java` (P2.4), `schema.sql`, `index.html`, `Coordinator.java`,
`IngestionController.java`, and `vault.path` in `application.yaml`.

**Depends on:** nothing for Part A. ADR30 for Part B.

**Interacts with `plan-P2.2.md`:** both fix the "a typed note has no file" problem, at different
stages, and both fixes are correct to keep. After both merge, step 2's branch stops being taken on the
normal path.

**Interacts with `plan-P2.4.md`:** step 5 logs the topic that plan writes. Reading a null topic before
it merges is fine.

## Scope boundary

Out, deliberately:

- **Everything in Part B**, until ADR30.
- **Repointing `vault.path` at the Obsidian vault.** A real problem, wrong branch. Step 4 logs it.
- **BUG-002** — nothing creates `data/`, `vault/` or `tmp/` on a fresh clone. Its own bug.
- **Recording an indexing failure as a status.** DD-4.
- **`DatabaseService.move`'s lack of atomicity.** Left alone rather than fixed, because the file is
  shared with three parallel branches. Worth a follow-up once these merge: after this plan, the
  Indexer no longer calls it, and `Extractor` and `Clipper` do not either — it has no caller left in
  `src/main`.
- **The `incoming` area.** `vault.indexer.source-area` moves to it under P2.3, by configuration.
- **Search over the indexed vault.** `/api/search` is a stub.

## Acceptance criteria mapping

| Criterion (P2.5) | Closed by |
|---|---|
| Classified documents written to vault indexing area | Part A steps 1–3 |
| Smart Connections indexing triggered via MCP | **Part B, blocked on ADR30.** ADR30 may also decide there is no MCP call to make |
| Document status updated to indexed | Unchanged from `Actuator.run`; verification 3 |
| Source copy retired with end_date timestamp | Step 3, verification 7 |
| File move operations atomic (no partial writes) | Step 3, and the `.part` assertion in `IndexerTest` |
| Failures logged with appropriate error detail | Step 6, verification 5 and 6 |

Five of six close in Part A. The sixth is the one the story already flagged as an open question.

## Risks

- **The ADR30 experiment may not be conclusive.** "It appeared in search eventually" and "the write
  triggered it" are different claims. Index a file with a distinctive nonsense string and search for
  that string, with a timestamp on both ends.
- **`ATOMIC_MOVE` across filesystems throws**, and the fallback is what catches it. It will fire the
  day the vault moves to a network share or a different drive from `tmp`.
- **Two synchronized calls are not one transaction** (step 3). A crash between them leaves two live
  copies. Chosen over the alternative, which loses the row for a file that exists.
- **The vault path mismatch is real and unaddressed.** Everything this plan writes lands in
  `./vault/indexing` inside the repository, which Smart Connections has no reason to be watching.
  Part A is still correct; it just is not yet pointed anywhere useful. ADR30 is where that gets
  settled.
