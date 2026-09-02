const { generateDailyBriefing } = require("./briefing-engine");

/**
 * Briefing Executor (Story 5.1: Multi-Source Briefing Synthesis)
 *
 * Batch job executor that generates the daily briefing note.
 * Integrates with Story 4.1's batch worker to run as part of overnight processing.
 */

function canHandle(db, job) {
  return job.job_type === "briefing";
}

/**
 * Execute briefing job:
 * 1. Collect local context (job queue, vault state)
 * 2. Call Ollama to generate briefing
 * 3. Write to vault's daily-notes folder
 * 4. Return result
 */
async function execute(db, job, cfg) {
  try {
    // Initialize Ollama client (reuse existing from cfg or create new)
    const { OllamaChatClient } = require("../server/lib/ollama-client");
    const ollamaClient = new OllamaChatClient({
      baseUrl: cfg.ollamaBaseUrl || "http://localhost:11434",
    });

    // Generate briefing
    const result = await generateDailyBriefing(db, cfg, ollamaClient);

    if (result.status === "failed") {
      throw new Error(result.error);
    }

    return {
      job_id: job.id,
      result: result,
      status: "Completed",
    };
  } catch (err) {
    throw new Error(`Briefing generation failed: ${err.message}`);
  }
}

module.exports = {
  canHandle,
  execute,
};
