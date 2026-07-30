// ═══════════════════════════════════════════════════════
//  Shared API layer — every page talks to the same Apps
//  Script Web App. Set this URL once after you deploy the
//  script (see /appscript/Code.gs).
// ═══════════════════════════════════════════════════════
const APPS_SCRIPT_URL = 'PASTE_YOUR_DEPLOYED_APPS_SCRIPT_URL_HERE';

const Api = {
  async get(params) {
    const url = APPS_SCRIPT_URL + '?' + new URLSearchParams(params).toString();
    const res = await fetch(url);
    return res.json();
  },
};

// ── Candidate identity is stored locally so it survives
// navigation between pages (index.html -> sales-aptitude.html
// -> sales.html etc). This is NOT used to decide who can see
// what — every gated page re-checks the sheet itself. It only
// saves the candidate from re-typing their details.
const Candidate = {
  save({ name, phone, email, id }) {
    localStorage.setItem('candidate', JSON.stringify({ name, phone, email, id }));
  },
  load() {
    try { return JSON.parse(localStorage.getItem('candidate')); } catch { return null; }
  },
  clear() { localStorage.removeItem('candidate'); },
};
