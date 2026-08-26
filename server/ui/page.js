const CSS = require("./styles");
const CLIENT_JS = require("./client");

const NAV_ITEMS = [
  { id: "add-file", icon: "📎", label: "Add file" },
  { id: "add-text", icon: "Aa", label: "Add text" },
  { id: "add-url", icon: "🔗", label: "Add url" },
  { id: "ingest-status", icon: "▤", label: "Ingest status" },
  { id: "chat-llama", icon: "◎", label: "Chat with Llama" },
  { id: "chat-claude", icon: "✳", label: "Chat with Claude" },
  { id: "admin", icon: "⚙", label: "Admin" },
];

function renderNav() {
  return NAV_ITEMS.map(
    (item, i) => `
      <button class="nav-item${i === 0 ? " active" : ""}" data-panel="${item.id}">
        <span class="icon">${item.icon}</span> ${item.label}
      </button>`
  ).join("");
}

function renderAddFilePanel() {
  return `
    <section class="panel active" id="panel-add-file">
      <h1>Add file <span class="mock-badge">mocked — Story 6.1</span></h1>
      <p class="subtitle">Drop a file or browse. Nothing is written to disk yet — Story 6.1 wires this up for real.</p>
      <div class="card">
        <div class="dropzone" id="dropzone">Drag a file here, or click to browse</div>
        <input type="file" id="file-input" style="display:none">
        <div class="result-msg" id="file-result"></div>
      </div>
    </section>`;
}

function renderAddTextPanel() {
  return `
    <section class="panel" id="panel-add-text">
      <h1>Add text <span class="mock-badge">mocked — Story 6.1</span></h1>
      <p class="subtitle">Paste or type freeform text.</p>
      <div class="card">
        <form id="text-form">
          <textarea id="text-input" placeholder="Paste or type a note…"></textarea>
          <button type="submit" class="btn">Submit</button>
        </form>
        <div class="result-msg" id="text-result"></div>
      </div>
    </section>`;
}

function renderAddUrlPanel() {
  return `
    <section class="panel" id="panel-add-url">
      <h1>Add url <span class="mock-badge">mocked — Story 6.1</span></h1>
      <p class="subtitle">Submit a link to be clipped.</p>
      <div class="card">
        <form id="url-form">
          <input type="url" id="url-input" placeholder="https://…">
          <button type="submit" class="btn">Submit</button>
        </form>
        <div class="result-msg" id="url-result"></div>
      </div>
    </section>`;
}

function renderStatusPanel() {
  return `
    <section class="panel" id="panel-ingest-status">
      <h1>Ingest status <span class="mock-badge">mocked — Story 6.3</span></h1>
      <p class="subtitle">Sample data — Story 6.3 wires this to server/lib/smart-connections-status.js for real.</p>
      <div class="stat-grid" id="status-grid"></div>
      <button class="btn" id="status-refresh" type="button">Refresh</button>
      <div class="skip-list" id="status-skipped"></div>
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

function renderAdminPanel() {
  return `
    <section class="panel" id="panel-admin">
      <div class="admin-layout">
        <div class="admin-sidebar">
          <h2>Admin Tools</h2>
          <div class="admin-menu">
            <button class="admin-menu-item active" data-admin-section="tables">
              📊 Tables
            </button>
            <button class="admin-menu-item" data-admin-section="jobs">
              ⏳ Jobs <span class="mock-badge">mock</span>
            </button>
            <button class="admin-menu-item" data-admin-section="indexing">
              🔍 Indexing <span class="mock-badge">mock</span>
            </button>
          </div>
        </div>

        <div class="admin-content">
          <!-- Tables Section -->
          <div class="admin-section active" data-section="tables">
            <h1>Database Tables</h1>
            <p class="subtitle">Browse and edit database records.</p>

            <div class="table-controls">
              <label for="table-select">Table:</label>
              <select id="table-select">
                <option value="">— Select a table —</option>
              </select>
            </div>

            <div class="table-container" style="display: none;">
              <div class="table-toolbar">
                <div class="filter-group">
                  <select id="filter-col" style="display: none;">
                    <option value="">Filter by...</option>
                  </select>
                  <input type="text" id="filter-val" placeholder="filter value" style="display: none;">
                  <button class="btn secondary" id="filter-btn" style="display: none;">Apply</button>
                </div>
              </div>

              <div class="table-wrapper">
                <table id="admin-table">
                  <thead id="admin-table-head"></thead>
                  <tbody id="admin-table-body"></tbody>
                </table>
              </div>

              <div class="table-pagination" id="table-pagination"></div>
            </div>
          </div>

          <!-- Jobs Section (Mock) -->
          <div class="admin-section" data-section="jobs">
            <h1>Processing Jobs</h1>
            <p class="subtitle">View active, pending, and failed jobs (mock data).</p>
            <div class="card placeholder-panel">
              <div class="icon">⏳</div>
              <p>Job queue browser coming soon (Story 13.2)</p>
              <div class="mock-stats" style="margin-top: 16px;">
                <div class="stat"><span class="stat-label">Active</span> <span class="stat-value">3</span></div>
                <div class="stat"><span class="stat-label">Pending</span> <span class="stat-value">12</span></div>
                <div class="stat"><span class="stat-label">Failed</span> <span class="stat-value">1</span></div>
              </div>
            </div>
          </div>

          <!-- Indexing Section (Mock) -->
          <div class="admin-section" data-section="indexing">
            <h1>Vector Indexing Status</h1>
            <p class="subtitle">Smart Connections embedding statistics (mock data).</p>
            <div class="card placeholder-panel">
              <div class="icon">🔍</div>
              <p>Indexing status browser coming soon (Story 13.3)</p>
              <div class="mock-stats" style="margin-top: 16px;">
                <div class="stat"><span class="stat-label">Indexed</span> <span class="stat-value">247</span></div>
                <div class="stat"><span class="stat-label">Pending</span> <span class="stat-value">8</span></div>
                <div class="stat"><span class="stat-label">Skipped</span> <span class="stat-value">45</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>`;
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
    ${renderAdminPanel()}
  </main>

<script>${CLIENT_JS}</script>
</body>
</html>`;
}

module.exports = { renderChatPage };
