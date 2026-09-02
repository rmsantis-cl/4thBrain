---
name: solving-loop
description: Adaptive backlog loop with temperature escalation for stuck items
---

# solving-loop

Run an adaptive backlog loop that continues until all work completes or genuinely converges, escalating temperature (model creativity) when items get stuck on the same blocker.

## Usage

Invoke with:
```
/solving-loop [max-passes:10] [escalation-threshold:2]
```

- `max-passes`: Stop after this many passes (default: 10)
- `escalation-threshold`: Escalate temperature after N passes with same blocker (default: 2)

## How it works

### The adaptive loop

```
Set i = 0, blocked_history = {}, temperature = 0.7

Repeat:
  i = i + 1
  
  1. Derive ready set from trackers (BACKLOG-TRACKER, TODO-TRACKER)
     - Status READY or WIP in BACKLOG-TRACKER
     - Status pending/in-progress in TODO-TRACKER
     - Dependencies all COMPLETED
  
  2. Stop if list is empty (all work done) or i > max-passes
  
  3. Check for writer's block:
     - For each item in list: compare its blocker to blocked_history
     - If same blocker N times: escalate temperature
     - If new/different blocker: reset that item's count
  
  4. For each item T in list:
     a. Attempt to complete T (with current temperature)
     
     b. If blocked on reason R:
        - Increment blocked_history[T][R]
        - Check escalation: if count >= escalation_threshold
          - temperature = min(temperature + 0.3, 1.5)
          - Log escalation trigger
        - Update trackers with dependency note
     
     c. If completed:
        - Remove from blocked_history
        - Set COMPLETED in BACKLOG-TRACKER
        - Move to completed in TODO-TRACKER
        - Reset temperature to 0.7
  
  5. Update all documentation (trackers, story files, PROJECT-SUMMARY, DESIGN-DEBT)
  
  6. Go to 1

Stop when:
- list is empty (all work done) ✓
- i > max-passes (gave up) ✗
- pass closes zero items AND discovers zero new blockers AND no escalations pending → converged ✗
```

## Temperature states

- **0.7 (Normal):** Structured reasoning, follow design-before-implementation strictly
- **1.0 (Exploratory):** Consider workarounds, reframe constraints, sketch alternatives
- **1.3 (Creative):** Aggressive brainstorming, challenge assumptions, propose novel paths
- **1.5 (Emergency):** Last resort—try anything that might unstick the item

## Escalation rules

**Trigger escalation** when an item has been blocked on the same reason for `escalation_threshold` consecutive passes:
- Pass 1: Item A blocked on "missing design" → log it
- Pass 2: Item A blocked on "missing design" again → escalate to 1.0, try design workarounds
- Pass 3: Still blocked on "missing design" → escalate to 1.3, consider skipping design or designing in-place
- Pass 4: Still same blocker → escalate to 1.5, evaluate if item should be deferred

**Deescalate** (return to 0.7) when:
- Any item completes (reset all escalations)
- A different blocker appears on a re-blocked item (treat as progress)

## Blocked history tracking

```json
{
  "6.1": {
    "missing design": 1,
    "API not available": 0
  },
  "7.1": {
    "WSL2 shell access": 3  // Escalated twice
  }
}
```

When an item's blocker changes, increment the new reason. When an item completes, delete its entry.

## Reporting

At each pass end, report:
```
Pass N | Temperature: T | Completed: X items | Blocked: Y items | Escalations: Z
```

At loop end, report:
```
=== Solving Loop Report ===

Passes: N (reason: converged | all-work-done | max-passes-reached)
Temperature journey: 0.7 → 1.0 (pass 5, item 7.1) → 1.3 (pass 7, item 7.1) → 0.7 (pass 9, item 7.1 completed)
Items completed: [list]
Items blocked (final): [list with blockers]
Escalations triggered: [N items escalated, by which pass]
```

## Guards

- **No commits:** Code changes stay uncommitted until user authorizes per-commit
- **Design-first:** Even at high temperature, design-before-implementation rule holds—sketch or defer, don't improvise
- **Avoid thrashing:** If an item's blocker doesn't change after 3 escalations, defer it and move on (treat deferral as progress)
- **Temperature resets:** Only reset to 0.7 on actual completion or when switching to a different blocker; intermediate passes keep temperature
- **Use PowerShell** for shell work

## When to invoke

- After a backlog review, to make real progress on the ready set
- When stuck on a specific item and need creative unblocking
- To clear low-hanging work before planning the next phase

## Example run

```
solving-loop max-passes:15 escalation-threshold:2

Pass 1 | Temp 0.7 | Completed: 2 (6.1, 12.2) | Blocked: 5 | Escalations: none
Pass 2 | Temp 0.7 | Completed: 0 | Blocked: 5 (same blockers) | Converged

→ Loop stops (no progress two passes in a row, no new blockers)
```

vs.

```
Pass 1 | Temp 0.7 | Completed: 2 | Blocked: 5 | Escalations: none
Pass 2 | Temp 0.7 | Completed: 0 | Blocked: 5 (same) → Escalate 7.1 to 1.0
Pass 3 | Temp 1.0 | Completed: 1 (7.1 unblocked via workaround) | Blocked: 4 | Escalations: 7.1
Pass 4 | Temp 0.7 | Completed: 2 (2.1, 3.1 now unblocked) | Blocked: 2 | Escalations: none
Pass 5 | Temp 0.7 | Completed: 2 (6.2, 6.3) | Blocked: 0 | All work done ✓
```

## Notes

- Temperature affects LLM sampling, not hard logic—higher temp enables more creative problem-solving but risks tangents
- Escalation is a signal to try different angles, not to lower standards
- If an item stays blocked at 1.5 for 2+ passes, it's a sign to defer it (log as Design Debt and move on)
- The loop respects all existing rules from `.claude/rules/design-before-implementation.md`, file-versioning, etc.
