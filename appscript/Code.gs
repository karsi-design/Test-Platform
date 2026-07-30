/**
 * ══════════════════════════════════════════════════════
 *  SIXTH SENSE SECURITIES — Multi-Test Backend
 *  Google Apps Script (deploy as Web App)
 *
 *  SHEET STRUCTURE:
 *    Tab "Allowed Numbers" — col A Phone | col B ID | col C Status
 *                            | col D AptitudeScore | col E AptitudePassed
 *      ID:     "01" Psychology | "02" Sales | "03" Commodity
 *      Status: blank -> allowed | "verified" -> opened once | "used" -> completed main test
 *
 *    Tab "Results" — auto-populated on every submission (all test types)
 *      Timestamp | Phone | Name | Email | TestType | Score | Total | Percent
 *      | TimeTaken | Violations | FlagStatus | Reason | MCQ Pattern
 * ══════════════════════════════════════════════════════
 */

const SS_ID = 'PASTE_YOUR_SPREADSHEET_ID_HERE';
const PASS_THRESHOLD = 50; // must match passThreshold in sales-aptitude.html / commodity-aptitude.html

// ─────────────────────────────────────────────────────
//  SINGLE ENTRY POINT — everything via GET
// ─────────────────────────────────────────────────────
function doGet(e) {
  const action = (e.parameter.action || '').trim();
  const phone  = (e.parameter.phone  || '').trim().replace(/\D/g, '');

  try {
    if (action === 'verify' && phone.length === 10) {
      return jsonResponse(verifyPhone(phone));
    }
    if (action === 'checkAptitude' && phone.length === 10) {
      return jsonResponse(checkAptitude(phone));
    }
    if (action === 'submit' && phone.length === 10) {
      return jsonResponse(saveResult(e.parameter));
    }
    return jsonResponse({ status: 'error', message: 'Invalid request' });
  } catch (err) {
    Logger.log('ERROR: ' + err.message);
    return jsonResponse({ status: 'error', message: err.message });
  }
}

// ─────────────────────────────────────────────────────
//  VERIFY PHONE — also returns which test track (ID) to route to
// ─────────────────────────────────────────────────────
function verifyPhone(phone) {
  const sheet = SpreadsheetApp.openById(SS_ID).getSheetByName('Allowed Numbers');
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { status: 'not_found' };

  const data = sheet.getRange(2, 1, lastRow - 1, 3).getValues(); // Phone, ID, Status

  for (let i = 0; i < data.length; i++) {
    const rowPhone  = String(data[i][0]).trim().replace(/\D/g, '');
    const rowId     = String(data[i][1]).trim();
    const rowStatus = String(data[i][2]).trim().toLowerCase();

    if (rowPhone === phone) {
      if (rowStatus === 'used') return { status: 'used' };
      if (rowStatus === 'verified') return { status: 'already_verified' };

      sheet.getRange(i + 2, 3).setValue('verified'); // mark verified
      SpreadsheetApp.flush();
      return { status: 'allowed', id: rowId };
    }
  }
  return { status: 'not_found' };
}

// ─────────────────────────────────────────────────────
//  CHECK APTITUDE — used by sales.html / commodity.html before
//  showing any questions, so the gate can't be bypassed by URL.
// ─────────────────────────────────────────────────────
function checkAptitude(phone) {
  const sheet = SpreadsheetApp.openById(SS_ID).getSheetByName('Allowed Numbers');
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { status: 'not_found' };

  const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues(); // Phone..AptitudePassed

  for (let i = 0; i < data.length; i++) {
    const rowPhone = String(data[i][0]).trim().replace(/\D/g, '');
    if (rowPhone === phone) {
      const passedVal = String(data[i][4]).trim().toUpperCase();
      if (passedVal === 'TRUE') return { status: 'passed' };
      if (passedVal === 'FALSE') return { status: 'failed' };
      return { status: 'not_attempted' };
    }
  }
  return { status: 'not_found' };
}

// ─────────────────────────────────────────────────────
//  SAVE RESULT
//  - Always logs a row to "Results".
//  - If testType === 'aptitude': writes AptitudeScore/AptitudePassed
//    back onto the candidate's row in "Allowed Numbers".
//  - If testType is a *main* test (psychology/sales/commodity):
//    marks the candidate's Status as "used" so they can't retake it.
// ─────────────────────────────────────────────────────
function saveResult(p) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const now = new Date();

  const phone     = (p.phone     || '').trim().replace(/\D/g, '');
  const name      = (p.name      || '').trim();
  const email     = (p.email     || '').trim();
  const testType  = (p.testType  || '').trim().toLowerCase();
  const score     = parseInt(p.score || '0');
  const total     = parseInt(p.total || '0');
  const percent   = parseInt(p.percent || '0');
  const timeTaken = (p.timeTaken || '—').trim();
  const viols     = parseInt(p.violations || '0');
  const flagged   = p.flagged === '1' || p.flagged === 'true';
  const reason    = (p.reason    || 'manual').trim();
  const mcq       = (p.mcq       || '').trim();

  const resultsSheet = ss.getSheetByName('Results');
  const flagLabel = flagged ? '⚠ FLAGGED' : 'Clean';
  resultsSheet.appendRow([
    now, phone, name, email, testType, score, total, percent,
    timeTaken, viols, flagLabel, reason, mcq,
  ]);
  if (flagged) {
    const lr = resultsSheet.getLastRow();
    resultsSheet.getRange(lr, 1, 1, 13).setBackground('#fff0f0');
  }

  const allowedSheet = ss.getSheetByName('Allowed Numbers');
  const lastRow = allowedSheet.getLastRow();
  if (lastRow >= 2) {
    const phones = allowedSheet.getRange(2, 1, lastRow - 1, 1).getValues().flat()
      .map(v => String(v).trim().replace(/\D/g, ''));
    const idx = phones.indexOf(phone);
    if (idx !== -1) {
      const rowNum = idx + 2;
      if (testType === 'aptitude') {
        const passed = percent >= PASS_THRESHOLD;
        allowedSheet.getRange(rowNum, 4).setValue(percent);          // AptitudeScore
        allowedSheet.getRange(rowNum, 5).setValue(passed ? 'TRUE' : 'FALSE'); // AptitudePassed
        // Note: Status stays as "verified" here — the candidate still needs
        // to complete their MAIN test, so they aren't locked out yet.
      } else {
        // Main test (psychology / sales / commodity) — one attempt only.
        allowedSheet.getRange(rowNum, 3).setValue('used');
      }
    }
  }

  SpreadsheetApp.flush();
  return { status: 'ok' };
}

// ─────────────────────────────────────────────────────
//  HELPER
// ─────────────────────────────────────────────────────
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ─────────────────────────────────────────────────────
//  SETUP — run once manually from the Apps Script editor
// ─────────────────────────────────────────────────────
function setupSheets() {
  const ss = SpreadsheetApp.openById(SS_ID);

  let s1 = ss.getSheetByName('Allowed Numbers');
  if (!s1) s1 = ss.insertSheet('Allowed Numbers');
  const h1 = ['Phone Number (10 digits)', 'ID (01/02/03)', 'Status', 'AptitudeScore', 'AptitudePassed'];
  s1.getRange(1, 1, 1, h1.length).setValues([h1]).setFontWeight('bold').setBackground('#0a1628').setFontColor('#c9a227');
  s1.setFrozenRows(1);
  s1.setColumnWidth(1, 190); s1.setColumnWidth(2, 110); s1.setColumnWidth(3, 100);

  let s2 = ss.getSheetByName('Results');
  if (!s2) s2 = ss.insertSheet('Results');
  const h2 = ['Timestamp', 'Phone', 'Name', 'Email', 'TestType', 'Score', 'Total', 'Percent', 'TimeTaken', 'Violations', 'FlagStatus', 'Reason', 'MCQ Pattern'];
  s2.getRange(1, 1, 1, h2.length).setValues([h2]).setFontWeight('bold').setBackground('#0a1628').setFontColor('#c9a227');
  s2.setFrozenRows(1);

  SpreadsheetApp.flush();
  Logger.log('Setup complete!');
}
