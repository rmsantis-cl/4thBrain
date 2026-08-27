// Client-side JS for the Story 6.4 shell. Ingestion (file/text/url) is wired
// to real endpoints as of Story 6.1 — status and Ollama chat are still mocked.
// See ui/plan.md.
const CLIENT_JS = `
(function () {
  var sidebar = document.querySelector('.sidebar');
  var backdrop = document.querySelector('.backdrop');
  var menuBtn = document.querySelector('.menu-btn');

  function openSidebar() { sidebar.classList.add('open'); backdrop.classList.add('open'); }
  function closeSidebar() { sidebar.classList.remove('open'); backdrop.classList.remove('open'); }
  menuBtn.addEventListener('click', function () {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  backdrop.addEventListener('click', closeSidebar);

  var navItems = document.querySelectorAll('.nav-item');
  var panels = document.querySelectorAll('.panel');
  navItems.forEach(function (item) {
    item.addEventListener('click', function () {
      var target = item.getAttribute('data-panel');
      navItems.forEach(function (n) { n.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      item.classList.add('active');
      document.getElementById('panel-' + target).classList.add('active');
      closeSidebar();
    });
  });

  function showResult(el, message) {
    el.textContent = message;
    el.classList.add('visible');
  }

  // ---- Add file ----
  var dropzone = document.getElementById('dropzone');
  var fileInput = document.getElementById('file-input');
  var fileTagsInput = document.getElementById('file-tags-input');
  var fileResult = document.getElementById('file-result');

  dropzone.addEventListener('click', function () { fileInput.click(); });
  dropzone.addEventListener('dragover', function (e) { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', function () { dropzone.classList.remove('dragover'); });
  dropzone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length) uploadFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', function () {
    if (fileInput.files.length) uploadFile(fileInput.files[0]);
  });

  function uploadFile(file) {
    var formData = new FormData();
    formData.append('file', file);
    formData.append('tags', fileTagsInput.value);
    showResult(fileResult, 'Uploading …');
    fetch('/api/ingest/file', { method: 'POST', body: formData })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        showResult(fileResult, data.message + ' (jobId ' + data.jobId + ')');
        fileTagsInput.value = '';
      })
      .catch(function () { showResult(fileResult, 'Upload failed.'); });
  }

  // ---- Add text ----
  var textForm = document.getElementById('text-form');
  var textTagsInput = document.getElementById('text-tags-input');
  var textResult = document.getElementById('text-result');
  textForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = document.getElementById('text-input').value;
    if (!text.trim()) return;
    showResult(textResult, 'Submitting …');
    fetch('/api/ingest/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text, tags: textTagsInput.value }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        showResult(textResult, data.message + ' (jobId ' + data.jobId + ')');
        document.getElementById('text-input').value = '';
        textTagsInput.value = '';
      })
      .catch(function () { showResult(textResult, 'Submit failed.'); });
  });

  // ---- Add url ----
  var urlForm = document.getElementById('url-form');
  var urlTagsInput = document.getElementById('url-tags-input');
  var urlResult = document.getElementById('url-result');
  urlForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var url = document.getElementById('url-input').value;
    if (!url.trim()) return;
    showResult(urlResult, 'Submitting …');
    fetch('/api/ingest/url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url, tags: urlTagsInput.value }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        showResult(urlResult, data.message + ' (jobId ' + data.jobId + ')');
        document.getElementById('url-input').value = '';
        urlTagsInput.value = '';
      })
      .catch(function () { showResult(urlResult, 'Submit failed.'); });
  });

  // ---- Ingest status ----
  var statusRefreshBtn = document.getElementById('status-refresh');
  var statusGrid = document.getElementById('status-grid');
  var statusSkipped = document.getElementById('status-skipped');

  function loadStatus() {
    statusGrid.innerHTML = '<div class="stat-card"><div class="label">Loading…</div></div>';
    fetch('/api/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then(function (res) { return res.json(); })
      .then(renderStatus)
      .catch(function () { statusGrid.innerHTML = '<div class="stat-card"><div class="label">Failed to load</div></div>'; });
  }

  function renderStatus(data) {
    var s = data.sources;
    statusGrid.innerHTML =
      '<div class="stat-card current"><div class="label">Current</div><div class="value">' + s.current + '</div></div>' +
      '<div class="stat-card missing"><div class="label">Missing</div><div class="value">' + s.missing + '</div></div>' +
      '<div class="stat-card skipped"><div class="label">Skipped</div><div class="value">' + s.skipped + '</div></div>' +
      '<div class="stat-card"><div class="label">Unexpected</div><div class="value">' + s.unexpected + '</div></div>';

    statusSkipped.innerHTML = '';
    (data.skippedSources || []).forEach(function (item) {
      var div = document.createElement('div');
      div.className = 'skip-item';
      div.innerHTML = '<div class="path">' + item.path + '</div><div class="reason">' + item.reason + '</div>';
      statusSkipped.appendChild(div);
    });
  }

  statusRefreshBtn.addEventListener('click', loadStatus);
  loadStatus();

  // ---- Chat with Llama ----
  var llamaForm = document.getElementById('llama-form');
  var llamaInput = document.getElementById('llama-input');
  var llamaWindow = document.getElementById('llama-window');
  var llamaHistory = [];

  function addBubble(container, text, cls) {
    var div = document.createElement('div');
    div.className = 'bubble ' + cls;
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  }

  llamaForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = llamaInput.value.trim();
    if (!msg) return;
    addBubble(llamaWindow, msg, 'user');
    llamaHistory.push({ role: 'user', content: msg });
    llamaInput.value = '';
    llamaInput.disabled = true;
    var thinking = addBubble(llamaWindow, 'Thinking…', 'thinking');

    fetch('/api/chat/llama', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, history: llamaHistory }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        thinking.remove();
        addBubble(llamaWindow, data.reply, 'assistant');
        llamaHistory.push({ role: 'assistant', content: data.reply });
      })
      .catch(function () {
        thinking.remove();
        addBubble(llamaWindow, 'Error reaching the chat endpoint.', 'assistant');
      })
      .finally(function () {
        llamaInput.disabled = false;
        llamaInput.focus();
      });
  });

  // ---- Admin panel ----
  var adminCloseBtn = document.getElementById('admin-close');
  adminCloseBtn.addEventListener('click', function () {
    var defaultNavItem = navItems[0];
    navItems.forEach(function (n) { n.classList.remove('active'); });
    panels.forEach(function (p) { p.classList.remove('active'); });
    defaultNavItem.classList.add('active');
    document.getElementById('panel-' + defaultNavItem.getAttribute('data-panel')).classList.add('active');
  });

  var adminTitleText = document.getElementById('admin-title-text');
  var adminMenu = document.getElementById('admin-menu');
  adminTitleText.addEventListener('click', function () {
    adminMenu.classList.toggle('collapsed');
  });

  var adminMenuItems = document.querySelectorAll('.admin-menu-item');
  var adminSections = document.querySelectorAll('.admin-section');
  var tableSelect = document.getElementById('table-select');
  var tableContainer = document.querySelector('.table-container');
  var adminState = { currentTable: null, currentPage: 1, editingRecord: null, deleteId: null, deletePkCol: null };

  adminMenuItems.forEach(function (item) {
    item.addEventListener('click', function () {
      var target = item.getAttribute('data-admin-section');
      adminMenuItems.forEach(function (m) { m.classList.remove('active'); });
      adminSections.forEach(function (s) { s.classList.remove('active'); });
      item.classList.add('active');
      document.querySelector('[data-section="' + target + '"]').classList.add('active');
    });
  });

  // Load tables on page load
  function loadTables() {
    fetch('/admin/db/api/tables')
      .then(function (res) { return res.json(); })
      .then(function (tables) {
        tableSelect.innerHTML = '<option value="">— Select a table —</option>';
        tables.forEach(function (t) {
          var opt = document.createElement('option');
          opt.value = t.name;
          opt.textContent = t.name + ' (' + t.count + ' rows)';
          tableSelect.appendChild(opt);
        });
      })
      .catch(function (err) { console.error('Failed to load tables:', err); });
  }

  tableSelect.addEventListener('change', function () {
    if (!tableSelect.value) {
      tableContainer.style.display = 'none';
      return;
    }
    loadTableRows(tableSelect.value, 1);
  });

  function loadTableRows(tableName, page) {
    adminState.currentTable = tableName;
    adminState.currentPage = page;
    var params = new URLSearchParams({ page: page, pageSize: 25 });
    fetch('/admin/db/api/table/' + tableName + '/rows?' + params)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        renderTable(tableName, data);
        tableContainer.style.display = 'flex';
      })
      .catch(function (err) { console.error('Failed to load rows:', err); });
  }

  function renderTable(tableName, data) {
    fetch('/admin/db/api/table/' + tableName + '/schema')
      .then(function (res) { return res.json(); })
      .then(function (schema) {
        var thead = document.getElementById('admin-table-head');
        var tbody = document.getElementById('admin-table-body');
        var pkCol = schema.find(function (c) { return c.pk === 1; });

        thead.innerHTML = '';
        schema.forEach(function (col) {
          var th = document.createElement('th');
          th.textContent = col.name;
          thead.appendChild(th);
        });
        var actionsTh = document.createElement('th');
        actionsTh.textContent = 'Actions';
        thead.appendChild(actionsTh);

        tbody.innerHTML = '';
        data.rows.forEach(function (row) {
          var tr = document.createElement('tr');
          schema.forEach(function (col) {
            var td = document.createElement('td');
            var val = row[col.name];
            td.textContent = val === null ? '(null)' : String(val);
            tr.appendChild(td);
          });

          var actionsTd = document.createElement('td');
          actionsTd.className = 'admin-row-actions';

          var editBtn = document.createElement('button');
          editBtn.className = 'btn secondary';
          editBtn.type = 'button';
          editBtn.textContent = 'Edit';
          editBtn.addEventListener('click', function () { openRowModal(schema, row); });
          actionsTd.appendChild(editBtn);

          var delBtn = document.createElement('button');
          delBtn.className = 'btn danger';
          delBtn.type = 'button';
          delBtn.textContent = 'Delete';
          delBtn.addEventListener('click', function () {
            adminState.deleteId = pkCol ? row[pkCol.name] : null;
            adminState.deletePkCol = pkCol ? pkCol.name : null;
            document.getElementById('admin-delete-modal').classList.add('active');
          });
          actionsTd.appendChild(delBtn);

          tr.appendChild(actionsTd);
          tbody.appendChild(tr);
        });

        var pagination = document.getElementById('table-pagination');
        pagination.innerHTML = '';
        if (data.pages > 1) {
          var prevBtn = document.createElement('button');
          prevBtn.className = 'btn secondary';
          prevBtn.textContent = '← Prev';
          prevBtn.disabled = data.page === 1;
          prevBtn.addEventListener('click', function () {
            if (data.page > 1) loadTableRows(tableName, data.page - 1);
          });
          pagination.appendChild(prevBtn);

          var pageInfo = document.createElement('span');
          pageInfo.textContent = 'Page ' + data.page + ' of ' + data.pages;
          pagination.appendChild(pageInfo);

          var nextBtn = document.createElement('button');
          nextBtn.className = 'btn secondary';
          nextBtn.textContent = 'Next →';
          nextBtn.disabled = data.page === data.pages;
          nextBtn.addEventListener('click', function () {
            if (data.page < data.pages) loadTableRows(tableName, data.page + 1);
          });
          pagination.appendChild(nextBtn);
        }
      });
  }

  // ---- Admin panel: add/edit/delete row ----
  var adminInsertBtn = document.getElementById('admin-insert-btn');
  var adminRowModal = document.getElementById('admin-row-modal');
  var adminRowForm = document.getElementById('admin-row-form');
  var adminRowModalTitle = document.getElementById('admin-row-modal-title');
  var adminDeleteModal = document.getElementById('admin-delete-modal');

  adminInsertBtn.addEventListener('click', function () {
    if (!adminState.currentTable) return;
    fetch('/admin/db/api/table/' + adminState.currentTable + '/schema')
      .then(function (res) { return res.json(); })
      .then(function (schema) { openRowModal(schema, null); });
  });

  function openRowModal(schema, record) {
    adminState.editingRecord = record;
    var pkCol = schema.find(function (c) { return c.pk === 1; });
    adminState.editingPk = pkCol ? pkCol.name : null;
    adminRowModalTitle.textContent = record ? 'Edit row' : 'Add row';
    adminRowForm.innerHTML = schema.map(function (col) {
      var value = record ? record[col.name] : '';
      var readonly = col.pk === 1 && record;
      var displayValue = value === null || value === undefined ? '' : String(value);
      return '<label>' + col.name + '</label>' +
        '<input type="text" name="' + col.name + '" value="' + escapeAttr(displayValue) + '"' + (readonly ? ' readonly' : '') + '>';
    }).join('');
    adminRowModal.classList.add('active');
  }

  function escapeAttr(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/"/g, '&quot;');
  }

  document.getElementById('admin-row-cancel').addEventListener('click', function () {
    adminRowModal.classList.remove('active');
  });

  document.getElementById('admin-row-save').addEventListener('click', function () {
    var formData = new FormData(adminRowForm);
    var record = {};
    formData.forEach(function (val, key) { record[key] = val === '' ? null : val; });

    var editing = adminState.editingRecord;
    var method = editing ? 'PATCH' : 'POST';
    var url = editing
      ? '/admin/db/api/table/' + adminState.currentTable + '/row/' + editing[adminState.editingPk]
      : '/admin/db/api/table/' + adminState.currentTable + '/row';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    })
      .then(function (res) { return res.json(); })
      .then(function (result) {
        if (result.error) { alert('Error: ' + result.error); return; }
        adminRowModal.classList.remove('active');
        loadTableRows(adminState.currentTable, adminState.currentPage);
      })
      .catch(function (err) { alert('Error: ' + err.message); });
  });

  document.getElementById('admin-delete-cancel').addEventListener('click', function () {
    adminDeleteModal.classList.remove('active');
  });

  document.getElementById('admin-delete-confirm').addEventListener('click', function () {
    if (adminState.deleteId === null) { adminDeleteModal.classList.remove('active'); return; }
    fetch('/admin/db/api/table/' + adminState.currentTable + '/row/' + adminState.deleteId, { method: 'DELETE' })
      .then(function (res) { return res.json(); })
      .then(function (result) {
        adminDeleteModal.classList.remove('active');
        if (result.error) { alert('Error: ' + result.error); return; }
        loadTableRows(adminState.currentTable, adminState.currentPage);
      })
      .catch(function (err) {
        adminDeleteModal.classList.remove('active');
        alert('Error: ' + err.message);
      });
  });

  // Load tables on init
  loadTables();
})();
`;

module.exports = CLIENT_JS;
