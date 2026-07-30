# Sixth Sense Securities — Candidate Test Platform

Static site (no build step) that routes candidates to one of three tests based
on an ID assigned in your Google Sheet, using the same Apps Script + Sheet
backend pattern as your original single-file version — just split into
reusable pieces.

## How the flow works

1. Candidate opens `index.html`, enters name/phone/email, clicks Verify.
2. The Apps Script looks up their phone in the `Allowed Numbers` sheet and
   returns their `ID`.
3. Routing by ID:
   - **01** → `psychology.html` — one test, done.
   - **02** → `sales-aptitude.html` first. Pass (≥50%) → `sales.html`. Fail → "not qualified" screen.
   - **03** → `commodity-aptitude.html` first. Pass (≥50%) → `commodity.html`. Fail → "not qualified" screen.
4. Sales and Commodity share the exact same aptitude question bank
   (`questions/aptitude.js`).
5. `sales.html` and `commodity.html` re-check the sheet on load (`checkAptitude`
   action) before showing any question — so the gate can't be skipped by
   typing the URL directly.
6. Every submission (aptitude, psychology, sales, commodity — pass, fail, or
   terminated) writes a row to the `Results` tab.
7. Anti-cheat (tab-switch detection, right-click/shortcut blocking, 2-strike
   termination) is active on every test, same as your original code.

## File structure

```
index.html                → entry/login page
psychology.html           → ID 01
sales-aptitude.html       → ID 02, step 1
sales.html                → ID 02, step 2 (gated)
commodity-aptitude.html   → ID 03, step 1
commodity.html            → ID 03, step 2 (gated)
assets/style.css          → shared styles
assets/api.js             → Apps Script URL + fetch helper + candidate localStorage
assets/engine.js          → shared test-taking engine (timer, anti-cheat, palette, submit)
questions/psychology.js   → real 60-question bank (already filled in)
questions/aptitude.js     → placeholder — send me your real questions
questions/sales.js        → placeholder — send me your real questions
questions/commodity.js    → placeholder — send me your real questions
appscript/Code.gs         → paste this into your Apps Script project
```

## 1. Google Sheet setup

Open (or create) your spreadsheet with two tabs:

**`Allowed Numbers`**
| Phone Number (10 digits) | ID (01/02/03) | Status | AptitudeScore | AptitudePassed |
|---|---|---|---|---|

Fill in each candidate's phone number and their `ID` ahead of time (`01`
Psychology, `02` Sales, `03` Commodity). Leave `Status`, `AptitudeScore`,
`AptitudePassed` blank — the script fills those in.

**`Results`**
| Timestamp | Phone | Name | Email | TestType | Score | Total | Percent | TimeTaken | Violations | FlagStatus | Reason | MCQ Pattern |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

Leave empty — filled automatically. `TestType` will read `aptitude`,
`psychology`, `sales`, or `commodity` so you can filter one sheet by track.

Or just run the `setupSheets()` function once from the Apps Script editor
(see below) and it creates both tabs with correct headers for you.

## 2. Deploy the Apps Script

1. In your Google Sheet: **Extensions → Apps Script**.
2. Delete any existing code, paste in the contents of `appscript/Code.gs`.
3. Replace `PASTE_YOUR_SPREADSHEET_ID_HERE` with your sheet's ID (from its URL).
4. Run `setupSheets` once (▶ button, pick that function) to create the tabs —
   you'll be asked to authorize the script the first time.
5. **Deploy → New deployment → Web app.**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the deployment URL (ends in `/exec`).

## 3. Point the site at your script

Open `assets/api.js` and replace:
```js
const APPS_SCRIPT_URL = 'PASTE_YOUR_DEPLOYED_APPS_SCRIPT_URL_HERE';
```
with your real `/exec` URL. This one file controls every page — no need to
touch the individual HTML files.

## 4. Add your real questions

Send me the Aptitude, Sales, and Commodity questions and I'll drop them into
`questions/aptitude.js`, `questions/sales.js`, `questions/commodity.js` in
this exact format:

```js
{ text: "Question text here?", options: ["Option A", "Option B", "Option C", "Option D"], correct: 1 }
```//
`correct` is the zero-based index of the right option (0 = first option, 1 = second, etc).

## 5. Push to GitHub → deploy to Vercel

```bash
git init
git add .
git commit -m "Multi-test candidate platform"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Then on [vercel.com/new](https://vercel.com/new): import the repo, no
configuration needed — it's a static site, Vercel just serves the files.
Every push to `main` redeploys automatically.

## Extending later

- **Add a 4th track**: add a new `ID_ROUTES` entry in `index.html`, copy one
  of the existing test HTML files, point it at a new question file. The
  engine and styling are shared, so this is a ~15-line addition.
- **Change pass threshold**: edit `PASS_THRESHOLD` in `Code.gs` and
  `passThreshold` in `sales-aptitude.html` / `commodity-aptitude.html` (keep
  both in sync — the script enforces it server-side, the page just uses it
  for the pass/fail message).
- **Change test duration or question-subset size**: edit `durationSeconds` /
  `questionsToAsk` in each test's config block at the bottom of its HTML file.
- **Separate aptitude tests per track later**: duplicate
  `questions/aptitude.js` into `aptitude-sales.js` / `aptitude-commodity.js`,
  point each `*-aptitude.html` page at its own file.
