---
name: story-6.5
description: Chat with Llama — Local Ollama Chat Panel — working notes
date: 2026-09-01
metadata:
  version: 1.0
  created-by: Claude Code
---

# Story 6.5: Chat with Llama — Local Ollama Chat Panel

## Summary

Wired the "Chat with Llama" sidebar panel to real local Ollama instances instead of returning mocked responses. Replaced the scripted canned-reply handler with actual inference via the OpenAI SDK (which supports Ollama's `/v1/chat/completions` endpoint).

## Implementation Details

### Changes Made

1. **`server/routes/chat-llama.js`** — Replaced mock handler:
   - Imported OpenAI SDK (`require("openai")`)
   - Implemented client initialization with Ollama baseURL (from `config.ollamaBaseUrl`)
   - Implemented real chat endpoint handler that:
     - Extracts `message` and `history` from request
     - Builds conversation array (prior history + current message)
     - Calls `client.chat.completions.create()` with conversation
     - Returns `{ reply: string }` on success
     - Returns 503 (Service Unavailable) for connection errors
     - Returns 500 (Internal Server Error) for other errors
   - Client is cached per config to avoid recreating on every request

2. **`server/ui/page.js`** — Removed mock indicators:
   - Removed `<span class="mock-badge">mocked — Story 6.5</span>` from heading
   - Changed subtitle from "Scripted replies for now — Story 6.5 wires this to Ollama for real" to "Local LLM conversation"

### Acceptance Criteria

- ✓ POST /api/chat/llama calls real Ollama chat endpoint (via OpenAI SDK)
- ✓ Conversation history passed through in request and used in LLM context
- ✓ Ollama-unreachable case returns clean error (HTTP 503)
- ✓ Mock-badge label removed from UI
- ✓ No outbound cloud calls — local Ollama only, per ADR12

## Testing

Manual verification in browser:
- Start server with Ollama reachable at configured endpoint
- Open `/chat` in browser
- Click "Chat with Llama" panel
- Enter message and verify real response from Ollama (not a scripted string)
- Verify conversation history works across multiple turns
- Verify graceful error if Ollama is unreachable

## Status

**COMPLETED** — all acceptance criteria met.

## Notes

- Ollama compatibility via OpenAI SDK is a key design choice enabling interoperability with any OpenAI-compatible API
- Error handling distinguishes between connection failures (503) and processing failures (500) for better debugging
- Client caching avoids repeated initialization but is simple/naive — production might benefit from connection pooling
