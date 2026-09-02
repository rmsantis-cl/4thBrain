// CSS custom properties ported verbatim from ui/design/common-shell-mockup.html / STYLE-GUIDE.md.
// Panel-specific rules below the "Main" section are new for the 6-item shell.
const CSS = `
  :root {
    --bg: #191817;
    --surface: #211f1d;
    --surface-hover: #2a2825;
    --border: #34322e;
    --text-primary: #f2efe9;
    --text-secondary: #a3a099;
    --text-muted: #6f6c66;
    --accent: #d97757;
    --accent-hover: #c96a4c;
    --status-active: #5b9dd9;
    --status-done: #6fae7c;
    --status-failed: #c9645a;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: var(--bg);
    color: var(--text-primary);
    font-family: -apple-system, "Segoe UI", Inter, sans-serif;
    height: 100vh;
    display: flex;
    overflow: hidden;
  }

  /* ---------- Mobile top bar ---------- */
  .mobile-topbar {
    display: none;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    position: fixed;
    top: 0; left: 0; right: 0;
    background: var(--bg);
    z-index: 20;
  }
  .menu-btn {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    background: var(--surface-hover);
    color: var(--text-primary);
    border: none;
    font-size: 16px;
    cursor: pointer;
  }
  .mobile-topbar .brand { padding: 0; }

  .backdrop {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 25;
  }

  /* ---------- Sidebar ---------- */
  .sidebar {
    width: 272px;
    flex-shrink: 0;
    background: var(--bg);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    padding: 20px 12px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 8px 20px;
    font-size: 18px;
    font-weight: 600;
  }
  .brand .mark {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: var(--accent);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: #191817;
    font-weight: 700;
  }

  nav.primary { display: flex; flex-direction: column; gap: 2px; margin-bottom: 22px; }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 8px;
    color: var(--text-secondary);
    font-size: 14px;
    cursor: pointer;
    border: none;
    background: none;
    width: 100%;
    text-align: left;
    font-family: inherit;
    text-decoration: none;
  }
  .nav-item:hover { background: var(--surface-hover); color: var(--text-primary); }
  .nav-item.active { background: var(--surface-hover); color: var(--text-primary); }
  .nav-item.active .icon { color: var(--accent); }
  .icon { width: 18px; text-align: center; font-size: 15px; color: var(--text-secondary); }

  .section-label {
    font-size: 11px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text-muted);
    padding: 8px 12px 6px;
  }

  .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .dot.done { background: var(--status-done); }
  .dot.active { background: var(--status-active); }
  .dot.failed { background: var(--status-failed); }

  .account-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 8px 4px;
    border-top: 1px solid var(--border);
    margin-top: 10px;
  }
  .avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--accent);
    color: #191817;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .account-meta { display: flex; flex-direction: column; line-height: 1.3; }
  .account-name { font-size: 13px; color: var(--text-primary); }
  .account-status { font-size: 11px; color: var(--status-done); display: flex; align-items: center; gap: 4px; }
  .account-status .pulse { width: 6px; height: 6px; border-radius: 50%; background: var(--status-done); }

  /* ---------- Main ---------- */
  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 32px;
    overflow-y: auto;
  }

  .panel { display: none; max-width: 720px; width: 100%; margin: 0 auto; }
  .panel.active { display: block; }

  .panel h1 {
    font-family: Georgia, "Iowan Old Style", serif;
    font-size: 28px;
    font-weight: 400;
    margin: 0 0 6px;
  }
  .panel .subtitle { color: var(--text-secondary); font-size: 13px; margin: 0 0 24px; }
  .mock-badge {
    display: inline-block;
    font-size: 11px;
    color: var(--text-muted);
    background: var(--surface-hover);
    border-radius: 999px;
    padding: 3px 10px;
    margin-left: 8px;
    vertical-align: middle;
  }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
  }

  .dropzone {
    border: 1.5px dashed var(--border);
    border-radius: 12px;
    padding: 40px 20px;
    text-align: center;
    color: var(--text-secondary);
    cursor: pointer;
  }
  .dropzone.dragover { border-color: var(--accent); color: var(--text-primary); }

  textarea, input[type="text"], input[type="url"] {
    width: 100%;
    background: var(--surface-hover);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 14px;
    font-family: inherit;
    padding: 12px;
  }
  textarea { min-height: 160px; resize: vertical; }

  .btn {
    background: var(--accent);
    color: #191817;
    border: none;
    border-radius: 8px;
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 14px;
  }
  .btn:hover { background: var(--accent-hover); }
  .btn:disabled { background: var(--surface-hover); color: var(--text-muted); cursor: not-allowed; }
  .btn.danger { background: var(--status-failed); color: #191817; }
  .btn.danger:hover { background: #b3564d; }
  .btn.secondary { background: var(--surface-hover); color: var(--text-primary); }
  .btn.secondary:hover { background: var(--surface); }

  .result-msg {
    margin-top: 14px;
    font-size: 13px;
    color: var(--status-done);
    display: none;
  }
  .result-msg.visible { display: block; }

  /* ---------- Status panel ---------- */
  .section-heading { font-size: 13px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.03em; margin: 20px 0 10px; }
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
  .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px; }
  .stat-card .label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.03em; }
  .stat-card .value { font-size: 22px; margin-top: 4px; }
  .stat-card.current .value { color: var(--status-done); }
  .stat-card.skipped .value { color: var(--status-failed); }
  .stat-card.missing .value { color: var(--status-active); }
  .skip-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
  .skip-item { font-size: 13px; padding: 10px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; }
  .skip-item .path { color: var(--text-primary); }
  .skip-item .reason { color: var(--text-secondary); font-size: 12px; margin-top: 2px; }

  /* ---------- Chat panels ---------- */
  .chat-window {
    height: 380px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 14px;
    padding-right: 4px;
  }
  .bubble { max-width: 80%; padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.4; }
  .bubble.user { align-self: flex-end; background: var(--accent); color: #191817; }
  .bubble.assistant { align-self: flex-start; background: var(--surface-hover); color: var(--text-primary); }
  .bubble.thinking { align-self: flex-start; background: var(--surface-hover); color: var(--text-muted); font-style: italic; }

  .chat-input-row { display: flex; gap: 8px; }
  .chat-input-row input { flex: 1; }
  .chat-input-row .btn { margin-top: 0; }

  .placeholder-panel {
    text-align: center;
    color: var(--text-secondary);
    padding: 60px 20px;
  }
  .placeholder-panel .icon { font-size: 32px; margin-bottom: 12px; }

  /* ---------- Search Panel ---------- */
  .search-results {
    margin-top: 16px;
    max-height: 400px;
    overflow-y: auto;
  }

  .search-card {
    padding: 12px;
    margin-bottom: 8px;
    background: var(--surface-hover);
    border-radius: 6px;
    border: 1px solid var(--border);
    cursor: pointer;
    transition: background 0.15s;
  }

  .search-card:hover {
    background: var(--surface);
  }

  .search-card strong {
    color: var(--accent);
    font-size: 14px;
  }

  .search-card .snippet {
    display: block;
    color: var(--text-secondary);
    font-size: 13px;
    margin: 6px 0;
    word-break: break-word;
  }

  .search-card .type {
    color: var(--text-muted);
    font-size: 12px;
  }

  /* ---------- Mobile ---------- */
  @media (max-width: 760px) {
    .mobile-topbar { display: flex; }
    body { padding-top: 54px; }
    .sidebar {
      position: fixed;
      top: 0; bottom: 0; left: 0;
      transform: translateX(-100%);
      transition: transform 0.2s ease;
      z-index: 30;
      padding-top: 60px;
    }
    .sidebar.open { transform: translateX(0); }
    .sidebar.open ~ .backdrop, .backdrop.open { display: block; }
    main { padding: 20px; }
    .stat-grid { grid-template-columns: repeat(2, 1fr); }
  }
`;

module.exports = CSS;
