const fs = require("fs");
const path = require("path");

/**
 * Creates a timestamped snapshot of the vault directory and Smart Connections index.
 * Snapshots are stored in $VAULT_DIR/.snapshots/snapshot-YYYYMMDD-HHMMSS/
 *
 * @param {string} vaultDir - Path to the vault directory (e.g., $VAULT_DIR)
 * @param {Object} options - Configuration options
 * @param {Function} options.log - Logging function (default: console.log)
 * @returns {Object} - Snapshot metadata { timestamp, snapshotPath, vaultSize, fileCount }
 * @throws {Error} - If snapshot creation fails
 */
function createSnapshot(vaultDir, { log = defaultLog } = {}) {
  if (!vaultDir || !fs.existsSync(vaultDir)) {
    throw new Error(`Vault directory does not exist: ${vaultDir}`);
  }

  const timestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 15);
  const snapshotRoot = path.join(vaultDir, ".snapshots");
  const snapshotPath = path.join(snapshotRoot, `snapshot-${timestamp}`);

  try {
    // Ensure snapshots directory exists
    if (!fs.existsSync(snapshotRoot)) {
      fs.mkdirSync(snapshotRoot, { recursive: true });
    }

    // Create snapshot directory
    fs.mkdirSync(snapshotPath, { recursive: true });

    // Copy vault contents (excluding .smart-env and .snapshots themselves)
    const vaultSnapshotPath = path.join(snapshotPath, "vault");
    fs.mkdirSync(vaultSnapshotPath, { recursive: true });
    copyDirRecursive(vaultDir, vaultSnapshotPath, {
      exclude: [".smart-env", ".snapshots", ".obsidian"],
    });

    // Copy .smart-env if it exists
    const smartEnvSource = path.join(vaultDir, ".smart-env");
    if (fs.existsSync(smartEnvSource)) {
      const smartEnvDest = path.join(snapshotPath, ".smart-env");
      copyDirRecursive(smartEnvSource, smartEnvDest);
    }

    // Collect metadata
    const { fileCount, totalSize } = getDirectoryStats(snapshotPath);

    log({
      level: "info",
      component: "batch.snapshot",
      event: "snapshot_created",
      timestamp,
      snapshotPath,
      vaultDir,
      fileCount,
      totalSizeBytes: totalSize,
    });

    return {
      timestamp,
      snapshotPath,
      vaultDir,
      fileCount,
      totalSizeBytes: totalSize,
    };
  } catch (err) {
    log({
      level: "error",
      component: "batch.snapshot",
      event: "snapshot_failed",
      vaultDir,
      error: err.message,
    });
    throw err;
  }
}

/**
 * Recursively copies a directory, excluding specified paths.
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

/**
 * Recursively counts files and calculates total size of a directory.
 */
function getDirectoryStats(dir) {
  let fileCount = 0;
  let totalSize = 0;

  const traverse = (currentDir) => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        traverse(fullPath);
      } else {
        fileCount += 1;
        const stats = fs.statSync(fullPath);
        totalSize += stats.size;
      }
    }
  };

  traverse(dir);
  return { fileCount, totalSize };
}

function defaultLog(entry) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...entry }));
}

module.exports = { createSnapshot };
