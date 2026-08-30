const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const lockManager = require("../lock-manager");

function tmpLockPath() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "lock-test-")), "worker.lock");
}

test("acquire() succeeds when no lock file exists, and writes this process's PID", () => {
  const lockPath = tmpLockPath();
  const lock = lockManager.acquire(lockPath);
  try {
    assert.ok(lock, "should acquire the lock");
    assert.equal(fs.readFileSync(lockPath, "utf-8").trim(), String(process.pid));
  } finally {
    lock.release();
  }
});

test("acquire() returns null when a live process already holds the lock", () => {
  const lockPath = tmpLockPath();
  // process.pid is definitely alive (it's us) — simulates another live worker.
  fs.writeFileSync(lockPath, String(process.pid), { flag: "wx" });

  const second = lockManager.acquire(lockPath);
  assert.equal(second, null);

  fs.unlinkSync(lockPath); // cleanup — this test never went through release()
});

test("acquire() clears a stale lock (dead PID) and succeeds", () => {
  const lockPath = tmpLockPath();
  // PID 999999 is extremely unlikely to be a live process in any test environment.
  fs.writeFileSync(lockPath, "999999", { flag: "wx" });

  const lock = lockManager.acquire(lockPath);
  try {
    assert.ok(lock, "should clear the stale lock and acquire");
    assert.equal(fs.readFileSync(lockPath, "utf-8").trim(), String(process.pid));
  } finally {
    lock.release();
  }
});

test("release() removes the lock file", () => {
  const lockPath = tmpLockPath();
  const lock = lockManager.acquire(lockPath);
  lock.release();
  assert.equal(fs.existsSync(lockPath), false);
});

test("release() is a no-op if another process has since taken the lock (doesn't clobber a newer holder)", () => {
  const lockPath = tmpLockPath();
  const lock = lockManager.acquire(lockPath);

  // Simulate a different process now holding the lock (as if this worker's
  // lock was cleared as stale and immediately re-acquired by someone else).
  fs.writeFileSync(lockPath, "424242", { flag: "w" });

  lock.release();
  assert.equal(fs.existsSync(lockPath), true, "release() must not remove a lock file it doesn't own");
  assert.equal(fs.readFileSync(lockPath, "utf-8").trim(), "424242");

  fs.unlinkSync(lockPath);
});

test("isProcessAlive is true for our own pid and false for an implausible one", () => {
  assert.equal(lockManager.isProcessAlive(process.pid), true);
  assert.equal(lockManager.isProcessAlive(999999), false);
  assert.equal(lockManager.isProcessAlive(null), false);
  assert.equal(lockManager.isProcessAlive(NaN), false);
});
