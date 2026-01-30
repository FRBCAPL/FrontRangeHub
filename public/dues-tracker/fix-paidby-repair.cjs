/**
 * Repair: fix "Unexpected token 'const'" from paid-by patch.
 * Targets the block that sets weeklyPayment* from existingPayment only.
 * Run: node fix-paidby-repair.cjs
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const appPath = path.join(__dirname, 'app.js');

function checkSyntax() {
  try {
    execSync(`node --check "${appPath}"`, { stdio: 'pipe', encoding: 'utf8' });
    return true;
  } catch (_) {
    return false;
  }
}

if (!fs.existsSync(appPath)) {
  console.error('app.js not found.');
  process.exit(1);
}

let js = fs.readFileSync(appPath, 'utf8');

const fix = `        const _mEl = document.getElementById('weeklyPaymentMethod');
        const _mVal = existingPayment.paymentMethod || '';
        if (_mVal && !Array.from(_mEl.options).some(function(o){return o.value===_mVal;})) {
          var _o=document.createElement('option');_o.value=_mVal;_o.textContent=_mVal;_mEl.appendChild(_o);
        }
        _mEl.value = _mVal;
        const _aEl = document.getElementById('weeklyPaymentAmount');
        const _aVal = (existingPayment.amount != null && existingPayment.amount !== '') ? String(existingPayment.amount) : '';
        if (_aVal && !Array.from(_aEl.options).some(function(o){return o.value===_aVal;})) {
          var _o=document.createElement('option');_o.value=_aVal;_o.textContent=_aVal;_aEl.appendChild(_o);
        }
        _aEl.value = _aVal;
        document.getElementById('weeklyPaymentNotes').value = existingPayment.notes || '';`;

const notesAnchor = "document.getElementById('weeklyPaymentNotes')";
const notesEnd = "existingPayment.notes";
const original3 = `        document.getElementById('weeklyPaymentMethod').value = existingPayment.paymentMethod || '';
        document.getElementById('weeklyPaymentAmount').value = existingPayment.amount || '';
        document.getElementById('weeklyPaymentNotes').value = existingPayment.notes || '';`;

function findBlock(js, startHint) {
  const i = js.indexOf(notesAnchor, startHint);
  if (i === -1) return null;
  let k = js.indexOf(notesEnd, i);
  if (k === -1) return null;
  k = js.indexOf(';', k);
  if (k === -1) return null;
  return k + 1;
}

// Case 1: Already patched (broken) – we have _mEl block. Revert to 3-line.
const patched = "const _mEl = document.getElementById('weeklyPaymentMethod')";
let idx = js.indexOf(patched);
if (idx !== -1) {
  let revStart = idx;
  const lineStart = js.lastIndexOf('\n', idx - 1) + 1;
  const prevLine = js.slice(lineStart, idx).trim();
  if (/const\s+\w+\s*=\s*$/.test(prevLine)) {
    revStart = lineStart;
  }
  const end = findBlock(js, idx);
  if (end) {
    js = js.slice(0, revStart) + original3 + js.slice(end);
    fs.writeFileSync(appPath, js);
    console.log('Reverted paid-by patch to 3-line block.');
  }
}

// Case 2: Find block with existingPayment.paymentMethod and apply fix.
const anchor = "existingPayment.paymentMethod";
let start = js.indexOf(anchor);
if (start === -1) {
  console.log('No existingPayment block to patch.');
  process.exit(0);
}
let blockStart = js.lastIndexOf("document.getElementById('weeklyPaymentMethod')", start);
if (blockStart === -1) { console.log('Start not found.'); process.exit(1); }
// If preceded by "const x = ", we must replace from start of that line to avoid "const x = const _mEl..."
const lineStart = js.lastIndexOf('\n', blockStart - 1) + 1;
const next = js.indexOf('\n', blockStart);
const lineEnd = next >= 0 ? next : js.length;
const line = js.slice(lineStart, lineEnd);
if (/const\s+\w+\s*=\s*document\.getElementById\('weeklyPaymentMethod'\)\s*;?\s*$/.test(line.trim())) {
  blockStart = lineStart;
}
const end = findBlock(js, blockStart);
if (!end) { console.log('End not found.'); process.exit(1); }
const old = js.slice(blockStart, end);
if (!old.includes('weeklyPaymentAmount') || !old.includes('existingPayment.amount')) {
  console.log('Block missing amount.');
  process.exit(1);
}

js = js.slice(0, blockStart) + fix + js.slice(end);
fs.writeFileSync(appPath, js);
if (!checkSyntax()) {
  js = js.slice(0, blockStart) + original3 + js.slice(blockStart + fix.length);
  fs.writeFileSync(appPath, js);
  console.log('Syntax check failed after patch. Reverted to 3-line block only. Paid-by display fix skipped.');
} else {
  console.log('Repaired. Payment method & amount will display when loading existing payment.');
}
