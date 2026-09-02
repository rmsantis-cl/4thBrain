---
name: adr22-email-calendar-integration
description: Email and calendar API integration for Story 5.1 (Briefing Synthesis)
metadata:
  status: approved
  version: 1.0
  date: 2026-09-02
---

# ADR22: Email & Calendar API Integration for Daily Briefing

**Date Created:** 2026-09-02  
**Decision:** Minimal OAuth + local credential storage approach (extensible to full integration)  
**Status:** Approved (unblocks Story 5.1 implementation)

## Background

Story 5.1 (Multi-Source Briefing Synthesis Engine) requires collecting unread priority emails and pending calendar events to pass to the local LLM for briefing generation. Currently, no design specifies how to authenticate, retrieve, and store these data.

## Problem

Story 5.1 cannot proceed without:
1. OAuth flow for email/calendar (Gmail, Outlook, etc.)
2. Credential storage mechanism (secure, local)
3. Data model for cached events/emails
4. Scope/permissions design

## Options Considered

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A. Direct API (hardcoded) | Hardcode credentials in `params.json` | Simple, no OAuth | Insecure, not user-friendly |
| B. System OAuth (OS native) | Use OS/desktop OAuth (Windows Credential Manager) | Native, secure | Platform-dependent |
| C. Local web callback | Minimal OAuth server with localhost redirect | Standard, user-friendly | Requires callback URI handling |
| D. Defer to future | Skip email/calendar for v0.1 | Unblocks briefing with local data only | Reduces briefing value (no external context) |

## Decision

**Hybrid Minimal Approach (Option C + D):**

**For v0.1 (MVP):** Implement Option D (local data only, no external APIs)
- Story 5.1 briefing draws from:
  - Pending jobs in the queue (task context)
  - Recent vault notes (semantic context via Story 3.1 search)
  - System status (job counts, indexing progress)
- No email/calendar integration required for AC
- Full OAuth implementation deferred to v0.2

**For v0.2+ (Future):** Option C design ready for implementation
- Minimal OAuth server listening on `http://localhost:3001/oauth/callback`
- Supported providers: Google (Gmail + Calendar), Microsoft (Outlook + Calendar)
- Credential storage: Encrypted JSON in `$params.json`-configured `SECRETS_DIR` with `.gitignore`
- Data model: `calendar_event`, `email_message` tables in SQLite (optional; can cache in-memory for v0.2)

## Implementation (v0.1)

**Story 5.1 Acceptance Criteria (LOCAL DATA ONLY):**
1. **Daily briefing note generated each morning** — Batch-scheduled, via Story 4.1 timing
2. **Distinct sections for agenda, action items, contextual reminders** — Three sections sourced from:
   - **Agenda:** Pending jobs (ingest, classify, index) from job queue
   - **Action Items:** Pending documents in "Processing" state (documents awaiting tagging/indexing)
   - **Contextual Reminders:** Recent vault notes related to pending items (via semantic search, Story 3.1 + 6.2)

**Deliverables:**
- `batch/briefing-engine.js` — Collects local data sources, calls Ollama to generate briefing Markdown
- `batch/briefing-executor.js` — Job executor for 'briefing' job type, integrates into Story 4.1 batch run
- Briefing note written to `$VAULT_DIR/daily-notes/briefing-YYYYMMDD.md`
- Test coverage: 3 tests verifying briefing structure, Ollama integration, file output

**No OAuth, no external APIs required for v0.1.**

## Future (v0.2+)

Once Story 5.1 ships and the briefing value is demonstrated:

1. **OAuth Server** (`server/routes/oauth-callback.js`)
   - Listen on `http://localhost:3001/oauth/callback` (or via `params.json`)
   - Redirect user to Google/Microsoft OAuth consent screen
   - Exchange auth code for token, store encrypted in `SECRETS_DIR`

2. **Credential Storage**
   - Directory: `$SECRETS_DIR` (from `params.json`, default `~/.4thbrain-secrets/`)
   - Files: `google-oauth.json`, `microsoft-oauth.json` (encrypted at rest, `.gitignore` in repo)
   - Encryption: Use Node.js crypto + master password (or OS keychain integration later)

3. **Data Fetchers**
   - `batch/fetch-gmail.js` — Fetch unread emails from labels (e.g., "inbox", "priority")
   - `batch/fetch-calendar.js` — Fetch events for today + next 3 days from all calendars
   - Cache in SQLite `calendar_event` / `email_message` tables (optional; in-memory is fine too)

4. **Briefing Content Expansion**
   - Agenda: Today's calendar events + pending jobs
   - Action Items: Unread priority emails + pending documents
   - Context: Vault notes + recent email threads related to top actions

## Notes

- **Design-First Principle:** Story 5.1 v0.1 ships with local data only; OAuth is documented but deferred. No unfinished OAuth code in codebase.
- **User Expectation:** Briefing is valuable even without email/calendar (job queue + vault context is substantial).
- **Scope Clarity:** v0.1 AC is local-only; v0.2 AC will include external sources. Two separate stories, not one.

## Related Files

- `documets/design/Project 4thBrain.md` — Story 5.1 (EP5)
- `batch/worker.js` — Where briefing executor will run in batch cycle
- `SYSTEM-REQUIREMENTS-SPECIFICATION.md` — FR6 (Daily Briefing) references but doesn't prescribe OAuth

