---
name: submit-batch
description: Submit a coding task to Anthropic's Batch API for unattended, cost-effective processing (half the price of standard API calls). Submits immediately with a batch ID, tracked in BATCH_TRACKER.md, retrievable later when complete. See documets/batch-tool.txt for the template, decision protocol, and invocation examples.
---

## Invocation

### Standard batch submission

```
/submit-batch <task description>
```

Example: `/submit-batch add a DELETE /api/tables/job/:id/cancel endpoint that transitions a running job to Failed`

Task is formatted, submitted to Anthropic's Batch API, and a batch ID is returned immediately. Execution is fully asynchronous — you do not wait for results. Batch ID and metadata are logged to `BATCH_TRACKER.md` for later retrieval.

### Interactive mode (override autonomous directives)

```
/submit-batch [OVERRIDE: DISABLE AUTONOMOUS DIRECTIVES] <task description>
```

Task is submitted with directives to use `AskUserQuestion` at decision points instead of picking autonomously (processed inside the batch job once it runs).

### Complexity gate

```
/submit-batch <task description>. GATE: If {condition}, output COMPLEXITY_DETECTED and stop.
```

Task is submitted with instructions to stop early if complexity threshold is hit (processed inside the batch job).

### Hybrid gating

```
/submit-batch <task description>. GATE_MAJOR: {interactive}. GATE_MINOR: {autonomous}.
```

Task is submitted with split decision directives (processed inside the batch job).

---

If invoked with no task description, ask the user what task to submit.

## What this does

Wraps the task description in the Batch API template at `documets/batch-tool.txt`, formats it as a Batch API request (JSONL), submits to Anthropic's infrastructure via the Batch API, and returns control immediately with a batch ID. The request is queued and processed asynchronously at lower cost. Results are retrievable using the batch ID once processing completes.

Multiple submissions create multiple independent batch jobs, each tracked in `BATCH_TRACKER.md`.

### Key features

- **Cost-effective** — Batch API charges half the standard API rate; ideal for fire-and-forget tasks
- **Persistent tracking** — Batch IDs stored in `BATCH_TRACKER.md` across sessions; retrieve results anytime
- **Autonomous execution** — request includes autonomous directives; agent/Claude makes decisions independently and logs to `DECISIONS.md` in the batch request
- **Override directives** — task can include `[OVERRIDE: DISABLE AUTONOMOUS DIRECTIVES]` to pause at decisions (processed by Claude in the batch job)
- **Complexity gating** — task can include `GATE:` to stop early on complex problems
- **Hybrid gating** — split decisions via `GATE_MAJOR:`/`GATE_MINOR:`

## Steps

1. **Read `documets/batch-tool.txt` fresh** (template is the single source of truth). Substitute task description for `${task description}` on the `Submit to batch` line.

2. **Detect override/gate keywords** in the task description:
   - `[OVERRIDE: DISABLE AUTONOMOUS DIRECTIVES]` → embedded in batch job, Claude pauses at decisions
   - `GATE:` → embedded in batch job, Claude stops if threshold hit
   - `GATE_MAJOR:`/`GATE_MINOR:` → hybrid mode, embedded in batch job
   - None → standard silent mode, embedded in batch job

3. **Append repo-specific guardrails** (same as before — design-before-implementation, no destructive git, PowerShell only, etc.). Embed these guardrails in the batch request message.

4. **Format and submit the Batch API request**:
   - Create a JSONL payload: one JSON object per line
   - Each object: `{"custom_id": "batch-{timestamp}", "params": {"model": "claude-opus-5", "messages": [...], "max_tokens": 4096}}`
   - Use the Anthropic Python SDK or `curl` to POST to `https://api.anthropic.com/v1/messages/batches`
   - Capture the returned `id` (batch ID)

5. **Track in BATCH_TRACKER.md**:
   - Add a new row: `| {batch_id} | {description} | {submitted_date} | — | active | {date} |`
   - Save the file

6. **Confirm to the user**: Report the batch ID, brief description, submission time. Remind them they can check `BATCH_TRACKER.md` anytime to see status, and results are available via the batch ID once complete. No waiting required.

7. **When batch completes** (user checks status or gets external notification): Retrieve results via `anthropic` CLI or API (`batches get {batch_id}`), extract the response from the batch result, and relay to user. Update `BATCH_TRACKER.md` with completion date and status change to `finish`.
