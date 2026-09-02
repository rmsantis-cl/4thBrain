const fs = require("fs");
const path = require("path");

/**
 * Restores the vault and Smart Connections index from a snapshot.
 *
 * @param {string} snapshotDir - Path to the snapshot directory (e.g., $VAULT_DIR/.snapshots/snapshot-20260901-120000)
 * @param {string} vaultDir - Path to the vault directory to restore to (e.g., $VAULT_DIR)
 * @param {Object} options - Configuration options
 * @param {boolean} options.createBackup - Whether to create a pre-restore backup (default: true)
 * @param {Function} options.log - Logging function (default: console.log)
 * @returns {Object} - Restoration metadata { timestamp, snapshotDir, vaultDir, backupDir (if created) }
 * @throws {Error} - If restoration fails
 */
function restoreSnapshot(snapshotDir, vaultDir, { createBackup = true, log = defaultLog } = {}) {
  if (!snapshotDir || !fs.existsSync(snapshotDir)) {
    throw new Error(`Snapshot directory does not exist: ${snapshotDir}`);
  }

  if (!vaultDir || !fs.existsSync(vaultDir)) {
    throw new Error(`Vault directory does not exist: ${vaultDir}`);
  }

  // Validate snapshot structure
  const vaultSnapshotPath = path.join(snapshotDir, "vault");
  if (!fs.existsSync(vaultSnapshotPath)) {
    throw new Error(`Snapshot does not contain a 'vault' directory: ${snapshotDir}`);
  }

  try {
    let backupDir = null;

    // Create a pre-restore backup if requested
    if (createBackup) {
      const backupTimestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 15);
      backupDir = path.join(vaultDir, ".snapshots", `backup-pre-restore-${backupTimestamp}`);
      fs.mkdirSync(backupDir, { recursive: true });

      log({
        level: "info",
        component: "batch.restore",
        event: "backup_started",
        snapshotDir,
        vaultDir,
        backupDir,
      });

      // Backup current vault (excluding .snapshots)
      copyDirRecursive(vaultDir, path.join(backupDir, "vault"), {
        exclude: [".snapshots"],
      });

      log({
        level: "info",
        component: "batch.restore",
        event: "backup_completed",
        backupDir,
      });
    }

    log({
      level: "info",
      component: "batch.restore",
      event: "restore_started",
      snapshotDir,
      vaultDir,
    });

    // Restore vault contents (clear and copy from snapshot)
    // Delete all vault contents except .snapshots
    const entries = fs.readdirSync(vaultDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".snapshots") continue; // Never delete snapshots themselves
      const entryPath = path.join(vaultDir, entry.name);
      if (entry.isDirectory()) {
        fs.rmSync(entryPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(entryPath);
      }
    }

    // Copy snapshot vault contents
    copyDirRecursive(vaultSnapshotPath, vaultDir);

    // Restore .smart-env if it exists in snapshot
    const smartEnvSnapshotPath = path.join(snapshotDir, ".smart-env");
    const smartEnvVaultPath = path.join(vaultDir, ".smart-env");
    if (fs.existsSync(smartEnvSnapshotPath)) {
      // Remove existing .smart-env if present
      if (fs.existsSync(smartEnvVaultPath)) {
        fs.rmSync(smartEnvVaultPath, { recursive: true, force: true });
      }
      copyDirRecursive(smartEnvSnapshotPath, smartEnvVaultPath);
    }

    log({
      level: "info",
      component: "batch.restore",
      event: "restore_completed",
      snapshotDir,
      vaultDir,
      backupDir,
    });

    return {
      snapshotDir,
      vaultDir,
      backupDir,
      success: true,
    };
  } catch (err) {
    log({
      level: "error",
      component: "batch.restore",
      event: "restore_failed",
      snapshotDir,
      vaultDir,
      error: err.message,
    });
    throw err;
  }
}

/**
 * Lists available snapshots in a vault directory.
 */
function listSnapshots(vaultDir) {
  const snapshotRoot = path.join(vaultDir, ".snapshots");
  if (!fs.existsSync(snapshotRoot)) {
    return [];
  }

  const entries = fs.readdirSync(snapshotRoot, { withFileTypes: true });
  const snapshots = entries
    .filter((e) => e.isDirectory() && (e.name.startsWith("snapshot-") || e.name.startsWith("backup-")))
    .map((e) => {
      const fullPath = path.join(snapshotRoot, e.name);
      const stats = fs.statSync(fullPath);
      return {
        name: e.name,
        path: fullPath,
        timestamp: extractTimestamp(e.name),
        createdAt: stats.birthtime,
      };
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return snapshots;
}

/**
 * Extracts timestamp from a snapshot directory name.
 * Format: snapshot-YYYYMMDDHHMMSS or backup-pre-restore-YYYYMMDDHHMMSS
 */
function extractTimestamp(name) {
  const match = name.match(/(\d{14})/);
  return match ? match[1] : null;
}

/**
 * Recursively copies a directory.
 */
function copyDirRecursive(src, dest, { exclude = [] } = {}) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    if (exclude.includes(entry.name)) continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, { exclude });
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function defaultLog(entry) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...entry }));
}

module.exports = { restoreSnapshot, listSnapshots };
