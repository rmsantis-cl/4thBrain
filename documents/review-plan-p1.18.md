---
name: review-plan-p1.18
description: Comprehensive review and proposed improvements for execution plan documents/plan-P1.18.md (The Unified Composer)
date: 2026-09-07
metadata:
  target: documents/plan-P1.18.md
  story: P1.18
  adrs: [ADR25, ADR26, ADR27]
  status: PROPOSED
---

# Review & Proposed Improvements: Plan P1.18 (The Unified Composer)

## Executive Summary

`documents/plan-P1.18.md` is well-scoped, disciplined about parallel execution boundaries, and faithful to ADR27's intent. It correctly removes dead panels, preserves ADR25's template constraints, and prevents HTML injection.

However, a close technical walkthrough against the codebase reveals **three critical state/logic contradictions**, **one backend contract mismatch**, and **several interaction/UX traps** that will cause runtime defects or data loss if implemented exactly as written.

This document outlines the findings and provides drop-in replacement code snippets and plan adjustments.

---

## 1. Critical Logic & State Management Defects

### 1.1 The Staging vs. Immediate Upload Contradiction (Step 4)
* **The Defect**:
  * The Step 4 control mapping table states:
    > `+ / drop / paste` $\rightarrow$ `POST /api/ingest/file, one request per file`
  * But the explanatory prose below states:
    > *"Attachments are staged in a `File[]` and rendered as removable chips in `#composer-attachments`, so `+` followed by typing is one act rather than two."*
* **The Failure**:
  * If files are staged in `stagedFiles[]`, then `+`, drop, and paste do **not** trigger network requests immediately.
  * If the submission trigger is only `btn-send`, what happens if the user wants to upload a standalone file without entering text? If `handleSend()` checks `if (!text.trim()) return;`, the user **cannot upload attached files alone**.
* **Improvement**:
  1. Clarify in the Step 4 table that `+`, drag-and-drop, and paste **stage files into memory (`File[]`)** and update chip DOM elements.
  2. Define `SEND` submission criteria:
     ```javascript
     const hasText = composerInput.value.trim().length > 0;
     const hasFiles = stagedFiles.length > 0;
     if (!hasText && !hasFiles) return;
     ```
  3. `SEND` executes:
     * If `hasFiles`: upload each file via `POST /api/ingest/file`.
     * If `hasText`: submit text via `POST /api/ingest/capture`.
     * If both: execute file uploads first, followed by text capture.

---

### 1.2 The `finally` Re-enable Trap for `btn-url` (Step 4)
* **The Defect**:
  * Step 4 specifies: *"Each disables the buttons while a request is in flight and re-enables them in a `finally`."*
* **The Failure**:
  * If the `finally` block executes `btnUrl.disabled = false`, it **violates the narrow URL rule** established in ADR27. If the textarea currently contains plain text or multiple lines, `btn-url` will erroneously remain active.
* **Improvement**:
  * Centralize control state management into a dedicated helper function that respects the truth table:
    ```javascript
    function setBusy(busy) {
      btnSend.disabled = busy;
      btnAsk.disabled = busy;
      btnAttach.disabled = busy;
      btnUrl.disabled = busy || !isBareUrl(composerInput.value);
    }
    ```

---

### 1.3 Data Loss on Partial Submissions (Step 4)
* **The Defect**:
  * Step 4 states: *"Clear the textarea and the attachment list after a successful `SEND`, `URL` or file upload."*
* **The Failure**:
  * If a user attaches two files and types a detailed 500-word note, and File 2 fails due to a network timeout, blanket-clearing the textarea or attachment array destroys the user's unsaved text and leaves them unsure of what succeeded.
* **Improvement**:
  * **Granular cleanup**: Remove an attachment chip from `stagedFiles[]` **only when that specific file upload succeeds (200 OK)**. If an upload fails, mark the chip with an error border and keep it visible.
  * Clear `composerInput.value` **only when the text capture request succeeds**. On error, leave the text intact in the textarea.

---

### 1.4 Contract Discrepancy on `/api/ingest/file` Response Shape (Step 5)
* **The Defect**:
  * Step 5 assumes all ingestion endpoints return the ADR26 contract: `{ id, status, message }`.
  * In reality, `IngestionController.java` (`uploadFile` at line 137) currently returns:
    ```java
    Map.of(
        "message", "File received and queued",
        "id", savedDoc.id(),
        "fileName", doc.getName(),
        "mimeType", doc.getMimeType()
    );
    ```
  * `status` is **missing** from the `/api/ingest/file` payload.
* **The Failure**:
  * A template literal `${data.status}` will render `undefined` in the receipt feed for file uploads: `document 42 — undefined — File received and queued`.
* **Improvement**:
  * Defensive UI fallback in `feedAppend`:
    ```javascript
    const status = data.status || "ingesting";
    ```
  * Log a 1-line note in the plan to align `IngestionController.uploadFile` with ADR26's `"status": "ingesting"`.

---

## 2. Feed & Conversational (`ASK`) UX Gaps

### 2.1 The Missing Prompt Bubble in `ASK` (Step 5)
* **The Defect**:
  * Step 5 specifies: *"A model reply renders `data.reply`, falling back to `(no response)`."*
* **The Failure**:
  * The plan deletes `#panel-chat-llama` but forgets to render the user's question in the new unified feed. The feed would display orphaned model replies without the prompt that elicited them.
* **Improvement**:
  * When `btn-ask` is triggered, immediately append the user prompt to the feed before firing the fetch:
    ```javascript
    feedAppend("user-query", questionText);
    ```
  * Then, upon response or failure, append `feedAppend("reply", data.reply)` or `feedAppend("error", ...)`.

---

### 2.2 Anonymous "Blind" Receipts (Step 5)
* **The Defect**:
  * The receipt template: `document ${data.id} — ${data.status} — ${data.message}`.
* **The Failure**:
  * If a user uploads three files and pastes two links, the feed produces five visually identical entries with nothing but incrementing IDs:
    ```text
    document 101 — ingesting — File received and queued
    document 102 — ingesting — File received and queued
    document 103 — ingesting — Text received and queued
    ```
  * Without violating DD-2 (no live status polling), the receipt is far more useful if it includes a reference label (e.g., filename or truncated text snippet).
* **Improvement**:
  * Pass a label into the receipt renderer:
    ```javascript
    feedAppend("receipt", `Doc #${data.id} [${label}] — ${status} — ${data.message}`);
    ```

---

### 2.3 Whitespace & Pre-wrap Preservation in CSS (Step 2)
* **The Defect**:
  * Multi-line notes or code snippets pasted into the composer will have their whitespace collapsed by standard browser HTML rendering in `.feed-entry`.
* **Improvement**:
  * Ensure the feed styles preserve whitespace and wrap cleanly:
    ```css
    .feed-entry {
      white-space: pre-wrap;
      word-break: break-word;
    }
    ```

---

## 3. Ergonomics & Interaction Enhancements

### 3.1 Drag-and-Drop Hover Flicker (HTML Drag Event Bubbling)
* **The Defect**:
  * In Step 2, `.composer` is set as the drop target with `.dragover`.
  * When dragging a file across child elements inside `.composer` (e.g., the textarea, buttons, or attachment chips), the browser fires `dragleave` on the parent container, causing violent visual flickering of the border.
* **Improvement**:
  * Implement the standard drag counter pattern:
    ```javascript
    let dragCounter = 0;
    composer.addEventListener("dragenter", (e) => {
      e.preventDefault();
      if (++dragCounter === 1) composer.classList.add("dragover");
    });
    composer.addEventListener("dragleave", (e) => {
      e.preventDefault();
      if (--dragCounter === 0) composer.classList.remove("dragover");
    });
    composer.addEventListener("drop", (e) => {
      e.preventDefault();
      dragCounter = 0;
      composer.classList.remove("dragover");
      stageFiles(e.dataTransfer.files);
    });
    ```

---

### 3.2 Dynamic Auto-grow for Textarea
* **The Defect**:
  * `.composer textarea` is styled with `resize: none; min-height: 72px;`.
  * Pasting a 15-line note traps the user in a tiny, cramped box with an internal scrollbar.
* **Improvement**:
  * Add automatic height adjustment (clamped between 72px and 240px) inside the input listener:
    ```javascript
    function autoGrow(el) {
      el.style.height = "auto";
      el.style.height = Math.min(Math.max(el.scrollHeight, 72), 240) + "px";
    }
    ```

---

### 3.3 Keyboard Accelerator for URL Clipping (`Ctrl+Enter`)
* **The Defect**:
  * Under ADR27, `Enter` defaults to `SEND` (store as text).
  * Muscle memory for power users pasting a URL is to hit `Enter`. If they do, their link is stored as plain text (`source_url = null`) and never fetched by `Clipper`. They are forced to switch to the mouse to click `[URL]`.
* **Improvement**:
  * Preserve `Enter` = `SEND` per ADR27.
  * Bind `Ctrl+Enter` (or `Cmd+Enter`) to activate `URL` *if and only if* `btnUrl.disabled === false`.
  * This provides a keyboard shortcut for link capture without altering ADR27's default override semantics.

---

## 4. Concrete Code Adjustments for `plan-P1.18.md`

### Step 2: Extended Styles
```css
.composer {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 12px;
  transition: border-color 0.2s;
}
.composer:focus-within {
  border-color: var(--accent);
}
.composer.dragover {
  border-color: var(--accent);
  background: var(--surface-hover);
}
.composer textarea {
  border: none;
  background: transparent;
  color: var(--text-primary);
  resize: none;
  min-height: 72px;
  max-height: 240px;
  width: 100%;
  padding: 0;
  margin: 0;
  outline: none;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
}
.composer-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0;
}
.attachment-chip {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 2px 8px;
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}
.attachment-chip.error {
  border-color: var(--status-failed);
  color: var(--status-failed);
}
.attachment-chip .remove-btn {
  cursor: pointer;
  border: none;
  background: transparent;
  color: inherit;
  padding: 0;
  font-weight: bold;
}
.composer-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}
.composer-actions {
  display: flex;
  gap: 6px;
}
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
}
.btn-ghost:hover:not(:disabled) {
  background: var(--surface-hover);
  color: var(--text-primary);
}
.btn:disabled, .btn-ghost:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.feed {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}
.feed-entry {
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid var(--border);
}
.feed-entry.receipt {
  background: var(--surface);
  border-left: 3px solid var(--status-active);
}
.feed-entry.user-query {
  background: var(--surface);
  border-left: 3px solid var(--accent);
  color: var(--text-primary);
}
.feed-entry.reply {
  background: var(--surface);
  border-left: 3px solid var(--status-done);
}
.feed-entry.error {
  background: var(--surface);
  border-left: 3px solid var(--status-failed);
  color: var(--status-failed);
}
```

### Steps 3 & 4: Robust Controller Logic
```javascript
let stagedFiles = [];
let chatHistory = [];
let dragCounter = 0;

function isBareUrl(value) {
  const s = value.trim();
  if (s.length === 0 || /\s/.test(s)) return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function updateComposerState(isBusy = false) {
  const input = document.getElementById("composer-input");
  const btnSend = document.getElementById("btn-send");
  const btnAsk = document.getElementById("btn-ask");
  const btnUrl = document.getElementById("btn-url");
  const btnAttach = document.getElementById("composer-attach");

  btnSend.disabled = isBusy;
  btnAsk.disabled = isBusy;
  btnAttach.disabled = isBusy;
  btnUrl.disabled = isBusy || !isBareUrl(input.value);
}

function renderAttachments() {
  const container = document.getElementById("composer-attachments");
  container.innerHTML = stagedFiles.map((f, i) => `
    <span class="attachment-chip" id="chip-${i}">
      📄 ${escapeHtml(f.name)}
      <button type="button" class="remove-btn" onclick="removeAttachment(${i})">×</button>
    </span>
  `).join("");
}

window.removeAttachment = function(index) {
  stagedFiles.splice(index, 1);
  renderAttachments();
};

async function handleSend() {
  const input = document.getElementById("composer-input");
  const text = input.value.trim();
  if (!text && stagedFiles.length === 0) return;

  updateComposerState(true);
  try {
    // 1. Process files sequentially
    while (stagedFiles.length > 0) {
      const file = stagedFiles[0];
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/ingest/file", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Upload failed");
        feedAppend("receipt", `Doc #${data.id} [${file.name}] — ${data.status || 'ingesting'} — ${data.message || 'Queued'}`);
        stagedFiles.shift();
        renderAttachments();
      } catch (err) {
        feedAppend("error", `Upload failed [${file.name}]: ${err.message}`);
        break; // Stop queue on error, leave failed file in chips
      }
    }

    // 2. Process text if present
    if (text) {
      const res = await fetch("/api/ingest/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Capture failed");
      const preview = text.length > 30 ? text.substring(0, 30) + "…" : text;
      feedAppend("receipt", `Doc #${data.id} ["${preview}"] — ${data.status || 'ingesting'} — ${data.message || 'Queued'}`);
      input.value = "";
      autoGrow(input);
    }
  } catch (err) {
    feedAppend("error", `Submission failed: ${err.message}`);
  } finally {
    updateComposerState(false);
  }
}
```

---

## 5. Recommended Amendments to `documents/plan-P1.18.md`

1. **Update Step 2 CSS**: Add auto-grow rules, chip styling, and `white-space: pre-wrap` for `.feed-entry`.
2. **Update Step 3 & 4 Handlers**: Introduce `updateComposerState()` to eliminate the `finally` reactivation bug.
3. **Clarify Attachment Upload Model**: State clearly that `+`, drop, and paste append to `stagedFiles[]`, while `SEND` executes the uploads.
4. **Update Step 5 Feed**: Ensure `btn-ask` appends the user prompt to the feed before dispatching the request. Add label support to receipts.
5. **Add `Ctrl+Enter` Accelerator**: Document the keyboard shortcut to trigger `URL` when enabled.
6. **Update Verification Section**: Include test cases for:
   * Submitting attachments with an empty textarea.
   * Submitting multi-line text without whitespace collapsing.
   * Partial network failure handling (preserving unsaved state).
   * Drag-and-drop over child elements without visual flicker.
