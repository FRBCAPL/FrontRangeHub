import { APP_NAME, legalStatusLabel, valueTierLabel, distributionClassificationLabel, formatEstateDisplayDate } from './estateInventoryConstants.js';
import { acknowledgementStatusLabel } from './estateAcknowledgement.js';
import { getPhotoEntries } from './estatePhotoMeta.js';
import { formatCompletenessBannerHtml, ESTATE_SUPPORTING_DOCS_LABEL } from './estateCompleteness.js';
import { formatMoney, sumUnsoldInventoryValue } from './estateFinance.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
        <td>${escapeHtml(formatMoney(item.estimated_value))}</td>
        <td>${escapeHtml(item.valuation_date || '—')}</td>
        <td>${escapeHtml(item.valuation_source || '—')}</td>
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
        <td>${escapeHtml(expense.date_paid ? formatEstateDisplayDate(expense.date_paid) || '—' : '—')}</td>
        <td>${escapeHtml(expense.expense_name)}</td>
        <td>${escapeHtml(formatMoney(expense.amount))}</td>
        <td>${
          expense.receipt_url
            ? `<a href="${escapeHtml(expense.receipt_url)}" target="_blank" rel="noreferrer">Receipt</a>`
            : '—'
        }</td>
      </tr>`
    )
    .join('');
}

function prLoanRows(loans) {
  return (loans || [])
    .map(
      (loan) => `<tr>
        <td>${escapeHtml(loan.loan_date || '—')}</td>
        <td>${escapeHtml(loan.purpose)}</td>
        <td>${escapeHtml(formatMoney(loan.amount))}</td>
        <td>${escapeHtml(loan.notes || '—')}</td>
      </tr>`
    )
    .join('');
}

function accountRows(accounts, kind) {
  return (accounts || [])
    .filter((row) => (kind === 'debt' ? row.kind === 'debt' : row.kind !== 'debt'))
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.account_name)}</td>
        <td>${escapeHtml(row.institution || '—')}</td>
        <td>${escapeHtml(row.last4 ? `••••${row.last4}` : '—')}</td>
        <td>${escapeHtml(formatMoney(row.balance))}</td>
        <td>${escapeHtml(row.as_of_date || '—')}</td>
      </tr>`
    )
    .join('');
}

function accountDocumentRows(documents, accounts) {
  const accountById = Object.fromEntries((accounts || []).map((row) => [row.id, row]));
  return (documents || [])
    .map((row) => {
      const account = accountById[row.account_id];
      return `<tr>
        <td>${escapeHtml(account?.account_name || 'Unknown account')}</td>
        <td>${escapeHtml(row.statement_date || '—')}</td>
        <td>${escapeHtml(row.file_name || '—')}</td>
        <td>${escapeHtml(row.mime_type || '—')}</td>
        <td>${escapeHtml(row.size_bytes == null ? '—' : String(row.size_bytes))}</td>
        <td class="hash">${escapeHtml(row.sha256_hash || 'Hash unavailable')}</td>
      </tr>`;
    })
    .join('');
}

function auctionRows(lines) {
  return [...(lines?.paid || []), ...(lines?.outstanding || [])]
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(formatMoney(item.highest_bid))}</td>
        <td>${item.auction_paid_at ? `Paid ${escapeHtml(formatEstateDisplayDate(item.auction_paid_at) || '')}` : 'Outstanding'}</td>
      </tr>`
    )
    .join('');
}

function distributionRows(distributions) {
  return (distributions || [])
    .flatMap((distribution) =>
      (distribution.recipients || []).map(
        (recipient) => `<tr>
          <td>${escapeHtml(formatEstateDisplayDate(distribution.distribution_date) || distribution.distribution_date || '—')}</td>
          <td>${escapeHtml(distributionClassificationLabel(distribution.classification))}</td>
          <td>${escapeHtml(recipient.recipient_name || '—')}</td>
          <td>${escapeHtml(formatMoney(recipient.cash_amount))}</td>
          <td>${escapeHtml(
            (recipient.items || []).map((item) => item.item_name).join(', ') || '—'
          )}</td>
          <td>${escapeHtml(
            recipient.acknowledgement_status === 'acknowledged'
              ? `Acknowledged ${
                  formatEstateDisplayDate(recipient.acknowledged_at) ||
                  (recipient.acknowledged_at
                    ? new Date(recipient.acknowledged_at).toLocaleString()
                    : '')
                }`
              : acknowledgementStatusLabel(recipient.acknowledgement_status)
          )}</td>
          <td>${escapeHtml(
            distribution.status === 'void'
              ? `Reversed: ${distribution.void_reason || 'reason not recorded'}`
              : 'Finalized'
          )}</td>
        </tr>`
      )
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
  const distributions = pack.distributions || [];
  const formal = pack.formal_accounting || null;
  const warnings = pack.warnings || [];
  const valuedInventoryTotal = sumUnsoldInventoryValue(inventory);
  const caseLabel = estate.court_case_number || estate.case_number || 'estate';
  const finalizedDistributions = distributions.filter((row) => row.status === 'finalized');
  const distributedCash = finalizedDistributions.reduce(
    (sum, row) => sum + (Number(row.cash_total) || 0),
    0
  );
  const distributedProperty = finalizedDistributions.reduce(
    (sum, row) => sum + (Number(row.property_value_total) || 0),
    0
  );
  const accountedValue =
    (Number(finance.netDistributable) || 0) + distributedCash + distributedProperty;

  const formalSection = formal
    ? section(
        'Formal accounting statement (period schedule)',
        `<div class="grid">
    <div><strong>Period:</strong> ${escapeHtml(formal.periodStartLabel)} — ${escapeHtml(formal.periodEndLabel)}</div>
    <div><strong>Method:</strong> Current balances</div>
    <div><strong>Beginning net (reconstructed):</strong> ${formatMoney(formal.beginning?.netEstate)}</div>
    <div><strong>Receipts (auction deposits):</strong> ${formatMoney(formal.receipts?.total)}</div>
    <div><strong>Disbursements (expenses):</strong> ${formatMoney(formal.disbursements?.total)}</div>
    <div><strong>Distributions (cash + property):</strong> ${formatMoney(formal.distributions?.total)}</div>
    <div><strong>Ending estate balance:</strong> ${formatMoney(formal.ending?.estateBalance)}</div>
    <div><strong>Value accounted for:</strong> ${formatMoney(formal.reconciliation?.valueAccountedFor)}</div>
  </div>
  <p class="muted">Beginning figures are reconstructed from today’s balances plus activity. Full schedules (expenses, distributions, accounts, debts, PR loans) are in the companion JSON under <code>formal_accounting</code>. Print the dedicated Formal Accounting report from Reports for the complete printable statement.</p>`
      )
    : '';

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
  <h1>${escapeHtml(APP_NAME)} — Court Evidence Pack (supporting)</h1>
  <div class="meta">Case ${escapeHtml(caseLabel)} · Generated ${escapeHtml(new Date(pack.generated_at).toLocaleString())}</div>
  <div class="notice"><strong>Point-in-time supporting export for your records — not a court filing.</strong> ${escapeHtml(ESTATE_SUPPORTING_DOCS_LABEL)} This HTML is a read-only printable view of data as of the generation time above. Later edits in Estate Vault can make an earlier pack stale. The companion JSON is a machine-readable catalog of the same export; the SHA-256 manifest fingerprints that JSON for integrity checking (it is not a court seal).</div>
  ${pack.completeness ? formatCompletenessBannerHtml(pack.completeness) : ''}

  ${section('Estate identity', `<div class="grid">
    <div><strong>Estate:</strong> ${escapeHtml(estate.estate_name || '—')}</div>
    <div><strong>Court case:</strong> ${escapeHtml(estate.court_case_number || '—')}</div>
    <div><strong>Portal case:</strong> ${escapeHtml(estate.case_number || '—')}</div>
    <div><strong>Primary representative:</strong> ${escapeHtml(estate.owner_email || '—')}</div>
    <div><strong>Letters issued:</strong> ${escapeHtml(formatEstateDisplayDate(estate.letters_issued_at) || estate.letters_issued_at || '—')}</div>
    <div><strong>Inventory status:</strong> ${estate.inventory_completed_at ? `PR marked complete ${escapeHtml(estate.inventory_completed_at)}` : 'In progress / not certified complete'}</div>
    <div><strong>Record status:</strong> ${estate.closed_at ? `Closed ${escapeHtml(estate.closed_at)}` : 'Open'}</div>
  </div>`)}

  ${section(`Formal inventory schedule (${inventory.length})`, `<p><strong>Active unsold property estimated value:</strong> ${formatMoney(valuedInventoryTotal)}</p><table><thead><tr><th>Item</th><th>Room</th><th>Value tier</th><th>Estimated value</th><th>Valuation date</th><th>Basis / source</th><th>Legal status</th><th>Beneficiary</th><th>Claims / dispute</th><th>Photos</th><th>Changes</th></tr></thead><tbody>${itemRows(inventory) || '<tr><td colspan="11">No items</td></tr>'}</tbody></table><p class="muted">PR-entered estimates are good-faith inventory values, not appraisals unless the basis/source says so. An item with a bid is represented by the bid in the finance snapshot instead of its estimate.</p>`)}

  ${section(`Scene documentation (${scenes.length})`, `<p>${scenes.length} room/scene capture(s), including provenance metadata and change histories, are included in the companion JSON.</p>`)}

  ${section('Finance snapshot', `<div class="grid">
    <div><strong>Estate balance:</strong> ${formatMoney(finance.netDistributable)}</div>
    <div><strong>Cash available (Funds):</strong> ${formatMoney(finance.fundsAvailable)}</div>
    <div><strong>What the estate holds:</strong> ${formatMoney(finance.grossEstateValue)}</div>
    <div><strong>What the estate owes:</strong> ${formatMoney(finance.totalLiabilities)}</div>
    <div><strong>PR loans:</strong> ${formatMoney(finance.prLoansTotal)}</div>
    <div><strong>Other / starting cash:</strong> ${formatMoney(finance.otherCashOnHand)}</div>
    ${Number(finance.undepositedPaidSales) > 0 ? `<div><strong>Paid sales not yet deposited:</strong> ${formatMoney(finance.undepositedPaidSales)}</div>` : ''}
    <div><strong>Approved expenses:</strong> ${formatMoney(finance.expensesTotal)}</div>
    <div><strong>Paid sale/auction sales:</strong> ${formatMoney(finance.paidAuctionSales)}</div>
    <div><strong>Outstanding bids:</strong> ${formatMoney(finance.outstandingBids)}</div>
    <div><strong>Listed accounts:</strong> ${formatMoney(finance.accountAssetsTotal)}</div>
    <div><strong>Listed debts:</strong> ${formatMoney(finance.accountDebtsTotal)}</div>
    <div><strong>Unsold inventory estimates:</strong> ${formatMoney(finance.unsoldInventoryValue)}</div>
    <div><strong>Accounting method:</strong> Current balances (account balances are source of truth)</div>
  </div>
  <h3>PR loans to the estate</h3>
  <table><thead><tr><th>Date</th><th>Purpose</th><th>Amount</th><th>Notes</th></tr></thead><tbody>${prLoanRows(finance.prLoans) || '<tr><td colspan="4">No PR loans</td></tr>'}</tbody></table>
  <h3>Estate expenses</h3>
  <table><thead><tr><th>Date</th><th>Expense</th><th>Amount</th><th>Receipt</th></tr></thead><tbody>${expenseRows(finance.expenses) || '<tr><td colspan="4">No expenses</td></tr>'}</tbody></table>`)}

  ${section('Accounts the estate holds', `<table><thead><tr><th>Account</th><th>Institution</th><th>Last 4</th><th>Balance</th><th>As of</th></tr></thead><tbody>${accountRows(finance.accounts, 'asset') || '<tr><td colspan="5">No accounts listed</td></tr>'}</tbody></table>`)}

  ${section('Debts the estate owes', `<table><thead><tr><th>Debt</th><th>Creditor</th><th>Last 4</th><th>Amount</th><th>As of</th></tr></thead><tbody>${accountRows(finance.accounts, 'debt') || '<tr><td colspan="5">No debts listed</td></tr>'}</tbody></table>`)}

  ${section('Supporting account statements', `<table><thead><tr><th>Account / debt</th><th>Statement date</th><th>File</th><th>Type</th><th>Bytes</th><th>SHA-256 fingerprint</th></tr></thead><tbody>${accountDocumentRows(finance.accountDocuments, finance.accounts) || '<tr><td colspan="6">No account statements attached</td></tr>'}</tbody></table><p class="muted">Statements are stored privately. This evidence pack records their file metadata and cryptographic fingerprints; obtain the original private files from the Estate Vault account.</p>`)}

  ${section('Sale/auction payment state', `<table><thead><tr><th>Item</th><th>Highest bid</th><th>Payment state</th></tr></thead><tbody>${auctionRows(auction) || '<tr><td colspan="3">No sale/auction bid lines</td></tr>'}</tbody></table>`)}

  ${section('Distribution accounting', `<div class="grid">
    <div><strong>Finalized cash distributions:</strong> ${formatMoney(distributedCash)}</div>
    <div><strong>Transferred property at recorded value:</strong> ${formatMoney(distributedProperty)}</div>
    <div><strong>Current ending estate balance:</strong> ${formatMoney(finance.netDistributable)}</div>
    <div><strong>Value accounted for:</strong> ${formatMoney(accountedValue)}</div>
  </div>
  <p class="muted">Current account balances are the source of truth. Cash distributions are not subtracted a second time; the PR must update each account balance after payment. “Value accounted for” adds finalized distribution activity to the current ending balance and is a reconciliation aid, not a tax return.</p>
  <table><thead><tr><th>Date</th><th>Type</th><th>Recipient</th><th>Cash</th><th>Property</th><th>Receipt</th><th>Status</th></tr></thead><tbody>${distributionRows(distributions) || '<tr><td colspan="7">No distributions recorded</td></tr>'}</tbody></table>`)}

  ${formalSection}

  ${section(`Heirs / family (${heirs.length})`, `<p>${heirs.map((h) => escapeHtml(h.preferred_name || h.display_name)).join(', ') || 'No heirs configured.'}</p>`)}

  ${section(`Activity trail (${activity.length})`, `<table><thead><tr><th>When</th><th>Action</th><th>Actor</th><th>Summary</th></tr></thead><tbody>${activityRows(activity) || '<tr><td colspan="4">No events</td></tr>'}</tbody></table>`)}

  ${warnings.length ? section('Collection warnings', `<ul>${warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul>`) : ''}
  ${section(
    'Manifest (integrity fingerprint — not a court seal)',
    `<p><strong>Generated:</strong> ${escapeHtml(new Date(pack.generated_at).toLocaleString())}</p>
  <p><strong>Included in this pack:</strong> estate identity, inventory schedule, scene metadata reference, finance snapshot, accounts/debts, statement fingerprints, sale/auction payment state, distributions, formal-accounting figures when present, heirs, activity trail, and completeness / Needs attention status.</p>
  <p><strong>Completeness gaps on this export:</strong> ${
    pack.completeness
      ? `${Number(pack.completeness.blockingCount || 0)} blocking · ${Number(pack.completeness.warningCount || 0)} warning`
      : 'Not attached'
  }. Later edits in Estate Vault can make this pack stale — regenerate for counsel when records change.</p>
  <p>SHA-256 content hash of the companion JSON (all fields except this manifest):</p>
  <div class="hash">${escapeHtml(pack.manifest?.content_hash || 'Hash unavailable in this browser')}</div>`
  )}
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
