const fs = require("fs");
const path = require("path");
const { OpenAI } = require("openai");

async function classifyHandler({ job, document, repos, cfg, logger }) {
  const log = logger.forDocument(document.id, job.id);

  // Initialize Ollama client
  const client = new OpenAI({
    baseURL: cfg.ollamaBaseUrl.replace(/\/v1\/?$/, "") + "/v1",
    apiKey: "ollama",
  });

  // Read the indexed file from VAULT_INCOMING
  const incomingFileName = `${document.id}.md`;
  const incomingPath = path.join(cfg.vaultIncomingDir, incomingFileName);

  if (!fs.existsSync(incomingPath)) {
    throw new Error(`Indexed file not found: ${incomingPath}`);
  }

  const content = fs.readFileSync(incomingPath, "utf-8");

  // Call Ollama for classification
  let classification;
  try {
    const response = await client.chat.completions.create({
      model: cfg.ollamaChatModel,
      messages: [
        {
          role: "system",
          content: `You are a document classifier. Analyze the document and respond with ONLY a valid JSON object (no markdown, no extra text) with this structure:
{
  "topic": "main category (string, required)",
  "subtopic": "subcategory (string, required)",
  "tags": ["tag1", "tag2"] (array of strings, optional, can be empty)
}`,
        },
        {
          role: "user",
          content: `Classify this document:\n\n${content.slice(0, 2000)}`,
        },
      ],
    });

    const responseText = response.choices[0].message.content.trim();
    classification = JSON.parse(responseText);
  } catch (err) {
    log.error(
      "llm_parse_failed",
      `Classification failed for document ${document.id} ("${document.name}"): ${err.message}`,
      { error: err.message }
    );
    throw err;
  }

  if (!classification.topic || !classification.subtopic) {
    throw new Error("Classification missing required fields: topic and/or subtopic");
  }

  // Upsert classifications
  repos.classification.upsert(classification.topic, "VAULT_DIR");
  repos.classification.upsert(classification.subtopic, classification.topic);

  // Link tags to document
  if (classification.tags && Array.isArray(classification.tags)) {
    classification.tags.forEach((tagName) => {
      repos.tag.upsert(tagName);
      repos.document_tag.link(document.id, tagName);
    });
  }

  // Create vault directory structure
  const vaultPath = path.join(
    cfg.vaultDir,
    sanitizeFileName(classification.topic),
    sanitizeFileName(classification.subtopic)
  );
  fs.mkdirSync(vaultPath, { recursive: true });

  // Create frontmatter
  const frontmatter = createFrontmatter({
    title: document.name,
    tags: classification.tags || [],
    topic: classification.topic,
    subtopic: classification.subtopic,
    source: document.uri_location,
    created: document.created,
    original: null, // Will be set if parent document exists in VAULT_RAW
  });

  // Write the filed document
  const filedFileName = sanitizeFileName(document.name) + ".md";
  const filedPath = path.join(vaultPath, filedFileName);
  fs.writeFileSync(filedPath, frontmatter + "\n\n" + content);

  // Handle child documents (images from Clipper, or parent archive reference)
  const childDocuments = repos.document.listChildren(document.id);
  if (childDocuments && childDocuments.length > 0) {
    const childDir = path.join(vaultPath, sanitizeFileName(document.name));
    fs.mkdirSync(childDir, { recursive: true });

    for (const child of childDocuments) {
      if (fs.existsSync(child.uri_location)) {
        const childFileName = sanitizeFileName(child.name);
        const childFiledPath = path.join(childDir, childFileName);
        fs.copyFileSync(child.uri_location, childFiledPath);
      }
    }
  }

  // Remove from incoming
  if (fs.existsSync(incomingPath)) {
    fs.unlinkSync(incomingPath);
  }

  // Update document status to Indexed (terminal success)
  repos.document.updateStatus(document.id, "Indexed");
  repos.classification.upsert(classification.topic);
  repos.document.update(document.id, { topic: classification.topic });

  repos.job_file.create(
    filedFileName,
    filedPath,
    "text/markdown",
    "VAULT_TREE",
    job.id,
    "Filed"
  );
}

function createFrontmatter(meta) {
  const tags = meta.tags && Array.isArray(meta.tags) ? meta.tags : [];
  const tagsStr = tags.length > 0 ? `[${tags.map((t) => `"${t}"`).join(", ")}]` : "[]";

  return `---
title: "${escapeFrontmatter(meta.title)}"
tags: ${tagsStr}
topic: "${escapeFrontmatter(meta.topic)}"
subtopic: "${escapeFrontmatter(meta.subtopic)}"
source: "${escapeFrontmatter(meta.source)}"
created: "${meta.created}"
original: ${meta.original ? `"${escapeFrontmatter(meta.original)}"` : "null"}
---`;
}

function sanitizeFileName(name) {
  return name
    .replace(/[<>:"|?*]/g, "_")
    .replace(/[\\/]/g, "_")
    .replace(/\s+/g, "_")
    .substring(0, 200);
}

function escapeFrontmatter(str) {
  if (!str) return "";
  return String(str).replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

module.exports = classifyHandler;
