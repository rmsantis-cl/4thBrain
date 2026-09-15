---
name: ADR30-java-mcp-transport
description: How a Java process gets a document into Smart Connections' index — options, evidence from the installed MCP server, and the experiment that has not been run
date: 2026-09-08
metadata:
  version: 1.0
  created-by: Claude Opus 5
  story: P2.5
  status: Proposed
---

# ADR30 — How Java reaches Smart Connections

**Date:** 2026-09-08
**Status:** Proposed. Not decided.
**Supersedes:** nothing
**Arises from:** Story P2.5, which records the open question, and ADR28, which declined to answer it

*Written as its own file rather than appended to `ADRS.md`: ADR29 and ADR31 were being written at the
same time on sibling branches, and three appends to one file is three conflicts. Fold it in on merge.*

## The question

Story P2.5 asks the Indexer to "trigger Smart Connections indexing via MCP". Nothing in this
repository speaks MCP, and ADR28 ends by saying so explicitly: it "deliberately does not settle how
Java speaks MCP — that is P2.5's question". This is that question.

## Context

`plan-P2.5.md` put four options up:

| | What it costs |
|---|---|
| **A — no call at all.** The vault write is the trigger; `SmartConnectionsMonitor` becomes a health check | Nothing. No dependency, no process, no protocol |
| **B — MCP over stdio, hand-rolled JSON-RPC** | A subprocess, framing, initialise/call/shutdown, correlation. ADR28 rejected this shape for MarkItDown |
| **C — the MCP Java SDK, or Spring AI's MCP client** | A first AI dependency in a build with none. Buys a maintained transport; still needs the server supervised |
| **D — HTTP, if the server exposes it** | Ordinary HTTP, the same shape as the Ollama client |

The plan recommended running a cheap experiment before choosing: put a Markdown file into the vault
by hand with Obsidian running, and see whether Smart Connections picks it up on its own.

**That experiment has not been run.** It needs the running application or at least a hand-edited
vault, and the branch this was written on was under instruction not to start the app. So this ADR is
Proposed, not Accepted, and the recommendation below is an expectation rather than a result.

## What was established without running anything

Reading the installed server settles three of the four options on its own. It lives at
`C:\Users\rsant\.claude\mcp-servers\smart-connections`, is `@yejianye/smart-connections-mcp` ^1.0.0,
and is started through a Windows-safe `launcher.mjs` wrapper because the package's own bin script
hands `import()` a raw Windows path.

1. **It is stdio only.** `mcp-server.js` constructs a `StdioServerTransport` and nothing else. There
   is no listener, so **option D does not exist for this server**.
2. **It exposes four tools, and all four read.** `lookup` (semantic search by query text),
   `connection` (notes similar to a given note), `stats` (embedding and vault statistics) and
   `validate` (data integrity). **There is no tool that indexes, embeds, or writes.** So B and C buy
   a transport to a server with nothing on the other end of it: whatever protocol Java spoke, there
   would be no call to make.
3. **The embeddings are the Obsidian plugin's, not the server's.** `src/core/data-loader.js` reads
   `<vault>/.smart-env/smart_sources.json`, or `<vault>/.smart-env/multi/*.ajson`, and skips entries
   with no embedding vector. The only embedding the server generates itself is for the query string
   (`src/core/local-embedding-service.js`). Indexing happens inside Obsidian or it does not happen.

That leaves A as the only mechanism the installed stack offers. It does not confirm A works — it
narrows the open question from "which of four" to "does the plugin embed a file an external process
wrote, and how soon".

## Recommendation, and what would settle it

**Expect A. Confirm it before closing this.** The experiment, stated so the result is a fact rather
than an impression:

1. With Obsidian and Smart Connections running, write a Markdown file into the vault containing a
   distinctive nonsense token (`zylbract-4th-0001`). Note the wall-clock time.
2. Poll `smart-cli lookup zylbract-4th-0001 --vault <path> --format json`, or the `lookup` MCP tool,
   until it returns the file. Note that time too.
3. Record both, and record whether Obsidian had to be focused, or the vault re-opened, for it to
   happen at all.

Search for a token that exists nowhere else. "It turned up eventually" and "the write triggered it"
are different claims, and only a token nothing else could match tells them apart.

If A holds, Part B of P2.5 collapses to the boot check already written, `logToSmartConnections` stays
deleted, and the story closes. If the plugin ignores external writes, none of B, C or D rescues it
either — the fix would be somewhere else entirely (an Obsidian-side plugin or command, or accepting
that documents are embedded whenever the user next opens the vault), and this ADR gets rewritten
around that instead.

## The vault path, which is broken either way

`application.yaml` sets `vault.path: ./vault`, a relative path inside the repository. The Obsidian
vault is `C:\Users\rsant\desar\Local Vault\Local Vault`. **Nothing the Indexer writes today is
anywhere Smart Connections looks**, so the experiment above would fail for a reason that has nothing
to do with the plugin's behaviour if it were run against the current configuration.

P2.5 Part A does not repoint it — moving where every stage writes is a change of its own, from a
branch about the last stage. It adds a boot warning instead: `SmartConnectionsMonitor` compares
`smartconnections.vault-path` against the resolved `vault.indexing` and says so when one is not
inside the other. Whoever accepts this ADR owns the repointing, and owes ADR28's other rule with it:
**write down which side of a WSL boundary the vault path is on**. A JVM on Windows and a vault
reached through `/mnt/c/...` is the same trap ADR28 had to name for the Python interpreter.

## The read side, which is a different question

If Java later needs to *query* Smart Connections — `/api/search` is a stub today — the transport
question comes back, and it comes back with a real answer available. The package ships a CLI
(`smart-cli lookup|connection|stats|validate`, with `--format json` and `--vault <path>`). Shelling
out to it with a hard timeout is exactly the shape ADR28 chose for MarkItDown, for the argument ADR28
makes about uninterruptible work in a status-driven pipeline. Reading `<vault>/.smart-env/*.ajson`
directly is the other candidate, and it couples this application to an undocumented on-disk format.

Not decided here. Recorded so that the next person does not re-derive it, and so that "we need MCP
for search" is not mistaken for "we need MCP for indexing". They are separate, and only the second
one was P2.5's blocker.

## Consequences of leaving this open

- **P2.5 Part B is not implemented.** `SmartConnectionsMonitor` holds one `@PostConstruct` check and
  no client. `smartconnections.enabled` defaults to false and warns if switched on, because switching
  it on currently enables nothing.
- **Five of P2.5's six acceptance criteria close in Part A.** The sixth — "Smart Connections indexing
  triggered via MCP" — is the one the story already flagged as an open question, and the evidence
  above suggests the criterion itself is wrong: there is no MCP call to trigger indexing with.
- **The two `SMART_CONNECTIONS:` INFO lines in `Indexer` are gone.** They logged a string and did
  nothing, and a log line that reads like an integration is worse than no integration while this is
  undecided.

## Triggers

- The experiment runs and shows the plugin does **not** pick up external writes. A is dead and this
  ADR is rewritten, not amended.
- Smart Connections, or a different MCP server for it, ships a tool that indexes or embeds a named
  file. B or C becomes live again, and C over B for ADR28's reason.
- Java needs to read from Smart Connections. That is the CLI-versus-`.ajson` question above, and it
  deserves its own decision rather than an extension of this one.
