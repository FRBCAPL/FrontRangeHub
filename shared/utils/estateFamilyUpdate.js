/**
 * Estate Vault — Family Update package (beneficiary-facing).
 *
 * Different from the Court Evidence Pack: no sealed bank statements, no
 * private court binder. Staged transparency for heirs and their counsel.
 */

import { APP_NAME, distributionClassificationLabel } from './estateInventoryConstants.js';
import { formatMoney } from './estateFinance.js';
import { buildDisclosureTimeline } from './estateDisclosureTimeline.js';
import { buildInventoryReconciliation } from './estateInventoryReconciliation.js';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {object} params
 * @param {object} params.settings
 * @param {Array}  params.items
 * @param {Array}  [params.distributions]
 * @param {object} [params.finance] optional summary totals (no account last4/statements)
 * @param {object} [params.auction] { paid, outstanding, unsold }
 * @param {string} [params.visibilityNote]
 */
export function buildFamilyUpdatePackage({
  settings = {},
  items = [],
  distributions = [],
  finance = null,
  auction = null,
  visibilityNote = null,
  generatedAt = new Date().toISOString()
} = {}) {
  const timeline = buildDisclosureTimeline({ settings, items, distributions });
  const reconciliation = buildInventoryReconciliation(items);
  const finalized = (distributions || []).filter((row) => row.status === 'finalized');

  const distributionLines = finalized.flatMap((distribution) =>
    (distribution.recipients || []).map((recipient) => ({
      date: distribution.distribution_date,
      classification: distribution.classification || 'partial',
      recipientName: recipient.recipient_name,
      cash: Number(recipient.cash_amount) || 0,
      property: (recipient.items || []).reduce(
        (sum, item) =>
          sum + (Number(item.estimated_value_snapshot ?? item.estimated_value) || 0),
        0
      )
    }))
  );

  const paidTotal = (auction?.paid || []).reduce(
    (sum, row) => sum + (Number(row.highest_bid) || 0),
    0
  );
  const outstandingTotal = (auction?.outstanding || []).reduce(
    (sum, row) => sum + (Number(row.highest_bid) || 0),
    0
  );

  const nextSteps = [];
  if (!settings.letters_issued_at) nextSteps.push('Set Letters issued date.');
  if (!timeline.inventoryComplete) nextSteps.push('Complete and certify the inventory.');
  if (!timeline.probateEnded) nextSteps.push('Wait for the claims / probate window to close before final accounting.');
  if ((auction?.outstanding || []).length) {
    nextSteps.push('Collect outstanding auction payments and update account balances.');
  }
  if (!finalized.length) nextSteps.push('Record distributions when the estate is ready.');
  if (!settings.closed_at) {
    nextSteps.push('Generate formal accounting and close the estate for records when finished.');
  }
  if (!nextSteps.length) nextSteps.push('No open staged actions recorded.');

  return {
    version: 1,
    generatedAt,
    estateName: settings.estate_name || 'Estate',
    caseNumber: settings.case_number || null,
    courtCaseNumber: settings.court_case_number || null,
    timeline,
    reconciliation,
    distributionLines,
    finance: finance
      ? {
          estateBalance: Number(finance.netDistributable) || 0,
          grossAssets: Number(finance.grossEstateValue) || 0,
          debts: Number(finance.accountDebtsTotal) || 0,
          expenses: Number(finance.expensesTotal) || 0,
          distributedCash: Number(finance.distributedCashTotal) || 0,
          distributedProperty: Number(finance.distributedPropertyValue) || 0
        }
      : null,
    auction: {
      paidTotal,
      outstandingTotal,
      expectedTotal: paidTotal + outstandingTotal,
      paidCount: (auction?.paid || []).length,
      outstandingCount: (auction?.outstanding || []).length,
      unsoldCount: (auction?.unsold || []).length,
      lotCount: reconciliation.auctionLotCount
    },
    nextSteps,
    visibilityNote,
    whyNotFinal: timeline.whyNotFinal
  };
}

export function buildFamilyUpdateHtml(pack) {
  const p = pack || {};
  const caseLabel = p.courtCaseNumber || p.caseNumber || 'estate';

  const timelineRows = (p.timeline?.events || [])
    .map(
      (event) => `<tr>
      <td>${esc(event.dateLabel || '—')}</td>
      <td>${esc(event.title)}</td>
      <td>${esc(event.detail)}</td>
      <td>${esc(event.status)}</td>
    </tr>`
    )
    .join('');

  const reconRows = (p.reconciliation?.allBuckets || [])
    .filter((bucket) => bucket.count > 0)
    .map(
      (bucket) => `<tr>
      <td>${esc(bucket.label || bucket.key)}</td>
      <td>${esc(bucket.count)}</td>
    </tr>`
    )
    .join('');

  const distributionRows = (p.distributionLines || [])
    .map(
      (row) => `<tr>
      <td>${esc(row.date || '—')}</td>
      <td>${esc(distributionClassificationLabel(row.classification))}</td>
      <td>${esc(row.recipientName)}</td>
      <td>${formatMoney(row.cash)}</td>
      <td>${formatMoney(row.property)}</td>
    </tr>`
    )
    .join('');

  const nextList = (p.nextSteps || []).map((step) => `<li>${esc(step)}</li>`).join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>${esc(APP_NAME)} — Family Update — ${esc(caseLabel)}</title>
<style>
body{font-family:Georgia,"Times New Roman",serif;color:#1c1917;max-width:860px;margin:28px auto;padding:0 20px;background:#fafaf9}
h1{font-size:1.5rem;margin:0 0 .2rem}h2{font-size:1.08rem;border-bottom:2px solid #78716c;padding-bottom:.2rem;margin:1.35rem 0 .5rem}
.meta,.muted{color:#57534e}.notice{border:1px solid #a8a29e;background:#fff;padding:.75rem;margin:1rem 0}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:.35rem 1rem;margin:.6rem 0}
table{width:100%;border-collapse:collapse;background:#fff;margin:.4rem 0 1rem}
th,td{border:1px solid #d6d3d1;padding:.4rem;text-align:left;font-size:.83rem;vertical-align:top}th{background:#f5f5f4}
.toolbar{margin-bottom:1rem}@media print{.toolbar{display:none}body{background:#fff}}
</style></head><body>
<div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button></div>
<h1>${esc(APP_NAME)} — Family Update</h1>
<div class="meta">${esc(p.estateName || 'Estate')} · Case ${esc(caseLabel)}</div>
<div class="meta">Generated ${esc(new Date(p.generatedAt || Date.now()).toLocaleString())}</div>

<div class="notice">
  <strong>Staged transparency for beneficiaries — not a court binder and not a tax return.</strong>
  This update explains where the estate is in the process and what has been disclosed so far.
  Bank statements and sealed court evidence stay with the Personal Representative unless separately shared.
</div>

<div class="notice"><strong>Why final numbers may not appear yet:</strong> ${esc(p.whyNotFinal)}</div>
${p.visibilityNote ? `<p class="muted">${esc(p.visibilityNote)}</p>` : ''}

<h2>Disclosure timeline</h2>
<table><thead><tr><th>When</th><th>Milestone</th><th>Detail</th><th>Status</th></tr></thead>
<tbody>${timelineRows || '<tr><td colspan="4">No timeline events</td></tr>'}</tbody></table>

<h2>Inventory summary</h2>
<div class="grid">
  <div><strong>Total items:</strong> ${esc(p.reconciliation?.total || 0)}</div>
  <div><strong>Auction lots:</strong> ${esc(p.reconciliation?.auctionLotCount || 0)}</div>
  <div><strong>Distributed:</strong> ${esc(p.reconciliation?.distributedCount || 0)}</div>
  <div><strong>Held / remaining:</strong> ${esc(p.reconciliation?.heldCount || 0)}</div>
</div>
<table><thead><tr><th>Disposition</th><th>Count</th></tr></thead>
<tbody>${reconRows || '<tr><td colspan="2">No items</td></tr>'}</tbody></table>

<h2>Auction status</h2>
<div class="grid">
  <div><strong>Expected proceeds:</strong> ${formatMoney(p.auction?.expectedTotal)}</div>
  <div><strong>Collected:</strong> ${formatMoney(p.auction?.paidTotal)}</div>
  <div><strong>Outstanding:</strong> ${formatMoney(p.auction?.outstandingTotal)}</div>
  <div><strong>Unsold approved lots:</strong> ${esc(p.auction?.unsoldCount || 0)}</div>
</div>

<h2>Distributions recorded</h2>
<table><thead><tr><th>Date</th><th>Type</th><th>Recipient</th><th>Cash</th><th>Property</th></tr></thead>
<tbody>${distributionRows || '<tr><td colspan="5">No finalized distributions</td></tr>'}</tbody></table>

${
  p.finance
    ? `<h2>Staged financial snapshot</h2>
<div class="grid">
  <div><strong>Estimated estate balance:</strong> ${formatMoney(p.finance.estateBalance)}</div>
  <div><strong>Gross assets:</strong> ${formatMoney(p.finance.grossAssets)}</div>
  <div><strong>Debts:</strong> ${formatMoney(p.finance.debts)}</div>
  <div><strong>Expenses (activity):</strong> ${formatMoney(p.finance.expenses)}</div>
  <div><strong>Cash distributed:</strong> ${formatMoney(p.finance.distributedCash)}</div>
  <div><strong>Property distributed:</strong> ${formatMoney(p.finance.distributedProperty)}</div>
</div>
<p class="muted">Account balances are the source of truth. Expenses and distributions are activity records and are not subtracted again from the live estate balance.</p>`
    : ''
}

<h2>Projected next steps</h2>
<ul>${nextList}</ul>

<p class="muted">${esc(APP_NAME)} Family Update v${esc(p.version)} · Request for staged transparency, not continuous live financial access.</p>
</body></html>`;
}

export function openFamilyUpdate(pack) {
  const win = window.open('', '_blank');
  if (!win) return { success: false, error: 'Popup blocked. Allow popups and try again.' };
  win.document.open();
  win.document.write(buildFamilyUpdateHtml(pack));
  win.document.close();
  return { success: true };
}
