---
name: todo-add
description: Append a task to TODO-TRACKER.md with guided prompting for missing fields
metadata:
  version: 2.2
  created-by: claude
  created-date: 2026-08-31
---

# INSTRUCTIONS FOR todo-add SKILL

When invoked with `/todo-add <arguments>`, Claude should:

## Parse Input

Arguments come as key:value pairs, where keys are lowercase:
- `task` (required) — task name
- `category` — Implementation, Documentation, or Testing & QA
- `description` — optional task description
- `impact` — High, Medium, Low (for documentation tasks)
- `depends-on` — blocking dependencies
- `status` — pending, in-progress, done, deferred

## Removal Rule

**When status is "done":** Remove the task from TODO-TRACKER.md entirely (do not update it, delete the row). Completed tasks do not remain in the tracker.

Example: `task:MyTask Description:"do this" category:Implementation`

## Infer Missing Fields

When fields can be inferred from the task name, do so automatically:

- **"implement PLAN-*"** → category = Implementation, description = extract plan title/abstract
- **"update *.md"** → category = Documentation, impact = Medium (default), description = auto-generated
- **"test Story *"** → category = Testing & QA, description = auto-generated
- **"wire ..."** → category = Implementation (common pattern)
- **"backpropagate ..."** → category = Documentation, impact = High

## Validate & Prompt

1. If `task` is missing, fail with error
2. If `status` is invalid, fail with error
3. If `category` **cannot be inferred**, prompt user
4. If `description` is missing, use task name as description (unless inferred)
5. If `impact` is missing (documentation task), default to Medium (don't prompt)

## Normalize Status

Accept variations: `wip` → `in-progress`, `inprogress` → `in-progress`

## Append or Remove from TODO-TRACKER.md

**If status is "done":**
1. Find the task row in TODO-TRACKER.md
2. Delete the entire row (do not leave it marked as done)
3. Update file metadata: increment `version` by 0.1, set `date` to today

**Otherwise (pending, in-progress, deferred):**
1. Find the "## Manual Tasks" section (create if missing)
2. Find the appropriate table (by category/impact)
3. Append a new row: `| | {task} | {category} | {description} | {depends-on} | {status} |`
4. Update file metadata: increment `version` by 0.1, set `date` to today

## Report

Output: `✓ Added task: {task}` (with inferred fields noted if any)

---

## Fields Reference

**Implementation/Testing task columns:**
Task | Category | Description | Depends On | Status

**Documentation task columns:**
Task | Description | Impact | Status
