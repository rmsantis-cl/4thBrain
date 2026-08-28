# Design Before Implementation

No code implementation without a design behind it, and without an Epic and Story it belongs to. Applies project-wide, to all code changes (not documentation).

## Rule

- Before writing or editing any code, the work must trace to:
  1. An existing **Epic** (`EPn`) and **Story** (`Story n.n`) in `documets/design/Project 4thBrain.md`, and
  2. A design that covers what's being built — an ADR, schema, class definition, or other design artifact under `documets/design/`, sufficient to implement from without improvising the shape of the solution while coding.
- If either is missing, do not implement around the gap. Stop and either:
  - get the Epic/Story/design created and reviewed first, or
  - log a **Design Debt** entry (see below) and continue planning without implementing that part.
- A plan is not complete until every Design Debt item it raised has been cleared — resolved into real Epic/Story/design coverage, or explicitly deferred with the user's sign-off recorded in the debt entry itself. An incomplete plan must not proceed to implementation.

## Design Debt log

Tracked in `documets/DESIGN-DEBT.md`. When a gap is found mid-plan (a needed capability with no Epic/Story, or no design decision behind it):

1. Add an entry: what's missing, where it was discovered, which Story/plan surfaced it.
2. Do not implement past the gap in the same pass — either resolve it (create the Epic/Story/ADR) or leave it logged as Open and scope the plan around it.
3. Mark it Cleared once the missing Epic/Story/design exists, with a pointer to what closed it.

## Commit authorization

- Code changes may only be committed with the user's explicit authorization for that commit — a standing "yes, commit" from earlier in a session does not carry forward to later, unrelated changes (consistent with the existing git safety protocol).
- Documentation changes (design docs, tracking docs, working notes, this rule file itself, etc.) may be committed without that same explicit per-change authorization, since they carry no code-execution risk.
