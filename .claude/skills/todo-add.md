# todo-add skill

Append a task to `documets/TODO-TRACKER.md` with guided prompting for missing fields.

## Usage

Run the script with task details (any subset):
```powershell
# Guided prompt for all fields
./scripts/add-todo-task.ps1 -Task "wire html-sanitizer" -Category "Implementation"

# With all details
./scripts/add-todo-task.ps1 -Task "backprop schema docs" -Category "Documentation" -Impact "High"

# Let script prompt for missing fields
./scripts/add-todo-task.ps1 -Task "implement PLAN-31-08-2026" -Category Implementation
```

Or ask Claude Code directly:
```
/todo-add task="wire html-sanitizer" category="Implementation"
```

Missing fields are prompted interactively.

## Supported Fields

**For Implementation/Testing tasks:**
- `task` (required) — task name
- `category` — one of: Implementation, Documentation, Testing & QA (default: ask)
- `description` — task description (default: task name)
- `depends-on` — blocking dependencies (default: none)
- `status` — one of: pending, in-progress, done, deferred (default: pending)

**For Documentation tasks:**
- `task` (required) — task name
- `description` — what needs updating
- `impact` — one of: High, Medium, Low (default: Medium)
- `status` — one of: pending, in-progress, done, deferred (default: pending)

## Behavior

1. Prompt for any missing required fields
2. Validate category and status against allowed values
3. Format as markdown table row
4. Append to the appropriate section in TODO-TRACKER.md
5. Update file metadata (version, date)
6. Commit with message summarizing the task added

## Example Session

```
User: /todo-add task="run smoke tests" 
Claude: Which category? (Implementation / Documentation / Testing & QA)
User: Testing & QA
Claude: Depends on? (or "none")
User: all UI stories
Claude: Status? (pending/in-progress/done/deferred, default: pending)
User: (enter to accept default)
Claude: Added task "run smoke tests" to Testing & QA section.
        Ready to commit? [y/n]
```

## Workflow

Use this when:
- A planning doc (PLAN-*.md) is created → `/todo-add task="implement PLAN-XXX" category=Implementation`
- A doc gap is found → `/todo-add task="update XXX.md" category=Documentation impact=High`
- A test is needed → `/todo-add task="test YYY" category="Testing & QA"`
- A manual follow-up exists → `/todo-add task="resolve ZZZ" category=Documentation`

Update TODO-TRACKER.md's Changelog automatically.
