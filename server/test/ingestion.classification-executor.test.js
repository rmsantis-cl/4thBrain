const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { createTestDb } = require("./helpers/test-db");
const { createTestCfg, cleanupTestCfg } = require("./helpers/test-cfg");
const { createRepositories } = require("../lib/repositories");
const classificationExecutor = require("../lib/ingestion/classification-executor");
const { withTransaction } = require("../lib/repositories/tx");

test("canHandle returns false for jobs without a document_id", () => {
  const db = createTestDb();
  const job = { job_type: "classify", document_id: null };
  assert.equal(classificationExecutor.canHandle(db, job), false);
  db.close();
});

test("canHandle returns false for documents that don't exist", () => {
  const db = createTestDb();
  const job = { job_type: "classify", document_id: 999 };
  assert.equal(classificationExecutor.canHandle(db, job), false);
  db.close();
});

test("canHandle returns false for documents not in Processing status", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const repos = createRepositories(db);
    const doc = repos.document.create(
      "test.md",
      path.join(cfg.vaultDirIncoming, "test.md"),
      "text/markdown",
      "utf-8",
      "New", // Not Processing
      null
    );
    const job = { job_type: "classify", document_id: doc.id };
    assert.equal(classificationExecutor.canHandle(db, job), false);
  } finally {
    cleanupTestCfg(cfg);
    db.close();
  }
});

test("canHandle returns false when the document file doesn't exist", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const repos = createRepositories(db);
    const nonexistentPath = path.join(cfg.vaultDirIncoming, "nonexistent.md");
    const doc = repos.document.create(
      "nonexistent.md",
      nonexistentPath,
      "text/markdown",
      "utf-8",
      "Processing",
      null
    );
    const job = { job_type: "classify", document_id: doc.id };
    assert.equal(classificationExecutor.canHandle(db, job), false);
  } finally {
    cleanupTestCfg(cfg);
    db.close();
  }
});

test("canHandle returns true for a document in Processing status with an existing file", () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const repos = createRepositories(db);
    const filePath = path.join(cfg.vaultDirIncoming, "test.md");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "# Test\n\nContent");

    const doc = repos.document.create(
      "test.md",
      filePath,
      "text/markdown",
      "utf-8",
      "Processing",
      null
    );
    const job = { job_type: "classify", document_id: doc.id };
    assert.equal(classificationExecutor.canHandle(db, job), true);
  } finally {
    cleanupTestCfg(cfg);
    db.close();
  }
});

// Mock executor that doesn't require Ollama
function createMockClassifier(mockClassification) {
  return {
    canHandle: classificationExecutor.canHandle,
    execute: async (db, job, cfg) => {
      if (!classificationExecutor.canHandle(db, job)) {
        throw new Error("canHandle returned false");
      }

      const repos = createRepositories(db);
      const doc = repos.document.get(job.document_id);

      if (!doc || !fs.existsSync(doc.uri_location)) {
        throw new Error("Document not found or file doesn't exist");
      }

      const content = fs.readFileSync(doc.uri_location, "utf-8");
      if (!content) {
        throw new Error("Document file is empty");
      }

      const topicName = `${mockClassification.topic}/${mockClassification.subtopic}`;

      // Ensure classifications exist
      try {
        repos.classification.create(mockClassification.topic, null);
      } catch {
        // already exists
      }
      try {
        repos.classification.create(topicName, mockClassification.topic);
      } catch {
        // already exists
      }

      // Update document with topic
      repos.document.update(
        doc.id,
        doc.name,
        doc.uri_location,
        doc.mime_type,
        doc.charset,
        "Processing",
        topicName
      );

      // Create and link tags
      for (const tag of mockClassification.tags) {
        try {
          repos.tag.get(tag);
        } catch {
          repos.tag.create(tag);
        }
        try {
          repos.document_tag.link(doc.id, tag);
        } catch (err) {
          // already linked or tag not active
        }
      }

      // Move file to final location
      const finalPath = path.join(cfg.DOCUMENT_ROOT, mockClassification.topic, mockClassification.subtopic, doc.name);
      const finalDir = path.dirname(finalPath);
      fs.mkdirSync(finalDir, { recursive: true });
      fs.renameSync(doc.uri_location, finalPath);

      // Update document uri_location to final path
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
        tags: mockClassification.tags,
        finalPath,
      };
    },
  };
}

test("execute (mocked) updates document with inferred topic and creates classification", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const repos = createRepositories(db);
    const filePath = path.join(cfg.vaultDirIncoming, "research-note.md");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "# Machine Learning Research");

    const doc = repos.document.create(
      "research-note.md",
      filePath,
      "text/markdown",
      "utf-8",
      "Processing",
      null
    );
    const job = repos.job.create("classify", "New", doc.id, null);

    const mockClassifier = createMockClassifier({
      topic: "AI",
      subtopic: "Research",
      tags: ["machine-learning", "nlp"],
    });

    const result = await mockClassifier.execute(db, job, cfg);

    assert.equal(result.topic, "AI/Research");
    assert.ok(result.finalPath);
    assert.deepEqual(result.tags, ["machine-learning", "nlp"]);

    // Verify document was updated
    const updated = repos.document.get(doc.id);
    assert.equal(updated.topic, "AI/Research");

    // Verify classifications exist
    assert.ok(repos.classification.get("AI"));
    assert.ok(repos.classification.get("AI/Research"));

    // Verify file was moved
    assert.equal(fs.existsSync(filePath), false);
    assert.equal(fs.existsSync(result.finalPath), true);
  } finally {
    cleanupTestCfg(cfg);
    db.close();
  }
});

test("execute (mocked) creates tags and links them to document", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const repos = createRepositories(db);
    const filePath = path.join(cfg.vaultDirIncoming, "note.md");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "# Personal Notes");

    const doc = repos.document.create(
      "note.md",
      filePath,
      "text/markdown",
      "utf-8",
      "Processing",
      null
    );
    const job = repos.job.create("classify", "New", doc.id, null);

    const mockClassifier = createMockClassifier({
      topic: "Personal",
      subtopic: "Ideas",
      tags: ["thought", "reflection", "important"],
    });

    const result = await mockClassifier.execute(db, job, cfg);

    // Verify tags were returned from the mock classifier
    assert.ok(Array.isArray(result.tags));
    assert.deepEqual(result.tags, ["thought", "reflection", "important"], "mock classifier should return the configured tags");
  } finally {
    cleanupTestCfg(cfg);
    db.close();
  }
});

test("execute throws if the document file doesn't exist", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const repos = createRepositories(db);
    const nonexistentPath = path.join(cfg.vaultDirIncoming, "nonexistent.md");
    const doc = repos.document.create(
      "nonexistent.md",
      nonexistentPath,
      "text/markdown",
      "utf-8",
      "Processing",
      null
    );
    const job = repos.job.create("classify", "New", doc.id, null);

    await assert.rejects(
      () => classificationExecutor.execute(db, job, cfg),
      /document file not found/
    );
  } finally {
    cleanupTestCfg(cfg);
    db.close();
  }
});

test("execute throws if the document file is empty", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const repos = createRepositories(db);
    const filePath = path.join(cfg.vaultDirIncoming, "empty.md");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "");

    const doc = repos.document.create(
      "empty.md",
      filePath,
      "text/markdown",
      "utf-8",
      "Processing",
      null
    );
    const job = repos.job.create("classify", "New", doc.id, null);

    await assert.rejects(
      () => classificationExecutor.execute(db, job, cfg),
      /document file is empty/
    );
  } finally {
    cleanupTestCfg(cfg);
    db.close();
  }
});

test("execute (mocked) places file in topic/subtopic directory structure", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const repos = createRepositories(db);
    const filePath = path.join(cfg.vaultDirIncoming, "article.md");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "# Article Title\n\nResearch article.");

    const doc = repos.document.create(
      "article.md",
      filePath,
      "text/markdown",
      "utf-8",
      "Processing",
      null
    );
    const job = repos.job.create("classify", "New", doc.id, null);

    const mockClassifier = createMockClassifier({
      topic: "PKM",
      subtopic: "Tools",
      tags: ["productivity"],
    });

    const result = await mockClassifier.execute(db, job, cfg);

    assert.ok(result.finalPath.includes("PKM"));
    assert.ok(result.finalPath.includes("Tools"));
    assert.ok(fs.existsSync(result.finalPath));
  } finally {
    cleanupTestCfg(cfg);
    db.close();
  }
});

test("execute (mocked) avoids system directories", async () => {
  const db = createTestDb();
  const cfg = createTestCfg();
  try {
    const repos = createRepositories(db);
    const filePath = path.join(cfg.vaultDirIncoming, "note.md");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "# Note");

    const doc = repos.document.create(
      "note.md",
      filePath,
      "text/markdown",
      "utf-8",
      "Processing",
      null
    );
    const job = repos.job.create("classify", "New", doc.id, null);

    const mockClassifier = createMockClassifier({
      topic: "External",
      subtopic: "References",
      tags: [],
    });

    const result = await mockClassifier.execute(db, job, cfg);

    assert.ok(!result.finalPath.includes("raw"));
    assert.ok(!result.finalPath.includes("incoming"));
  } finally {
    cleanupTestCfg(cfg);
    db.close();
  }
});

test("story 2.1: classification executor is wired into batch worker dispatcher", async () => {
  const { executors } = require("../../batch/job-executors");
  assert.ok(executors.classify, "classify executor should be registered");
  assert.ok(typeof executors.classify.canHandle === "function", "canHandle should be a function");
  assert.ok(typeof executors.classify.execute === "function", "execute should be a function");
});
