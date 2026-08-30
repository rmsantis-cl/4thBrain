const express = require("express");
const fs = require("fs");
const path = require("path");
const devOnly = require("../middleware/dev-only");

const router = express.Router();

router.use(devOnly);

// Main admin panel route
router.get("/", (req, res) => {
  const db = req.app.locals.db;

  try {
    // Get all tables and their stats
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    const tableStats = tables.map(t => {
      const count = db.prepare(`SELECT COUNT(*) as cnt FROM "${t.name}"`).get();
      return { name: t.name, count: count.cnt };
    });

    // Get database file stats
    const dbPath = path.join(__dirname, "..", "4thbrain-metadata.db");
    const stats = fs.statSync(dbPath);
    const dbSizeKb = Math.round(stats.size / 1024);
    const dbModified = stats.mtime.toISOString();

    const html = renderAdminPage(tableStats, dbSizeKb, dbModified);
    res.type("html").send(html);
  } catch (err) {
    console.error("Admin panel error:", err);
    res.status(500).type("html").send(`
      <!DOCTYPE html>
      <html>
      <head><title>Error</title></head>
      <body style="font-family: system-ui; padding: 20px;">
        <h1>Error loading admin panel</h1>
        <pre>${err.message}</pre>
      </body>
      </html>
    `);
  }
});

// API: Get all tables with stats
router.get("/api/tables", (req, res) => {
  const db = req.app.locals.db;
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    const result = tables.map(t => {
      const count = db.prepare(`SELECT COUNT(*) as cnt FROM "${t.name}"`).get();
      return { name: t.name, count: count.cnt };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get table schema
router.get("/api/table/:name/schema", (req, res) => {
  const db = req.app.locals.db;
  const tableName = req.params.name;
  try {
    const columns = db.prepare(`PRAGMA table_info("${tableName}")`).all();
    res.json(columns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get paginated rows from table
router.get("/api/table/:name/rows", (req, res) => {
  const db = req.app.locals.db;
  const tableName = req.params.name;
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 25;
  const sort = req.query.sort || null;
  const dir = req.query.dir === "DESC" ? "DESC" : "ASC";
  const filterCol = req.query.filterCol || null;
  const filterVal = req.query.filterVal || null;

  try {
    // Base query
    let query = `SELECT * FROM "${tableName}"`;
    const params = [];

    // Apply filter if provided
    if (filterCol && filterVal !== null) {
      query += ` WHERE "${filterCol}" LIKE ?`;
      params.push(`%${filterVal}%`);
    }

    // Apply sorting if provided
    if (sort) {
      query += ` ORDER BY "${sort}" ${dir}`;
    }

    // Get total count (before pagination)
    const countQuery = query.replace(/SELECT \*/, "SELECT COUNT(*) as cnt");
    const countResult = db.prepare(countQuery).get(...params);
    const total = countResult.cnt;

    // Apply pagination
    const offset = (page - 1) * pageSize;
    query += ` LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);

    // Fetch rows
    const rows = db.prepare(query).all(...params);

    res.json({
      rows,
      total,
      page,
      pageSize,
      pages: Math.ceil(total / pageSize)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get single record
router.get("/api/table/:name/row/:id", (req, res) => {
  const db = req.app.locals.db;
  const tableName = req.params.name;
  const id = req.params.id;

  try {
    // Try to find the primary key column
    const columns = db.prepare(`PRAGMA table_info("${tableName}")`).all();
    const pkColumn = columns.find(c => c.pk === 1);

    if (!pkColumn) {
      return res.status(400).json({ error: "Table has no primary key" });
    }

    const row = db.prepare(`SELECT * FROM "${tableName}" WHERE "${pkColumn.name}" = ?`).get(id);
    if (!row) {
      return res.status(404).json({ error: "Record not found" });
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Insert record
router.post("/api/table/:name/row", (req, res) => {
  const db = req.app.locals.db;
  const tableName = req.params.name;
  const data = req.body;

  try {
    const columns = Object.keys(data).filter(k => data[k] !== null && data[k] !== "");
    const values = columns.map(k => data[k]);

    const placeholders = columns.map(() => "?").join(", ");
    const query = `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(", ")}) VALUES (${placeholders})`;

    db.prepare(query).run(...values);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Update record
router.patch("/api/table/:name/row/:id", (req, res) => {
  const db = req.app.locals.db;
  const tableName = req.params.name;
  const id = req.params.id;
  const data = req.body;

  try {
    // Find primary key column
    const columns = db.prepare(`PRAGMA table_info("${tableName}")`).all();
    const pkColumn = columns.find(c => c.pk === 1);

    if (!pkColumn) {
      return res.status(400).json({ error: "Table has no primary key" });
    }

    // Build update query
    const updateCols = Object.keys(data).map(k => `"${k}" = ?`).join(", ");
    const values = Object.values(data);
    values.push(id);

    const query = `UPDATE "${tableName}" SET ${updateCols} WHERE "${pkColumn.name}" = ?`;
    db.prepare(query).run(...values);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Delete record
router.delete("/api/table/:name/row/:id", (req, res) => {
  const db = req.app.locals.db;
  const tableName = req.params.name;
  const id = req.params.id;

  try {
    // Find primary key column
    const columns = db.prepare(`PRAGMA table_info("${tableName}")`).all();
    const pkColumn = columns.find(c => c.pk === 1);

    if (!pkColumn) {
      return res.status(400).json({ error: "Table has no primary key" });
    }

    db.prepare(`DELETE FROM "${tableName}" WHERE "${pkColumn.name}" = ?`).run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function renderAdminPage(tableStats, dbSizeKb, dbModified) {
  const tableList = tableStats.map(t => `
    <div class="table-item" data-table="${t.name}">
      <div class="table-name">${t.name}</div>
      <div class="table-count">${t.count} rows</div>
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Database Inspector — 4thBrain Admin</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui; background: #0a0a0a; color: #e0e0e0; }

    .container { display: flex; height: 100vh; }

    .sidebar { width: 280px; background: #1a1a1a; border-right: 1px solid #333; overflow-y: auto; padding: 20px; }
    .sidebar h2 { font-size: 14px; font-weight: 600; text-transform: uppercase; color: #888; margin-bottom: 16px; }
    .sidebar-section { margin-bottom: 24px; }

    .table-item {
      padding: 12px; margin-bottom: 8px; background: #222; border-radius: 6px; cursor: pointer;
      border-left: 3px solid transparent; transition: all 0.2s;
    }
    .table-item:hover { background: #2a2a2a; border-left-color: #4a9eff; }
    .table-item.active { background: #2a2a2a; border-left-color: #4a9eff; }
    .table-name { font-size: 13px; font-weight: 500; margin-bottom: 4px; }
    .table-count { font-size: 11px; color: #888; }

    .stats {
      background: #222; padding: 12px; border-radius: 6px; font-size: 12px; margin-top: 12px;
    }
    .stat-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .stat-row:last-child { margin-bottom: 0; }
    .stat-label { color: #888; }
    .stat-value { font-weight: 600; }

    .main { flex: 1; display: flex; flex-direction: column; }

    .header {
      background: #1a1a1a; border-bottom: 1px solid #333; padding: 16px 24px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .header h1 { font-size: 18px; font-weight: 600; }
    .header-actions { display: flex; gap: 8px; }

    .content { flex: 1; display: flex; overflow: hidden; }

    .browser {
      flex: 1; padding: 20px; overflow-y: auto;
      display: flex; flex-direction: column;
    }

    .toolbar {
      display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;
    }

    .filter-group { display: flex; gap: 8px; align-items: center; }
    .filter-group input {
      padding: 6px 10px; background: #222; border: 1px solid #333; color: #e0e0e0;
      border-radius: 4px; font-size: 12px; min-width: 120px;
    }
    .filter-group select {
      padding: 6px 10px; background: #222; border: 1px solid #333; color: #e0e0e0;
      border-radius: 4px; font-size: 12px;
    }

    .btn {
      padding: 6px 12px; background: #4a9eff; color: #000; border: none;
      border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;
    }
    .btn:hover { background: #5aadff; }
    .btn.secondary { background: #333; color: #e0e0e0; }
    .btn.secondary:hover { background: #444; }
    .btn.danger { background: #d32f2f; }
    .btn.danger:hover { background: #e53935; }

    .table-wrapper {
      flex: 1; overflow: auto; border: 1px solid #333; border-radius: 6px; background: #1a1a1a;
    }

    table {
      width: 100%; border-collapse: collapse; font-size: 12px;
    }

    thead { background: #222; position: sticky; top: 0; }
    th {
      padding: 10px 12px; text-align: left; font-weight: 600; border-bottom: 1px solid #333;
      cursor: pointer; user-select: none; white-space: nowrap;
    }
    th:hover { background: #2a2a2a; }
    th.sortable::after { content: " ↕"; color: #666; }
    th.asc::after { content: " ↑"; color: #4a9eff; }
    th.desc::after { content: " ↓"; color: #4a9eff; }

    tbody tr { border-bottom: 1px solid #2a2a2a; }
    tbody tr:hover { background: #1f1f1f; }
    td {
      padding: 10px 12px;
    }

    .null-value { color: #666; font-style: italic; }
    .row-actions { display: flex; gap: 4px; }
    .row-actions button { padding: 2px 6px; font-size: 10px; }

    .pagination {
      display: flex; gap: 8px; align-items: center; margin-top: 16px; justify-content: center;
    }
    .pagination input { width: 50px; padding: 4px 6px; background: #222; border: 1px solid #333; color: #e0e0e0; }

    .detail-panel {
      width: 350px; border-left: 1px solid #333; background: #1a1a1a; padding: 20px; overflow-y: auto;
      display: none;
    }
    .detail-panel.active { display: block; }

    .detail-panel h3 { margin-bottom: 12px; font-size: 14px; }
    .detail-json {
      background: #222; padding: 12px; border-radius: 4px; font-family: monospace;
      font-size: 11px; overflow-x: auto; max-height: 300px; overflow-y: auto;
    }

    .modal {
      display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8); z-index: 1000; align-items: center; justify-content: center;
    }
    .modal.active { display: flex; }

    .modal-content {
      background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 24px;
      max-width: 500px; width: 90%;
    }
    .modal-content h2 { margin-bottom: 16px; font-size: 16px; }
    .modal-content label { display: block; margin-bottom: 4px; font-size: 12px; }
    .modal-content input {
      width: 100%; padding: 8px; margin-bottom: 12px; background: #222; border: 1px solid #333;
      color: #e0e0e0; border-radius: 4px; font-size: 12px;
    }
    .modal-actions { display: flex; gap: 8px; margin-top: 16px; justify-content: flex-end; }

    .no-table-msg { text-align: center; color: #666; padding: 40px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="sidebar">
      <h2>📊 Tables</h2>
      <div class="sidebar-section" id="table-list">
        ${tableList}
      </div>

      <h2>📈 Stats</h2>
      <div class="stats">
        <div class="stat-row">
          <span class="stat-label">Tables</span>
          <span class="stat-value">${tableStats.length}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Total Rows</span>
          <span class="stat-value" id="total-rows">${tableStats.reduce((sum, t) => sum + t.count, 0)}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">DB Size</span>
          <span class="stat-value">${dbSizeKb} KB</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Last Modified</span>
          <span class="stat-value" style="font-size: 10px;">${new Date(dbModified).toLocaleString()}</span>
        </div>
      </div>
    </div>

    <div class="main">
      <div class="header">
        <h1 id="current-table">Database Inspector</h1>
        <div class="header-actions">
          <button class="btn secondary" id="insert-btn" style="display:none;">+ Insert</button>
          <span style="color: #666; font-size: 12px;">NODE_ENV = development</span>
        </div>
      </div>

      <div class="content">
        <div class="browser">
          <div class="toolbar" id="toolbar" style="display:none;">
            <div class="filter-group">
              <select id="filter-col">
                <option value="">Filter by...</option>
              </select>
              <input type="text" id="filter-val" placeholder="value">
              <button class="btn secondary" id="filter-btn">Apply</button>
              <button class="btn secondary" id="clear-filter-btn">Clear</button>
            </div>
          </div>

          <div class="table-wrapper" id="table-wrapper" style="display:none;">
            <table id="data-table">
              <thead id="table-head"></thead>
              <tbody id="table-body"></tbody>
            </table>
          </div>

          <div id="pagination" class="pagination" style="display:none;"></div>

          <div class="no-table-msg" id="no-table-msg">← Select a table to start</div>
        </div>

        <div class="detail-panel" id="detail-panel">
          <h3>Record Details</h3>
          <div class="detail-json" id="detail-json"></div>
          <button class="btn" id="edit-btn" style="margin-top: 12px; width: 100%;">Edit</button>
          <button class="btn danger" id="delete-btn" style="margin-top: 8px; width: 100%;">Delete</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Insert/Edit Modal -->
  <div class="modal" id="edit-modal">
    <div class="modal-content">
      <h2 id="edit-title">Insert Record</h2>
      <form id="edit-form"></form>
      <div class="modal-actions">
        <button class="btn secondary" onclick="closeEditModal()">Cancel</button>
        <button class="btn" onclick="submitEdit()">Save</button>
      </div>
    </div>
  </div>

  <!-- Delete Confirmation Modal -->
  <div class="modal" id="delete-modal">
    <div class="modal-content">
      <h2>Delete Record?</h2>
      <p style="margin-bottom: 16px; color: #aaa;">This action cannot be undone.</p>
      <div class="modal-actions">
        <button class="btn secondary" onclick="closeDeleteModal()">Cancel</button>
        <button class="btn danger" onclick="confirmDelete()">Delete</button>
      </div>
    </div>
  </div>

  <script>
    const API_BASE = "/admin/db/api";
    const state = {
      currentTable: null,
      currentPage: 1,
      pageSize: 25,
      sortColumn: null,
      sortDir: "ASC",
      filterCol: null,
      filterVal: null,
      selectedRecord: null,
      editingRecord: null,
    };

    // Initialize
    document.querySelectorAll(".table-item").forEach(el => {
      el.addEventListener("click", () => selectTable(el.getAttribute("data-table")));
    });

    document.getElementById("insert-btn").addEventListener("click", openInsertModal);
    document.getElementById("filter-btn").addEventListener("click", applyFilter);
    document.getElementById("clear-filter-btn").addEventListener("click", clearFilter);

    async function selectTable(tableName) {
      state.currentTable = tableName;
      state.currentPage = 1;
      state.sortColumn = null;
      state.filterCol = null;
      state.filterVal = null;

      // Update active state
      document.querySelectorAll(".table-item").forEach(el => el.classList.remove("active"));
      document.querySelector(\`.table-item[data-table="\${tableName}"]\`).classList.add("active");

      // Update header
      document.getElementById("current-table").textContent = tableName;
      document.getElementById("insert-btn").style.display = "block";
      document.getElementById("no-table-msg").style.display = "none";
      document.getElementById("toolbar").style.display = "flex";
      document.getElementById("table-wrapper").style.display = "block";

      // Fetch schema
      const schema = await fetch(\`\${API_BASE}/table/\${tableName}/schema\`).then(r => r.json());

      // Build filter dropdown
      const filterSelect = document.getElementById("filter-col");
      filterSelect.innerHTML = '<option value="">Filter by...</option>';
      schema.forEach(col => {
        const opt = document.createElement("option");
        opt.value = col.name;
        opt.textContent = col.name;
        filterSelect.appendChild(opt);
      });

      // Fetch and display rows
      await loadRows();
    }

    async function loadRows() {
      const params = new URLSearchParams({
        page: state.currentPage,
        pageSize: state.pageSize,
        ...(state.sortColumn && { sort: state.sortColumn, dir: state.sortDir }),
        ...(state.filterCol && { filterCol: state.filterCol, filterVal: state.filterVal })
      });

      const data = await fetch(\`\${API_BASE}/table/\${state.currentTable}/rows?\${params}\`).then(r => r.json());
      const schema = await fetch(\`\${API_BASE}/table/\${state.currentTable}/schema\`).then(r => r.json());

      // Build table header
      const thead = document.getElementById("table-head");
      const headerCells = schema.map(col => \`
        <th class="sortable" onclick="toggleSort('\${col.name}')">
          \${col.name}
        </th>
      \`).join("");
      thead.innerHTML = headerCells + '<th>Actions</th>';

      // Build table rows
      const tbody = document.getElementById("table-body");
      tbody.innerHTML = data.rows.map(row => {
        const pkCol = schema.find(c => c.pk === 1);
        const pkValue = row[pkCol.name];
        return \`
          <tr onclick="selectRecord(\${JSON.stringify(row).replace(/"/g, '&quot;')})">
            \${schema.map(col => \`
              <td>\${row[col.name] === null ? '<span class="null-value">null</span>' : escapeHtml(String(row[col.name]))}</td>
            \`).join("")}
            <td onclick="event.stopPropagation();">
              <div class="row-actions">
                <button class="btn secondary" onclick="openEditModal(\${JSON.stringify(row).replace(/"/g, '&quot;')})">Edit</button>
                <button class="btn danger" onclick="openDeleteModal('\${pkValue}')">Del</button>
              </div>
            </td>
          </tr>
        \`;
      }).join("");

      // Pagination
      const paginationEl = document.getElementById("pagination");
      paginationEl.innerHTML = \`
        <button class="btn secondary" onclick="previousPage()" \${state.currentPage === 1 ? 'disabled' : ''}>← Prev</button>
        <span>Page <input type="number" id="page-input" value="\${state.currentPage}" min="1" max="\${data.pages}" style="width: 40px;"> of \${data.pages}</span>
        <button class="btn secondary" onclick="nextPage()" \${state.currentPage === data.pages ? 'disabled' : ''}>Next →</button>
      \`;

      document.getElementById("page-input").addEventListener("change", (e) => {
        state.currentPage = Math.max(1, Math.min(parseInt(e.target.value), data.pages));
        loadRows();
      });
    }

    function selectRecord(record) {
      state.selectedRecord = record;
      const detailPanel = document.getElementById("detail-panel");
      detailPanel.classList.add("active");
      document.getElementById("detail-json").textContent = JSON.stringify(record, null, 2);
    }

    function toggleSort(column) {
      if (state.sortColumn === column) {
        state.sortDir = state.sortDir === "ASC" ? "DESC" : "ASC";
      } else {
        state.sortColumn = column;
        state.sortDir = "ASC";
      }
      state.currentPage = 1;
      loadRows();
    }

    function applyFilter() {
      const col = document.getElementById("filter-col").value;
      const val = document.getElementById("filter-val").value;
      if (col && val) {
        state.filterCol = col;
        state.filterVal = val;
        state.currentPage = 1;
        loadRows();
      }
    }

    function clearFilter() {
      state.filterCol = null;
      state.filterVal = null;
      document.getElementById("filter-col").value = "";
      document.getElementById("filter-val").value = "";
      state.currentPage = 1;
      loadRows();
    }

    function previousPage() {
      if (state.currentPage > 1) {
        state.currentPage--;
        loadRows();
      }
    }

    function nextPage() {
      state.currentPage++;
      loadRows();
    }

    async function openInsertModal() {
      state.editingRecord = null;
      const schema = await fetch(\`\${API_BASE}/table/\${state.currentTable}/schema\`).then(r => r.json());
      buildEditForm(schema, null);
      document.getElementById("edit-title").textContent = "Insert Record";
      document.getElementById("edit-modal").classList.add("active");
    }

    async function openEditModal(record) {
      state.editingRecord = record;
      const schema = await fetch(\`\${API_BASE}/table/\${state.currentTable}/schema\`).then(r => r.json());
      buildEditForm(schema, record);
      document.getElementById("edit-title").textContent = "Edit Record";
      document.getElementById("edit-modal").classList.add("active");
    }

    function buildEditForm(schema, record) {
      const form = document.getElementById("edit-form");
      form.innerHTML = schema.map(col => {
        const value = record ? record[col.name] : "";
        const isReadonly = col.pk === 1 && record; // PK fields are readonly on edit
        return \`
          <label>\${col.name}</label>
          <input type="text" name="\${col.name}" value="\${value === null ? "" : escapeHtml(String(value))}" \${isReadonly ? 'readonly' : ''} />
        \`;
      }).join("");
    }

    async function submitEdit() {
      const form = document.getElementById("edit-form");
      const data = new FormData(form);
      const record = {};
      data.forEach((val, key) => {
        record[key] = val === "" ? null : val;
      });

      try {
        const pkCol = Object.keys(state.editingRecord || record)[0]; // Rough guess, should be from schema
        const method = state.editingRecord ? "PATCH" : "POST";
        const url = state.editingRecord
          ? \`\${API_BASE}/table/\${state.currentTable}/row/\${state.editingRecord[pkCol]}\`
          : \`\${API_BASE}/table/\${state.currentTable}/row\`;

        await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record)
        });

        closeEditModal();
        loadRows();
      } catch (err) {
        alert("Error: " + err.message);
      }
    }

    function closeEditModal() {
      document.getElementById("edit-modal").classList.remove("active");
    }

    function openDeleteModal(id) {
      state.deleteId = id;
      document.getElementById("delete-modal").classList.add("active");
    }

    async function confirmDelete() {
      try {
        await fetch(\`\${API_BASE}/table/\${state.currentTable}/row/\${state.deleteId}\`, {
          method: "DELETE"
        });
        closeDeleteModal();
        loadRows();
        state.selectedRecord = null;
        document.getElementById("detail-panel").classList.remove("active");
      } catch (err) {
        alert("Error: " + err.message);
      }
    }

    function closeDeleteModal() {
      document.getElementById("delete-modal").classList.remove("active");
    }

    function escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  </script>
</body>
</html>`;
}

module.exports = router;
