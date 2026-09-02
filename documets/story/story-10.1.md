---
name: story-10.1
description: Scheduled Vault Snapshot & Restore — backup/recovery for vault and vector index
date: 2026-09-01
metadata:
  version: 1.0
  created-by: Claude Agent (solving-loop)
---

# Story 10.1: Scheduled Vault Snapshot & Restore

## Abstract
Periodically snapshot the vault and vector index for recovery.

## Description
Implement a scheduled backup routine (pre-batch-run snapshot) covering the Markdown vault and .smart-env files, with a documented restore procedure.

## Acceptance Criteria

1. **Snapshots are taken automatically before each overnight batch run (EP4).**
   - A snapshot function (`vault/snapshot.py` or `batch/snapshot.js`) captures the state of:
     - `$VAULT_DIR` (all Markdown files and subdirectories)
     - `$VAULT_DIR/.smart-env` (Smart Connections vector index)
   - Snapshots are stored with a timestamp: `$VAULT_DIR/.snapshots/snapshot-YYYYMMDD-HHMMSS/`
   - The batch worker (`batch/worker.js`) calls this snapshot before processing any jobs.
   - Snapshot operations are logged with structured JSON format (consistent with `batch/worker.js`).

2. **A restore operation returns the vault/index to the last good snapshot without manual file surgery.**
   - A restore function (`vault/restore.py` or `batch/restore.js`) accepts a snapshot timestamp (or "latest").
   - Restore copies the snapshot's vault and .smart-env back to the live locations.
   - Restore validates that the snapshot directory exists and is readable before proceeding.
   - Restore operation is logged (start, progress, completion, error).
   - Documentation in `RESTORE.md` describes the restore procedure (CLI invocation, what gets restored, rollback).

## Implementation Plan

### Phase 1: Snapshot Function
1. Create `vault/snapshot.py` (if using Python) or `batch/snapshot.js` (if Node.js):
   - Accept `vault_dir` and output `snapshot_root` as parameters.
   - Create timestamped directory: `snapshot_root/snapshot-YYYYMMDD-HHMMSS/`.
   - Copy `vault_dir` → `snapshot_root/vault/`.
   - Copy `vault_dir/.smart-env` → `snapshot_root/.smart-env/`.
   - Return the snapshot path and metadata (timestamp, vault size, file count).
   - Log with structured JSON: `{level, event, timestamp, vaultSize, fileCount, snapshotPath}`.

2. Integrate into `batch/worker.js`:
   - Call `snapshot()` before the first job in `runCycle()`.
   - If snapshot fails, log a warning but continue (don't fail the batch run).
   - Capture snapshot output in the batch summary.

### Phase 2: Restore Function
1. Create `vault/restore.py` or `batch/restore.js`:
   - Accept `snapshot_dir` (full path to the snapshot to restore, e.g., `/path/to/vault/.snapshots/snapshot-20260901-120000`).
   - Accept `vault_dir` (target location to restore to, e.g., `/path/to/vault`).
   - Validate that `snapshot_dir` exists and contains `vault/` and `.smart-env/`.
   - Validate that `vault_dir` exists (but is okay if it has current data — restore will overwrite).
   - Optionally create a backup of the current vault before overwriting (name: `vault-pre-restore-YYYYMMDD-HHMMSS/`).
   - Copy `snapshot_dir/vault/` → `vault_dir/` (overwrites).
   - Copy `snapshot_dir/.smart-env/` → `vault_dir/.smart-env/` (overwrites).
   - Log completion: `{level: "info", event: "vault_restored", snapshotDir, vaultDir, timestamp}`.

2. CLI / Entry Point:
   - If Node.js: `node batch/restore.js --snapshot-dir /path/to/snapshot --vault-dir /path/to/vault`.
   - If Python: `python vault/restore.py --snapshot-dir /path/to/snapshot --vault-dir /path/to/vault`.
   - Else: Document manual invocation (cp commands).

### Phase 3: Documentation
1. Create `RESTORE.md`:
   - "What is a snapshot?" — point-in-time copy of vault and vector index.
   - "How to restore":
     - List available snapshots: `ls $VAULT_DIR/.snapshots/`.
     - Choose the snapshot to restore.
     - Run restore script (with exact command).
     - Verify restoration (check Obsidian opens vault successfully, Smart Connections re-indexing status).
   - "Safety": restore overwrites the current vault; create a pre-restore backup (script does this automatically).
   - "Troubleshooting": if restore fails mid-way, manual restore from backup.

2. Update `RELEASE.md` (already exists per Story 11.1):
   - Add snapshot/restore to the backup strategy section (already mentioned in Story 11.1 working notes).
   - Reference `RESTORE.md` for procedures.

## Known Limitations / Deferred

- **Automated pre-batch snapshot:** batched into batch/worker.js but only if `batch/snapshot.js` or equivalent is implemented.
- **Snapshot cleanup:** Old snapshots are not automatically deleted. Manual cleanup or a separate story (EP10 expansion) handles retention policy.
- **Smart Connections re-indexing post-restore:** After restore, Smart Connections may need to re-index changed files. This is out of scope — the restored .smart-env is correct as of the snapshot time; future notes will trigger incremental re-indexing via Story 3.1's watcher.
- **Verification/checksums:** Snapshots are not checksummed or signed. A corrupted snapshot backup will be restored as-is (rare, but possible if disk fails mid-copy).

## Acceptance Criteria Mapping

1. **Snapshots are taken automatically before each overnight batch run (EP4).**
   - Implemented via `batch/snapshot.js` call in `batch/worker.js:runCycle()`.
   - Logs structured JSON with timestamp, vault size, file count.

2. **A restore operation returns the vault/index to the last good snapshot without manual file surgery.**
   - Implemented via `batch/restore.js` or `vault/restore.py`.
   - CLI provides easy restore (no manual file surgery).
   - Documentation (`RESTORE.md`) explains the full procedure.

## Status

READY — awaiting implementation. Story 3.1 doesn't need to be COMPLETED before this story ships; Story 3.1's watcher (when implemented in Story 3.1) will trigger incremental re-indexing post-restore.

## References

- **Story 4.1** (Background Sweep & Queue Execution Script) — the batch worker that calls snapshot.
- **Story 3.1** (Smart Connections Vector Indexing Pipeline) — incremental re-indexing post-restore.
- **ADR14** — vault directory layout (`$VAULT_DIR`, `$VAULT_DIR/.smart-env`, etc.).
- **Story 11.1** (Release Packaging & Versioning) — `RELEASE.md` backup strategy section.
