---
name: submit-batch
description: Submit a coding task to run unattended in the background as an isolated Claude Code subagent, using the fixed autonomous-execution template in documets/batch-tool.txt (explore, implement, validate, conclude — no clarifying questions, assumptions self-documented). Use whenever the user says "submit to batch", "queue this task", "run this while I'm away from keyboard", or asks for a task to run unattended without further interaction from them.
---

## Invocation

```
/submit-batch <task description>
```

Example: `/submit-batch add a DELETE /api/tables/job/:id/cancel endpoint that transitions a running job to Failed`

If invoked with no task description, ask the user what task to submit — the autonomous directives in the template govern the *launched agent's* behavior once it's running, they don't excuse skipping the one piece of information this tool can't function without.

## What this does

Wraps the given task description in the fixed template at `documets/batch-tool.txt`, launches it as an independent background agent isolated in its own git worktree, and returns control immediately — the task runs unattended while the user does other things, and reports back via the normal task-notification when it finishes (or is checked with `ListAgents` / by resuming it via `SendMessage`).

This is for tasks the user wants to fire-and-forget, not ones needing back-and-forth in this conversation. Multiple invocations queue multiple independent tasks — each gets its own isolated worktree, so they can't collide with each other or with work in progress in this session's own branch.

## Steps

1. **Read `documets/batch-tool.txt` fresh** (don't hardcode a copy of it here — the template is the single source of truth and may change). Substitute the user's task description for `${task description}` on the `Submit to batch` line; leave everything else in the file verbatim.

2. **Append repo-specific guardrails** the generic template doesn't know about, so "proceed without asking clarifying questions" can't be misread as license to bypass this repo's actual rules. Append this block to the prompt:

   > This repository additionally requires, non-negotiably regardless of the directives above:
   > - `.claude/rules/design-before-implementation.md`: before writing or editing any application code, confirm it traces to an existing Epic+Story (`documets/design/Project 4thBrain.md`) and a design artifact sufficient to implement from. If either is missing, do not implement around the gap — log a Design Debt entry in `documets/DESIGN-DEBT.md` instead and stop there for that part of the task.
   > - Do not run `git commit`, `git push`, or any destructive git command (`reset --hard`, `checkout --`, force-push, etc.) unless the task description above explicitly asks for that. Leave finished work as uncommitted changes in the worktree for the user to review.
   > - Follow this repo's existing conventions (PowerShell only per `.claude/rules/shell.md`, no unnecessary comments, existing test patterns under `server/test/` or `batch/test/`) rather than introducing new ones.
   > - **Your worktree may be stale relative to the `v03` branch** (it exists locally in this same repository, just checked out on a different ref) — this has caused real problems in prior runs: agents "fixed" bugs that were symptoms of stale files, using a different/incompatible approach than what `v03` already has, and that work had to be discarded by hand afterward. Before modifying any existing file (not new files you're adding), run `git diff v03 -- <path>` first. If `v03`'s version already differs and looks more current/correct — especially in `server/lib/repositories/`, `server/lib/ingest-service.js`, or anything schema-adjacent — treat `v03` as ground truth: pull it in with `git show v03:<path> > <path>` instead of re-deriving your own fix. Only proceed with your own fix if the bug is genuinely also present on `v03`.

3. **Launch the agent**: call `Agent` with `subagent_type: "general-purpose"`, `isolation: "worktree"`, a `description` summarizing the task in 3-5 words, and `prompt` set to the filled template + guardrail block from steps 1-2. Do not use `subagent_type: "fork"` — batch tasks should start clean, not inherit this conversation's full history/cost.

4. **Confirm to the user**: report that the task was submitted (name/description of the launched agent), note it's running in an isolated worktree so it won't touch their current branch, and that they'll get a notification when it completes — don't wait on it or poll.

5. When a batch task's completion notification arrives, relay its final report to the user concisely, and mention the worktree path/branch from the launch result so they know where to review or merge the changes from.
