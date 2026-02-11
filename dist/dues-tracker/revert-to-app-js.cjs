const fs = require('fs');
const path = require('path');
const idx = path.join(__dirname, 'index.html');
let html = fs.readFileSync(idx, 'utf8');
html = html.replace(/\s*<script src="split\/app-\d+\.js"><\/script>\n/g, '');
html = html.replace('</body>', '    <script src="app.js"></script>\n</body>');
fs.writeFileSync(idx, html);
console.log('Reverted to app.js');