// ═══════════════════════════════════════════════════════
//  Admin Dashboard — logs in with phone + email (ID "00" rows
//  only), then pulls a full read-only dump of both sheets.
// ═══════════════════════════════════════════════════════

const TRACK_LABELS = {
  '01': 'Psychology',
  '02': 'Sales',
  '03': 'Commodity',
  '04': 'Accounts',
};

// Which "main test" TestType value corresponds to each track,
// so the funnel summary can count completions correctly.
const TRACK_MAIN_TEST = {
  '01': 'psychology',
  '02': 'sales',
  '03': 'commodity',
  '04': 'accounts',
};
const TRACKS_WITH_APTITUDE_GATE = ['02', '03'];

let ALL_CANDIDATES = [];
let ALL_RESULTS = [];
let ADMIN_IDENTITY = null;

function el(id) { return document.getElementById(id); }

function showDenied(message) {
  document.getElementById('app-root').innerHTML = `
    <div class="result-wrap">
      <div class="result-card blocked-card">
        <div class="result-icon">🚫</div>
        <div class="result-title" style="color:var(--red)">Access Denied</div>
        <div class="result-sub">${message}</div>
      </div>
    </div>`;
}

async function init() {
  ADMIN_IDENTITY = Candidate.load();
  if (!ADMIN_IDENTITY || !ADMIN_IDENTITY.phone || ADMIN_IDENTITY.id !== '00') {
    window.location.href = 'index.html';
    return;
  }

  try {
    const data = await Api.get({ action: 'adminData', phone: ADMIN_IDENTITY.phone, email: ADMIN_IDENTITY.email });
    if (data.status !== 'ok') {
      showDenied('Your admin login could not be verified. Please log in again from the home page.');
      return;
    }
    ALL_CANDIDATES = data.candidates;
    ALL_RESULTS = data.results;
    renderDashboard();
  } catch (e) {
    showDenied('Could not reach the server. Check your connection and refresh.');
  }
}

function renderDashboard() {
  document.getElementById('app-root').innerHTML = `
    <div class="admin-page">
      <div class="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p class="muted">Logged in as ${ADMIN_IDENTITY.email}</p>
        </div>
        <button class="btn-primary secondary" id="btn-logout" style="margin-top:0;width:auto;padding:10px 18px;">Log out</button>
      </div>

      <h2 class="section-title">Track Summary</h2>
      <div id="funnel-grid" class="funnel-grid"></div>

      <h2 class="section-title">Candidates</h2>
      <div class="filter-row">
        <select id="filter-track"><option value="">All Tracks</option></select>
        <input type="text" id="filter-phone" placeholder="Search phone…">
      </div>
      <div class="table-wrap"><table class="data-table" id="candidates-table"></table></div>

      <h2 class="section-title">Results</h2>
      <div class="filter-row">
        <select id="filter-testtype"><option value="">All Test Types</option></select>
        <select id="filter-flag">
          <option value="">All</option>
          <option value="flagged">Flagged only</option>
          <option value="clean">Clean only</option>
        </select>
        <input type="text" id="filter-result-phone" placeholder="Search phone…">
      </div>
      <div class="table-wrap"><table class="data-table" id="results-table"></table></div>
    </div>`;

  document.getElementById('btn-logout').addEventListener('click', () => {
    Candidate.clear();
    window.location.href = 'index.html';
  });

  populateTrackFilterOptions();
  populateTestTypeFilterOptions();

  ['filter-track', 'filter-phone'].forEach(id => el(id).addEventListener('input', renderCandidatesTable));
  ['filter-testtype', 'filter-flag', 'filter-result-phone'].forEach(id => el(id).addEventListener('input', renderResultsTable));

  renderFunnel();
  renderCandidatesTable();
  renderResultsTable();
}

function populateTrackFilterOptions() {
  const sel = el('filter-track');
  Object.keys(TRACK_LABELS).forEach(id => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = `${id} — ${TRACK_LABELS[id]}`;
    sel.appendChild(opt);
  });
}

function populateTestTypeFilterOptions() {
  const sel = el('filter-testtype');
  const types = [...new Set(ALL_RESULTS.map(r => r.testType))].sort();
  types.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    sel.appendChild(opt);
  });
}

// ── Track Summary funnel: how many candidates per track, how many
// passed the aptitude gate (where relevant), how many completed
// their main test.
function renderFunnel() {
  const grid = el('funnel-grid');
  grid.innerHTML = Object.keys(TRACK_LABELS).map(id => {
    const label = TRACK_LABELS[id];
    const trackCandidates = ALL_CANDIDATES.filter(c => c.id === id);
    const total = trackCandidates.length;
    const mainTestType = TRACK_MAIN_TEST[id];
    const completed = ALL_RESULTS.filter(r => r.testType === mainTestType).length;

    let aptitudeLine = '';
    if (TRACKS_WITH_APTITUDE_GATE.includes(id)) {
      const passed = trackCandidates.filter(c => c.aptitudePassed === 'TRUE').length;
      const failed = trackCandidates.filter(c => c.aptitudePassed === 'FALSE').length;
      aptitudeLine = `<div class="funnel-row"><span>Passed aptitude</span><strong>${passed}</strong></div>
                      <div class="funnel-row"><span>Failed aptitude</span><strong>${failed}</strong></div>`;
    }

    return `
      <div class="funnel-card">
        <div class="funnel-title">${id} — ${label}</div>
        <div class="funnel-row"><span>Candidates</span><strong>${total}</strong></div>
        ${aptitudeLine}
        <div class="funnel-row"><span>Completed main test</span><strong>${completed}</strong></div>
      </div>`;
  }).join('');
}

function renderCandidatesTable() {
  const trackFilter = el('filter-track').value;
  const phoneFilter = el('filter-phone').value.trim();

  let rows = ALL_CANDIDATES.slice();
  if (trackFilter) rows = rows.filter(c => c.id === trackFilter);
  if (phoneFilter) rows = rows.filter(c => c.phone.includes(phoneFilter));

  const table = el('candidates-table');
  table.innerHTML = `
    <thead><tr>
      <th>Phone</th><th>Track</th><th>Status</th><th>Aptitude Score</th><th>Aptitude Passed</th><th>Email</th>
    </tr></thead>
    <tbody>
      ${rows.map(c => `
        <tr>
          <td>${c.phone}</td>
          <td>${c.id} — ${TRACK_LABELS[c.id] || 'Unknown'}</td>
          <td>${c.status || '—'}</td>
          <td>${c.aptitudeScore !== '' && c.aptitudeScore != null ? c.aptitudeScore : '—'}</td>
          <td>${c.aptitudePassed || '—'}</td>
          <td>${c.email || '—'}</td>
        </tr>`).join('') || '<tr><td colspan="6" class="muted">No candidates match this filter.</td></tr>'}
    </tbody>`;
}

function renderResultsTable() {
  const testTypeFilter = el('filter-testtype').value;
  const flagFilter = el('filter-flag').value;
  const phoneFilter = el('filter-result-phone').value.trim();

  let rows = ALL_RESULTS.slice();
  if (testTypeFilter) rows = rows.filter(r => r.testType === testTypeFilter);
  if (flagFilter === 'flagged') rows = rows.filter(r => r.flagStatus.includes('FLAGGED'));
  if (flagFilter === 'clean') rows = rows.filter(r => !r.flagStatus.includes('FLAGGED'));
  if (phoneFilter) rows = rows.filter(r => r.phone.includes(phoneFilter));

  rows.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const table = el('results-table');
  table.innerHTML = `
    <thead><tr>
      <th>Submitted</th><th>Phone</th><th>Name</th><th>Email</th><th>Test</th><th>Score</th><th>%</th><th>Time</th><th>Violations</th><th>Flag</th><th>Reason</th>
    </tr></thead>
    <tbody>
      ${rows.map(r => `
        <tr class="${r.flagStatus.includes('FLAGGED') ? 'row-flagged' : ''}">
          <td>${new Date(r.timestamp).toLocaleString()}</td>
          <td>${r.phone}</td>
          <td>${r.name}</td>
          <td>${r.email}</td>
          <td>${r.testType}</td>
          <td>${r.score}/${r.total}</td>
          <td>${r.percent}%</td>
          <td>${r.timeTaken}</td>
          <td>${r.violations}</td>
          <td>${r.flagStatus}</td>
          <td>${r.reason}</td>
        </tr>`).join('') || '<tr><td colspan="11" class="muted">No results match this filter.</td></tr>'}
    </tbody>`;
}

init();