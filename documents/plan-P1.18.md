---
name: plan-P1.18
description: Execution plan for Story P1.18 (The Unified Composer) — build ADR27's composer in index.html, remove the four panels it replaces
date: 2026-09-07
metadata:
  version: 1.1
  created-by: Claude Opus 5
  story: P1.18
  owns: src/main/resources/templates/index.html
  new-adr: none
---

# Plan — P1.18 (The Unified Composer)

One of five plans written to run in parallel. See *Parallel safety* for the files this plan owns and
the files it must not touch. The other four are `plan-P2.1.md`, `plan-P2.2.md`, `plan-P2.4.md` and
`plan-P2.5.md`.

This is the cheapest of the five to run and the only one that touches no Java. It can merge at any
point without waiting for the others.

**Version 1.1** folds in `documents/review-plan-p1.18.md`. Six of its seven findings are taken and one
is rejected on the code; see *Review disposition* at the end for what changed and why.

## Scope

Build the composer ADR27 specifies into `index.html`, wire it to the endpoints that already exist,
and delete the four panels it replaces. No new endpoint, no new Java, no schema change.

## Design gate

**Nothing to decide.** ADR27 is written and P1.18's story says it is implemented "without further
interpretation". No ADR is reserved for this plan.

Two gaps are carried rather than closed, and both are already logged:

- **DD-2** — no endpoint reports the status of one document, so a receipt shows what the server
  returned at submission and never updates. Do not build a poller against `/api/status`; it returns
  aggregate counts, and it returns them wrong until P1.12 lands (see *Scope boundary*).
- **DD-3** — the composer posts no tags. `/api/ingest/file` still accepts an optional `tags`
  parameter; leave it unset rather than inventing a field.

One thing in this plan goes past ADR27 and is marked where it appears: the `Ctrl+Enter` accelerator in
step 4. It is optional, it changes no routing semantics, and it is the first thing to drop if the
control row proves dense in use.

## Verified state of the tree

Read 2026-09-07 on branch `v04`, re-verified against the review on the same date.

| Claim | Verified |
|---|---|
| `index.html` is in `templates/`, self-contained, inline CSS and one inline `<script>` | `index.html:1-580` |
| `NAV_ITEMS` has seven entries, six panels plus an Admin link | `:334-342` |
| Panel markup is built as one template literal in `renderPanels()` | `:365-435` |
| Add File posts multipart to `/api/ingest/file` with a `tags` field | `:453-466` |
| Add Text posts `{ text, tags }` to `/api/ingest/capture` | `:471-489` |
| Add URL posts `{ url, tags }` to `/api/ingest/capture` | `:494-512` |
| Chat posts `{ message, history }` to `/api/chat/llama` and reads `data.reply` | `:549-573` |
| **`/api/ingest/file` returns `status`**, alongside `id`, `message`, `fileName`, `mimeType` | `IngestionController.java:137-143`, `status` at `:139` |
| `/api/ingest/capture` returns `{ id, status, message }` | `IngestionController.java:187-191` |
| A bad capture body returns 400 with `{ "message": ... }` and no `id` or `status` | `IngestionController.java:216-220` |
| `/api/chat/llama` is a stub that echoes the input | `ChatController.java:11-23` |
| The chat window interpolates the user's text into `innerHTML` unescaped | `:554`, `:564` |
| The chat panel renders the user's own message before the reply | `:554` |
| No `th:` attribute appears anywhere in the file | Confirmed |

Three findings worth carrying forward.

**The chat panel has an HTML-injection defect.** `llamaWindow.innerHTML += \`...${message}...\`` puts
raw user input into the DOM, and the same is true of the model's reply. It is unexploitable in a
single-user local app and it is still wrong to copy into a feed that will carry every submission the
user makes. Step 5 escapes.

**`/api/chat/llama` still echoes.** ASK will reach the endpoint and render its reply, which meets
P1.18's acceptance criterion as written, but the reply will be `(Phase 1 Stub) I received your
message: …` until something wires the controller to Ollama. No story owns that; logged as DD-5.

**Both ingest endpoints already return ADR26's full shape.** The review reported `status` missing from
`/api/ingest/file` and quoted a four-key map; the file has five keys and `status` is one of them
(`:139`). No controller change is needed and none is in scope. The row above is stated precisely so the
claim does not get re-raised.

## Step 1 — the nav

`NAV_ITEMS` goes from seven entries to four, per ADR27 decision 8:

```javascript
const NAV_ITEMS = [
  { id: "composer",      icon: "✎", label: "Composer" },
  { id: "search",        icon: "🔍", label: "Search" },
  { id: "ingest-status", icon: "▤", label: "Ingest status" },
  { id: "admin",         icon: "⚙", label: "Admin", href: "/admin" },
];
```

`renderNav()` needs no change — it already branches on `item.href` and marks index 0 active, and
Composer is now index 0.

## Step 2 — the composer, markup and CSS

One rounded container holding the text area and its controls, `[+]` bottom-left and `ASK` `URL`
`SEND` bottom-right (ADR27 decision 1). The container is the panel's only card; the feed sits below
it.

```html
<section class="panel active" id="panel-composer">
  <div class="composer" id="composer">
    <textarea id="composer-input" placeholder="Type a note, paste a link, or ask…"></textarea>
    <div class="composer-attachments" id="composer-attachments"></div>
    <div class="composer-controls">
      <button type="button" class="btn btn-ghost composer-attach" id="composer-attach">+</button>
      <div class="composer-actions">
        <button type="button" class="btn btn-ghost" id="btn-ask">ASK</button>
        <button type="button" class="btn btn-ghost" id="btn-url" disabled>URL</button>
        <button type="button" class="btn" id="btn-send">SEND</button>
      </div>
    </div>
  </div>
  <input type="file" id="composer-file" multiple style="display:none">
  <div class="feed" id="feed"></div>
</section>
```

CSS, using the variables already defined at `:8-21`. This is the whole of it — the review's version,
taken as written:

```css
.composer {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 12px;
  transition: border-color 0.2s;
}
.composer:focus-within { border-color: var(--accent); }
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
  overflow-y: auto;
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
.attachment-chip.error { border-color: var(--status-failed); color: var(--status-failed); }
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
.composer-actions { display: flex; gap: 6px; }
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
}
.btn-ghost:hover:not(:disabled) { background: var(--surface-hover); color: var(--text-primary); }
.btn:disabled, .btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }
.btn:disabled:hover, .btn-ghost:disabled:hover { background: inherit; }
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
  background: var(--surface);
}
.feed-entry.receipt    { border-left: 3px solid var(--status-active); }
.feed-entry.user-query { border-left: 3px solid var(--accent); color: var(--text-primary); }
.feed-entry.reply      { border-left: 3px solid var(--status-done); }
.feed-entry.error      { border-left: 3px solid var(--status-failed); color: var(--status-failed); }
```

Three of those rules are doing specific work and are easy to drop by accident:

- **`.btn:disabled { opacity: 0.4 }`.** ADR27's URL rule is only visible if a disabled button looks
  disabled. Without it the rule is invisible and the feature reads as broken.
- **`.feed-entry { white-space: pre-wrap; word-break: break-word }`.** A pasted note or code snippet
  otherwise has its line breaks and indentation collapsed by the browser, and a long URL with no
  spaces in it stretches the panel horizontally.
- **`.composer textarea { max-height: 240px; overflow-y: auto }`.** The upper bound for step 4's
  auto-grow. Without it a long paste grows the box past the viewport and the buttons leave the screen.

The `.dropzone` rules at `:178-194` are no longer used by the composer, which has its own `.dragover`
above. Keep them anyway — see step 6.

## Step 3 — the URL rule

ADR27 decision 3, implemented exactly as the ADR states it:

```javascript
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
```

Nothing calls this directly to set `disabled`. **Every path that changes button state goes through
`updateComposerState()` in step 4**, which is the only thing that may write `btnUrl.disabled`. That
constraint exists because the obvious alternative — setting it from the `input` handler and clearing
it in a request's `finally` — silently breaks the rule; see step 4.

The whitespace test is what makes the ADR's truth table come out right. `new URL()` on
`see https://example.com — worth reading` throws anyway, but on two URLs separated by a newline it
does not, and the whitespace test is what rejects that case.

## Step 4 — state, staging and submissions

### 4.1 One function owns button state

```javascript
function updateComposerState(isBusy = false) {
  btnSend.disabled   = isBusy;
  btnAsk.disabled    = isBusy;
  btnAttach.disabled = isBusy;
  btnUrl.disabled    = isBusy || !isBareUrl(input.value);
}
```

Called from the textarea's `input` event, and from every request's `finally` as
`updateComposerState(false)`.

**Why this is a function and not four assignments.** The naive version disables the buttons before a
request and re-enables them afterwards. Re-enabling `btnUrl` unconditionally lights it while the box
holds plain text, which breaks ADR27's rule in the one direction the ADR says must not happen — the
rule exists so that "a wrong rule costs a dark button rather than a misrouted document", and a button
lit against the rule is exactly a misrouted document waiting to happen. Routing every state change
through one function that re-derives the rule is what prevents it.

### 4.2 `+`, drop and paste stage; `SEND` uploads

| Control | Effect |
|---|---|
| `+` / drop / paste | **stages** into `stagedFiles[]` and redraws the chips. **No request is sent.** |
| `SEND` | uploads each staged file to `POST /api/ingest/file`, then posts `{ "text": … }` to `POST /api/ingest/capture` if the box has text |
| `URL` | posts `{ "url": <trimmed input> }` to `POST /api/ingest/capture` |
| `ASK` | posts `{ message, history }` to `POST /api/chat/llama` |

Staging is what makes `+` followed by typing one act rather than two, and it is what ADR27 decision 6
describes — "text plus an attached file is two submissions and two Documents" is one press producing
two requests, not two presses.

`SEND` fires when **either** the box has text **or** files are staged:

```javascript
const hasText  = input.value.trim().length > 0;
const hasFiles = stagedFiles.length > 0;
if (!hasText && !hasFiles) return;
```

A guard of `if (!text.trim()) return` makes a file-only send impossible, which is the most ordinary
thing anyone will try. Files go first, then the text, so the receipts arrive in the order the user
would describe them.

Three mechanical traps in the staging code, each of which produces a bug that looks like something
else:

- **Reset `fileInput.value = ""` after staging.** Otherwise picking the same file twice in a row fires
  no `change` event and the second attempt appears to do nothing.
- **`preventDefault()` on a paste carrying files**, so the browser does not also insert a text
  representation of the pasted item into the box.
- **Chips are wired by event delegation on `#composer-attachments`**, reading an index from a
  `data-index` attribute — not by an inline `onclick` calling a function on `window`. Everything else
  in this file uses `addEventListener`, and a global reaching into `renderPanels()`'s closure is out of
  keeping with it.

### 4.3 Partial failure keeps the user's work

```javascript
async function handleSend() {
  const text = input.value.trim();
  if (!text && stagedFiles.length === 0) return;

  updateComposerState(true);
  try {
    // Files first, one request each, oldest first.
    while (stagedFiles.length > 0) {
      const file = stagedFiles[0];
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res  = await fetch("/api/ingest/file", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
        feedAppend("receipt", receiptLine(data, file.name));
        stagedFiles.shift();          // only on success
        renderAttachments();
      } catch (err) {
        feedAppend("error", `Upload failed [${file.name}]: ${err.message}`);
        markChipError(0);
        break;                        // stop the queue; the failed file stays staged
      }
    }

    if (text) {
      const res  = await fetch("/api/ingest/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      feedAppend("receipt", receiptLine(data, preview(text)));
      input.value = "";               // only on success
      autoGrow(input);
    }
  } catch (err) {
    feedAppend("error", `Submission failed: ${err.message}`);
  } finally {
    updateComposerState(false);
  }
}
```

**Nothing is cleared until the request that owned it succeeded.** A chip disappears when its own upload
returns 2xx; the textarea empties when the capture returns 2xx. Blanket-clearing after a send destroys
a note the user spent five minutes writing the moment the second of three uploads times out, and leaves
them unable to tell which of the three landed. A failed upload keeps its chip, marked with
`.attachment-chip.error`, and pressing `SEND` again retries from that file.

`URL` follows the same shape with a `{ url }` body and clears the box only on success. `ASK` is in
step 5.

### 4.4 Keyboard

- **`Enter` submits (`SEND`), `Shift+Enter` inserts a newline.** ADR27 decision 2 binds Enter to the
  primary action.
- **`Ctrl+Enter` / `Cmd+Enter` presses `URL`, and only when `btnUrl.disabled === false`.**
  *This goes beyond ADR27 and is optional.* The case for it: after pasting a link, the reflex is
  Enter, and Enter stores it as text with `source_url` null so `Clipper` never fetches it. That is a
  legitimate override (decision 3) but it is rarely what the hand meant, and the alternative is
  reaching for the mouse. Because it fires only when the whole trimmed input is one `http`/`https` URL,
  it carries none of the ambiguity ADR27 rejected sigils and inference for. Drop it if the first run
  finds the control row already dense, and record either way — it is evidence for the same evaluation.
- Nothing else binds Enter. Search keeps its own form in its own panel (decision 8).

### 4.5 Auto-grow

```javascript
function autoGrow(el) {
  el.style.height = "auto";
  el.style.height = Math.min(Math.max(el.scrollHeight, 72), 240) + "px";
}
```

Called from the same `input` handler as `updateComposerState`, and after any programmatic change to
the box's value. The clamp matches the CSS `min-height` / `max-height` in step 2; past 240px the
textarea scrolls internally rather than pushing the buttons off screen.

### 4.6 Rules that fall out of ADR27 and must not be improvised

- **Which button was pressed picks the key.** `URL` sends `url`, `SEND` sends `text`, including when
  the text happens to be a bare URL. That is the user's override (decision 3) and needs no warning.
- **`tags` is not sent** on any request (decision 7, DD-3).
- **There is no mode to reset** (decision 4). Do not add one.
- Several files are one Document each (decision 6), which is one request each.

## Step 5 — the feed

One function appends every entry, and it escapes:

```javascript
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function feedAppend(kind, text) { /* kind: "receipt" | "user-query" | "reply" | "error" */ }
```

**Every entry goes through `escapeHtml`.** The panel this replaces did not, and the defect must not
survive the rewrite.

### 5.1 Receipts carry a label

```javascript
function receiptLine(data, label) {
  return `Doc #${data.id} [${label}] — ${data.status} — ${data.message}`;
}
```

The label is the file name for an upload, and a ~30-character preview of the note for a capture. Five
submissions in a row otherwise produce five rows distinguished only by an incrementing id:

```
Doc #101 — ingesting — File received and queued
Doc #102 — ingesting — File received and queued
Doc #103 — ingesting — Text received and queued
```

which tells the user nothing about which of their five things is which. The label costs nothing, needs
no endpoint, and does not touch DD-2 — it names what was sent, not where it got to. The receipt is
still written once and never updated; **do not add a spinner suggesting otherwise.**

`data.status` is read directly. Both ingest endpoints set it (`IngestionController.java:139`, `:189`),
so a `|| "ingesting"` fallback would be guarding a case that cannot occur on a 2xx, and a non-2xx never
reaches this line — it renders an error entry instead.

### 5.2 `ASK` renders the question too

```javascript
feedAppend("user-query", question);      // before the fetch
// then, on resolve:
feedAppend("reply", data.reply || "(no response)");
```

Without the first line the feed shows answers with nothing above them, and after two or three
questions there is no way to tell which reply belongs to which. The chat panel being replaced already
did this (`:554`), and dropping it would be a regression rather than a simplification.

`ASK` clears the textarea when the question is dispatched and keeps `chatHistory`, as the chat panel
does today. A failed `ASK` appends an error entry; the question stays in the feed, since it was asked.

### 5.3 Errors

A failed `fetch` or a non-2xx renders an error entry carrying what is known: the status, and the
server's `message` when the body parses. `/api/ingest/capture` returns 400 with `{ "message": ... }`
and no `id` for a body that sets neither or both keys (`IngestionController.java:216-220`), so the
error path must not read `data.id` or `data.status`.

Scroll the feed to the bottom after each append.

## Step 6 — remove what the composer replaces

Delete from `renderPanels()`:

- the `panel-add-file`, `panel-add-text`, `panel-add-url` and `panel-chat-llama` sections (`:366-401`,
  `:424-434`);
- the handlers that only served them: the dropzone and `uploadFile` block (`:438-466`), the text form
  block (`:469-489`), the URL form block (`:492-512`), the chat block (`:544-573`);
- the CSS rules that then have no selector left: `.chat-window`, `.chat-message`, `.chat-input-row`
  (`:237-279`), and `.result-msg` (`:196-208`), replaced by the feed.

Keep `panel-search` and `panel-ingest-status` byte-identical, along with their handlers at `:530-541`
and `:515-527`, and keep `.stat-grid` and `.stat-box`.

**Keep `.dropzone` (`:178-194`)** even though the composer no longer uses it. It is three rules, it is
the styling any future drop affordance would want, and deleting it is the kind of tidying that makes a
diff harder to review for no benefit. Delete it in a later pass if nothing has claimed it.

## Step 7 — drag and drop without flicker

The composer is the drop target. Dragging a file across its children — the textarea, a chip, a button —
fires `dragleave` on the container each time the pointer crosses a child boundary, so a naive
add-on-`dragover` / remove-on-`dragleave` pair strobes the border. Use a counter:

```javascript
let dragCounter = 0;

composer.addEventListener("dragenter", (e) => {
  e.preventDefault();
  if (++dragCounter === 1) composer.classList.add("dragover");
});
composer.addEventListener("dragover", (e) => e.preventDefault());   // required, or drop never fires
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

`dragover` must call `preventDefault()` or the browser refuses the drop and opens the file instead.
Resetting the counter to 0 on `drop` rather than decrementing it is what keeps a dropped-then-dragged
sequence from leaving the class stuck on.

## Step 8 — ADR25's constraints

They carry over unchanged and are easy to break in a rewrite this size:

- The page stays in `src/main/resources/templates/`, self-contained, no bundler and no framework.
- **Do not add `th:inline="javascript"` to any script block.** Every template literal in this file —
  and the rewrite adds many more — uses `${...}`, which is also Thymeleaf's expression delimiter. A
  plain `<script>` passes through as raw text; the attribute is what would break it.
- Thymeleaf parses the page as a document rather than copying it, so malformed markup a browser
  forgives can fail at render. The page has to be loaded once to know it still renders.

## Verification

No automated coverage exists for this page and none is added here — P3.3 is REST tests through
MockMvc, and there is no browser harness in the build. Verification is manual, against a running app
(`scripts/build-log.ps1 -Task bootRun`).

1. `GET /` returns 200 and the page renders. Four nav items, Composer active.
2. Type a note, press `SEND`. A receipt appears with a real id, a status, and a preview label.
   `GET /admin/db` shows the document.
3. Paste `https://example.com`. The `URL` button lights. Press it — a receipt appears, and the
   document has `source_url` set with no `document_copy` row.
4. With the same bare URL in the box, press `SEND` instead. The document stores it as text
   (`content` set, `source_url` null). This is ADR27's override and it must work.
5. The URL button's truth table, checked by watching the button rather than by submitting:

   | Input | Expected |
   |---|---|
   | `https://example.com/article` | enabled |
   | `see https://example.com/article — worth reading` | disabled |
   | `example.com/article` | disabled |
   | two URLs on two lines | disabled |
   | `ftp://example.com/file` | disabled |

6. **State after a request.** Submit a note, wait for the receipt, then type plain text. `URL` is dark.
   This is the `finally` trap from step 4.1 and it is invisible unless checked deliberately.
7. **File-only send.** Attach a file with `+` and press `SEND` with the box empty. It uploads. Repeat
   by dropping the file on the composer.
8. **Re-picking the same file.** Attach a file with `+`, remove the chip, attach the same file again.
   The chip comes back.
9. Type text with two files attached, press `SEND`. Three receipts, three documents, files first.
10. **Partial failure.** Stop the app mid-send, or point one upload at a bad path: the failed chip
    stays with an error border, the note stays in the textarea, and pressing `SEND` again retries.
11. **Multi-line text.** Paste a note with blank lines and indentation. The box grows to 240px and then
    scrolls; the feed entry preserves the line breaks and the indentation.
12. **Drag flicker.** Drag a file slowly across the textarea, a chip and the buttons without releasing.
    The border highlights once and stays steady.
13. Press `ASK`. The question appears in the feed, then the stub's reply below it, in the same stream
    as the receipts.
14. Submit `<img src=x onerror=alert(1)>` as a note, and again as a question. Both show as text; no
    dialog.
15. `Shift+Enter` inserts a newline. `Enter` submits. `Ctrl+Enter` on a bare URL clips it; `Ctrl+Enter`
    on plain text does nothing.

Record the answer to ADR27's own open question while doing this: whether the four-control row feels
dense, and whether `ASK` gets pressed by mistake. P1.18's story names this as the evaluation the
spike skipped, and the finding belongs in the story's closing note either way. The `Ctrl+Enter`
accelerator is part of what gets evaluated, not a settled feature.

## Parallel safety

**Owns:** `src/main/resources/templates/index.html`.

**Must not touch:** anything under `src/main/java`, `application.yaml`, `build.gradle`, `schema.sql`.
This plan needs none of them — including `IngestionController`, which already returns everything the
feed reads.

**Conflicts with the other four plans:** none. No other plan opens a template.

`api-docs.html` describes the endpoints rather than the UI and needs no edit — `/capture` and `/file`
are unchanged by this plan.

## Scope boundary

Out, deliberately:

- **A live receipt.** DD-2. The feed is a submission log. Building a poller against `/api/status`
  would be worse than nothing: `Coordinator.getStatusCounts()` is keyed by actuator class name while
  `StatusController` looks up status names, so every key misses and the panel reads zero. That is
  P1.12's, and nothing here may make it worse. Step 5.1's label is the affordable half of what DD-2
  wants and does not pretend to be the rest.
- **A real chat reply.** `/api/chat/llama` echoes. DD-5.
- **Tags.** DD-3, and P2.4's plan is what closes it.
- **Search.** Its panel and its stub endpoint are untouched.
- **`/api/status` being wrong.** P1.12.
- **Any change to `IngestionController`.** The review proposed aligning `/api/ingest/file` with ADR26;
  it is already aligned.
- **Retrying a failed upload automatically.** The chip stays and `SEND` retries it. A backoff loop in
  a page with no queue is more machinery than the failure deserves.

## Acceptance criteria mapping

| Criterion (P1.18) | Closed by |
|---|---|
| One composer for file, text, URL and asking; the four panels and their JavaScript are gone | Steps 1, 2, 6 |
| Each input type reaches the endpoint P1.13 built, with no client guess duplicated server-side | Step 4.2 |
| `ASK` reaches `/api/chat/llama`, reply lands in the same feed | Steps 4.2, 5.2 |
| URL button enabled/disabled per the truth table; `SEND` on a bare URL gives a text Document | Steps 3 and 4.1, verification 4, 5 and 6 |
| The receipt feed reflects ADR26's response shape | Step 5.1 |
| Manual smoke test of all three input types against a running app | Verification 2, 3, 7, 9 |

## Review disposition

`documents/review-plan-p1.18.md`, dated 2026-09-07. Six findings taken, one rejected.

| Finding | Disposition |
|---|---|
| 1.1 Staging versus immediate upload contradiction | **Taken.** The v1.0 table and its prose disagreed. Step 4.2 says staging, and `SEND` accepts a file-only submission |
| 1.2 `finally` re-enables `btnUrl` against the rule | **Taken.** Step 4.1 routes every state change through `updateComposerState()`, and verification 6 checks it |
| 1.3 Data loss on partial submission | **Taken.** Step 4.3 clears each thing only when its own request succeeded; verification 10 |
| 1.4 `/api/ingest/file` omits `status` | **Rejected.** The endpoint returns `status` at `IngestionController.java:139`; the review quotes a four-key map that does not match the file. No fallback and no controller change |
| 2.1 `ASK` renders no question | **Taken.** Step 5.2. The panel being replaced already did this |
| 2.2 Anonymous receipts | **Taken.** Step 5.1 adds a file-name or text-preview label |
| 2.3 `white-space: pre-wrap` in the feed | **Taken.** Step 2 |
| 3.1 Drag flicker across child elements | **Taken.** Step 7, with `dragover`'s `preventDefault` added — the review's snippet omits it and the drop would never fire |
| 3.2 Textarea auto-grow | **Taken.** Step 4.5, clamped to the CSS bounds |
| 3.3 `Ctrl+Enter` for `URL` | **Taken with a caveat.** It goes past ADR27, so step 4.4 marks it optional and folds it into the evaluation rather than presenting it as settled |
| 4 Code snippets | **Taken, with two changes.** Chips are wired by event delegation rather than an inline `onclick` and a `window` global, matching the rest of the file; and `fileInput.value` is reset after staging, without which re-picking the same file does nothing |

## Risks

- **The rewrite is one file and most of it.** Roughly 300 of 580 lines change. Keep Search and Ingest
  status untouched so a broken render is bisectable to the composer.
- **A Thymeleaf render failure looks like a 500, not a syntax error.** Load the page once before
  calling the step done.
- **`updateComposerState` is a single point of failure for the URL rule.** That is the trade: one
  function to get right instead of five call sites to keep consistent. Verification 6 exists because
  the failure is silent.
- **Staging changes what `+` means.** Anyone used to the old Add File panel will expect the picker to
  upload immediately. The chip is the affordance that says otherwise, which is why a failed upload
  keeps its chip rather than vanishing.
- **Enter-to-send in a multiline box is the most likely usability complaint.** Shift+Enter is the
  release valve; if it still bites, that is evidence for ADR27's reopening triggers rather than a bug.
