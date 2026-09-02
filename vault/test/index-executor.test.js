const indexExecutor = require("../index-executor");

describe("Index Executor (Story 3.1)", () => {
  describe("canHandle", () => {
    it("returns true for 'index' job type", () => {
      const job = { job_type: "index", id: 1 };
      expect(indexExecutor.canHandle(null, job)).toBe(true);
    });

    it("returns false for other job types", () => {
      expect(indexExecutor.canHandle(null, { job_type: "ingest" })).toBe(false);
      expect(indexExecutor.canHandle(null, { job_type: "classify" })).toBe(false);
      expect(indexExecutor.canHandle(null, { job_type: "convert" })).toBe(false);
    });
  });

  describe("execute", () => {
    it("accepts index job and returns completed result", async () => {
      const job = {
        id: 42,
        job_type: "index",
        document_id: 1,
      };

      const cfg = {
        VAULT_DIR: process.env.VAULT_DIR || "C:\\Users\\rsant\\desar\\Local Vault\\Local Vault",
        projectRoot: process.cwd(),
      };

      const result = await indexExecutor.execute(null, job, cfg);

      expect(result).toHaveProperty("job_id", 42);
      expect(result).toHaveProperty("status", "Completed");
      expect(result).toHaveProperty("result");
      expect(result.result).toHaveProperty("message");
      expect(result.result.message).toMatch(/vault change watcher executed/i);
    });

    it("AC1: detects modified or created notes", async () => {
      const job = { id: 43, job_type: "index", document_id: 1 };
      const cfg = {
        VAULT_DIR: process.env.VAULT_DIR || "C:\\Users\\rsant\\desar\\Local Vault\\Local Vault",
        projectRoot: process.cwd(),
      };

      const result = await indexExecutor.execute(null, job, cfg);

      expect(result.result).toHaveProperty("watcher_output");
      expect(Array.isArray(result.result.watcher_output)).toBe(true);
    });

    it("AC2: verifies local .smart-env storage", async () => {
      const job = { id: 44, job_type: "index", document_id: 1 };
      const cfg = {
        VAULT_DIR: process.env.VAULT_DIR || "C:\\Users\\rsant\\desar\\Local Vault\\Local Vault",
        projectRoot: process.cwd(),
      };

      const result = await indexExecutor.execute(null, job, cfg);

      // Status output should report on .smart-env
      expect(result.result).toHaveProperty("status_output");
      expect(result.result.message).toMatch(/Smart Connections/i);
    });
  });
});
