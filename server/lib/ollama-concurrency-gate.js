const fs = require("fs");
const path = require("path");

/**
 * Shared concurrency=1 gate for all Ollama callers (batch worker, chat API,
 * classification jobs). Enforces ADR10's constraint that only one local LLM
 * call runs at a time — prevents memory overload from simultaneous model loads.
 *
 * Uses a file-based, PID-tracked mutex with automatic stale-lock cleanup.
 * The lock file lives in the project root as `.ollama.lock` and is shared
 * across all callers.
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
 * Attempts to acquire the Ollama concurrency gate. Returns { release() } on
 * success, or null if another live process already holds it.
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
 *  slow caller releasing a lock a newer instance has since acquired. */
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

// Default lock file path — project root's `.ollama.lock`
const DEFAULT_LOCK_FILE = path.join(path.dirname(__dirname), "..", ".ollama.lock");

/**
 * Gets the default shared Ollama concurrency gate lock file path.
 */
function getLockFilePath() {
  return process.env.OLLAMA_LOCK_FILE || DEFAULT_LOCK_FILE;
}

module.exports = { acquire, getLockFilePath, isProcessAlive, readLockPid };
