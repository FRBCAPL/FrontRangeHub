/**
 * Patch index.html to load split chunks instead of app.js
 * Run from this folder: node patch-index-for-split.cjs
 */
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const idx = path.join(dir, 'index.html');
const splitDir = path.join(dir, 'split');

const chunks = fs.readdirSync(splitDir)
  .filter(f => f.startsWith('app-') && f.endsWith('.js'))
  .sort((a, b) => parseInt(a.match(/\d+/), 10) - parseInt(b.match(/\d+/), 10));

if (chunks.length === 0) {
  console.error('No split chunks in', splitDir);
  process.exit(1);
}

let html = fs.readFileSync(idx, 'utf8');
const scriptTags = chunks.map(c => `    <script src="split/${c}"></script>`).join('\n');
html = html.replace(/<script\s+src=["']app\.js["'][^>]*><\/script>/i, scriptTags);
fs.writeFileSync(idx, html);
console.log('Patched index.html to load', chunks.length, 'split chunks');