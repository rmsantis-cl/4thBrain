# Roast: Plan-batch-queue.md — local job queue for LLM batch + non-LLM WSL tasks

## Contrarian

The "5 minutes before indexation" rule is a guess dressed up as a spec, and the plan even admits it in the Note under Memory — "research a more effective way to determine if a note was already indexed" is a TODO sitting inside what's supposed to be the design doc for a scheduling system. You cannot build a correct dependency scheduler on top of an unknown wait time. Either the note gets indexed in 30 seconds and you're wasting 4.5 minutes per job, or it takes 8 minutes on a big page and every downstream `research` silently reads stale/missing data with no error, just a research note quietly built on nothing. A fixed sleep is not a synchronization primitive; it's a bet you haven't tested.

The `research [level=X] url` recursion has no stated termination guard beyond `level` reaching 0, but nothing stops the same URL from appearing at two different levels of the same tree, or from two independent `research` invocations both enqueueing it. There's no dedup key mentioned anywhere in Memory. You will fetch the same page five times because five different notes referenced it, and nothing here tracks "already downloaded" versus "already fetched for this particular research job."

The batch-id lifecycle (`cancel`/`pause`/`continue`) is specified as three verbs with no state machine behind them. What happens to a `research level=2` job's already-enqueued children if you `cancel` the parent — do they orphan and run anyway, or cascade-cancel? The doc doesn't say, which means whoever builds this will pick an answer arbitrarily and you won't find out it's the wrong one until a canceled job's side effects show up in the vault anyway.

## Investor

There's no user here but you, so "market" is moot, but the same lens still applies as opportunity cost: you're about to build a bespoke job scheduler, a state machine, a WSL/Windows bridge, and a Claude Batch API integration — for a workload that a cron job plus a SQLite table plus `curl` could mostly cover in a tenth of the code. The "moat" question becomes "why not use an existing tool" — you already have Claude Code itself doing scheduled/background work via its own task and cron primitives elsewhere in this project. Before writing a queue engine, the return on that investment needs to beat "just use what's already available," and nothing in this doc argues it does.

## Pragmatist

"Tasks not requiring LLM... will be executed in a bash shell in WLS [sic]" is the line that should worry you most operationally. That's a Windows machine calling into WSL, which means every non-LLM task now depends on WSL being running, the right interpreter being on PATH inside it, and some marshaling layer translating Windows paths (`C:\Users\rsant\...`) into `/mnt/c/Users/rsant/...` correctly every single time. You already have a project rule mandating PowerShell-only and banning Bash for this exact project (`.claude/rules/shell.md`) — this plan directly contradicts that rule by routing execution through a Linux bash shell. That's not a nitpick, that's the plan disagreeing with a decision you already made and wrote down.

The Claude Batch round-trip (`[id]-prompt.md` → submit → `[id]-result.md`) has no stated timeout, retry, or failure-handling behavior. "Failed jobs" is listed as a status bucket in Memory, but nothing describes what makes a batch job count as failed, or whether the queue can tell "still processing" apart from "silently dropped." Batch APIs can take hours; if `status` can't distinguish "still queued upstream" from "died," you'll manually re-run things and get duplicate `[id]-result.md` writes or duplicate vault notes.

Nowhere does the plan say what "the queue" actually is — file on disk, SQLite, JSON blob, in-memory. Every other design decision (locking for concurrent `add`, how `pause` survives a machine reboot, how `status` reads state) depends on that choice and it's unstated.

## Domain Expert

Speaking as someone who's built job queues: this is reinventing a durable task queue (think a tiny local Celery/Sidekiq) without naming it as that, which means you'll rediscover — the hard way — the reasons those systems have explicit states (queued → running → succeeded/failed/canceled), idempotency keys, and dead-letter handling instead of the three pending/executed/failed buckets sketched here. "Executed" isn't even the right word for a terminal state; you presumably mean "succeeded," and conflating "ran" with "ran successfully" is exactly the kind of ambiguity that produces silent data loss in a system nobody's watching closely.

The citation requirement in `research` ("include quotations — with proper citation — from the referenced urls") is a real content-integrity requirement, but it's declared without saying how quote-to-source mapping survives the recursive fan-out. If url A references B and C, and B and C are each summarized independently by separate batch jobs, whoever writes the final note for A needs the exact quoted spans and their provenance passed back up, not just "the summary" — otherwise the "proper citation" promise degrades into "I remember roughly where this came from."

## Hype Man

The actual idea underneath — separate cheap, fast, LLM-free jobs from expensive batched LLM jobs, and let the second kind lean on the first kind's output once it's ready — is exactly the right shape for keeping vault research affordable and fast. You already have the citation discipline (APA 7, reference logging under `External/Web/References/`) from `b4-research` working and proven; this queue is a natural next step that turns that manual, one-shot skill into something that can run unattended overnight on a whole reading list. The recursive `research [level=X]` idea, if it works, gives you something genuinely useful that off-the-shelf tools don't: a controlled-depth citation tree instead of an undifferentiated pile of scraped pages.

## Visionary

Push this past "queue for my vault" and it's the backbone of an autonomous research assistant: seed it with a reading list or a single seminal paper, let `level` decide how far the citation tree spreads, and wake up to a fully cross-referenced knowledge graph with every claim traceable to a quote and a source. Once the queue exists as infrastructure, it stops being vault-specific — `add question` and `add url` are general primitives that could drive tag maintenance, `b4-review` audits, or even the `b4-ai-score` scoring pass, all running as background batch jobs instead of interactive skill invocations. The real endpoint isn't a task queue, it's a standing research organism that keeps your second brain current without you touching it.

## Verdict

The core idea — decouple free/fast non-LLM fetches from paid/slow batched LLM summarization, with a recursive citation-tree research mode — is sound and worth building. But the plan as written has one unresolved correctness bug (the fixed 5-minute indexation wait, self-flagged as needing research) and one direct contradiction of an existing project rule (WSL bash vs. the PowerShell-only mandate), plus no stated storage backend or job state machine. Don't code this yet: resolve the indexation-detection mechanism, decide whether WSL execution is actually acceptable given `shell.md`, and write down the state machine (including what cancel/pause do to child jobs) before this goes anywhere near implementation.
