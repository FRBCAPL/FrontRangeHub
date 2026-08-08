/**
 * Auction reconciliation — sold / pending / unsold lots and cash totals.
 * Pure helpers used by the PR printable report and (via RPC) family Full view.
 */

import { APP_NAME } from './estateInventoryConstants.js';
import { formatMoney, sumOutstandingBids, sumPaidAuctionSales } from './estateFinance.js';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {object} params
 * @param {Array} [params.items] estate items (or auction lines)
 * @param {Array} [params.paid] optional pre-split paid list
 * @param {Array} [params.outstanding] optional pre-split outstanding list
 */
export function buildAuctionReconciliation({
  items = null,
  paid = null,
  outstanding = null,
  unsold = null,
  estateName = 'Estate',
  caseNumber = null
} = {}) {
  let paidRows = paid;
  let outstandingRows = outstanding;
  let unsoldRows = unsold;

  if (Array.isArray(items)) {
    paidRows = [];
    outstandingRows = [];
    unsoldRows = [];
    for (const item of items) {
      const bid = Number(item?.highest_bid) || 0;
      if (item?.auction_paid_at && bid > 0) {
        paidRows.push(item);
      } else if (bid > 0) {
        outstandingRows.push(item);
      } else if (item?.approved_for_sale && item?.legal_status !== 'archived') {
        unsoldRows.push(item);
      }
    }
  }

  paidRows = paidRows || [];
  outstandingRows = outstandingRows || [];
  unsoldRows = unsoldRows || [];

  const paidTotal = sumPaidAuctionSales(paidRows);
  const outstandingTotal = sumOutstandingBids(outstandingRows);

  return {
    estateName,
    caseNumber,
    paid: paidRows,
    outstanding: outstandingRows,
    unsold: unsoldRows,
    paidTotal,
    outstandingTotal,
    expectedTotal: paidTotal + outstandingTotal,
    approvedLotCount: paidRows.length + outstandingRows.length + unsoldRows.length,
    soldCount: paidRows.length + outstandingRows.length
  };
}

export function buildAuctionReconciliationHtml(report) {
  const r = report || {};
  const caseLabel = r.caseNumber || 'estate';

  const rowHtml = (rows, status) =>
    (rows || [])
      .map(
        (row) => `<tr>
      <td>${esc(row.name)}</td>
      <td>${formatMoney(row.highest_bid)}</td>
      <td>${esc(status)}</td>
    </tr>`
      )
      .join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>${esc(APP_NAME)} — Sale inventory reconciliation — ${esc(caseLabel)}</title>
<style>
body{font-family:Georgia,"Times New Roman",serif;color:#1c1917;max-width:820px;margin:28px auto;padding:0 20px}
h1{font-size:1.5rem;margin:0 0 .2rem}h2{font-size:1.05rem;border-bottom:2px solid #78716c;padding-bottom:.2rem;margin:1.3rem 0 .5rem}
.meta,.muted{color:#57534e}.notice{border:1px solid #a8a29e;background:#fff;padding:.75rem;margin:1rem 0}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:.4rem 1rem;margin:.6rem 0}
table{width:100%;border-collapse:collapse;background:#fff}th,td{border:1px solid #d6d3d1;padding:.4rem;text-align:left;font-size:.85rem}
th{background:#f5f5f4}.toolbar{margin-bottom:1rem}
@media print{.toolbar{display:none}}
</style></head><body>
<div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button></div>
<h1>${esc(APP_NAME)} — Sale/Auction Reconciliation</h1>
<div class="meta">${esc(r.estateName || 'Estate')} · Case ${esc(caseLabel)}</div>
<div class="notice">
  <strong>Trust report for sale inventory activity.</strong>
  Paid bids should already be reflected in estate account balances.
  Outstanding bids are expected proceeds not yet collected.
</div>
<div class="grid">
  <div><strong>Approved / listed lots:</strong> ${esc(r.approvedLotCount || 0)}</div>
  <div><strong>Sold (bid received):</strong> ${esc(r.soldCount || 0)}</div>
  <div><strong>Expected proceeds:</strong> ${formatMoney(r.expectedTotal)}</div>
  <div><strong>Collected:</strong> ${formatMoney(r.paidTotal)}</div>
  <div><strong>Outstanding:</strong> ${formatMoney(r.outstandingTotal)}</div>
  <div><strong>Unsold approved lots:</strong> ${esc((r.unsold || []).length)}</div>
</div>

<h2>Collected</h2>
<table><thead><tr><th>Item</th><th>Winning bid</th><th>Status</th></tr></thead>
<tbody>${rowHtml(r.paid, 'Paid / deposited') || '<tr><td colspan="3">None</td></tr>'}</tbody></table>

<h2>Outstanding</h2>
<table><thead><tr><th>Item</th><th>Winning bid</th><th>Status</th></tr></thead>
<tbody>${rowHtml(r.outstanding, 'Pending collection') || '<tr><td colspan="3">None</td></tr>'}</tbody></table>

<h2>Unsold (approved, no bid)</h2>
<table><thead><tr><th>Item</th><th>Winning bid</th><th>Status</th></tr></thead>
<tbody>${rowHtml(r.unsold, 'No bids') || '<tr><td colspan="3">None</td></tr>'}</tbody></table>

<p class="muted">Generated ${esc(new Date().toLocaleString())}</p>
</body></html>`;
}

export function openAuctionReconciliation(report) {
  const win = window.open('', '_blank');
  if (!win) return { success: false, error: 'Popup blocked. Allow popups and try again.' };
  win.document.open();
  win.document.write(buildAuctionReconciliationHtml(report));
  win.document.close();
  return { success: true };
}
