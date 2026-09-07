---
name: DESIGN-DEBT
description: Open design gaps found mid-plan that were logged rather than resolved in the same pass, per .claude/rules/design-before-implementation.md
metadata:
  version: 1.0
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
