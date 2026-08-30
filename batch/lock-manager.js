const fs = require("fs");

/**
 * File-based, PID-tracked mutex enforcing ADR10's concurrency=1 constraint
 * for the batch worker. Uses an exclusive-create write ('wx' flag) so the
 * check-and-create is atomic at the OS level — two processes racing to
 * acquire the same lock file can't both succeed.
 *
 * A lock file whose PID is no longer alive (process.kill(pid, 0) throws
 * ESRCH) is treated as stale — left behind by a crashed prior run — and is
 * cleared automatically so the worker doesn't require manual intervention
 * after a crash.
 */

function isProcessAlive(pid) {
  if (!pid || Number.isNaN(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === "EPERM"; // exists but we lack permission to signal it — still alive
  }
}

function readLockPid(lockFilePath) {
  try {
    const raw = fs.readFileSync(lockFilePath, "utf-8").trim();
    return parseInt(raw, 10);
  } catch (err) {
    return null;
  }
}

/**
 * Attempts to acquire the lock. Returns { release() } on success, or null if
 * a live process already holds it.
 */
function acquire(lockFilePath) {
  try {
    fs.writeFileSync(lockFilePath, String(process.pid), { flag: "wx" });
    return { release: () => releaseIfOwned(lockFilePath) };
  } catch (err) {
    if (err.code !== "EEXIST") throw err;
  }

  const existingPid = readLockPid(lockFilePath);
  if (isProcessAlive(existingPid)) {
    return null;
  }

  // Stale lock from a crashed prior run — clear and retry once.
  try {
    fs.unlinkSync(lockFilePath);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }

  try {
    fs.writeFileSync(lockFilePath, String(process.pid), { flag: "wx" });
    return { release: () => releaseIfOwned(lockFilePath) };
  } catch (err) {
    if (err.code === "EEXIST") return null; // lost the retry race to another process
    throw err;
  }
}

/** Only removes the lock file if it still names this process — avoids a
 *  slow worker releasing a lock a newer instance has since acquired. */
function releaseIfOwned(lockFilePath) {
  const pid = readLockPid(lockFilePath);
  if (pid === process.pid) {
    try {
      fs.unlinkSync(lockFilePath);
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
  }
}

module.exports = { acquire, isProcessAlive, readLockPid };
