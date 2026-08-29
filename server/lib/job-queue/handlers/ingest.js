const fs = require("fs");
const path = require("path");
const { MOCK_HTML_WITH_IMAGES, MOCK_MARKDOWN, MOCK_PDF_URL_TEXT } = require("../fixtures");

async function ingestHandler({ job, document, repos, cfg, logger }) {
  // Update document status to Processing
  repos.document.updateStatus(document.id, "Processing");

  const isUrlOrigin = document.uri_location &&
                      (document.uri_location.startsWith(cfg.rawDirClipping) ||
                       document.uri_location.startsWith("http://") ||
                       document.uri_location.startsWith("https://"));

  if (isUrlOrigin) {
    // Mock Clipper for URL-origin documents
    handleMockClipper({ document, repos, cfg, logger });
  } else {
    // Local file or typed text
    const mimeType = document.mime_type || "text/plain";
    if (mimeType.startsWith("text/")) {
      // Enqueue index for text content
      repos.job.createChild("index", document.id, job.id);
    } else {
      // Enqueue convert for binary content
      repos.job.createChild("convert", document.id, job.id);
    }
  }

  // Create job_file audit row
  repos.job_file.create(
    document.name,
    document.uri_location,
    document.mime_type,
    "INGEST",
    job.id,
    "Processed"
  );
}

function handleMockClipper({ document, repos, cfg, logger }) {
  // Determine mock content by URL extension
  const urlExt = getExtensionFromUri(document.uri_location).toLowerCase();
  let mockContent;
  let contentExt;

  if (urlExt === ".pdf") {
    mockContent = MOCK_PDF_URL_TEXT;
    contentExt = "txt";
  } else if (urlExt === ".md") {
    mockContent = MOCK_MARKDOWN;
    contentExt = "md";
  } else if (urlExt === ".zip") {
    // For zips, mock Clipper doesn't extract; instead treat as binary
    // which will go through the convert stage in Phase 2
    repos.job.createChild("convert", document.id, job.id);
    return;
  } else {
    // Default to HTML with images
    mockContent = MOCK_HTML_WITH_IMAGES;
    contentExt = "html";
  }

  // Create a new document for the fetched content
  const fetchedFileName = `clipped_${document.id}.${contentExt}`;
  const fetchedPath = path.join(cfg.tmpDir, fetchedFileName);
  fs.writeFileSync(fetchedPath, mockContent);

  const fetchedDocument = repos.document.create({
    name: fetchedFileName,
    uriLocation: fetchedPath,
    mimeType: `text/${contentExt === "md" ? "markdown" : contentExt}`,
    status: "New",
    parent: document.id,
    author: "Clipper",
  });

  // If HTML with images, create child documents for each image
  if (contentExt === "html") {
    // Extract mock image refs from the HTML
    const imageMatches = mockContent.match(/<img[^>]+src="([^"]+)"/g) || [];
    imageMatches.forEach((imgTag, idx) => {
      const srcMatch = imgTag.match(/src="([^"]+)"/);
      if (srcMatch) {
        const imgName = `image_${idx + 1}.png`;
        repos.document.create({
          name: imgName,
          uriLocation: path.join(cfg.tmpDir, `img_${idx + 1}.png`),
          mimeType: "image/png",
          status: "New",
          parent: fetchedDocument.id,
          author: "Clipper",
        });
      }
    });
  }

  // Enqueue index for the fetched content (not the original URL document)
  repos.job.createChild("index", fetchedDocument.id, job.id);
}

function getExtensionFromUri(uri) {
  try {
    const url = new URL(uri);
    const pathname = url.pathname;
    return path.extname(pathname);
  } catch {
    return path.extname(uri);
  }
}

module.exports = ingestHandler;
