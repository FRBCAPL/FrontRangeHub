import { APP_NAME, legalStatusLabel, valueTierLabel } from './estateInventoryConstants.js';
import { getPhotoEntries } from './estatePhotoMeta.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(value) {
  const n = Number(value);
  return Number.isFinite(n)
    ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : '—';
}

function safeFilePart(value) {
  return String(value || 'estate')
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'estate';
}

export async function sha256Text(text) {
  if (!globalThis.crypto?.subtle) return null;
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function sealCourtPack(pack) {
  const unsealed = { ...pack };
  delete unsealed.manifest;
  const canonical = JSON.stringify(unsealed);
  const hash = await sha256Text(canonical);
  return {
    ...unsealed,
    manifest: {
      algorithm: hash ? 'SHA-256' : 'unavailable',
      content_hash: hash,
      scope: 'All court-pack JSON fields except manifest',
      generated_at: pack.generated_at
    }
  };
}

export function downloadCourtPackJson(pack) {
  const json = JSON.stringify(pack, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `estate-court-pack-${safeFilePart(pack?.estate?.court_case_number || pack?.estate?.case_number)}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function itemRows(items) {
  return (items || [])
    .map((item) => {
      const photos = getPhotoEntries(item);
      return `<tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.room || 'Unassigned')}</td>
        <td>${escapeHtml(valueTierLabel(item.value_tier))}</td>
        <td>${escapeHtml(legalStatusLabel(item.legal_status))}</td>
        <td>${escapeHtml(item.assigned_beneficiary || '—')}</td>
        <td>${escapeHtml(
          item.disputed_at
            ? 'Disputed'
            : Array.isArray(item.sibling_claims) && item.sibling_claims.length
              ? `${item.sibling_claims.length} claim(s)`
              : '—'
        )}</td>
        <td>${photos.length}</td>
        <td>${Array.isArray(item.change_history) ? item.change_history.length : 0}</td>
      </tr>`;
    })
    .join('');
}

function activityRows(events) {
  return (events || [])
    .map(
      (event) => `<tr>
        <td>${escapeHtml(event.created_at ? new Date(event.created_at).toLocaleString() : '—')}</td>
        <td>${escapeHtml(event.event_type)}</td>
        <td>${escapeHtml(event.actor_name || event.actor_email || event.actor_role || 'System')}</td>
        <td>${escapeHtml(event.summary || '—')}</td>
      </tr>`
    )
    .join('');
}

function expenseRows(expenses) {
  return (expenses || [])
    .map(
      (expense) => `<tr>
        <td>${escapeHtml(expense.date_paid ? new Date(expense.date_paid).toLocaleDateString() : '—')}</td>
        <td>${escapeHtml(expense.expense_name)}</td>
        <td>${escapeHtml(formatMoney(expense.amount))}</td>
        <td>${escapeHtml(expense.receipt_url ? 'Receipt linked' : '—')}</td>
      </tr>`
    )
    .join('');
}

function auctionRows(lines) {
  return [...(lines?.paid || []), ...(lines?.outstanding || [])]
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(formatMoney(item.highest_bid))}</td>
        <td>${item.auction_paid_at ? `Paid ${escapeHtml(new Date(item.auction_paid_at).toLocaleDateString())}` : 'Outstanding'}</td>
      </tr>`
    )
    .join('');
}

function section(title, content) {
  return `<section><h2>${escapeHtml(title)}</h2>${content}</section>`;
}

export function buildCourtPackHtml(pack) {
  const estate = pack.estate || {};
  const finance = pack.finance || {};
  const inventory = pack.inventory || [];
  const scenes = pack.scenes || [];
  const heirs = pack.heirs || [];
  const activity = pack.activity || [];
  const auction = pack.auction || { paid: [], outstanding: [] };
  const warnings = pack.warnings || [];
  const caseLabel = estate.court_case_number || estate.case_number || 'estate';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(APP_NAME)} Court Evidence Pack — ${escapeHtml(caseLabel)}</title>
  <style>
    body{font-family:Georgia,"Times New Roman",serif;color:#1c1917;margin:1.25rem;background:#fafaf9}
    h1{margin:0 0 .25rem;font-size:1.65rem}h2{font-size:1.15rem;border-bottom:2px solid #78716c;padding-bottom:.25rem;margin-top:1.5rem}
    .meta,.muted{color:#57534e}.notice{border:1px solid #a8a29e;background:#fff;padding:.75rem;margin:1rem 0}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem 1rem}
    table{width:100%;border-collapse:collapse;background:#fff}th,td{border:1px solid #d6d3d1;padding:.4rem;text-align:left;vertical-align:top;font-size:.82rem}
    th{background:#f5f5f4;font-family:system-ui,sans-serif}.toolbar{margin-bottom:1rem}.hash{font-family:monospace;word-break:break-all;font-size:.75rem}
    @media print{.toolbar{display:none}body{margin:.45in;background:#fff}section{break-inside:avoid}}
  </style>
</head>
<body>
  <div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button></div>
  <h1>${escapeHtml(APP_NAME)} — Court Evidence Pack</h1>
  <div class="meta">Case ${escapeHtml(caseLabel)} · Generated ${escapeHtml(new Date(pack.generated_at).toLocaleString())}</div>
  <div class="notice"><strong>Point-in-time evidence copy.</strong> This report is read-only. The companion JSON contains the full machine-readable record and SHA-256 manifest.</div>

  ${section('Estate identity', `<div class="grid">
    <div><strong>Estate:</strong> ${escapeHtml(estate.estate_name || '—')}</div>
    <div><strong>Court case:</strong> ${escapeHtml(estate.court_case_number || '—')}</div>
    <div><strong>Portal case:</strong> ${escapeHtml(estate.case_number || '—')}</div>
    <div><strong>Primary representative:</strong> ${escapeHtml(estate.owner_email || '—')}</div>
    <div><strong>Letters issued:</strong> ${escapeHtml(estate.letters_issued_at || '—')}</div>
    <div><strong>Record status:</strong> ${estate.closed_at ? `Closed ${escapeHtml(estate.closed_at)}` : 'Open'}</div>
  </div>`)}

  ${section(`Inventory (${inventory.length})`, `<table><thead><tr><th>Item</th><th>Room</th><th>Value tier</th><th>Legal status</th><th>Beneficiary</th><th>Claims / dispute</th><th>Photos</th><th>Changes</th></tr></thead><tbody>${itemRows(inventory) || '<tr><td colspan="8">No items</td></tr>'}</tbody></table>`)}

  ${section(`Scene documentation (${scenes.length})`, `<p>${scenes.length} room/scene capture(s), including provenance metadata and change histories, are included in the companion JSON.</p>`)}

  ${section('Finance snapshot', `<div class="grid">
    <div><strong>PR loans:</strong> ${formatMoney(finance.prLoansTotal)}</div>
    <div><strong>Other cash:</strong> ${formatMoney(finance.otherCashOnHand)}</div>
    <div><strong>Approved expenses:</strong> ${formatMoney(finance.expensesTotal)}</div>
    <div><strong>Paid auction sales:</strong> ${formatMoney(finance.paidAuctionSales)}</div>
    <div><strong>Outstanding bids:</strong> ${formatMoney(finance.outstandingBids)}</div>
    <div><strong>Net cash:</strong> ${formatMoney(finance.netCashRemaining)}</div>
  </div>
  <table><thead><tr><th>Date</th><th>Expense</th><th>Amount</th><th>Receipt</th></tr></thead><tbody>${expenseRows(finance.expenses) || '<tr><td colspan="4">No expenses</td></tr>'}</tbody></table>`)}

  ${section('Auction payment state', `<table><thead><tr><th>Item</th><th>Highest bid</th><th>Payment state</th></tr></thead><tbody>${auctionRows(auction) || '<tr><td colspan="3">No auction bid lines</td></tr>'}</tbody></table>`)}

  ${section(`Heirs / family (${heirs.length})`, `<p>${heirs.map((h) => escapeHtml(h.preferred_name || h.display_name)).join(', ') || 'No heirs configured.'}</p>`)}

  ${section(`Activity trail (${activity.length})`, `<table><thead><tr><th>When</th><th>Action</th><th>Actor</th><th>Summary</th></tr></thead><tbody>${activityRows(activity) || '<tr><td colspan="4">No events</td></tr>'}</tbody></table>`)}

  ${warnings.length ? section('Collection warnings', `<ul>${warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul>`) : ''}
  ${section('Manifest', `<p>SHA-256 content hash:</p><div class="hash">${escapeHtml(pack.manifest?.content_hash || 'Hash unavailable in this browser')}</div>`)}
</body>
</html>`;
}

export function writeCourtPackWindow(targetWindow, pack) {
  const html = buildCourtPackHtml(pack);
  if (targetWindow && !targetWindow.closed) {
    targetWindow.document.open();
    targetWindow.document.write(html);
    targetWindow.document.close();
    return { success: true };
  }
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, '_blank');
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  return opened ? { success: true } : { success: false, error: 'Pop-up blocked.' };
}
