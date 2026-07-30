// ═══════════════════════════════════════════════════════
//  TestEngine — shared logic for every test page.
//  Each test HTML file just includes this + its own question
//  bank + a small config object. See any of the *.html pages
//  for the ~15-line usage.
// ═══════════════════════════════════════════════════════
const TestEngine = (() => {

  let cfg = null;
  let candidate = null;
  let QUESTIONS = [];
  let currentQIndex = 0;
  let userAnswers = [];
  let secondsLeft = 0;
  let testTimerInterval = null;
  let startTime = null;
  let testActive = false;
  let testEnded = false;
  let violations = 0;
  let violationOverlayOpen = false;

  const root = () => document.getElementById('engine-root');

  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildQuestionSet() {
    const pool = cfg.questionsToAsk ? shuffleArray(cfg.questions).slice(0, cfg.questionsToAsk) : cfg.questions.slice();
    return pool.map(q => {
      const order = shuffleArray(q.options.map((_, i) => i));
      const newOptions = order.map(i => q.options[i]);
      const newCorrect = order.indexOf(q.correct);
      return { text: q.text, image: q.image || null, options: newOptions, correct: newCorrect };
    });
  }

  let toastTimer;
  function showToast(msg, duration = 3000) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), duration);
  }

  // ── SCREEN: blocked (aptitude not passed / not attempted yet) ──
  function renderBlocked(message) {
    root().innerHTML = `
      <div class="result-wrap">
        <div class="result-card blocked-card">
          <div class="result-icon">🚫</div>
          <div class="result-title" style="color:var(--red)">Not Available</div>
          <div class="result-sub">${message}</div>
        </div>
      </div>`;
  }

  // ── SCREEN: disclaimer ──
  function renderDisclaimer() {
    const mins = Math.round(cfg.durationSeconds / 60);
    const qCount = cfg.questionsToAsk || cfg.questions.length;
    const rules = cfg.rules || [
      `<strong>Duration:</strong> ${mins} minutes for the entire test. The timer starts when you click Begin and does not pause.`,
      `<strong>Questions:</strong> ${qCount} multiple-choice questions (1 mark each).`,
      `<strong>Navigation:</strong> You may move freely between questions — go back and change any answer before you submit.`,
      `<strong>No tab switching</strong> — switching away will trigger a warning. 2 violations = test terminated.`,
      `<strong>No minimizing</strong> the window or switching apps during the test.`,
      `<strong>No keyboard shortcuts</strong> (Ctrl+C, Ctrl+V, etc.) are allowed.`,
      `<strong>No right-click</strong> is allowed inside the test window.`,
      `<strong>One attempt only</strong> — your mobile number allows a single submission.`,
      `Once submitted, you cannot retake the test.`,
      `If the timer runs out, the test auto-submits with whatever answers you've selected.`,
    ];

    root().innerHTML = `
      <div class="card-wrap">
        <div class="card" style="max-width:560px">
          <div class="card-logo">
            <div class="brand">SIXTH SENSE <span>SECURITIES</span></div>
            <div class="sub">${cfg.testLabel} — Instructions</div>
          </div>
          <div class="disclaimer-box">
            <h3>📋 Test Rules &amp; Instructions</h3>
            <ul>${rules.map(r => `<li>${r}</li>`).join('')}</ul>
          </div>
          <label class="checkbox-row">
            <input type="checkbox" id="chk-agree">
            <span>I have read and understood the above rules, and I agree to take this test honestly.</span>
          </label>
          <button class="btn-primary" id="btn-begin" disabled>Begin Test →</button>
        </div>
      </div>`;

    document.getElementById('chk-agree').addEventListener('change', e => {
      document.getElementById('btn-begin').disabled = !e.target.checked;
    });
    document.getElementById('btn-begin').addEventListener('click', beginTest);
  }

  // ── SCREEN: quiz shell ──
  function renderQuizShell() {
    root().innerHTML = `
      <div id="quiz-screen">
        <div id="test-timer-wrap">
          <span id="test-timer-label">Time Remaining</span>
          <span id="test-timer-display">00:00</span>
        </div>
        <div id="progress-wrap"><div id="progress-fill"></div></div>
        <div id="palette-wrap">
          <div id="palette-title">Question Navigator — click any number to jump</div>
          <div id="palette-grid"></div>
          <div class="palette-legend">
            <span><span class="legend-dot" style="background:#fafbfd;border:1.5px solid var(--border)"></span> Unanswered</span>
            <span><span class="legend-dot" style="background:var(--gold-bg);border:1.5px solid var(--gold)"></span> Answered</span>
            <span><span class="legend-dot" style="background:var(--navy)"></span> Current</span>
          </div>
        </div>
        <div id="questions-container"></div>
        <div id="nav-row">
          <button id="btn-prev">← Previous</button>
          <button id="btn-next">Next →</button>
        </div>
        <button id="submit-btn">Submit Test →</button>
      </div>
      <div class="overlay" id="overlay-violation">
        <div class="overlay-card">
          <div class="overlay-icon">⚠️</div>
          <div class="overlay-title">Warning: <span id="v-count">1st</span> Violation</div>
          <div class="overlay-body">You left the test window. This has been recorded.<br><strong>One more violation will terminate your test.</strong></div>
          <button class="overlay-btn" id="btn-dismiss-violation">Return to Test</button>
        </div>
      </div>
      <div class="overlay" id="overlay-submit">
        <div class="overlay-card">
          <div class="overlay-icon">📝</div>
          <div class="overlay-title">Submit Test?</div>
          <div class="overlay-body" id="overlay-submit-body">Once submitted you cannot make changes.<br>Are you sure you want to submit?</div>
          <div style="display:flex;gap:12px;justify-content:center">
            <button class="overlay-btn" style="background:#888" id="btn-cancel-submit">Go Back</button>
            <button class="overlay-btn" id="btn-confirm-submit">Yes, Submit</button>
          </div>
        </div>
      </div>`;

    document.getElementById('btn-prev').addEventListener('click', goPrev);
    document.getElementById('btn-next').addEventListener('click', goNext);
    document.getElementById('submit-btn').addEventListener('click', confirmSubmit);
    document.getElementById('btn-dismiss-violation').addEventListener('click', () => dismissOverlay('overlay-violation'));
    document.getElementById('btn-cancel-submit').addEventListener('click', () => dismissOverlay('overlay-submit'));
    document.getElementById('btn-confirm-submit').addEventListener('click', () => submitTest(true, 'manual'));
  }

  function beginTest() {
    document.getElementById('warning-banner').classList.add('show');
    testActive = true;
    startTime = new Date();
    attachAntiCheat();
    try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); } catch (e) {}

    QUESTIONS = buildQuestionSet();
    userAnswers = new Array(QUESTIONS.length).fill(null);
    currentQIndex = 0;

    renderQuizShell();
    buildPalette();
    renderQuestion(0);
    startTestTimer();
  }

  function startTestTimer() {
    secondsLeft = cfg.durationSeconds;
    updateTestTimerDisplay();
    testTimerInterval = setInterval(() => {
      secondsLeft--;
      updateTestTimerDisplay();
      if (secondsLeft <= 0) {
        clearInterval(testTimerInterval);
        showToast('⏱ Time is up — submitting your test');
        submitTest(false, 'timeout');
      }
    }, 1000);
  }

  function updateTestTimerDisplay() {
    const disp = document.getElementById('test-timer-display');
    if (!disp) return;
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    disp.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    disp.classList.remove('warning', 'critical');
    if (secondsLeft <= 60) disp.classList.add('critical');
    else if (secondsLeft <= 300) disp.classList.add('warning');
  }

  function buildPalette() {
    const grid = document.getElementById('palette-grid');
    grid.innerHTML = QUESTIONS.map((q, i) => `<button class="palette-btn" id="palette-${i}" data-idx="${i}">${i + 1}</button>`).join('');
    grid.querySelectorAll('.palette-btn').forEach(btn => {
      btn.addEventListener('click', () => jumpToQuestion(Number(btn.dataset.idx)));
    });
    updatePalette();
  }

  function updatePalette() {
    QUESTIONS.forEach((q, i) => {
      const btn = document.getElementById('palette-' + i);
      if (!btn) return;
      btn.classList.remove('answered', 'current');
      if (userAnswers[i] !== null && userAnswers[i] !== undefined) btn.classList.add('answered');
      if (i === currentQIndex) btn.classList.add('current');
    });
  }

  function jumpToQuestion(idx) {
    if (!testActive) return;
    captureCurrentAnswer();
    currentQIndex = idx;
    renderQuestion(idx);
  }

  function renderQuestion(idx) {
    const q = QUESTIONS[idx];
    const container = document.getElementById('questions-container');
    const total = QUESTIONS.length;

    container.innerHTML = `
      <div class="q-card">
        <div class="q-meta">Question ${idx + 1} of ${total} · MCQ</div>
        <div class="q-text">${idx + 1}. ${q.text}</div>
        ${q.image ? `<img src="${q.image}" alt="Reference chart" class="q-chart-img">` : ''}
        <div class="options">
          ${q.options.map((opt, j) => `
            <label class="option-label">
              <input type="radio" name="qcur" value="${j}" ${userAnswers[idx] === j ? 'checked' : ''}>
              <span>${String.fromCharCode(65 + j)}. ${opt}</span>
            </label>`).join('')}
        </div>
      </div>`;

    container.querySelectorAll('input[name="qcur"]').forEach(inp => {
      inp.addEventListener('change', onAnswerChange);
    });

    const answeredCount = userAnswers.filter(a => a !== null && a !== undefined).length;
    document.getElementById('progress-fill').style.width = Math.round((answeredCount / total) * 100) + '%';
    document.getElementById('btn-prev').disabled = idx === 0;
    document.getElementById('btn-next').disabled = idx === total - 1;
    updatePalette();
  }

  function captureCurrentAnswer() {
    const sel = document.querySelector('input[name="qcur"]:checked');
    userAnswers[currentQIndex] = sel ? parseInt(sel.value) : null;
  }

  function onAnswerChange() {
    captureCurrentAnswer();
    updatePalette();
    const answeredCount = userAnswers.filter(a => a !== null && a !== undefined).length;
    document.getElementById('progress-fill').style.width = Math.round((answeredCount / QUESTIONS.length) * 100) + '%';
  }

  function goNext() {
    if (!testActive) return;
    captureCurrentAnswer();
    if (currentQIndex < QUESTIONS.length - 1) { currentQIndex++; renderQuestion(currentQIndex); }
  }
  function goPrev() {
    if (!testActive) return;
    captureCurrentAnswer();
    if (currentQIndex > 0) { currentQIndex--; renderQuestion(currentQIndex); }
  }

  function attachAntiCheat() {
    window.addEventListener('blur', onViolation);
    document.addEventListener('visibilitychange', () => { if (document.hidden) onViolation(); });
    window.addEventListener('beforeunload', e => { if (testActive && !testEnded) { e.preventDefault(); e.returnValue = ''; } });
    document.addEventListener('contextmenu', e => { if (testActive) { e.preventDefault(); showToast('Right-click disabled.'); } });
    document.addEventListener('keydown', e => {
      if (!testActive) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && ['c', 'v', 'x', 'a', 'u', 's', 'p', 'r', 'f'].includes(e.key.toLowerCase())) { e.preventDefault(); showToast('Keyboard shortcuts are disabled.'); }
      if (['F12', 'F5'].includes(e.key)) e.preventDefault();
      if (ctrl && e.shiftKey) e.preventDefault();
    });
  }

  function onViolation() {
    if (!testActive || testEnded || violationOverlayOpen) return;
    violations++;
    if (violations >= 2) { terminateTest(); return; }
    violationOverlayOpen = true;
    document.getElementById('v-count').textContent = violations === 1 ? '1st' : '2nd';
    document.getElementById('overlay-violation').classList.add('show');
  }

  function dismissOverlay(id) {
    document.getElementById(id).classList.remove('show');
    if (id === 'overlay-violation') violationOverlayOpen = false;
  }

  function confirmSubmit() {
    if (testEnded) return;
    captureCurrentAnswer();
    const answeredCount = userAnswers.filter(a => a !== null && a !== undefined).length;
    const unanswered = QUESTIONS.length - answeredCount;
    document.getElementById('overlay-submit-body').innerHTML = unanswered > 0
      ? `You have <strong>${unanswered} unanswered</strong> question(s).<br>Once submitted you cannot make changes.<br>Are you sure you want to submit?`
      : `Once submitted you cannot make changes.<br>Are you sure you want to submit?`;
    document.getElementById('overlay-submit').classList.add('show');
  }

  function collectAnswers() {
    captureCurrentAnswer();
    let score = 0;
    let mcqSummary = '';
    QUESTIONS.forEach((q, i) => {
      const correct = userAnswers[i] === q.correct;
      if (correct) score++;
      mcqSummary += correct ? '1' : '0';
    });
    return { score, mcqSummary };
  }

  async function submitTest(manual, reason) {
    if (testEnded) return;
    testEnded = true;
    testActive = false;
    clearInterval(testTimerInterval);
    dismissOverlay('overlay-submit');

    const elapsed = startTime ? Math.floor((new Date() - startTime) / 1000) : 0;
    const timeStr = Math.floor(elapsed / 60) + 'm ' + (elapsed % 60) + 's';
    const { score, mcqSummary } = collectAnswers();
    const total = QUESTIONS.length;
    const percent = total > 0 ? Math.round((score / total) * 100) : 0;

    renderResult({ score, total, percent, timeStr, violations, reason });

    try {
      const data = await Api.get({
        action: 'submit',
        name: candidate.name,
        phone: candidate.phone,
        email: candidate.email,
        testType: cfg.testType,
        score, total, percent,
        timeTaken: timeStr,
        violations: String(violations),
        flagged: violations > 0 ? '1' : '0',
        reason,
        mcq: mcqSummary,
      });
      updateSubmitStatus(data);
    } catch (e) {
      console.warn('submit ping failed', e);
      updateSubmitStatus({ status: 'error' });
    }
  }

  function terminateTest() {
    if (testEnded) return;
    submitTest(false, 'terminated');
    document.getElementById('warning-banner').classList.remove('show');
    root().innerHTML = `
      <div class="result-wrap">
        <div class="result-card terminated-card">
          <div class="result-icon">🚫</div>
          <div class="result-title" style="color:var(--red)">Test Terminated</div>
          <div class="result-sub">Your test was terminated due to repeated violations of test rules.</div>
          <div class="result-note" style="background:#fff0f0; margin-top:16px">
            Multiple tab switches / window changes were detected. Your partial responses have been recorded and flagged.
            Please contact HR at Sixth Sense Securities if you believe this was an error.
          </div>
        </div>
      </div>`;
  }

  function updateSubmitStatus(data) {
    const el = document.getElementById('submit-status');
    if (!el) return;
    if (data.status === 'ok') { el.textContent = '✅ Result saved successfully.'; el.style.color = 'var(--green)'; }
    else if (data.status === 'duplicate') { el.textContent = '⚠ Already recorded.'; el.style.color = 'var(--gold)'; }
    else { el.textContent = '⚠ Could not confirm save. Please note your score and contact HR if needed.'; el.style.color = 'orange'; }
  }

  function renderResult({ score, total, percent, timeStr, violations, reason }) {
    document.getElementById('warning-banner').classList.remove('show');

    if (cfg.isAptitudeTest) {
      const passed = percent >= cfg.passThreshold;
      root().innerHTML = passed ? `
        <div class="result-wrap">
          <div class="result-card">
            <div class="result-icon">✅</div>
            <div class="result-title">Aptitude Test Passed</div>
            <div class="result-sub">Score: ${score} / ${total} (${percent}%). You may now continue to the next test.</div>
            <button class="btn-primary" id="btn-continue">Continue →</button>
            <div id="submit-status" style="margin-top:14px;font-size:13px;font-weight:600;color:var(--muted);text-align:center">⏳ Saving…</div>
          </div>
        </div>` : `
        <div class="result-wrap">
          <div class="result-card blocked-card">
            <div class="result-icon">❌</div>
            <div class="result-title" style="color:var(--red)">Not Qualified</div>
            <div class="result-sub">Score: ${score} / ${total} (${percent}%). A minimum of ${cfg.passThreshold}% is required to proceed.</div>
            <div class="result-note">Your response has been recorded. HR will be in touch if relevant.</div>
            <div id="submit-status" style="margin-top:14px;font-size:13px;font-weight:600;color:var(--muted);text-align:center">⏳ Saving…</div>
          </div>
        </div>`;

      if (passed) {
        document.getElementById('btn-continue').addEventListener('click', () => {
          window.location.href = cfg.onPassRedirect;
        });
      }
      return;
    }

    const flagged = violations > 0;
    root().innerHTML = `
      <div class="result-wrap">
        <div class="result-card">
          <div class="result-icon">${flagged ? '⚠️' : '✅'}</div>
          <div class="result-title">${flagged ? 'Submitted — Flagged' : 'Test Submitted!'}</div>
          <div class="result-sub">Thank you for taking the ${cfg.testLabel}.</div>
          <div class="result-grid">
            <div class="result-row"><span class="label">Score</span><span class="value">${score} / ${total}</span></div>
            <div class="result-row"><span class="label">Time Taken</span><span class="value">${timeStr}</span></div>
            <div class="result-row ${flagged ? 'flag-row' : ''}"><span class="label">Violations</span><span class="value">${violations > 0 ? violations + ' (Flagged)' : 'None ✓'}</span></div>
            <div class="result-row"><span class="label">Candidate</span><span class="value">${candidate.name}</span></div>
          </div>
          <div class="result-note">Your responses have been recorded. HR will review your results and reach out to you shortly.</div>
          <div id="submit-status" style="margin-top:14px;font-size:13px;font-weight:600;color:var(--muted);text-align:center">⏳ Saving…</div>
        </div>
      </div>`;
  }

  // ── ENTRY POINT ──
  async function init(config) {
    cfg = config;
    document.title = `Sixth Sense Securities — ${cfg.testLabel}`;

    candidate = Candidate.load();
    if (!candidate || !candidate.phone) {
      window.location.href = 'index.html';
      return;
    }

    if (cfg.requiresAptitudeCheck) {
      root().innerHTML = `<div class="center-page"><p>Checking eligibility…</p></div>`;
      try {
        const data = await Api.get({ action: 'checkAptitude', phone: candidate.phone });
        if (data.status !== 'passed') {
          renderBlocked(
            data.status === 'failed'
              ? 'You did not meet the minimum aptitude score required to access this test.'
              : 'You need to complete and pass the Aptitude Test before accessing this test.'
          );
          return;
        }
      } catch (e) {
        renderBlocked('Could not verify eligibility right now. Please refresh or contact HR.');
        return;
      }
    }

    renderDisclaimer();
  }

  return { init };
})();
