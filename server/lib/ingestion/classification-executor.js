const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const { createRepositories } = require("../repositories");
const { withTransaction } = require("../repositories/tx");

/**
 * True if this executor can process the given job right now. The worker
 * (Story 4.1) checks this *before* claiming the job, so a job without a
 * document or with a document not yet filed in the vault is left untouched
 * in 'New'.
 *
 * Story 2.1 processes 'classify' jobs for documents already filed in
 * $VAULT_DIR/incoming (by Story 1.1's ingest-executor or Story 1.2's
 * transcode-executor). The document must exist, have a uri_location pointing
 * to an existing file, and status='Processing'. If any of these conditions
 * aren't met, the executor returns false and leaves the job for a later sweep.
 */
function canHandle(db, job) {
  if (!job || job.job_type !== "classify") return false;

  const repos = createRepositories(db);
  const doc = repos.document.get(job.document_id);

  // Document must exist and be in Processing state (output of ingest or transcode).
  if (!doc || doc.status !== "Processing") return false;

  // File must exist at the uri_location.
  if (!doc.uri_location || !fs.existsSync(doc.uri_location)) return false;

  return true;
}

/**
 * Executes a 'classify' job: reads the document content from its current
 * location in $VAULT_DIR/incoming, calls Ollama to infer tags and topic/subtopic,
 * updates the document record with the inferred topic, adds tags via the
 * document_tag link table, and moves the file to its final vault location
 * based on the inferred topic.
 *
 * Story 2.1 (ADR15) topics are hierarchical (topic/subtopic pair); the final
 * vault path is derived from this topic classification, not from tags.
 * Files referenced by the note (images, documents, etc.) are placed in a
 * sibling attachment directory next to the note.
 *
 * Throws on failure (missing file, Ollama unreachable, invalid LLM response,
 * file move failed, etc.). The caller (worker) owns job lifecycle transitions.
 */
async function execute(db, job, cfg) {
  return withTransaction(db, async (txDb) => {
    const repos = createRepositories(txDb);

    const doc = repos.document.get(job.document_id);
    if (!doc) {
      throw new Error(`document ${job.document_id} not found`);
    }

    if (!fs.existsSync(doc.uri_location)) {
      throw new Error(`document file not found: ${doc.uri_location}`);
    }

    // Read the document content
    const content = fs.readFileSync(doc.uri_location, "utf-8");
    if (!content) {
      throw new Error(`document file is empty: ${doc.uri_location}`);
    }

    // Call Ollama to infer tags and topic/subtopic
    const classification = await inferClassification(cfg, doc.name, content);

    // Ensure the inferred topic exists in the classification table
    // (create it if necessary, with the parent if the topic is hierarchical)
    ensureClassification(repos, classification.topic, classification.subtopic);

    // Update the document with the inferred topic
    const topicName = buildTopicName(classification.topic, classification.subtopic);
    repos.document.update(
      doc.id,
      doc.name,
      doc.uri_location, // will be updated below once file is moved
      doc.mime_type,
      doc.charset,
      "Processing", // stays Processing until Story 3.1's index executor finishes
      topicName
    );

    // Add tags to the document_tag link table
    for (const tag of classification.tags) {
      // Ensure tag exists
      try {
        repos.tag.get(tag);
      } catch {
        repos.tag.create(tag);
      }
      // Link the tag to the document (idempotent: ignore if already exists)
      try {
        repos.document_tag.create(doc.id, tag);
      } catch (err) {
        if (!err.message.includes("UNIQUE constraint")) throw err;
      }
    }

    // Move the file from $VAULT_DIR/incoming to its final location based on topic
    const finalPath = resolveVaultPath(cfg, topicName, doc.name);
    const finalDir = path.dirname(finalPath);
    fs.mkdirSync(finalDir, { recursive: true });
    fs.renameSync(doc.uri_location, finalPath);

    // Update the document's uri_location to the final path
    repos.document.update(
      doc.id,
      doc.name,
      finalPath,
      doc.mime_type,
      doc.charset,
      "Processing",
      topicName
    );

    return {
      documentId: doc.id,
      topic: topicName,
      tags: classification.tags,
      finalPath,
    };
  });
}

/**
 * Calls Ollama to infer tags and topic/subtopic for a document.
 * Returns { topic, subtopic, tags: [...] }.
 */
async function inferClassification(cfg, documentName, content) {
  const client = new OpenAI({
    apiKey: "ollama", // required by OpenAI SDK but ignored by Ollama
    baseURL: cfg.ollamaBaseUrl.replace(/\/v1\/?$/, ""), // Remove /v1 suffix; OpenAI SDK will add it
  });

  const prompt = buildClassificationPrompt(documentName, content);

  try {
    const response = await client.chat.completions.create({
      model: cfg.ollamaChatModel,
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText = response.choices[0]?.message?.content || "";
    return parseClassificationResponse(responseText);
  } catch (err) {
    throw new Error(`Ollama inference failed: ${err.message}`);
  }
}

/**
 * Builds a prompt instructing the LLM to classify a document.
 * Returns a structured prompt asking for topic, subtopic, and tags in JSON format.
 */
function buildClassificationPrompt(documentName, content) {
  const truncated = content.substring(0, 2000); // Limit to first 2000 chars to keep prompt reasonable
  return `You are a document classification system. Analyze the following document and provide:
1. A primary topic (one of: AI, PKM, Personal, Clippings, External)
2. A subtopic within that topic (e.g., "Research", "Tools", "Ideas", "Learning", etc.)
3. A list of 3-5 relevant tags (lowercase, single words or hyphenated)

Document name: ${documentName}
Content (first 2000 chars):
${truncated}

Respond ONLY with valid JSON in this exact format, no other text:
{
  "topic": "AI",
  "subtopic": "Research",
  "tags": ["machine-learning", "nlp", "transformers"]
}`;
}

/**
 * Parses the LLM's JSON response.
 * Expects { topic, subtopic, tags: [...] }.
 */
function parseClassificationResponse(responseText) {
  // Extract JSON from the response (in case there's extra text)
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Invalid classification response: no JSON found in "${responseText}"`);
  }

  const parsed = JSON.parse(jsonMatch[0]);

  if (!parsed.topic || !parsed.subtopic || !Array.isArray(parsed.tags)) {
    throw new Error(
      `Invalid classification response: missing topic, subtopic, or tags in ${jsonMatch[0]}`
    );
  }

  // Normalize topic/subtopic (allow minor case variations)
  const topic = normalizeTopicName(parsed.topic);
  const subtopic = normalizeTopicName(parsed.subtopic);
  const tags = parsed.tags.map((t) => t.toLowerCase().trim());

  return { topic, subtopic, tags };
}

/**
 * Normalizes topic/subtopic names: lowercase, trim, replace spaces/hyphens.
 */
function normalizeTopicName(name) {
  return name.toLowerCase().trim().replace(/\s+/g, "-");
}

/**
 * Builds the full topic name from topic/subtopic: "topic/subtopic".
 */
function buildTopicName(topic, subtopic) {
  return `${topic}/${subtopic}`;
}

/**
 * Ensures the topic and (optionally) subtopic classifications exist in the
 * database, creating them if necessary with proper parent links.
 *
 * ADR15: topic/subtopic are hierarchical. A topic name is "topic/subtopic",
 * stored as separate classification rows with parent links.
 */
function ensureClassification(repos, topic, subtopic) {
  // Ensure the parent topic exists (top-level, no parent)
  try {
    repos.classification.get(topic);
  } catch {
    repos.classification.create(topic, null);
  }

  // Ensure the subtopic exists with the topic as parent
  const fullTopicName = buildTopicName(topic, subtopic);
  try {
    repos.classification.get(fullTopicName);
  } catch {
    repos.classification.create(fullTopicName, topic);
  }
}

/**
 * Resolves the final vault path for a document based on its topic/subtopic.
 * Topic names are "topic/subtopic" (e.g., "AI/Research").
 * Returns the path where the document should be filed: $VAULT_DIR/topic/subtopic/documentName
 */
function resolveVaultPath(cfg, topicName, documentName) {
  const [topic, subtopic] = topicName.split("/");
  // Avoid filing into system directories (VAULT_INCOMMING, VAULT_RAW, etc.)
  if (isSystemTopic(topic)) {
    // Fall back to Personal if topic is a system directory
    return path.join(cfg.DOCUMENT_ROOT, "Personal", documentName);
  }
  return path.join(cfg.DOCUMENT_ROOT, topic, subtopic || topic, documentName);
}

/**
 * Checks if a topic name is a reserved system directory.
 */
function isSystemTopic(topic) {
  const systemTopics = [
    "VAULT_DIR",
    "VAULT_RAW",
    "VAULT_INCOMMING",
    "DOCUMENT_ROOT",
    "TMP_DIR",
    "incoming",
    "raw",
    "clipping",
  ];
  return systemTopics.includes(topic);
}

module.exports = { canHandle, execute };
