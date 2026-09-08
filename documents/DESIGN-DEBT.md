---
name: DESIGN-DEBT
description: Open design gaps found mid-plan that were logged rather than resolved in the same pass, per .claude/rules/design-before-implementation.md
metadata:
  version: 1.1
  created-by: Claude Sonnet 5
  date: 2026-09-07
---

# Design Debt

## Open

### DD-1 — Two services write `Document.status`, only one synchronized

**Found:** implementing `plan-11-13-17.md` (P1.11, P1.13).

**What's missing:** ADR26 decision 6 names `DatabaseService` (synchronized, ADR17) as the sole
writer of `Document.status`, and says `DocumentService.updateDocumentStatus` is "unused for status
going forward". `Actuator.run()` still calls `service.setStatus(d, ...)`, where `service` is the
unsynchronized `DocumentService` — every actuator hop writes status through the service ADR26 just
retired. `Coordinator.startChain` was changed to use `DatabaseService.updateDocumentStatus` (this
plan's step 2), so the two writers now disagree at different points in the same chain: the first
write (`startChain`) is synchronized, every write after it (`Actuator.run()`) is not.

**Why it wasn't fixed in this pass:** `plan-11-13-17.md` names the inconsistency as a risk ("ADR26
decision 5 gets deferred quietly... do not leave it as it is for a third time") but its numbered
steps never include changing `Actuator.run()`'s status-writing call. Making that change here would
also change what `Actuator`'s run loop reads back onto the in-memory `Document` it passes along in
each `Message` — `DatabaseService.updateDocumentStatus` reloads and saves a *different* object than
the one flowing through the chain, so switching call sites without also deciding how (or whether) the
in-memory copy's status field gets kept in sync is a second design decision, not a one-line swap.
Bundling it into this plan's blast radius risked breaking `ActuatorManagerTest`'s injection assertion
in a change that was not otherwise touching that test.

**Closes when:** a story or ADR addendum decides (a) `Actuator.run()` calls
`DatabaseService.updateDocumentStatus`, not `DocumentService`'s, and (b) whether the actuator also
calls `d.setStatus(...)` on its own in-memory copy so a stage downstream sees the current status
without a reload — consistent with ADR26 decision 2 (the document travels in the message).

### DD-2 — No endpoint reports the status of one document

**Found:** deciding ADR27 (Story P1.17).

**What's missing:** ADR27 puts capture receipts and model replies in one feed below the composer, and a
receipt is supposed to show its document moving through the pipeline. Nothing can report that.
`/api/status` returns five aggregate counts — how many documents are classifying, not which ones — so
the UI can say four documents are indexing and never say that *this* document just finished. The
receipt therefore shows ADR26's `{ id, status, message }` once, at submission, and never changes.

**Why it wasn't fixed in this pass:** P1.17 produces a design decision and no production code, so it
cannot build an endpoint. Attaching it to P1.12 (Status Endpoint Reports Document Counts) was
considered — that story is READY, unstarted, and already rewrites `/api/status` against the database —
but P1.12's acceptance criteria are written entirely about aggregate counts, and widening its scope
from the outside makes it a different story than the one that was reviewed.

**Closes when:** a story owns a per-document status lookup, either as an addition to P1.12 or on its
own. Until then P1.18's feed is a submission log rather than a live one, which is also the first thing
to revisit if the single screen feels flat in use.

### DD-3 — Tags have no owner

**Found:** deciding ADR27 (Story P1.17).

**What's missing:** all three ingest panels post a `tags` field today (`index.html`), and the composer
ADR27 specifies posts none. Nothing decides where tags come from once the panels are gone. Two answers
are open: the user types them, or the Classifier produces them (P2.4 parses the model's response for
tags and writes `DocumentTag` rows). They are not exclusive, and the difference shows up in the schema
and the UI both.

**Why it wasn't fixed in this pass:** a tags field in the composer would have settled the question by
accident, in a decision that was about routing. There is also a trap waiting for the obvious inline
form: `#tag` at the start of a line is a Markdown heading, and the vault stores Markdown, so inline
tokens need a stripping rule exact enough not to eat headings.

**Closes when:** P2.4's design says where tags come from, or a story adds manual tagging back to the
composer. Note that the `tags` parameter the ingest endpoints already accept is unaffected either
way — this is about who fills it.
