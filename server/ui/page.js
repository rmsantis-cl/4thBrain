const CSS = require("./styles");
const CLIENT_JS = require("./client");

const NAV_ITEMS = [
  { id: "add-file", icon: "📎", label: "Add file" },
  { id: "add-text", icon: "Aa", label: "Add text" },
  { id: "add-url", icon: "🔗", label: "Add url" },
  { id: "ingest-status", icon: "▤", label: "Ingest status" },
  { id: "chat-llama", icon: "◎", label: "Chat with Llama" },
  { id: "chat-claude", icon: "✳", label: "Chat with Claude" },
  { id: "admin", icon: "⚙", label: "Admin", href: "/admin" },
];

function renderNav() {
  return NAV_ITEMS.map((item, i) => {
    if (item.href) {
      return `
      <a class="nav-item" href="${item.href}">
        <span class="icon">${item.icon}</span> ${item.label}
      </a>`;
    }
    return `
      <button class="nav-item${i === 0 ? " active" : ""}" data-panel="${item.id}">
        <span class="icon">${item.icon}</span> ${item.label}
      </button>`;
  }).join("");
}

function renderAddFilePanel() {
  return `
    <section class="panel active" id="panel-add-file">
      <h1>Add file</h1>
      <p class="subtitle">Drop a file or browse.</p>
      <div class="card">
        <div class="dropzone" id="dropzone">Drag a file here, or click to browse</div>
        <input type="file" id="file-input" style="display:none">
        <input type="text" id="file-tags-input" class="tags-input" placeholder="Tags (comma-separated)">
        <div class="result-msg" id="file-result"></div>
      </div>
    </section>`;
}

function renderAddTextPanel() {
  return `
    <section class="panel" id="panel-add-text">
      <h1>Add text</h1>
      <p class="subtitle">Paste or type freeform text.</p>
      <div class="card">
        <form id="text-form">
          <textarea id="text-input" placeholder="Paste or type a note…"></textarea>
          <input type="text" id="text-tags-input" class="tags-input" placeholder="Tags (comma-separated)">
          <button type="submit" class="btn">Submit</button>
        </form>
        <div class="result-msg" id="text-result"></div>
      </div>
    </section>`;
}

function renderAddUrlPanel() {
  return `
    <section class="panel" id="panel-add-url">
      <h1>Add url</h1>
      <p class="subtitle">Submit a link to be clipped.</p>
      <div class="card">
        <form id="url-form">
          <input type="url" id="url-input" placeholder="https://…">
          <input type="text" id="url-tags-input" class="tags-input" placeholder="Tags (comma-separated)">
          <button type="submit" class="btn">Submit</button>
        </form>
        <div class="result-msg" id="url-result"></div>
      </div>
    </section>`;
}

function renderStatusPanel() {
  return `
    <section class="panel" id="panel-ingest-status">
      <h1>Ingest status</h1>
      <p class="subtitle">Live Smart Connections indexing status and job queue counts.</p>
      <button class="btn" id="status-refresh" type="button">Refresh</button>
      <h2 class="section-heading">Smart Connections</h2>
      <div class="stat-grid" id="status-grid"></div>
      <div class="skip-list" id="status-skipped"></div>
      <h2 class="section-heading">Job queue</h2>
      <div class="stat-grid" id="jobs-grid"></div>
      <div class="skip-list" id="jobs-failed"></div>
    </section>`;
}

function renderLlamaPanel() {
  return `
    <section class="panel" id="panel-chat-llama">
      <h1>Chat with Llama <span class="mock-badge">mocked — Story 6.5</span></h1>
      <p class="subtitle">Scripted replies for now — Story 6.5 wires this to Ollama for real.</p>
      <div class="card">
        <div class="chat-window" id="llama-window"></div>
        <form id="llama-form" class="chat-input-row">
          <input type="text" id="llama-input" placeholder="Ask something…" autocomplete="off">
          <button type="submit" class="btn">Send</button>
        </form>
      </div>
    </section>`;
}

function renderClaudePanel() {
  return `
    <section class="panel" id="panel-chat-claude">
      <h1>Chat with Claude</h1>
      <div class="card placeholder-panel">
        <div class="icon">✳</div>
        <p>Coming soon.</p>
        <p class="subtitle">Intentionally not wired to a backend — a cloud call here would conflict with ADR12 (zero outbound cloud LLM calls). See documets/story/story-6.4.md.</p>
        <form class="chat-input-row" style="max-width:420px;margin:16px auto 0;">
          <input type="text" placeholder="Chat with Claude — coming soon" disabled>
          <button type="button" class="btn" disabled>Send</button>
        </form>
      </div>
    </section>`;
}

function renderAdminMenuPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>4thBrain — Admin</title>
<style>${CSS}</style>
</head>
<body style="display:block; overflow:auto; height:auto; min-height:100vh; padding:40px;">
  <div class="card" style="max-width:420px; margin:60px auto;">
    <h1 style="margin-top:0;">Admin</h1>
    <p class="subtitle">Dev-only tools.</p>
    <div style="display:flex; flex-direction:column; gap:12px; margin-top:20px;">
      <a class="btn" style="display:inline-block; text-align:center; text-decoration:none;" href="/admin/db">Tables</a>
      <a class="btn secondary" style="display:inline-block; text-align:center; text-decoration:none;" href="/api/docs">API Docs</a>
    </div>
    <p class="subtitle" style="margin-top:24px;"><a href="/chat" style="color:var(--accent);">← Back to chat</a></p>
  </div>
</body>
</html>`;
}

function renderChatPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>4thBrain</title>
<style>${CSS}</style>
</head>
<body>

  <div class="mobile-topbar">
    <button class="menu-btn" aria-label="Toggle menu">☰</button>
    <div class="brand"><span class="mark">B4</span> 4thBrain</div>
  </div>
  <div class="backdrop"></div>

  <aside class="sidebar">
    <div class="brand"><span class="mark">B4</span> 4thBrain</div>
    <nav class="primary">${renderNav()}</nav>
    <div class="section-label">Recent</div>
    <div class="recent-list">
      <div class="recent-item"><span class="dot done"></span> Q3 planning notes.md</div>
      <div class="recent-item"><span class="dot done"></span> Clipped: obsidian.md local-rest-api</div>
      <div class="recent-item"><span class="dot active"></span> Meeting-transcript-08-25.pdf</div>
      <div class="recent-item"><span class="dot failed"></span> vendor-contract-scan.pdf</div>
    </div>
    <div class="account-row">
      <div class="avatar">RS</div>
      <div class="account-meta">
        <div class="account-name">Ren</div>
        <div class="account-status"><span class="pulse"></span> Local · Ollama</div>
      </div>
    </div>
  </aside>

  <main>
    ${renderAddFilePanel()}
    ${renderAddTextPanel()}
    ${renderAddUrlPanel()}
    ${renderStatusPanel()}
    ${renderLlamaPanel()}
    ${renderClaudePanel()}
  </main>

<script>${CLIENT_JS}</script>
</body>
</html>`;
}

module.exports = { renderChatPage, renderAdminMenuPage };
