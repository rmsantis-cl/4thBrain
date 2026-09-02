---
name: RESTORE
description: Procedures for restoring the vault and vector index from snapshots
date: 2026-09-01
metadata:
  version: 1.0
  created-by: Claude Agent (Story 10.1)
---

# Vault Snapshot & Restore Procedures

## Overview

The 4thBrain vault and Smart Connections vector index are automatically snapshot before each overnight batch run (Story 10.1). This document describes how to restore the vault to a previous state in case of data corruption, accidental changes, or index rebuild.

## What is a Snapshot?

A snapshot is a point-in-time copy of:
- **Vault contents** (`$VAULT_DIR` — all Markdown notes and subdirectories)
- **Vector index** (`$VAULT_DIR/.smart-env` — Smart Connections embeddings)

Snapshots are stored in: `$VAULT_DIR/.snapshots/snapshot-YYYYMMDDHHMMSS/`

Each snapshot preserves the exact state of the vault at the moment the batch run began, before any new documents were ingested or classified.

## Listing Available Snapshots

List all available snapshots:

```bash
# Bash / PowerShell
ls $VAULT_DIR/.snapshots/
# or on Windows
Get-ChildItem "$env:VAULT_DIR\.snapshots\"
```

Each directory is named with a timestamp: `snapshot-YYYYMMDDHHMMSS`

Example output:
```
snapshot-20260901-120000/  (Sept 1, 2026 at 12:00:00)
snapshot-20260831-120000/  (Aug 31, 2026 at 12:00:00)
backup-pre-restore-20260901-140000/  (backup created before a prior restore)
```

## How to Restore

### Step 1: Choose Your Snapshot

Decide which snapshot to restore to. Typically, the most recent snapshot (latest timestamp) is the safest choice. If you know the problem started on a specific date, choose a snapshot from before that date.

### Step 2: Run the Restore Script

Use the restore script to restore your vault from a snapshot:

```bash
# Node.js (from repository root)
node batch/restore.js --snapshot-dir "$VAULT_DIR/.snapshots/snapshot-20260901-120000" --vault-dir "$VAULT_DIR"

# PowerShell
node batch/restore.js --snapshot-dir "$env:VAULT_DIR\.snapshots\snapshot-20260901-120000" --vault-dir "$env:VAULT_DIR"
```

Replace the snapshot name with your chosen snapshot.

### Step 3: Verify the Restoration

After the restore completes:

1. **Check Obsidian:**
   - Open Obsidian and verify that the vault loads correctly.
   - Check the file count in the sidebar and compare with your expectation.
   - Open a few random notes and verify their content is correct.

2. **Check Smart Connections:**
   - Open Obsidian's command palette (`Cmd+P` or `Ctrl+Shift+P`).
   - Run "Smart Connections: Open: Smart Environment" panel.
   - The panel should show indexed sources and current/missing counts.
   - If the counts seem low, Smart Connections may be re-indexing (check again in a few minutes).

3. **Check Logs:**
   - Review the batch worker logs (if available) for the restore operation:
     ```bash
     grep "restore_completed" /path/to/logs/*.log
     ```

## Safety: Pre-Restore Backup

When you run `restore.js`, the script automatically creates a backup of your current vault before overwriting it:

```
$VAULT_DIR/.snapshots/backup-pre-restore-YYYYMMDDHHMMSS/
```

This backup contains your vault state before the restore, so you can undo if needed.

### Undoing a Restore

If the restore causes problems, you can restore your vault to the backup that was created:

```bash
# Restore from the pre-restore backup
node batch/restore.js --snapshot-dir "$VAULT_DIR/.snapshots/backup-pre-restore-YYYYMMDDHHMMSS" --vault-dir "$VAULT_DIR"
```

## Manual Restore (No Script)

If the restore script fails or you prefer manual file operations:

1. **Locate your snapshot:**
   ```bash
   ls $VAULT_DIR/.snapshots/snapshot-20260901-120000/
   # Output: vault  .smart-env
   ```

2. **Backup your current vault** (optional but recommended):
   ```bash
   cp -r $VAULT_DIR $VAULT_DIR-backup-$(date +%Y%m%d-%H%M%S)
   ```

3. **Delete current vault contents** (but preserve .snapshots):
   ```bash
   # Remove all except .snapshots
   cd $VAULT_DIR
   rm -rf * .*
   # But restore .snapshots
   mkdir -p .snapshots
   ```
   **On Windows / PowerShell:**
   ```powershell
   Get-ChildItem "$env:VAULT_DIR" -Exclude ".snapshots" -Force | Remove-Item -Recurse -Force
   ```

4. **Copy snapshot contents:**
   ```bash
   cp -r $VAULT_DIR/.snapshots/snapshot-20260901-120000/vault/* $VAULT_DIR/
   cp -r $VAULT_DIR/.snapshots/snapshot-20260901-120000/.smart-env $VAULT_DIR/.smart-env
   ```

5. **Verify in Obsidian** (see Step 3 above).

## Troubleshooting

### Restore Script Hangs or Times Out

If the restore script appears stuck:
- **Check disk space:** Ensure `$VAULT_DIR` has enough free space for a full vault copy.
- **Check file permissions:** Ensure you have write permissions to `$VAULT_DIR` and the snapshot directory.
- **Kill and retry:** `Ctrl+C` to stop the script, check logs, and retry.

### Snapshot is Corrupted or Incomplete

Symptoms: restore succeeds but Obsidian won't load the vault, or only partial files appear.

**Cause:** The snapshot was interrupted mid-creation (unlikely but possible).

**Solution:**
1. Check the prior snapshot: restore from an earlier `snapshot-` directory.
2. If all snapshots are corrupted, restore from your external backup (if available).

### Smart Connections Re-Indexing Takes a Long Time

After restore, Smart Connections may take hours to re-index all notes if the vector database was incomplete. This is normal.

**Solution:**
- Leave Obsidian open and let Smart Connections finish.
- Check the "Smart Environment" panel in Obsidian to monitor progress.
- Do not close Obsidian or restart Ollama during re-indexing (Story 3.1's watcher will resume where it left off).

### Vault Appears Empty After Restore

**Cause:** You restored from a snapshot created before ingestion (e.g., an empty vault snapshot).

**Solution:**
- Choose a different snapshot from a later date.
- Or restore from the pre-restore backup you created:
  ```bash
  node batch/restore.js --snapshot-dir "$VAULT_DIR/.snapshots/backup-pre-restore-..." --vault-dir "$VAULT_DIR"
  ```

## Retention Policy

Snapshots accumulate over time. To save disk space, periodically delete old snapshots:

```bash
# Remove snapshots older than 7 days
find $VAULT_DIR/.snapshots -maxdepth 1 -name "snapshot-*" -mtime +7 -exec rm -rf {} \;

# Or on Windows/PowerShell (older than 7 days)
Get-ChildItem "$env:VAULT_DIR\.snapshots" -Directory -Filter "snapshot-*" |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } |
  Remove-Item -Recurse -Force
```

**Note:** A snapshot retention policy is not yet automated — consider scheduling a cron job or scheduled task if you want automatic cleanup.

## See Also

- **Story 10.1** (Scheduled Vault Snapshot & Restore) — architecture and implementation.
- **Story 4.1** (Background Sweep & Queue Execution Script) — where snapshots are created.
- **Story 3.1** (Smart Connections Vector Indexing Pipeline) — re-indexing after restore.
- **RELEASE.md** — backup strategy as part of the release workflow.
