---
name: clear-edits
description: Silent execution protocol for file edits with mandatory backup and safety checks
metadata:
  version: 2.0
  updated: 2026-08-28
---

# Clear Edits Operation

You operate in a clean execution environment. When requested to edit files or run shell commands:

1. Perform operations silently without narration
2. Do not emit markdown code blocks of command execution logs unless explicitly asked
3. Keep conversational text minimal — focus entirely on results and final state
4. When running shell scripts, redirect output and errors to log files; show logs only on error or request

---

## File Safety Rules — Check BEFORE Editing

Before making ANY change to a file, inspect its YAML header for safety directives.

### Rule 1: Read-Only Files

**If the file header contains:**
```yaml
read-only: true
```

**Action:** Refuse the modification request. Never edit or delete. Explain why and offer to present suggested changes for the user to apply themselves.

---

### Rule 2: Session Backup (MANDATORY FIRST STEP)

**If the file header contains:**
```yaml
metadata:
  backup-cycle: session
```

**Action sequence — must follow this order:**

#### Step 1: Create Backup (BEFORE ANY EDITS)

- [ ] Check if backup already exists in `.backup/` from this session (file created today)
- [ ] If no backup exists:
  - Copy the file to `.backup/` with format: `{filename}_{YYYYMMDD}.md`
  - Example: `story-6.1_20260828.md`
  - Verify the backup file exists and matches the original content
  - **Do not proceed to Step 2 until backup is confirmed**

#### Step 2: Perform Edits

- [ ] Edits via Edit tool may now proceed
- [ ] Apply all changes requested in this session

#### Step 3: Completion

- [ ] All edits complete
- [ ] Backup from Step 1 remains in `.backup/` as the recovery point

**Gate check before calling Edit:** Ask yourself: "Does this file have `backup-cycle: session`?" If yes, is a backup from today already in `.backup/`? If no to either question, create the backup first.

**One backup per session:** If a `backup-cycle: session` file was already backed up earlier in this session, skip the backup step and proceed directly to edits. If the file's `date` field predates this session start, create a new backup anyway (the prior backup is stale).

---

## Execution Style

- Perform operations silently — create backups without announcing them
- Show results only, not process steps
- On error: show the error message and any relevant logs
- Keep final communication concise — one sentence summarizing what was done

---

## Examples

### Example 1: File with backup-cycle: session, never backed up

**File:** `documets/story/story-6.1.md` with `metadata: backup-cycle: session`

**Action:**
1. Recognize `backup-cycle: session` in header
2. Check `.backup/` — no backup from today exists
3. Copy `story-6.1.md` → `.backup/story-6.1_20260828.md`
4. Verify backup file exists with original content
5. **Now** proceed to edit the working file
6. Output: "Backup created. Changes applied."

### Example 2: File with read-only: true

**File:** `documets/design/schema.sql` with `read-only: true`

**Action:**
1. Recognize `read-only: true` in header
2. Stop; refuse the edit
3. Output: "This file is read-only. I can show you the changes you'd like to make, and you can apply them yourself."

### Example 3: Backup-cycle file, backup already exists from this session

**File:** `documets/story/story-6.1.md` with `metadata: backup-cycle: session`
**Backup exists:** `.backup/story-6.1_20260828.md` (created earlier today)

**Action:**
1. Recognize `backup-cycle: session` in header
2. Check `.backup/` — backup from today **already exists**
3. Skip backup step
4. Proceed directly to edits
5. Output: "Changes applied."

---

## Related Rules

See also:
- `.claude/rules/file-versioning.md` — version bumping on save
- `.claude/rules/file-protection.md` — read-only enforcement details
- `.claude/rules/file-format.md` — YAML header requirements
