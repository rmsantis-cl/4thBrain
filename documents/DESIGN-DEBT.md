---
name: DESIGN-DEBT
description: Open design gaps found mid-plan that were logged rather than resolved in the same pass, per .claude/rules/design-before-implementation.md
metadata:
  version: 1.3
  created-by: Claude Sonnet 5
  date: 2026-09-08
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

**2026-09-07:** the five parallel plans (`plan-P1.18.md`, `plan-P2.1.md`, `plan-P2.2.md`,
`plan-P2.4.md`, `plan-P2.5.md`) all freeze `Actuator.java` for the length of their run, so none of
them can close this and none of them can make it worse. It needs a pass of its own, after they merge.

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

**2026-09-08:** Story P1.20 (Live Document Status in the Receipt Feed) is written to close this, on
its own rather than as an addition to P1.12, for the reason recorded above. Mark Cleared when ADR32
lands, not before. Designing it surfaced something this entry did not anticipate: `document.status`
holds only where a document is now, and no transition history is recorded anywhere, so a polled
endpoint cannot show the states a document *went through* — a stage completing in under a millisecond
is invisible between two polls. P1.20 carries that as the question its ADR turns on. It also depends
on [[DD-1]] and [[DD-4]], both of which live in the three lines of `Actuator.run()` that a status
publish hook would have to attach to.

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

**2026-09-07:** `plan-P2.4.md`'s step 0 (decision D1, to be recorded as ADR31) is written to close
this — the Classifier produces tags, manual tagging stays possible and unbuilt. Mark Cleared when
ADR31 lands, not before.

### DD-4 — An actuator cannot record a failure

**Found:** planning P2.2, P2.4 and P2.5 (`plan-P2.2.md`, `plan-P2.4.md`, `plan-P2.5.md`).

**What's missing:** `Actuator.run()` stamps the participle unconditionally once `doTheThing` returns
(`Actuator.java:90`), so a stage that failed leaves the document reading exactly as if it had
succeeded. An Indexer that could not write to the vault, a Classifier whose model call threw, an
Ingestor whose source file was gone — all three return null, and all three produce a document at
`indexed`, `classified` or `ingested` with nothing in the database to say otherwise. The only trace is
a log line.

This matters more here than it would in a pipeline with a job table. 4thBrain is driven by
`Document.status`, so a document whose status lies is a document nothing will ever sweep up — the same
invisibility ADR28 argues against for stalled conversions, arriving by a different route. ADR28's own
failure semantics assume the opposite: "a conversion failure records a terminal status and a reason on
the Document". Nothing in the run loop allows that today.

**Why it wasn't fixed in this pass:** the fix is in `Actuator.java`, which all five parallel plans
freeze so they cannot collide in it. It is also a design decision rather than a patch — `doTheThing`
returns the next actuator's name, and giving it a way to say "I failed" means either a sentinel return,
an exception contract, or a result type, and each of those changes every actuator at once. Tangled
with DD-1, which lives in the same three lines.

**Closes when:** a story or ADR decides how a stage signals failure and what status it produces, and
changes `Actuator.run()` accordingly. Best taken together with DD-1, after the five parallel plans
merge.

**2026-09-08:** Story P1.20 raises the stakes on this. A live status strip in the composer's receipt
puts the pipeline's own account of a document in front of the user, so a stage that failed but stamped
its participle stops being a wrong value in an unread column and becomes a green tick on screen.
P1.20's ADR32 has to close this or state in writing that the strip shows apparent progress and cannot
show failure.

### DD-5 — `/api/chat/llama` has no owner

**Found:** planning P1.18 and P2.1 (`plan-P1.18.md`, `plan-P2.1.md`).

**What's missing:** ADR27 makes `ASK` one of the composer's four controls, and P1.18 wires it to
`/api/chat/llama`. That endpoint is a Phase 1 stub that echoes its input back
(`ChatController.java:11-23`). P2.1 builds `OllamaClient` and its concurrency gate, but its
implementation requirements name `Classifier` and `Briefing` as the injection sites and not the
controller — so after both P1.18 and P2.1 land, the composer's `ASK` button still returns
"(Phase 1 Stub) I received your message: …".

P1.18's acceptance criterion is met either way, since it asks only that the reply reach the feed. The
gap is between two stories rather than inside one, which is why neither of them catches it.

**Why it wasn't fixed in this pass:** `plan-P1.18.md` touches no Java by design, and `plan-P2.1.md`
deliberately injects into nothing so it can run in parallel with `plan-P2.4.md`. Wiring the controller
also needs a decision P2.1's interface does not carry — whether a chat turn sends conversation history
to the model, and whether an interactive question shares the single Ollama permit with the Classifier
or waits behind it. ADR27 already rejected option D partly because "using a model call to route a
model call also consumes the one Ollama concurrency slot the Classifier needs"; the same tension
applies to a real `ASK`.

**Closes when:** a story owns `ChatController`, deciding the multi-turn shape and how an interactive
call shares the gate with pipeline work.
