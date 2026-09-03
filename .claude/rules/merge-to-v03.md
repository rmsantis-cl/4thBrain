# Merge to v03

`v03` is the single branch of record for this project (see project memory: "v03 is the single branch"). All approved work is supposed to live there — not scattered across feature branches, worktree branches, or agent-specific branches that the user never sees.

## Rule

- Any agent (this session, a subagent, a background/scheduled agent, or a separate parallel session) that modifies files while working in a git worktree or on a branch other than `v03` **must merge those changes into `v03` before considering the task finished** — not leave them parked on the side branch.
- This applies regardless of how the branch was created (`EnterWorktree`, a manually created feature branch, an agent-specific worktree branch, etc.).
- "Merge" means the commits become reachable from `v03` (a fast-forward push, a real merge, or a rebase-and-fast-forward) — not just "pushed somewhere on origin." A branch sitting on `origin` that `v03` doesn't contain does not satisfy this rule.
- Once merged, the side branch should be deleted (local and remote) rather than left around — per the git safety protocol, confirm with the user before deleting a branch if there's any doubt about whether it's still needed, but don't leave merged-and-done branches littering `git branch -a`.
- If a merge would conflict, or the side branch's content has been superseded/invalidated by newer work already in `v03` (e.g., a stale Design Debt item whose concern is already resolved), do not force a mechanical merge — stop, explain the conflict/staleness to the user, and let them decide whether to reconcile it, discard it, or handle it manually. Silently dropping the side branch without saying so is not acceptable; silently merging over a real conflict is not acceptable either.
- Code changes still require the user's explicit per-commit authorization (per `design-before-implementation.md`) before merging into `v03` — this rule governs *where* finished, authorized work ends up, not a bypass of that authorization requirement.

## Why

Found 2026-09-03: multiple prior sessions/agents had committed real, useful work (a batch test report, a design-debt entry, several actuator-pipeline fixes) to their own throwaway branches (`fix/bug-5-chat-spinner`, `worktree-batch-report-save`, `worktree-design-debt-extractor-constraint`, various `worktree-agent-*` branches) and never merged it back. The user only discovered this by asking directly — the work was effectively invisible from `v03`, the branch they actually work from. This rule exists so that doesn't happen silently again.
