const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { createSnapshot } = require("../snapshot");
const { restoreSnapshot, listSnapshots } = require("../restore");

/**
 * Creates a temporary test vault with some sample content.
 */
function createTestVault() {
  const vaultDir = path.join(os.tmpdir(), `test-vault-${Date.now()}`);
  fs.mkdirSync(vaultDir, { recursive: true });

  // Create some test files
  fs.writeFileSync(path.join(vaultDir, "note1.md"), "# Note 1\nContent for note 1");
  fs.writeFileSync(path.join(vaultDir, "note2.md"), "# Note 2\nContent for note 2");

  // Create a subdirectory with files
  fs.mkdirSync(path.join(vaultDir, "subdir"), { recursive: true });
  fs.writeFileSync(
    path.join(vaultDir, "subdir", "nested.md"),
    "# Nested Note\nContent for nested note"
  );

  // Create .smart-env stub
  fs.mkdirSync(path.join(vaultDir, ".smart-env"), { recursive: true });
  fs.writeFileSync(
    path.join(vaultDir, ".smart-env", "smart_env.json"),
    '{"version": 1, "embeddings": []}'
  );

  return vaultDir;
}

function cleanupTestVault(vaultDir) {
  fs.rmSync(vaultDir, { recursive: true, force: true });
}

test("createSnapshot creates a timestamped snapshot directory with vault and .smart-env", () => {
  const vaultDir = createTestVault();

  try {
    const result = createSnapshot(vaultDir);

    assert.ok(result.timestamp, "should return a timestamp");
    assert.ok(result.snapshotPath, "should return a snapshot path");
    assert.ok(fs.existsSync(result.snapshotPath), "snapshot directory should exist");
    assert.ok(
      fs.existsSync(path.join(result.snapshotPath, "vault")),
      "snapshot should contain vault directory"
    );
    assert.ok(
      fs.existsSync(path.join(result.snapshotPath, ".smart-env")),
      "snapshot should contain .smart-env"
    );

    // Verify vault contents are copied
    const note1Path = path.join(result.snapshotPath, "vault", "note1.md");
    assert.ok(fs.existsSync(note1Path), "note1.md should be in snapshot");
    const content = fs.readFileSync(note1Path, "utf-8");
    assert.equal(content, "# Note 1\nContent for note 1", "note1.md content should match");

    // Verify nested files are copied
    const nestedPath = path.join(result.snapshotPath, "vault", "subdir", "nested.md");
    assert.ok(fs.existsSync(nestedPath), "nested.md should be in snapshot");

    assert.ok(result.fileCount > 0, "should return file count");
    assert.ok(result.totalSizeBytes > 0, "should return total size");
  } finally {
    cleanupTestVault(vaultDir);
  }
});

test("createSnapshot excludes .snapshots and .obsidian directories", () => {
  const vaultDir = createTestVault();

  try {
    // Create .snapshots and .obsidian directories
    fs.mkdirSync(path.join(vaultDir, ".snapshots"), { recursive: true });
    fs.writeFileSync(path.join(vaultDir, ".snapshots", "old-snapshot.txt"), "old data");
    fs.mkdirSync(path.join(vaultDir, ".obsidian"), { recursive: true });
    fs.writeFileSync(path.join(vaultDir, ".obsidian", "config.json"), "{}");

    const result = createSnapshot(vaultDir);

    // Verify that .snapshots and .obsidian are excluded from the snapshot
    assert.ok(
      !fs.existsSync(path.join(result.snapshotPath, "vault", ".snapshots")),
      ".snapshots should not be in snapshot"
    );
    assert.ok(
      !fs.existsSync(path.join(result.snapshotPath, "vault", ".obsidian")),
      ".obsidian should not be in snapshot"
    );
  } finally {
    cleanupTestVault(vaultDir);
  }
});

test("restoreSnapshot restores vault contents from a snapshot", () => {
  const vaultDir = createTestVault();

  try {
    // Create a snapshot
    const snapshotResult = createSnapshot(vaultDir);
    const snapshotPath = snapshotResult.snapshotPath;

    // Modify the vault (simulate changes)
    fs.unlinkSync(path.join(vaultDir, "note1.md"));
    fs.writeFileSync(path.join(vaultDir, "note3.md"), "# Note 3\nNew content");

    // Restore from snapshot
    const restoreResult = restoreSnapshot(snapshotPath, vaultDir, { createBackup: false });

    assert.ok(restoreResult.success, "restore should succeed");
    assert.ok(fs.existsSync(path.join(vaultDir, "note1.md")), "note1.md should be restored");
    assert.ok(!fs.existsSync(path.join(vaultDir, "note3.md")), "note3.md (new file) should be removed");
    assert.ok(
      fs.existsSync(path.join(vaultDir, ".smart-env")),
      ".smart-env should be restored"
    );

    // Verify content
    const note1 = fs.readFileSync(path.join(vaultDir, "note1.md"), "utf-8");
    assert.equal(note1, "# Note 1\nContent for note 1", "restored content should match");
  } finally {
    cleanupTestVault(vaultDir);
  }
});

test("restoreSnapshot creates a pre-restore backup when requested", () => {
  const vaultDir = createTestVault();

  try {
    // Create initial snapshot
    const snapshotResult = createSnapshot(vaultDir);
    const snapshotPath = snapshotResult.snapshotPath;

    // Modify vault
    fs.writeFileSync(path.join(vaultDir, "modified.md"), "# Modified\nNew content");

    // Restore with backup
    const restoreResult = restoreSnapshot(snapshotPath, vaultDir, { createBackup: true });

    assert.ok(restoreResult.backupDir, "should return backup directory");
    assert.ok(fs.existsSync(restoreResult.backupDir), "backup directory should exist");
    assert.ok(
      fs.existsSync(path.join(restoreResult.backupDir, "vault", "modified.md")),
      "modified.md should be in backup"
    );
  } finally {
    cleanupTestVault(vaultDir);
  }
});

test("listSnapshots returns all snapshots in a vault directory", () => {
  const vaultDir = createTestVault();

  try {
    // Create a snapshot
    const snap1 = createSnapshot(vaultDir);

    // List snapshots
    const snapshots = listSnapshots(vaultDir);

    // Should have at least one snapshot
    assert.ok(snapshots.length >= 1, `should list at least 1 snapshot, got ${snapshots.length}`);
    // First snapshot should exist
    assert.ok(
      fs.existsSync(snap1.snapshotPath),
      "snapshot path should exist"
    );
    // List should contain objects with name, path, and timestamp
    assert.ok(snapshots[0].name, "snapshot should have a name");
    assert.ok(snapshots[0].path, "snapshot should have a path");
  } finally {
    cleanupTestVault(vaultDir);
  }
});

test("restoreSnapshot throws if snapshot directory does not exist", () => {
  const vaultDir = createTestVault();

  try {
    assert.throws(
      () => restoreSnapshot("/nonexistent/snapshot", vaultDir),
      /Snapshot directory does not exist/,
      "should throw if snapshot directory not found"
    );
  } finally {
    cleanupTestVault(vaultDir);
  }
});

test("restoreSnapshot throws if snapshot vault subdirectory is missing", () => {
  const vaultDir = createTestVault();

  try {
    // Create a fake snapshot without the vault subdirectory
    const snapshotPath = path.join(vaultDir, ".snapshots", "invalid-snapshot");
    fs.mkdirSync(snapshotPath, { recursive: true });
    // Create .smart-env but not vault
    fs.mkdirSync(path.join(snapshotPath, ".smart-env"), { recursive: true });

    assert.throws(
      () => restoreSnapshot(snapshotPath, vaultDir),
      /does not contain a 'vault' directory/,
      "should throw if snapshot vault directory is missing"
    );
  } finally {
    cleanupTestVault(vaultDir);
  }
});

test("createSnapshot throws if vault directory does not exist", () => {
  assert.throws(
    () => createSnapshot("/nonexistent/vault"),
    /Vault directory does not exist/,
    "should throw if vault directory not found"
  );
});
