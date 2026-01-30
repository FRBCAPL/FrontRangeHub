/**
 * Fix: Payment Method & Amount not showing when loading existing payment
 * in weekly payment modal. Run from this folder: node fix-paidby-display.cjs
 */
const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname, 'app.js');

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

const a = "document.getElementById('weeklyPaymentMethod')";
const b = "document.getElementById('weeklyPaymentNotes')";
const i = js.indexOf(a);
const j = js.indexOf(b);
if (i === -1 || j <= i) {
  console.log('weeklyPaymentMethod or weeklyPaymentNotes not found.');
  process.exit(0);
}
const k = js.indexOf(';', j);
if (k === -1) {
  console.log('Could not find end of block.');
  process.exit(0);
}
const old = js.slice(i, k + 1);
if (!old.includes('weeklyPaymentAmount') || !old.includes('existingPayment')) {
  console.log('Block missing amount or existingPayment.');
  process.exit(0);
}
js = js.slice(0, i) + fix + js.slice(k + 1);
fs.writeFileSync(appPath, js);
console.log('Patched. Payment method & amount will display when loading existing payment.');
