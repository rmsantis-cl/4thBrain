const fs = require("fs");
const path = require("path");

const MAX_COLLISION_ATTEMPTS = 1000;

/**
 * Resolves a safe, collision-free destination path inside vaultDirIncoming
 * for desiredName.
 *
 * Decisions (Story 1.1):
 * - Only the basename of desiredName is used — any directory component is
 *   discarded, so a malicious or malformed name (e.g. "../../etc/passwd")
 *   can't escape vaultDirIncoming. This is Story 1.1's scope: files land
 *   flat in $VAULT_DIR/incoming. Per-topic subfolder filing is Story 2.1's
 *   job (ADR15), not this one's.
 * - Collisions are resolved by appending "-2", "-3", ... before the
 *   extension until a free name is found, rather than overwriting an
 *   existing note or rejecting the ingest outright.
 * - The resolved path is re-verified to stay inside vaultDirIncoming as a
 *   defense-in-depth check even though basename() already prevents
 *   traversal — protects against a future caller passing an absolute path
 *   in desiredName on a platform where path.basename() semantics surprise us.
 */
function resolveDestination(vaultDirIncoming, desiredName) {
  const safeBase = path.basename(desiredName || "");
  if (!safeBase || safeBase === "." || safeBase === "..") {
    throw new Error(`invalid destination file name: ${JSON.stringify(desiredName)}`);
  }

  const ext = path.extname(safeBase);
  const stem = safeBase.slice(0, safeBase.length - ext.length) || "untitled";

  for (let attempt = 0; attempt < MAX_COLLISION_ATTEMPTS; attempt++) {
    const candidateName = attempt === 0 ? safeBase : `${stem}-${attempt + 1}${ext}`;
    const candidatePath = path.resolve(vaultDirIncoming, candidateName);

    const resolvedRoot = path.resolve(vaultDirIncoming) + path.sep;
    if (!(candidatePath + path.sep).startsWith(resolvedRoot) && candidatePath !== path.resolve(vaultDirIncoming)) {
      throw new Error(`resolved destination escapes vaultDirIncoming: ${candidatePath}`);
    }

    if (!fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  throw new Error(`could not resolve a free destination for '${desiredName}' after ${MAX_COLLISION_ATTEMPTS} attempts`);
}

module.exports = { resolveDestination };
