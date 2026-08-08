/**
 * Estate Vault — Family Update package (beneficiary-facing).
 *
 * Different from the Court Evidence Pack: no sealed bank statements, no
 * private court binder. Staged transparency for heirs and their counsel.
 */

import { APP_NAME, distributionClassificationLabel, formatEstateDisplayDate } from './estateInventoryConstants.js';
import { formatMoney, sumOutstandingBids, sumPaidAuctionSales } from './estateFinance.js';
import { buildDisclosureTimeline } from './estateDisclosureTimeline.js';
import { buildInventoryReconciliation } from './estateInventoryReconciliation.js';
import { buildSimpleTextPdf, downloadPdfBytes } from './estateSimplePdf.js';
import { saleAuctionCopy } from './estateSaleAuctionCopy.js';

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
  decisionNotes = [],
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

  const paidTotal = sumPaidAuctionSales(auction?.paid || []);
  const outstandingTotal = sumOutstandingBids(auction?.outstanding || []);

  const nextSteps = [];
  if (!settings.letters_issued_at) nextSteps.push('Set Letters issued date.');
  if (!timeline.inventoryComplete) nextSteps.push('Complete and certify the inventory.');
  if (!timeline.probateEnded) nextSteps.push('Wait for the claims / probate window to close before final accounting.');
  if ((auction?.outstanding || []).length) {
    nextSteps.push('Collect outstanding sale payments and update account balances.');
  }
  if (!finalized.length) nextSteps.push('Record distributions when the estate is ready.');
  if (!settings.closed_at) {
    nextSteps.push('Generate formal accounting and close the estate for records when finished.');
  }
  if (!nextSteps.length) nextSteps.push('No open staged actions recorded.');

  const disputedCount = (items || []).filter(
    (item) => item.legal_status === 'disputed'
  ).length;
  const expenseNames = (finance?.expenses || [])
    .slice(0, 6)
    .map((row) => row.expense_name || row.name)
    .filter(Boolean);

  const digest = {
    generatedLabel: formatEstateDisplayDate(generatedAt) || String(generatedAt).slice(0, 10),
    claims: {
      windowOpen: !timeline.probateEnded,
      windowEndLabel: timeline.events?.find((e) => e.key === 'claims')?.dateLabel || null,
      note: timeline.probateEnded
        ? 'Claims / probate window closed on the recorded end date.'
        : 'Creditor claims period still open or not fully configured — final residual figures are not expected yet.'
    },
    auction: {
      approved: reconciliation.auctionBreakdown?.approvedCount || reconciliation.auctionLotCount,
      listed: reconciliation.auctionBreakdown?.listedCount || 0,
      notListed: reconciliation.auctionBreakdown?.notListedCount || 0,
      paid: reconciliation.auctionPaidCount,
      pendingPayment: reconciliation.auctionPendingCount,
      expectedProceeds: paidTotal + outstandingTotal,
      collected: paidTotal,
      outstanding: outstandingTotal
    },
    inventory: {
      total: reconciliation.total,
      distributed: reconciliation.distributedCount,
      held: reconciliation.heldCount,
      disputed: disputedCount
    },
    expenses: {
      total: Number(finance?.expensesTotal) || 0,
      highlights: expenseNames
    },
    distributions: {
      batches: finalized.length,
      cash: Number(finance?.distributedCashTotal) || sumFromLines(distributionLines, 'cash'),
      property: Number(finance?.distributedPropertyValue) || sumFromLines(distributionLines, 'property')
    },
    upcoming: nextSteps.slice(0, 4)
  };

  return {
    version: 2,
    generatedAt,
    estateName: settings.estate_name || 'Estate',
    caseNumber: settings.case_number || null,
    courtCaseNumber: settings.court_case_number || null,
    digest,
    timeline,
    reconciliation,
    distributionLines,
    finance: finance
      ? {
          estateBalance: Number(finance.netDistributable) || 0,
          grossAssets: Number(finance.grossEstateValue) || 0,
          debts: Number(finance.totalLiabilities) || 0,
          accountDebts: Number(finance.accountDebtsTotal) || 0,
          prLoans: Number(finance.prLoansTotal) || 0,
          expenses: Number(finance.expensesTotal) || 0,
          distributedCash: Number(finance.distributedCashTotal) || 0,
          distributedProperty: Number(finance.distributedPropertyValue) || 0,
          fundsAvailable: Number(finance.fundsAvailable) || 0,
          undepositedPaidSales: Number(finance.undepositedPaidSales) || 0
        }
      : null,
    auction: {
      paidTotal,
      outstandingTotal,
      expectedTotal: paidTotal + outstandingTotal,
      paidCount: (auction?.paid || []).length,
      outstandingCount: (auction?.outstanding || []).length,
      unsoldCount: (auction?.unsold || []).length,
      lotCount: reconciliation.auctionLotCount,
      approvedCount: reconciliation.auctionBreakdown?.approvedCount || 0,
      listedCount: reconciliation.auctionBreakdown?.listedCount || 0,
      notListedCount: reconciliation.auctionBreakdown?.notListedCount || 0,
      notListed: (reconciliation.auctionBreakdown?.notListed || []).map((item) => ({
        name: item.name,
        reason: item.not_listed_reason
      })),
      summaryLabel: reconciliation.auctionBreakdown?.summaryLabel || null
    },
    nextSteps,
    visibilityNote,
    whyNotFinal: timeline.whyNotFinal,
    decisionNotes: (decisionNotes || [])
      .slice(0, 12)
      .map((row) => ({
        at: row.created_at,
        topic: row.metadata?.topic || 'general',
        note: row.metadata?.note || row.summary || '',
        dateLabel: formatEstateDisplayDate(row.created_at) || String(row.created_at || '').slice(0, 10)
      }))
  };
}

function sumFromLines(lines, key) {
  return (lines || []).reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
}

export function buildFamilyUpdateHtml(pack) {
  const p = pack || {};
  const caseLabel = p.courtCaseNumber || p.caseNumber || 'estate';
  const notListedRows = (p.auction?.notListed || [])
    .map(
      (row) => `<tr>
      <td>${esc(row.name)}</td>
      <td>${esc(row.reason || '—')}</td>
    </tr>`
    )
    .join('');

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

${
  p.digest
    ? `<h2>At a glance</h2>
<div class="grid">
  <div><strong>Inventory:</strong> ${esc(p.digest.inventory?.total || 0)} recorded · ${esc(
        p.digest.inventory?.distributed || 0
      )} distributed · ${esc(p.digest.inventory?.disputed || 0)} disputed</div>
  <div><strong>${esc(saleAuctionCopy.shortCap)}:</strong> ${esc(p.digest.auction?.paid || 0)} paid · ${esc(
        p.digest.auction?.pendingPayment || 0
      )} pending payment · ${esc(p.digest.auction?.notListed || 0)} approved not listed</div>
  <div><strong>Claims window:</strong> ${esc(
    p.digest.claims?.windowEndLabel
      ? p.digest.claims.windowOpen
        ? `Open until ${p.digest.claims.windowEndLabel}`
        : `Closed ${p.digest.claims.windowEndLabel}`
      : p.digest.claims?.note || '—'
  )}</div>
  <div><strong>Distributions:</strong> ${esc(p.digest.distributions?.batches || 0)} batch(es) · cash ${formatMoney(
        p.digest.distributions?.cash
      )}</div>
</div>
${
  (p.digest.expenses?.highlights || []).length
    ? `<p class="muted"><strong>Expense highlights:</strong> ${esc(
        p.digest.expenses.highlights.join(' · ')
      )}</p>`
    : ''
}
${
  (p.digest.upcoming || []).length
    ? `<p><strong>Upcoming:</strong> ${esc(p.digest.upcoming.join(' · '))}</p>`
    : ''
}
${
  (p.decisionNotes || []).length
    ? `<h2>PR explanation notes</h2>
<table><thead><tr><th>When</th><th>Topic</th><th>Note</th></tr></thead>
<tbody>${(p.decisionNotes || [])
  .map(
    (row) => `<tr>
  <td>${esc(row.dateLabel || '—')}</td>
  <td>${esc(row.topic || 'general')}</td>
  <td>${esc(row.note || '')}</td>
</tr>`
  )
  .join('')}</tbody></table>`
    : ''
}`
    : ''
}

<h2>Disclosure timeline</h2>
<table><thead><tr><th>When</th><th>Milestone</th><th>Detail</th><th>Status</th></tr></thead>
<tbody>${timelineRows || '<tr><td colspan="4">No timeline events</td></tr>'}</tbody></table>

<h2>Inventory summary</h2>
<div class="grid">
  <div><strong>Total items:</strong> ${esc(p.reconciliation?.total || 0)}</div>
  <div><strong>${esc(saleAuctionCopy.lots)}:</strong> ${esc(p.reconciliation?.auctionLotCount || 0)}</div>
  <div><strong>Distributed:</strong> ${esc(p.reconciliation?.distributedCount || 0)}</div>
  <div><strong>Held / remaining:</strong> ${esc(p.reconciliation?.heldCount || 0)}</div>
</div>
<table><thead><tr><th>Disposition</th><th>Count</th></tr></thead>
<tbody>${reconRows || '<tr><td colspan="2">No items</td></tr>'}</tbody></table>

<h2>${esc(saleAuctionCopy.status)}</h2>
<div class="grid">
  <div><strong>${esc(saleAuctionCopy.approvedFor)}:</strong> ${esc(p.auction?.approvedCount || p.auction?.lotCount || 0)}</div>
  <div><strong>${esc(saleAuctionCopy.onCatalog)}:</strong> ${esc(p.auction?.listedCount || 0)}</div>
  <div><strong>${esc(saleAuctionCopy.approvedNotListed)}:</strong> ${esc(p.auction?.notListedCount || 0)}</div>
  <div><strong>Expected proceeds:</strong> ${formatMoney(p.auction?.expectedTotal)}</div>
  <div><strong>Collected:</strong> ${formatMoney(p.auction?.paidTotal)}</div>
  <div><strong>Outstanding:</strong> ${formatMoney(p.auction?.outstandingTotal)}</div>
</div>
${p.auction?.summaryLabel ? `<p class="muted">${esc(p.auction.summaryLabel)}</p>` : ''}
<table><thead><tr><th>Approved but not listed</th><th>Reason</th></tr></thead>
<tbody>${
    notListedRows ||
    `<tr><td colspan="2">None — approved items match the ${esc(saleAuctionCopy.catalog.toLowerCase())}</td></tr>`
  }</tbody></table>

<h2>Distributions recorded</h2>
<table><thead><tr><th>Date</th><th>Type</th><th>Recipient</th><th>Cash</th><th>Property</th></tr></thead>
<tbody>${distributionRows || '<tr><td colspan="5">No finalized distributions</td></tr>'}</tbody></table>

${
  p.finance
    ? `<h2>Staged financial snapshot</h2>
<div class="grid">
  <div><strong>Estimated estate balance:</strong> ${formatMoney(p.finance.estateBalance)}</div>
  <div><strong>Cash available (Funds):</strong> ${formatMoney(p.finance.fundsAvailable)}</div>
  ${Number(p.finance.undepositedPaidSales) > 0 ? `<div><strong>Paid sales not yet deposited:</strong> ${formatMoney(p.finance.undepositedPaidSales)}</div>` : ''}
  <div><strong>Gross assets:</strong> ${formatMoney(p.finance.grossAssets)}</div>
  <div><strong>Debts &amp; PR advances:</strong> ${formatMoney(p.finance.debts)}</div>
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

function familyUpdateBaseName(pack) {
  const n = pack?.digest?.generatedLabel || pack?.generatedAt || 'update';
  const num = pack?.updateNumber || pack?.update_number || '';
  return String(`family-update-${num || n}`)
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 60);
}

/** Flat printable lines for the native PDF builder. */
export function buildFamilyUpdatePdfLines(pack) {
  const p = pack || {};
  const caseLabel = p.courtCaseNumber || p.caseNumber || 'estate';
  const lines = [
    `${APP_NAME} — Family Update`,
    `${p.estateName || 'Estate'} · Case ${caseLabel}`,
    `Generated ${new Date(p.generatedAt || Date.now()).toLocaleString()}`,
    '',
    'Staged transparency for beneficiaries — not a court binder and not a tax return.',
    'Bank statements and sealed court evidence stay with the Personal Representative',
    'unless separately shared.',
    ''
  ];

  if (p.whyNotFinal) {
    lines.push(`Why final numbers may not appear yet: ${p.whyNotFinal}`, '');
  }
  if (p.visibilityNote) {
    lines.push(String(p.visibilityNote), '');
  }

  if (p.digest) {
    lines.push(
      'At a glance',
      '----------------------------------------',
      `Inventory: ${p.digest.inventory?.total || 0} recorded · ${
        p.digest.inventory?.distributed || 0
      } distributed · ${p.digest.inventory?.disputed || 0} disputed`,
      `${saleAuctionCopy.shortCap}: ${p.digest.auction?.paid || 0} paid · ${
        p.digest.auction?.pendingPayment || 0
      } pending · ${p.digest.auction?.notListed || 0} approved not listed`,
      `Claims: ${
        p.digest.claims?.windowEndLabel
          ? p.digest.claims.windowOpen
            ? `Open until ${p.digest.claims.windowEndLabel}`
            : `Closed ${p.digest.claims.windowEndLabel}`
          : p.digest.claims?.note || '—'
      }`,
      `Distributions: ${p.digest.distributions?.batches || 0} batch(es) · cash ${formatMoney(
        p.digest.distributions?.cash
      )}`,
      ''
    );
    if ((p.digest.expenses?.highlights || []).length) {
      lines.push(`Expense highlights: ${p.digest.expenses.highlights.join(' · ')}`, '');
    }
    if ((p.digest.upcoming || []).length) {
      lines.push(`Upcoming: ${p.digest.upcoming.join(' · ')}`, '');
    }
  }

  if ((p.decisionNotes || []).length) {
    lines.push('PR explanation notes', '----------------------------------------');
    for (const row of p.decisionNotes) {
      lines.push(
        `- ${row.dateLabel || '—'} · ${row.topic || 'general'}`,
        `  ${row.note || ''}`
      );
    }
    lines.push('');
  }

  lines.push('Disclosure timeline', '----------------------------------------');
  const events = p.timeline?.events || [];
  if (!events.length) {
    lines.push('No timeline events');
  } else {
    for (const event of events) {
      lines.push(
        `- ${event.dateLabel || '—'} · ${event.title || ''}`,
        `  ${event.detail || ''} [${event.status || ''}]`
      );
    }
  }
  lines.push('');

  lines.push(
    'Inventory summary',
    '----------------------------------------',
    `Total items: ${p.reconciliation?.total || 0}`,
    `${saleAuctionCopy.lots}: ${p.reconciliation?.auctionLotCount || 0}`,
    `Distributed: ${p.reconciliation?.distributedCount || 0}`,
    `Held / remaining: ${p.reconciliation?.heldCount || 0}`
  );
  const buckets = (p.reconciliation?.allBuckets || []).filter((b) => b.count > 0);
  for (const bucket of buckets) {
    lines.push(`- ${bucket.label || bucket.key}: ${bucket.count}`);
  }
  lines.push('');

  lines.push(
    saleAuctionCopy.status,
    '----------------------------------------',
    `Approved: ${p.auction?.approvedCount || p.auction?.lotCount || 0}`,
    `On catalog: ${p.auction?.listedCount || 0}`,
    `Approved but not listed: ${p.auction?.notListedCount || 0}`,
    `Expected proceeds: ${formatMoney(p.auction?.expectedTotal)}`,
    `Collected: ${formatMoney(p.auction?.paidTotal)}`,
    `Outstanding: ${formatMoney(p.auction?.outstandingTotal)}`
  );
  if (p.auction?.summaryLabel) lines.push(p.auction.summaryLabel);
  const notListed = p.auction?.notListed || [];
  if (notListed.length) {
    lines.push('Not listed:');
    for (const row of notListed) {
      lines.push(`- ${row.name || 'Item'}: ${row.reason || '—'}`);
    }
  }
  lines.push('');

  lines.push('Distributions recorded', '----------------------------------------');
  const dist = p.distributionLines || [];
  if (!dist.length) {
    lines.push('No finalized distributions');
  } else {
    for (const row of dist) {
      lines.push(
        `- ${row.date || '—'} · ${distributionClassificationLabel(row.classification)} · ${
          row.recipientName || '—'
        }`,
        `  Cash ${formatMoney(row.cash)} · Property ${formatMoney(row.property)}`
      );
    }
  }
  lines.push('');

  if (p.finance) {
    lines.push(
      'Staged financial snapshot',
      '----------------------------------------',
      `Estimated estate balance: ${formatMoney(p.finance.estateBalance)}`,
      `Cash available (Funds): ${formatMoney(p.finance.fundsAvailable)}`,
      `Gross assets: ${formatMoney(p.finance.grossAssets)}`,
      `Debts & PR advances: ${formatMoney(p.finance.debts)}`,
      `Expenses (activity): ${formatMoney(p.finance.expenses)}`,
      `Cash distributed: ${formatMoney(p.finance.distributedCash)}`,
      `Property distributed: ${formatMoney(p.finance.distributedProperty)}`,
      ''
    );
    if (Number(p.finance.undepositedPaidSales) > 0) {
      lines.splice(
        lines.length - 1,
        0,
        `Paid sales not yet deposited: ${formatMoney(p.finance.undepositedPaidSales)}`
      );
    }
  }

  lines.push('Projected next steps', '----------------------------------------');
  for (const step of p.nextSteps || []) {
    lines.push(`- ${step}`);
  }
  if (!(p.nextSteps || []).length) lines.push('- No open staged actions recorded.');

  lines.push(
    '',
    `${APP_NAME} Family Update v${p.version || 2} · Staged transparency, not live bank access.`
  );
  return lines;
}

/** Preferred path: save a native Family Update PDF locally (no popup required). */
export function downloadFamilyUpdate(pack) {
  try {
    const lines = buildFamilyUpdatePdfLines(pack);
    const bytes = buildSimpleTextPdf(lines, { fontSize: 10, maxChars: 95 });
    downloadPdfBytes(bytes, `${familyUpdateBaseName(pack)}.pdf`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error?.message || 'Could not download Family Update PDF.' };
  }
}

/** Optional: save Family Update HTML locally. */
export function downloadFamilyUpdateHtml(pack) {
  try {
    const html = buildFamilyUpdateHtml(pack);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${familyUpdateBaseName(pack)}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return { success: true };
  } catch (error) {
    return { success: false, error: error?.message || 'Could not download Family Update HTML.' };
  }
}
