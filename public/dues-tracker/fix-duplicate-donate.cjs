/**
 * Fix duplicate updateDonateNavVisibility. Run: node fix-duplicate-donate.cjs
 */
const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname, 'app.js');
let js = fs.readFileSync(appPath, 'utf8');

const fn = 'function updateDonateNavVisibility()';
let i = js.indexOf(fn);
if (i === -1) {
  console.log('updateDonateNavVisibility not found.');
  process.exit(0);
}
const j = js.indexOf(fn, i + 1);
if (j === -1) {
  console.log('Only one declaration; no duplicate.');
  process.exit(0);
}
// Find extent of second declaration (next function or end of similar block)
let end = js.indexOf('\nfunction ', j + 1);
if (end === -1) end = js.indexOf('\nasync function ', j + 1);
if (end === -1) end = js.length;
const prev = js.lastIndexOf('\n', end - 1);
const block = js.slice(j, prev + 1);
// Remove second declaration (keep first)
js = js.slice(0, j) + js.slice(prev + 1);
fs.writeFileSync(appPath, js);
console.log('Removed duplicate updateDonateNavVisibility.');
require('child_process').execSync('node --check "' + appPath + '"', { stdio: 'pipe' });
console.log('Syntax OK.');
