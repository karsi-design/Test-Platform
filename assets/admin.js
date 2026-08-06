// // ═══════════════════════════════════════════════════════
// //  Admin Dashboard — logs in with phone + email (ID "00" rows
// //  only), then pulls a full read-only dump of both sheets.
// // ═══════════════════════════════════════════════════════

// const TRACK_LABELS = {
//   '01': 'Psychology',
//   '02': 'Sales',
//   '03': 'Commodity',
//   '04': 'Accounts',
//   '05': 'Commodity (NISM 8+16)',
// };

// const TRACK_MAIN_TEST = {
//   '01': 'psychology',
//   '02': 'sales',
//   '03': 'commodity',
//   '04': 'accounts',
//   '05': 'commodity2',
// };
// const TRACKS_WITH_APTITUDE_GATE = ['02', '03', '05'];

// let ALL_CANDIDATES = [];
// let ALL_RESULTS = [];
// let ADMIN_IDENTITY = null;

// function el(id) { return document.getElementById(id); }

// function showDenied(message) {
//   document.getElementById('app-root').innerHTML = `
//     <div class="result-wrap">
//       <div class="result-card blocked-card">
//         <div class="result-icon">🚫</div>
//         <div class="result-title" style="color:var(--red)">Access Denied</div>
//         <div class="result-sub">${message}</div>
//       </div>
//     </div>`;
// }

// async function init() {
//   ADMIN_IDENTITY = Candidate.load();
//   if (!ADMIN_IDENTITY || !ADMIN_IDENTITY.phone || ADMIN_IDENTITY.id !== '00') {
//     window.location.href = 'index.html';
//     return;
//   }

//   try {
//     const data = await Api.get({ action: 'adminData', phone: ADMIN_IDENTITY.phone, email: ADMIN_IDENTITY.email });
//     if (data.status !== 'ok') {
//       showDenied('Your admin login could not be verified. Please log in again from the home page.');
//       return;
//     }
//     ALL_CANDIDATES = data.candidates;
//     ALL_RESULTS = data.results;
//     renderDashboard();
//   } catch (e) {
//     showDenied('Could not reach the server. Check your connection and refresh.');
//   }
// }

// function renderDashboard() {
//   document.getElementById('app-root').innerHTML = `
//     <div class="admin-page">
//       <div class="admin-header">
//         <div>
//           <h1>Admin Dashboard</h1>
//           <p class="muted">Logged in as ${ADMIN_IDENTITY.email}</p>
//         </div>
//         <button class="btn-ghost" id="btn-logout">Log out</button>
//       </div>

//       <h2 class="section-title">Track Summary</h2>
//       <div id="funnel-grid" class="funnel-grid"></div>

//       <h2 class="section-title">Candidates</h2>
//       <div class="filter-row">
//         <select id="filter-track"><option value="">All Tracks</option></select>
//         <input type="text" id="filter-phone" placeholder="Search phone…">
//       </div>
//       <div class="table-wrap"><table class="data-table" id="candidates-table"></table></div>

//       <h2 class="section-title">Results</h2>
//       <div class="filter-row">
//         <select id="filter-testtype"><option value="">All Test Types</option></select>
//         <select id="filter-flag">
//           <option value="">All</option>
//           <option value="flagged">Flagged only</option>
//           <option value="clean">Clean only</option>
//         </select>
//         <input type="text" id="filter-result-phone" placeholder="Search phone…">
//       </div>
//       <div class="table-wrap"><table class="data-table" id="results-table"></table></div>
//     </div>`;

//   document.getElementById('btn-logout').addEventListener('click', () => {
//     Candidate.clear();
//     window.location.href = 'index.html';
//   });

//   populateTrackFilterOptions();
//   populateTestTypeFilterOptions();

//   ['filter-track', 'filter-phone'].forEach(id => el(id).addEventListener('input', renderCandidatesTable));
//   ['filter-testtype', 'filter-flag', 'filter-result-phone'].forEach(id => el(id).addEventListener('input', renderResultsTable));

//   renderFunnel();
//   renderCandidatesTable();
//   renderResultsTable();
// }

// function populateTrackFilterOptions() {
//   const sel = el('filter-track');
//   Object.keys(TRACK_LABELS).forEach(id => {
//     const opt = document.createElement('option');
//     opt.value = id;
//     opt.textContent = `${id} — ${TRACK_LABELS[id]}`;
//     sel.appendChild(opt);
//   });
// }

// function populateTestTypeFilterOptions() {
//   const sel = el('filter-testtype');
//   const types = [...new Set(ALL_RESULTS.map(r => r.testType))].sort();
//   types.forEach(t => {
//     const opt = document.createElement('option');
//     opt.value = t;
//     opt.textContent = t;
//     sel.appendChild(opt);
//   });
// }

// // ── Track Summary funnel: how many candidates per track, how many
// // passed the aptitude gate (where relevant), how many completed
// // their main test.
// function renderFunnel() {
//   const grid = el('funnel-grid');
//   grid.innerHTML = Object.keys(TRACK_LABELS).map(id => {
//     const label = TRACK_LABELS[id];
//     const trackCandidates = ALL_CANDIDATES.filter(c => c.id === id);
//     const total = trackCandidates.length;
//     const mainTestType = TRACK_MAIN_TEST[id];
//     const completed = ALL_RESULTS.filter(r => r.testType === mainTestType).length;

//     let aptitudeBlock = '';
//     if (TRACKS_WITH_APTITUDE_GATE.includes(id)) {
//       const passed = trackCandidates.filter(c => c.aptitudePassed === 'TRUE').length;
//       const failed = trackCandidates.filter(c => c.aptitudePassed === 'FALSE').length;
//       const pending = total - passed - failed;
//       const pct = n => total > 0 ? (n / total) * 100 : 0;

//       aptitudeBlock = `
//         <div class="funnel-bar">
//           ${passed  ? `<div class="funnel-bar-seg passed"  style="width:${pct(passed)}%"></div>`  : ''}
//           ${failed  ? `<div class="funnel-bar-seg failed"  style="width:${pct(failed)}%"></div>`  : ''}
//           ${pending ? `<div class="funnel-bar-seg pending" style="width:${pct(pending)}%"></div>` : ''}
//         </div>
//         <div class="funnel-legend">
//           <span><span class="funnel-dot" style="background:var(--green)"></span>Passed ${passed}</span>
//           <span><span class="funnel-dot" style="background:var(--red)"></span>Failed ${failed}</span>
//           <span><span class="funnel-dot" style="background:#d7dce6"></span>Pending ${pending}</span>
//         </div>`;
//     }

//     return `
//       <div class="funnel-card track-${id}">
//         <div class="funnel-title">${label}</div>
//         <div class="funnel-count">${total}</div>
//         <div class="funnel-count-label">candidates on this track</div>
//         ${aptitudeBlock}
//         <div class="funnel-footer"><span>Completed main test</span><strong>${completed}</strong></div>
//       </div>`;
//   }).join('');
// }
// function statusBadge(status) {
//   const s = (status || '').toLowerCase();
//   if (s === 'used') return `<span class="badge badge-neutral">Completed</span>`;
//   if (s === 'verified') return `<span class="badge badge-pass">In progress</span>`;
//   return `<span class="badge badge-neutral">Not started</span>`;
// }

// function aptitudeBadge(val) {
//   if (val === 'TRUE') return `<span class="badge badge-pass">Passed</span>`;
//   if (val === 'FALSE') return `<span class="badge badge-fail">Failed</span>`;
//   return `<span class="badge badge-neutral">—</span>`;
// }

// function renderCandidatesTable() {
//   const trackFilter = el('filter-track').value;
//   const phoneFilter = el('filter-phone').value.trim();

//   let rows = ALL_CANDIDATES.slice();
//   if (trackFilter) rows = rows.filter(c => c.id === trackFilter);
//   if (phoneFilter) rows = rows.filter(c => c.phone.includes(phoneFilter));

//   const table = el('candidates-table');
//   table.innerHTML = `
//     <thead><tr>
//       <th>Phone</th><th>Track</th><th>Status</th><th>Aptitude Score</th><th>Aptitude Result</th><th>Email</th>
//     </tr></thead>
//     <tbody>
//       ${rows.map(c => `
//         <tr>
//           <td class="mono">${c.phone}</td>
//           <td><span class="funnel-dot" style="background:var(--track-${c.id})"></span> ${TRACK_LABELS[c.id] || 'Unknown'}</td>
//           <td>${statusBadge(c.status)}</td>
//           <td class="num">${c.aptitudeScore !== '' && c.aptitudeScore != null ? c.aptitudeScore + '%' : '—'}</td>
//           <td>${aptitudeBadge(c.aptitudePassed)}</td>
//           <td>${c.email || '—'}</td>
//         </tr>`).join('') || '<tr><td colspan="6" class="muted">No candidates match this filter.</td></tr>'}
//     </tbody>`;
// }

// function renderResultsTable() {
//   const testTypeFilter = el('filter-testtype').value;
//   const flagFilter = el('filter-flag').value;
//   const phoneFilter = el('filter-result-phone').value.trim();

//   let rows = ALL_RESULTS.slice();
//   if (testTypeFilter) rows = rows.filter(r => r.testType === testTypeFilter);
//   if (flagFilter === 'flagged') rows = rows.filter(r => r.flagStatus.includes('FLAGGED'));
//   if (flagFilter === 'clean') rows = rows.filter(r => !r.flagStatus.includes('FLAGGED'));
//   if (phoneFilter) rows = rows.filter(r => r.phone.includes(phoneFilter));

//   rows.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

//   const table = el('results-table');
//   table.innerHTML = `
//     <thead><tr>
//       <th>Submitted</th><th>Phone</th><th>Name</th><th>Email</th><th>Test</th><th>Score</th><th>%</th><th>Time</th><th>Violations</th><th>Flag</th><th>Reason</th>
//     </tr></thead>
//     <tbody>
//       ${rows.map(r => {
//         const isFlagged = r.flagStatus.includes('FLAGGED');
//         return `
//         <tr class="${isFlagged ? 'row-flagged' : ''}">
//           <td>${new Date(r.timestamp).toLocaleString()}</td>
//           <td class="mono">${r.phone}</td>
//           <td>${r.name}</td>
//           <td>${r.email}</td>
//           <td><span class="funnel-dot" style="background:var(--track-${trackIdForTestType(r.testType)})"></span> ${r.testType}</td>
//           <td class="num">${r.score}/${r.total}</td>
//           <td class="num">${r.percent}%</td>
//           <td class="mono">${r.timeTaken}</td>
//           <td class="num">${r.violations}</td>
//           <td>${isFlagged ? '<span class="badge badge-flag">Flagged</span>' : '<span class="badge badge-clean">Clean</span>'}</td>
//           <td>${r.reason}</td>
//         </tr>`;
//       }).join('') || '<tr><td colspan="11" class="muted">No results match this filter.</td></tr>'}
//     </tbody>`;
// }

// function trackIdForTestType(testType) {
//   const entry = Object.entries(TRACK_MAIN_TEST).find(([, v]) => v === testType);
//   return entry ? entry[0] : '01';
// }

// init();
// ═══════════════════════════════════════════════════════
//  Admin Dashboard — logs in with phone + email (ID "00" rows
//  only), then pulls a full read-only dump of both sheets.
// ═══════════════════════════════════════════════════════

const TRACK_LABELS = {
  '01': 'Psychology',
  '02': 'Sales',
  '03': 'Commodity',
  '04': 'Accounts',
  '05': 'Commodity (NISM 8+16)',
};

const TRACK_MAIN_TEST = {
  '01': 'psychology',
  '02': 'sales',
  '03': 'commodity',
  '04': 'accounts',
  '05': 'commodity2',
};
const TRACKS_WITH_APTITUDE_GATE = ['02', '03', '05'];

let ALL_CANDIDATES = [];
let ALL_RESULTS = [];
let ADMIN_IDENTITY = null;

// ── Question banks: these come from plain <script> includes in
// admin.html (questions/*.js), which each define a global array.
// typeof-guarded in case a file is ever removed from admin.html.
const QUESTION_BANKS = {
  aptitude:   { label: 'Aptitude (Sales/Commodity gate)', data: typeof APTITUDE_QUESTIONS   !== 'undefined' ? APTITUDE_QUESTIONS   : [] },
  psychology: { label: 'Psychology',                      data: typeof PSYCHOLOGY_QUESTIONS !== 'undefined' ? PSYCHOLOGY_QUESTIONS : [] },
  sales:      { label: 'Sales',                           data: typeof SALES_QUESTIONS      !== 'undefined' ? SALES_QUESTIONS      : [] },
  commodity:  { label: 'Commodity',                       data: typeof COMMODITY_QUESTIONS  !== 'undefined' ? COMMODITY_QUESTIONS  : [] },
  commodity2: { label: 'Commodity (NISM 8+16)',            data: typeof COMMODITY2_QUESTIONS !== 'undefined' ? COMMODITY2_QUESTIONS : [] },
  accounts:   { label: 'Accounts',                        data: typeof ACCOUNTS_QUESTIONS   !== 'undefined' ? ACCOUNTS_QUESTIONS   : [] },
};

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
        <button class="btn-ghost" id="btn-logout">Log out</button>
      </div>

      <h2 class="section-title">Track Summary</h2>
      <div id="funnel-grid" class="funnel-grid"></div>

      <h2 class="section-title">Candidates</h2>
      <div class="filter-row">
        <select id="filter-track"><option value="">All Tracks</option></select>
        <input type="text" id="filter-phone" placeholder="Search phone…">
      </div>
      <div class="table-wrap"><table class="data-table" id="candidates-table"></table></div>

      <h2 class="section-title">Question Bank</h2>
      <div class="filter-row">
        <select id="filter-qbank"></select>
        <span class="muted" id="qbank-count"></span>
      </div>
      <div id="qbank-list"></div>

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
  populateQBankOptions();

  ['filter-track', 'filter-phone'].forEach(id => el(id).addEventListener('input', renderCandidatesTable));
  ['filter-testtype', 'filter-flag', 'filter-result-phone'].forEach(id => el(id).addEventListener('input', renderResultsTable));
  el('filter-qbank').addEventListener('change', renderQBank);

  renderFunnel();
  renderCandidatesTable();
  renderResultsTable();
  renderQBank();
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

function populateQBankOptions() {
  const sel = el('filter-qbank');
  sel.innerHTML = Object.keys(QUESTION_BANKS).map(key =>
    `<option value="${key}">${QUESTION_BANKS[key].label} (${QUESTION_BANKS[key].data.length})</option>`
  ).join('');
}

function renderQBank() {
  const key = el('filter-qbank').value;
  const bank = QUESTION_BANKS[key];
  const list = el('qbank-list');
  const countEl = el('qbank-count');

  if (!bank || !bank.data.length) {
    countEl.textContent = '';
    list.innerHTML = '<p class="muted">No questions loaded for this bank.</p>';
    return;
  }

  countEl.textContent = `${bank.data.length} questions`;
  list.innerHTML = bank.data.map((q, i) => `
    <div class="qbank-item">
      <div class="qbank-q"><span class="qbank-num">${i + 1}.</span> ${q.text}</div>
      <ul class="qbank-options">
        ${q.options.map((opt, oi) => `
          <li class="${oi === q.correct ? 'qbank-correct' : ''}">${opt}${oi === q.correct ? ' <span class="badge badge-pass">Correct</span>' : ''}</li>
        `).join('')}
      </ul>
    </div>`).join('');
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

    let aptitudeBlock = '';
    if (TRACKS_WITH_APTITUDE_GATE.includes(id)) {
      const passed = trackCandidates.filter(c => c.aptitudePassed === 'TRUE').length;
      const failed = trackCandidates.filter(c => c.aptitudePassed === 'FALSE').length;
      const pending = total - passed - failed;
      const pct = n => total > 0 ? (n / total) * 100 : 0;

      aptitudeBlock = `
        <div class="funnel-bar">
          ${passed  ? `<div class="funnel-bar-seg passed"  style="width:${pct(passed)}%"></div>`  : ''}
          ${failed  ? `<div class="funnel-bar-seg failed"  style="width:${pct(failed)}%"></div>`  : ''}
          ${pending ? `<div class="funnel-bar-seg pending" style="width:${pct(pending)}%"></div>` : ''}
        </div>
        <div class="funnel-legend">
          <span><span class="funnel-dot" style="background:var(--green)"></span>Passed ${passed}</span>
          <span><span class="funnel-dot" style="background:var(--red)"></span>Failed ${failed}</span>
          <span><span class="funnel-dot" style="background:#d7dce6"></span>Pending ${pending}</span>
        </div>`;
    }

    return `
      <div class="funnel-card track-${id}">
        <div class="funnel-title">${label}</div>
        <div class="funnel-count">${total}</div>
        <div class="funnel-count-label">candidates on this track</div>
        ${aptitudeBlock}
        <div class="funnel-footer"><span>Completed main test</span><strong>${completed}</strong></div>
      </div>`;
  }).join('');
}
function statusBadge(status) {
  const s = (status || '').toLowerCase();
  if (s === 'used') return `<span class="badge badge-neutral">Completed</span>`;
  if (s === 'verified') return `<span class="badge badge-pass">In progress</span>`;
  return `<span class="badge badge-neutral">Not started</span>`;
}

function aptitudeBadge(val) {
  if (val === 'TRUE') return `<span class="badge badge-pass">Passed</span>`;
  if (val === 'FALSE') return `<span class="badge badge-fail">Failed</span>`;
  return `<span class="badge badge-neutral">—</span>`;
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
      <th>Phone</th><th>Track</th><th>Status</th><th>Aptitude Score</th><th>Aptitude Result</th><th>Email</th>
    </tr></thead>
    <tbody>
      ${rows.map(c => `
        <tr>
          <td class="mono">${c.phone}</td>
          <td><span class="funnel-dot" style="background:var(--track-${c.id})"></span> ${TRACK_LABELS[c.id] || 'Unknown'}</td>
          <td>${statusBadge(c.status)}</td>
          <td class="num">${c.aptitudeScore !== '' && c.aptitudeScore != null ? c.aptitudeScore + '%' : '—'}</td>
          <td>${aptitudeBadge(c.aptitudePassed)}</td>
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
      ${rows.map(r => {
        const isFlagged = r.flagStatus.includes('FLAGGED');
        return `
        <tr class="${isFlagged ? 'row-flagged' : ''}">
          <td>${new Date(r.timestamp).toLocaleString()}</td>
          <td class="mono">${r.phone}</td>
          <td>${r.name}</td>
          <td>${r.email}</td>
          <td><span class="funnel-dot" style="background:var(--track-${trackIdForTestType(r.testType)})"></span> ${r.testType}</td>
          <td class="num">${r.score}/${r.total}</td>
          <td class="num">${r.percent}%</td>
          <td class="mono">${r.timeTaken}</td>
          <td class="num">${r.violations}</td>
          <td>${isFlagged ? '<span class="badge badge-flag">Flagged</span>' : '<span class="badge badge-clean">Clean</span>'}</td>
          <td>${r.reason}</td>
        </tr>`;
      }).join('') || '<tr><td colspan="11" class="muted">No results match this filter.</td></tr>'}
    </tbody>`;
}

function trackIdForTestType(testType) {
  const entry = Object.entries(TRACK_MAIN_TEST).find(([, v]) => v === testType);
  return entry ? entry[0] : '01';
}

init();