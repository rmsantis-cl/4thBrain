const fs = require("fs");
const path = require("path");
const mimeTypes = require("mime-types");
const { extractArchive } = require("../extractors/archive");
const { MOCK_PDF_EXTRACTED_TEXT, MOCK_OCR_TEXT, MOCK_DOCX_EXTRACTED_TEXT, MOCK_GENERIC_TRANSCRIPTION_NOTE } = require("../fixtures");

async function convertHandler({ job, document, repos, cfg, logger }) {
  repos.document.updateStatus(document.id, "Processing");

  const ext = path.extname(document.uri_location).toLowerCase();
  const isArchiveFormat = [".zip", ".tar", ".Z"].includes(ext);

  if (isArchiveFormat) {
    // Real archive extraction
    await handleRealArchiveExtraction({ document, repos, cfg, logger, job, ext });
  } else {
    // Mock extraction for other formats
    handleMockExtraction({ document, repos, cfg, logger, job, ext });
  }
}

async function handleRealArchiveExtraction({ document, repos, cfg, logger, job, ext }) {
  const extractDir = path.join(cfg.tmpDir, `${document.id}_extracted`);

  try {
    const extracted = await extractArchive(document.uri_location, ext, extractDir);

    if (extracted.length === 0) {
      throw new Error("Archive contains no files");
    }

    // Create a new document for each extracted file
    for (const file of extracted) {
      const newDocumentName = path.relative(path.dirname(extractDir), file.absolutePath);
      const mimeType = mimeTypes.lookup(file.absolutePath) || "application/octet-stream";

      const newDocument = repos.document.create({
        name: newDocumentName,
        uriLocation: file.absolutePath,
        mimeType,
        status: "New",
        parent: document.id,
        author: "Extractor",
      });

      // Re-enqueue as ingest
      repos.job.createChild("ingest", newDocument.id, job.id);

      repos.job_file.create(
        newDocumentName,
        file.absolutePath,
        mimeType,
        "EXTRACTED",
        job.id,
        "Extracted"
      );
    }

    // Copy original archive to VAULT_RAW
    const archiveFileName = path.basename(document.uri_location);
    const rawPath = path.join(cfg.vaultRawDir, `archived_${document.id}_${archiveFileName}`);
    fs.copyFileSync(document.uri_location, rawPath);

    // Mark original archive as Archived
    repos.document.updateStatus(document.id, "Archived");

    repos.job_file.create(
      archiveFileName,
      rawPath,
      document.mime_type,
      "VAULT_RAW",
      job.id,
      "Archived"
    );
  } catch (err) {
    const log = logger.forDocument(document.id, job.id);
    log.error(
      "archive_extract_failed",
      `Archive extraction failed for document ${document.id} ("${document.name}"): ${err.message}`,
      { reason: err.message }
    );

    // Copy archive to VAULT_RAW as failed
    const archiveFileName = path.basename(document.uri_location);
    const rawPath = path.join(cfg.vaultRawDir, `failed_${document.id}_${archiveFileName}`);
    fs.copyFileSync(document.uri_location, rawPath);

    repos.document.updateStatus(document.id, "Failed");
    repos.job_file.create(
      archiveFileName,
      rawPath,
      document.mime_type,
      "VAULT_RAW",
      job.id,
      `Failed: ${err.message}`
    );

    throw err;
  }
}

function handleMockExtraction({ document, repos, cfg, logger, job, ext }) {
  // Mock extraction for PDF, images, DOCX, etc.
  let mockText;

  if ([".pdf"].includes(ext)) {
    mockText = MOCK_PDF_EXTRACTED_TEXT;
  } else if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
    mockText = MOCK_OCR_TEXT;
  } else if ([".docx", ".doc"].includes(ext)) {
    mockText = MOCK_DOCX_EXTRACTED_TEXT;
  } else {
    mockText = MOCK_GENERIC_TRANSCRIPTION_NOTE;
  }

  // Create a transcription document
  const transcriptionFileName = `${path.basename(document.uri_location, path.extname(document.uri_location))}_transcription.txt`;
  const transcriptionPath = path.join(cfg.tmpDir, transcriptionFileName);
  fs.writeFileSync(transcriptionPath, mockText);

  const transcriptionDocument = repos.document.create({
    name: transcriptionFileName,
    uriLocation: transcriptionPath,
    mimeType: "text/plain",
    status: "New",
    parent: document.id,
    author: "Extractor",
  });

  // Copy original to VAULT_RAW
  const binaryFileName = path.basename(document.uri_location);
  const rawPath = path.join(cfg.vaultRawDir, `archived_${document.id}_${binaryFileName}`);
  fs.copyFileSync(document.uri_location, rawPath);

  repos.document.updateStatus(document.id, "Archived");

  // Enqueue index for the transcription (not ingest, because content is already text)
  repos.job.createChild("index", transcriptionDocument.id, job.id);

  repos.job_file.create(
    binaryFileName,
    rawPath,
    document.mime_type,
    "VAULT_RAW",
    job.id,
    "Archived"
  );
}

module.exports = convertHandler;
