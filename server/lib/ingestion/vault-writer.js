const fs = require("fs");
const { resolveDestination } = require("./path-resolver");

/**
 * Copies sourcePath into cfg.vaultDirIncoming, byte-for-byte, under
 * desiredName (collision-resolved by path-resolver). Uses fs.copyFileSync
 * rather than a read/parse/write round-trip so frontmatter and structure are
 * preserved exactly, per Story 1.1's acceptance criteria — this function
 * never inspects or transforms file content.
 *
 * Returns the actual destination path used (may differ from desiredName if
 * a collision was resolved).
 */
function copyToVaultIncoming(sourcePath, cfg, desiredName) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`source file does not exist: ${sourcePath}`);
  }

  const destPath = resolveDestination(cfg.vaultDirIncoming, desiredName);
  fs.copyFileSync(sourcePath, destPath, fs.constants.COPYFILE_EXCL);
  return destPath;
}

module.exports = { copyToVaultIncoming };
