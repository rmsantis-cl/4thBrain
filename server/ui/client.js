// Client-side JS for the Story 6.4 shell. Mocked: every fetch() here hits a stub
// route that returns canned data (see server/routes/*.js) — no real ingestion,
// status, or Ollama call happens yet. See ui/plan.md.
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
    showResult(fileResult, 'Uploading …');
    fetch('/api/ingest/file', { method: 'POST', body: formData })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        showResult(fileResult, 'Mocked — ' + data.message + ' (jobId ' + data.jobId + ')');
      })
      .catch(function () { showResult(fileResult, 'Upload failed.'); });
  }

  // ---- Add text ----
  var textForm = document.getElementById('text-form');
  var textResult = document.getElementById('text-result');
  textForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = document.getElementById('text-input').value;
    if (!text.trim()) return;
    showResult(textResult, 'Submitting …');
    fetch('/api/ingest/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        showResult(textResult, 'Mocked — ' + data.message + ' (jobId ' + data.jobId + ')');
        document.getElementById('text-input').value = '';
      })
      .catch(function () { showResult(textResult, 'Submit failed.'); });
  });

  // ---- Add url ----
  var urlForm = document.getElementById('url-form');
  var urlResult = document.getElementById('url-result');
  urlForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var url = document.getElementById('url-input').value;
    if (!url.trim()) return;
    showResult(urlResult, 'Submitting …');
    fetch('/api/ingest/url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        showResult(urlResult, 'Mocked — ' + data.message + ' (jobId ' + data.jobId + ')');
        document.getElementById('url-input').value = '';
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

        thead.innerHTML = '';
        schema.forEach(function (col) {
          var th = document.createElement('th');
          th.textContent = col.name;
          thead.appendChild(th);
        });

        tbody.innerHTML = '';
        data.rows.forEach(function (row) {
          var tr = document.createElement('tr');
          schema.forEach(function (col) {
            var td = document.createElement('td');
            var val = row[col.name];
            td.textContent = val === null ? '(null)' : String(val);
            tr.appendChild(td);
          });
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

  // Load tables on init
  loadTables();
})();
`;

module.exports = CLIENT_JS;
