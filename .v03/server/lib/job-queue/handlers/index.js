const fs = require("fs");
const path = require("path");
const { lookup } = require("../../smart-connections-status");
const { looksBinary } = require("../text-sniff");

async function indexHandler({ job, document, repos, cfg, logger }) {
  const log = logger.forDocument(document.id, job.id);

  // Text-sniff pre-check (non-blocking, WARNING only)
  const sniffResult = looksBinary(document.uri_location);
  if (sniffResult.isBinary) {
    log.warning(
      "index_binary_content_detected",
      `Document ${document.id} ("${document.name}") looks binary: ${sniffResult.reason}`,
      { reason: sniffResult.reason }
    );
    // Continue processing anyway - Smart Connections will be the real arbiter
  }

  // Copy file to VAULT_INCOMING_DIR
  const incomingFileName = `${document.id}.md`;
  const incomingPath = path.join(cfg.vaultIncomingDir, incomingFileName);

  // Read source file
  const content = fs.readFileSync(document.uri_location, "utf-8");
  fs.writeFileSync(incomingPath, content);

  repos.job_file.create(
    incomingFileName,
    incomingPath,
    "text/markdown",
    "VAULT_INCOMING",
    job.id,
    "Copied"
  );

  // Poll Smart Connections for indexing status
  const pollResult = await pollSmartConnections(cfg, incomingFileName, log);

  if (pollResult.status === "current") {
    // Successfully indexed
    repos.job.createChild("classify", document.id, job.id);
  } else if (pollResult.status === "skipped" && pollResult.reason && pollResult.reason.includes("minimum size")) {
    // Too short - move to VAULT_NOTES
    const notesDir = path.join(cfg.vaultDir, "notes");
    fs.mkdirSync(notesDir, { recursive: true });
    const notesPath = path.join(notesDir, incomingFileName);
    fs.renameSync(incomingPath, notesPath);

    repos.document.updateStatus(document.id, "Failed");
    log.error(
      "index_too_short",
      `Document ${document.id} ("${document.name}") is too short for indexing`,
      { charCount: content.length, reason: pollResult.reason }
    );

    repos.job_file.create(
      incomingFileName,
      notesPath,
      "text/markdown",
      "VAULT_NOTES",
      job.id,
      `Skipped: ${pollResult.reason}`
    );
  } else {
    // Failed or unexpected
    const rawPath = path.join(cfg.vaultRawDir, incomingFileName);
    fs.renameSync(incomingPath, rawPath);

    repos.document.updateStatus(document.id, "Failed");
    log.error(
      "index_failed",
      `Document ${document.id} ("${document.name}") failed Smart Connections check: ${pollResult.reason || pollResult.status}`,
      { status: pollResult.status, reason: pollResult.reason }
    );

    repos.job_file.create(
      incomingFileName,
      rawPath,
      "text/markdown",
      "VAULT_RAW",
      job.id,
      `Failed: ${pollResult.reason || pollResult.status}`
    );
  }
}

async function pollSmartConnections(cfg, notePath, log) {
  const pollIntervalMs = cfg.smartConnectionsPollIntervalMs;
  const timeoutMs = cfg.smartConnectionsPollTimeoutMs;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const result = lookup(cfg, notePath);

      if (result.found) {
        if (result.status === "current") {
          return { status: "current", reason: null };
        } else if (result.status === "skipped") {
          return { status: "skipped", reason: result.reason };
        } else if (result.status === "unexpected") {
          return { status: "unexpected", reason: result.reason };
        }
        // missing status - keep polling
      }
    } catch (err) {
      // Couldn't load smart connections status - continue polling
      log.warning(
        "smart_connections_poll_error",
        `Error polling Smart Connections: ${err.message}`,
        { error: err.message }
      );
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  // Timeout
  return { status: "timeout", reason: `Smart Connections indexing check timed out after ${timeoutMs}ms` };
}

module.exports = indexHandler;
