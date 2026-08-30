// Client-side JS for the Story 6.4 shell. Ingestion (file/text/url) is wired
// to real endpoints as of Story 6.1 â€” status and Ollama chat are still mocked.
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
      if (!target) return;
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
    showResult(fileResult, 'Uploading â€¦');
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
    showResult(textResult, 'Submitting â€¦');
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
    showResult(urlResult, 'Submitting â€¦');
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
    statusGrid.innerHTML = '<div class="stat-card"><div class="label">Loadingâ€¦</div></div>';
    fetch('/api/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then(function (res) { return res.json(); })
      .then(renderStatus)
      .catch(function () { statusGrid.innerHTML = '<div class="stat-card"><div class="label">Failed to load</div></div>'; });
  }

  var jobsGrid = document.getElementById('jobs-grid');
  var jobsFailed = document.getElementById('jobs-failed');

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

    var jobs = data.jobs || { counts: { active: 0, pending: 0, failed: 0, completed: 0 }, failed: [] };
    var c = jobs.counts;
    jobsGrid.innerHTML =
      '<div class="stat-card missing"><div class="label">Active</div><div class="value">' + c.active + '</div></div>' +
      '<div class="stat-card"><div class="label">Pending</div><div class="value">' + c.pending + '</div></div>' +
      '<div class="stat-card skipped"><div class="label">Failed</div><div class="value">' + c.failed + '</div></div>' +
      '<div class="stat-card current"><div class="label">Completed</div><div class="value">' + c.completed + '</div></div>';

    jobsFailed.innerHTML = '';
    (jobs.failed || []).forEach(function (job) {
      var div = document.createElement('div');
      div.className = 'skip-item';
      div.innerHTML =
        '<div class="path">Job #' + job.id + ' (' + job.jobType + ')</div>' +
        '<div class="reason">' + job.reason + '</div>';
      var retryBtn = document.createElement('button');
      retryBtn.className = 'btn secondary';
      retryBtn.type = 'button';
      retryBtn.textContent = 'Retry';
      retryBtn.style.marginTop = '6px';
      retryBtn.addEventListener('click', function () { retryJob(job.id); });
      div.appendChild(retryBtn);
      jobsFailed.appendChild(div);
    });
  }

  function retryJob(jobId) {
    fetch('/api/status/retry/' + jobId, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then(function (res) { return res.json(); })
      .then(function () { loadStatus(); })
      .catch(function () { loadStatus(); });
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
    var thinking = addBubble(llamaWindow, 'Thinkingâ€¦', 'thinking');

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

})();
`;

module.exports = CLIENT_JS;
