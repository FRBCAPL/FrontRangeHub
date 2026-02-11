/**
 * Split 17k app.js into smaller files. Run: node split-dues-public.cjs
 */
const fs = require('fs');
const path = require('path');
const BASE = __dirname;

let js = fs.readFileSync(path.join(BASE, 'app.js'), 'utf8');
let html = fs.readFileSync(path.join(BASE, 'index.html'), 'utf8');

function w(t, c) { fs.writeFileSync(path.join(BASE, t), c); }

if (js.includes('function formatDate(dateString)')) {
  const i = js.indexOf('function formatDate(dateString)');
  const j = js.indexOf('// Division filtering');
  if (j > i) {
    js = js.slice(0, i) + '/* formatDate, formatCurrency -> dues-utils.js */\n\n' + js.slice(j);
    w('dues-utils.js', "function formatDate(d){return new Date(d).toLocaleDateString()}\nfunction formatCurrency(a){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(a)}\n");
    if (!html.includes('dues-utils.js')) html = html.replace('<script src="app.js"></script>', '<script src="dues-utils.js"></script>\n    <script src="app.js"></script>');
    console.log('Phase 1 done.');
  }
}

if (js.includes('function showPlayersView(') && js.includes('function showPaymentHistory(')) {
  const i = js.indexOf('function showPlayersView(');
  const j = js.indexOf('function showPaymentHistory(');
  if (j > i) {
    w('dues-players.js', '/* players */\n' + js.slice(i, j));
    js = js.slice(0, i) + '/* players -> dues-players.js */\n\n' + js.slice(j);
    if (!html.includes('dues-players.js')) html = html.replace('<script src="app.js"></script>', '<script src="app.js"></script>\n    <script src="dues-players.js"></script>');
    console.log('Phase 2 done.');
  }
}

if (js.includes('function calculateFinancialBreakdown(') && js.includes('function showWeeklyPaymentModal(')) {
  const i = js.indexOf('function calculateFinancialBreakdown(');
  const j = js.indexOf('function showWeeklyPaymentModal(');
  if (j > i) {
    w('dues-financial.js', '/* financial */\n' + js.slice(i, j));
    js = js.slice(0, i) + '/* financial -> dues-financial.js */\n\n' + js.slice(j);
    if (!html.includes('dues-financial.js')) html = html.replace('<script src="app.js"></script>', '<script src="dues-financial.js"></script>\n    <script src="app.js"></script>');
    console.log('Phase 3 done.');
  }
}

if (js.includes('function showDivisionManagement(')) {
  let end = js.indexOf('function formatDate(dateString)');
  if (end === -1) end = js.indexOf('/* formatDate, formatCurrency');
  const i = js.indexOf('function showDivisionManagement(');
  if (end > i) {
    w('dues-divisions.js', '/* divisions */\n' + js.slice(i, end));
    js = js.slice(0, i) + '/* divisions -> dues-divisions.js */\n\n' + js.slice(end);
    if (!html.includes('dues-divisions.js')) {
      if (html.includes('dues-financial.js')) html = html.replace('<script src="dues-financial.js"></script>', '<script src="dues-divisions.js"></script>\n    <script src="dues-financial.js"></script>');
      else html = html.replace('<script src="app.js"></script>', '<script src="dues-divisions.js"></script>\n    <script src="app.js"></script>');
    }
    console.log('Phase 4 done.');
  }
}

w('app.js', js);
w('index.html', html);
console.log('Done. app.js is now smaller.');
