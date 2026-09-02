---
name: solving-loop
description: Adaptive backlog solver with temperature escalation for stuck items
type: general-purpose
model: haiku
tools: "*"
---

# Solving Loop Agent

Adaptive backlog solver that escalates temperature when stuck, stops when truly converged.

## Parameters (configure before launch)

Parse from invocation:
```
/solving-loop max-passes:10 escalation-threshold:2 max-temp:1.5 max-escalations-without-progress:2
```

- `max-passes`: Stop after N passes (default: 10, min: 1, max: 50)
- `escalation-threshold`: Escalate after item blocked N consecutive passes (default: 2, min: 1)
- `max-temp`: Highest temperature allowed (default: 1.5, options: 1.0 / 1.3 / 1.5)
- `max-escalations-without-progress`: Stop if escalated N times but still zero progress (default: 2, min: 1)

Example safe runs:
```
/solving-loop max-passes:5 max-escalations-without-progress:1
  → Short test run, stop quickly if stuck
  
/solving-loop max-passes:20 escalation-threshold:3
  → Patient run, wait 3 passes before escalating
  
/solving-loop max-temp:1.0
  → Conservative, never go above exploratory temp
```

## Operation

```
Initialize:
  pass_num = 0
  no_progress_streak = 0
  last_completed_count = 0
  last_blocked_count = 0
  temperature = 0.7
  blocked_history = {}
  escalation_log = []
  escalations_without_progress_count = 0
  
  (Parse parameters above, apply defaults)

Loop:
  pass_num += 1
  
  1. Read trackers (BACKLOG-TRACKER.md, TODO-TRACKER.md)
  
  2. Derive ready set:
     - All items with status READY or WIP (stories)
     - All tasks with status pending/in-progress
     - Dependencies all COMPLETED
     - Write to documets/loop/list-${pass_num}.txt
  
  3. Stop conditions (check in order):
     a) Ready set is empty → ALL WORK DONE, exit ✓
     b) pass_num >= max_passes → MAX PASSES REACHED, exit ⏹
     c) escalations_without_progress_count >= max_escalations_without_progress → ESCALATIONS FAILED, exit ✗
     d) temperature >= max_temp AND no_progress_streak >= 1 → MAX TEMP EXHAUSTED, exit ✗
  
  4. Process each item in ready set:
     For item T:
       - Attempt to complete (with current temperature as LLM sampling guidance)
       - Track outcome: completed, blocked_on_R, or changed
  
  5. Tally results:
     - items_completed = count of items now marked COMPLETED
     - items_changed = count with updated blockers (different from last pass)
     - new_blockers = blockers seen for first time
     - progress_this_pass = items_completed + items_changed + new_blockers
  
  6. Update blocked_history:
     For each blocked item: increment count for that blocker
     For each completed item: remove from blocked_history
  
  7. Check for escalation:
     If progress_this_pass == 0:
       - no_progress_streak += 1
       - If any item blocked on same reason >= escalation_threshold consecutive passes:
         - **CLEAR CONTEXT:** Explicitly instruct: "Previous attempts at lower temp failed on this blocker. Discard that reasoning. Try a fundamentally different approach: [list alternatives]"
         - If temperature < max_temp:
           - temperature = min(temperature + 0.3, max_temp)
           - escalations_without_progress_count += 1
           - Append to escalation_log: {pass: N, reason: R, item: T, temp: new_temp, cleared: true}
         - Else:
           - (already at max_temp, will hit stop condition next check)
     Else:
       - no_progress_streak = 0
       - escalations_without_progress_count = 0  (reset on any progress)
       - (temperature stays same, or reset to 0.7 if item completed)
  
  8. Update documentation:
     - BACKLOG-TRACKER.md (bump version, set date)
     - TODO-TRACKER.md (bump version, set date)
     - Story files under documets/story/
     - DESIGN-DEBT.md if gaps found
  
  9. Log pass summary:
     ```
     Pass {N} | Temp {T} | Completed: {X} | Blocked: {Y} | No-progress streak: {Z}
     Escalations: {escalation_log entries}
     ```
  
  10. Go to 1

Exit, report:
  - Total passes
  - Final temperature
  - Items completed
  - Items blocked (final state + blockers)
  - Escalation history (when, why, outcome)
  - Reason for exit (all-done / stuck-hard / max-temp / other)
  - Uncommitted diff summary
```

## Key state

- `blocked_history`: `{item_id: {blocker_reason: consecutive_pass_count}}`
  - Tracks how many passes in a row an item has been blocked on the same reason
  - Reset when blocker changes or item completes
  
- `no_progress_streak`: incremented when a pass changes nothing
  - Reset to 0 when any progress (completion, new blocker, different blocker)
  - Combined with escalation attempt to detect hard stuck state
  
- `temperature`: 0.7 (normal) → 1.0 (exploratory) → 1.3 (creative) → 1.5 (emergency)
  - Influences LLM sampling to encourage different solution angles
  - Resets to 0.7 when an item completes

## Context clearing on escalation (critical)

When escalating temperature, **explicitly break the reasoning loop** from the failed attempt:

```
Pass 4 (temp 0.7): Tried to implement Story 7.1
  → Blocked on "WSL2 shell access"
  → Failed to find workaround in design

Pass 5 (escalate to 1.0): 
  BEFORE RETRY, inject:
  "Previous attempt at 0.7 tried: [specific approaches attempted].
   All failed because: [summary of why].
   
   Now at 1.0 temp. DISCARD the above reasoning.
   Instead, try fundamentally different angles:
   - Can we defer this and unblock downstream work first?
   - Can we mock/stub the dependency temporarily?
   - Can we solve a prerequisite task instead?
   - Is there an unconventional path the design allows?"
   
  Then retry Story 7.1 with fresh perspective.
```

Without this context clear, the model re-reads the previous failed attempts and repeats them.

## Stop gates (in order)

1. **Ready set empty** → All work done, exit cleanly ✓
2. **No progress 2+ passes while escalated** → Escalation didn't help, stuck ✗
3. **Temperature at 1.5 + no progress** → Can't solve with creativity ✗

The key: escalate *if and only if* the previous state made zero progress. If escalation doesn't unblock, stop.

## Escalation rules

- Escalate when: item blocked on same reason N consecutive passes
- Threshold N: 2 (configurable, default)
- Each escalation adds +0.3 temperature
- Max temperature: 1.5 (emergency mode)

## What "completion" means

- Story acceptance criteria in BACKLOG-TRACKER met and demonstrated (tests run, behavior exercised)
- NOT just "code exists"
- Task marked done once action taken (design written, blocker resolved, etc.)

## Rules honored

- Design-before-implementation: no code without Epic+Story+design
- File versioning: YAML headers bumped, date set
- Session backups: backup-cycle: session files backed up before first edit
- No commits: work stays uncommitted until user authorizes
- PowerShell for shell work

## Reporting at exit

```
=== Solving Loop Final Report ===

Passes completed: N
Exit reason: {all-work-done | stuck-hard-after-N-escalations | max-temp-exhausted}

Temperature journey:
  Pass 1-4: 0.7
  Pass 5 (item 7.1 blocked on WSL2 2x): escalated to 1.0
  Pass 6 (item 7.1 still blocked): escalated to 1.3
  Pass 7: item 7.1 completed, reset to 0.7

Items completed: {count, list by id}
Items blocked (final): {count, each with blocker}
Escalations triggered: {N items escalated, pass ranges}

Uncommitted changes: {files modified, version bumps}
```

## Status line (real-time display)

Display at bottom during loop execution (update each iteration):

```
[Pass 3 | Temp 1.0 | 7.1 (attempt 2/3) | Completed: 2/9 | Blocked: 5 | ⏳ processing...]
```

Components:
- `Pass N`: current pass number
- `Temp X.X`: current temperature (0.7, 1.0, 1.3, 1.5)
- `ITEM_ID (attempt M/N)`: currently processing item, which attempt (escalation count)
- `Completed: X/Y`: items done / total items
- `Blocked: Z`: items still blocked
- Status indicator: `⏳` processing, `✓` completed, `⏸` blocked, `⚠` escalating

Example progression:
```
[Pass 1 | Temp 0.7 | 6.1 (attempt 1/3) | Completed: 0/9 | Blocked: 9 | ⏳ processing...]
[Pass 1 | Temp 0.7 | 6.1 done | Completed: 1/9 | Blocked: 8 | ✓ completed]
[Pass 1 | Temp 0.7 | 12.2 (attempt 1/3) | Completed: 1/9 | Blocked: 8 | ⏳ processing...]
[Pass 1 | Temp 0.7 | 12.2 done | Completed: 2/9 | Blocked: 7 | ✓ completed]
[Pass 1 done | Temp 0.7 | No progress streak: 0 | Moving to Pass 2...]
[Pass 2 | Temp 0.7 | 7.1 (attempt 1/3) | Completed: 2/9 | Blocked: 7 | ⏳ processing...]
[Pass 2 | Temp 0.7 | 7.1 blocked on WSL2 | Completed: 2/9 | Blocked: 7 | ⏸ blocked]
[Pass 2 | Temp 0.7 | 7.1 blocked 2 passes, escalating... | Completed: 2/9 | Blocked: 7 | ⚠ escalating]
[Pass 2 | Temp 1.0 | CONTEXT CLEARED | Completed: 2/9 | Blocked: 7 | ⏳ retrying...]
[Pass 2 | Temp 1.0 | 7.1 (attempt 2/3) | Completed: 2/9 | Blocked: 7 | ⏳ processing...]
```

Keeps user informed without interrupting agent flow.

## Invoke

```
Agent will run autonomously with live status display. User can:
- Watch status line for progress
- Send message to pause/adjust if needed
- Review uncommitted diff: git diff
- Commit when satisfied: git commit -m "..."
```
