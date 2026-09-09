---
name: README
description: How to build, run and stop 4thBrain v04, and what the HTTP surface is
date: 2026-09-09
metadata:
  version: 1.0
  created-by: Claude Opus 5
---

# 4thBrain v04

A Java Spring Boot reimplementation of the v03 Node.js application. Documents are ingested,
published to a vault and classified by a local model, with each stage running as an actuator on its
own thread. `CLAUDE.md` covers the architecture; `PROJECT_4thBrain.md` and `BACKLOG-TRACKER.md`
cover what is built and what is not.

## Requirements

- Java 21
- Gradle via the wrapper (`gradlew.bat`), so no separate install
- SQLite, created at startup from `src/main/resources/schema.sql`
- Ollama on `localhost:11434` for classification. The Classifier needs a model already loaded —
  `ollama run <model>` — because there is no configured model name; the client asks `/api/ps` which
  model is loaded and uses that (ADR35). Nothing else in the application needs Ollama.

## Build and test

Gradle runs through a wrapper script that tees output to `@logs/` and records the exit code in
`@logs/exit-codes.txt`:

```powershell
scripts\build-log.ps1 -Task build     # compile, test, assemble
scripts\build-log.ps1 -Task test      # tests only
```

## Run

```powershell
scripts\build-log.ps1 -Task bootRun
```

The application listens on port 8080 and binds all interfaces, so it is reachable from another
device on the same network at `http://<host-ip>:8080/`. The port is `server.port` in
`application.yaml`.

The Thymeleaf template cache is off (P1.19), so an edit to a page under
`src/main/resources/templates/` shows on refresh without a restart.

## Stop

```powershell
Invoke-WebRequest -Uri http://localhost:8080/api/shutdown -Method POST -UseBasicParsing
```

`POST /api/shutdown` (P1.15, ADR36) stops the application in order rather than by killing the
process. It signals every actuator thread and waits for them to finish, then answers `202 Accepted`:

```json
{ "status": "shutting down", "actuatorsStopped": 5 }
```

The context closes `shutdown.close-delay-ms` after that — 500 ms by default — which is what lets the
response reach the caller before the web server stops. There is no `System.exit`: closing the context
stops the web server, and the web server's non-daemon thread is the only thing keeping the JVM up.

Two details worth knowing. The endpoint is POST only, because a GET would let a link, a prefetch or a
crawler take the application down. And the actuator threads are stopped inline rather than on the
delay, so the count in the response is a fact about what was stopped rather than an intention.

## Restart

There is no restart endpoint. A process cannot relaunch itself once its context is closed, so
restarting means stopping and starting again:

```powershell
Invoke-WebRequest -Uri http://localhost:8080/api/shutdown -Method POST -UseBasicParsing
scripts\build-log.ps1 -Task bootRun
```

## HTTP surface

| Method | Path | What it does |
|---|---|---|
| GET | `/` | The main UI — one composer, plus Search, Ingest status and Admin |
| GET | `/chat` | Kept from before the composer folded chat in |
| POST | `/api/ingest/file` | Upload a file; creates a Document and starts the chain |
| POST | `/api/ingest/capture` | Ingest by value; dispatches on whichever of a `url` or `text` body key is present (ADR26) |
| GET | `/api/status` | Document counts per pipeline stage |
| GET | `/api/search` | Search |
| POST | `/api/chat/llama` | Ask the model |
| POST | `/api/shutdown` | Stop the application (above) |
| GET | `/admin/db` | Database browser |
| GET | `/admin/api/docs` | API documentation page |

## Pipeline

`Ingestor → Indexer → Classifier` on the full path, so a document is published to the vault before it
is given a topic and tags. The order was reversed under BUG-005 on the argument that the vault write
is the step whose failure loses a document, and it should not sit behind a model call. A URL
short-circuits to the Clipper, an archive to the Extractor, and an unsupported format stops with a
warning naming it.

At startup, a document left holding a gerund status longer than `recovery.stale-after-ms` is treated
as crashed and requeued (P1.16, ADR37).
