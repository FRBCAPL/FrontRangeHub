/**
 * Estate Vault — Formal Accounting Statement (period schedule).
 *
 * This is a court-oriented fiduciary schedule built ON TOP of the live
 * current-balances snapshot. It does NOT change netDistributable math.
 *
 * Beginning assets prefer recorded account opening balances (plus inventory
 * still on hand / distributed during the period). Receipts include auction
 * proceeds and Deposit / income fund transactions dated in the period —
 * not only auction sales (FR-01).
 */

import {
  APP_NAME,
  distributionClassificationLabel,
  formatEstateDisplayDate,
  parseEstateLocalDate
} from './estateInventoryConstants.js';
import { formatMoney } from './estateFinance.js';
import {
  finalizedDistributions,
  sumDistributionCash,
  sumDistributionPropertyValue
} from './estateDistributionReceipt.js';
import { formatCompletenessBannerHtml, ESTATE_SUPPORTING_DOCS_LABEL } from './estateCompleteness.js';
import { distributionsNeedBalanceUpdate } from './estateClosingReadiness.js';
import { acknowledgementStatusLabel } from './estateAcknowledgement.js';
import { cashAvailableHintHtml } from './estateCashCopy.js';
import { fundsCategoryLabel } from './estateFunds.js';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function money(value) {
  return Number(value) || 0;
}

function toDateLabel(value) {
  return formatEstateDisplayDate(value);
}

function toDayMs(value) {
  const d = parseEstateLocalDate(value);
  if (d) return d.getTime();
  if (!value) return null;
  const raw = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(raw.getTime())) return null;
  return new Date(raw.getFullYear(), raw.getMonth(), raw.getDate()).getTime();
}

/** Inclusive calendar-day window for period activity. */
function isDateInPeriod(value, periodStart, periodEnd) {
  const day = toDayMs(value);
  if (day == null) return false;
  const start = toDayMs(periodStart);
  const end = toDayMs(periodEnd);
  if (start != null && day < start) return false;
  if (end != null && day > end) return false;
  return true;
}

function accountOpeningAmount(account, fundTransactions = []) {
  if (!account || account.kind === 'debt') return 0;
  if (account.opening_balance != null && account.opening_balance !== '') {
    return money(account.opening_balance);
  }
  const current = money(
    account.computed_balance != null ? account.computed_balance : account.balance
  );
  const netTxns = (fundTransactions || [])
    .filter((txn) => txn?.account_id && txn.account_id === account.id)
    .reduce((sum, txn) => sum + money(txn.amount), 0);
  return current - netTxns;
}

function buildPeriodReceiptRows({
  fundTransactions = [],
  accounts = [],
  periodStart,
  periodEnd
}) {
  const accountNameById = Object.fromEntries(
    (accounts || []).map((row) => [
      row.id,
      row.account_name || row.label || row.name || 'Account'
    ])
  );
  const rows = [];
  for (const txn of fundTransactions || []) {
    const category = String(txn?.category || '').toLowerCase();
    if (category !== 'deposit' && category !== 'sale_proceeds') continue;
    const amount = money(txn.amount);
    if (amount <= 0) continue;
    if (!isDateInPeriod(txn.txn_date || txn.created_at, periodStart, periodEnd)) {
      continue;
    }
    rows.push({
      id: txn.id,
      date: txn.txn_date || txn.created_at,
      category,
      categoryLabel: fundsCategoryLabel(category),
      memo: String(txn.memo || '').trim() || fundsCategoryLabel(category),
      accountName: accountNameById[txn.account_id] || 'Account',
      amount
    });
  }
  rows.sort((a, b) => {
    const da = toDayMs(a.date) || 0;
    const db = toDayMs(b.date) || 0;
    return da - db;
  });
  return rows;
}

/**
 * Build the formal accounting data model from existing finance + distribution
 * snapshots. Pure / side-effect free.
 *
 * @param {object} params
 * @param {object} [params.settings]
 * @param {object} [params.finance] getFinanceSummary data
 * @param {Array}  [params.distributions]
 * @param {string|Date} [params.asOf] end of period (default now / closed_at)
 */
export function buildFormalAccountingStatement({
  settings = {},
  finance = {},
  distributions = [],
  asOf = null
} = {}) {
  const periodStart =
    settings.letters_issued_at || settings.created_at || settings.inventory_started_at || null;
  const periodEnd =
    asOf || settings.closed_at || new Date().toISOString();

  const endingGross = money(finance.grossEstateValue);
  const endingLiabilities = money(finance.totalLiabilities);
  const endingBalance = money(finance.netDistributable);
  const unsoldInventory = money(finance.unsoldInventoryValue);

  const fundTransactions = Array.isArray(finance.fundTransactions)
    ? finance.fundTransactions
    : [];
  const accounts = finance.accounts || [];

  const receiptRows = buildPeriodReceiptRows({
    fundTransactions,
    accounts,
    periodStart,
    periodEnd
  });
  const otherDeposits = receiptRows
    .filter((row) => row.category === 'deposit')
    .reduce((sum, row) => sum + row.amount, 0);
  const saleProceedsPosted = receiptRows
    .filter((row) => row.category === 'sale_proceeds')
    .reduce((sum, row) => sum + row.amount, 0);

  // Item-level paid sales (may include undeposited). Prefer the larger of
  // posted sale_proceeds vs paid auction so undeposited sales still appear.
  const paidAuctionSales = money(finance.paidAuctionSales);
  const receiptsAuction = Math.max(paidAuctionSales, saleProceedsPosted);
  const totalReceipts = receiptsAuction + otherDeposits;

  const disbursementsExpenses = money(finance.expensesTotal);
  const totalDisbursements = disbursementsExpenses;

  const cashDistributed = sumDistributionCash(distributions);
  const propertyDistributed = sumDistributionPropertyValue(distributions);
  const totalDistributions = cashDistributed + propertyDistributed;

  const prLoans = money(finance.prLoansTotal);
  const accountDebts = money(finance.accountDebtsTotal);

  // True opening from recorded account openings (not back-solved from ending).
  const openingAccountAssets = (accounts || [])
    .filter((row) => row?.kind !== 'debt')
    .reduce((sum, row) => sum + accountOpeningAmount(row, fundTransactions), 0);
  // Inventory proxy at period start: still on hand + transferred during period.
  const beginningInventory = unsoldInventory + propertyDistributed;
  const beginningGross = openingAccountAssets + beginningInventory;
  const beginningNet = beginningGross - endingLiabilities;
  const beginningFromOpenings = (accounts || []).some(
    (row) => row?.kind !== 'debt' && row?.opening_balance != null && row.opening_balance !== ''
  );

  const valueAccountedFor = endingBalance + cashDistributed + propertyDistributed;

  const finalRows = finalizedDistributions(distributions);
  const distributionLines = finalRows.flatMap((distribution) =>
    (distribution.recipients || []).map((recipient) => {
      const propertyValue = (recipient.items || []).reduce(
        (sum, item) => sum + (Number(item.estimated_value_snapshot ?? item.estimated_value) || 0),
        0
      );
      return {
        distributionId: distribution.id,
        distributionDate: distribution.distribution_date,
        classification: distribution.classification || 'partial',
        recipientName: recipient.recipient_name,
        cashAmount: money(recipient.cash_amount),
        propertyValue,
        acknowledgementStatus: recipient.acknowledgement_status,
        acknowledgedAt: recipient.acknowledged_at
      };
    })
  );

  const expenseRows = (finance.expenses || []).map((row) => ({
    id: row.id,
    date: row.date_paid,
    name: row.expense_name,
    amount: money(row.amount),
    receiptUrl: row.receipt_url || null
  }));

  const accountAssetRows = (accounts || [])
    .filter((row) => row.kind !== 'debt')
    .map((row) => ({
      id: row.id,
      name: row.account_name || row.label || row.name || 'Account',
      institution: row.institution || '',
      balance: money(row.balance),
      openingBalance: accountOpeningAmount(row, fundTransactions),
      // Ending Schedule C uses statement period end — not opening as_of_date (CS-13).
      asOf: periodEnd
    }));

  const accountDebtRows = (accounts || [])
    .filter((row) => row.kind === 'debt')
    .map((row) => ({
      id: row.id,
      name: row.account_name || row.label || row.name || 'Debt',
      institution: row.institution || row.creditor || '',
      balance: money(row.balance),
      asOf: periodEnd
    }));

  const prLoanRows = (finance.prLoans || []).map((row) => ({
    id: row.id,
    date: row.loan_date || row.created_at,
    purpose: row.purpose || row.notes || 'PR loan',
    amount: money(row.amount)
  }));

  return {
    version: 2,
    accountingMethod: 'current_balances',
    estateName: settings.estate_name || finance.estateName || 'Estate',
    caseNumber: settings.case_number || finance.caseNumber || null,
    courtCaseNumber: settings.court_case_number || finance.courtCaseNumber || null,
    closedAt: settings.closed_at || null,
    closeReason: settings.close_reason || null,
    periodStart,
    periodEnd,
    periodStartLabel: toDateLabel(periodStart) || 'Not set',
    periodEndLabel: toDateLabel(periodEnd) || new Date().toLocaleDateString(),
    beginning: {
      reconstructed: !beginningFromOpenings,
      fromOpenings: beginningFromOpenings,
      openingAccountAssets,
      inventoryAtStart: beginningInventory,
      grossAssets: beginningGross,
      netEstate: beginningNet
    },
    receipts: {
      paidAuctionSales: receiptsAuction,
      otherDeposits,
      total: totalReceipts,
      lines: receiptRows
    },
    disbursements: {
      expenses: disbursementsExpenses,
      total: totalDisbursements
    },
    liabilities: {
      accountDebts,
      prLoans,
      total: endingLiabilities
    },
    distributions: {
      cash: cashDistributed,
      property: propertyDistributed,
      total: totalDistributions,
      batchCount: finalRows.length,
      lines: distributionLines
    },
    ending: {
      accountAssets: money(finance.accountAssetsTotal),
      otherCash: money(finance.otherCashOnHand),
      undepositedPaidSales: money(finance.undepositedPaidSales),
      outstandingBids: money(finance.outstandingBids),
      unsoldInventory,
      fundsAvailable: money(finance.fundsAvailable),
      nonCashAssets: money(finance.nonCashAssets),
      grossAssets: endingGross,
      liabilities: endingLiabilities,
      estateBalance: endingBalance
    },
    reconciliation: {
      valueAccountedFor,
      note:
        'Value accounted for = ending estate balance + finalized cash distributions + transferred property at recorded value. Cash distributions are not subtracted again from the live estate balance; update account balances after payment.'
    },
    schedules: {
      receipts: receiptRows,
      expenses: expenseRows,
      accountAssets: accountAssetRows,
      accountDebts: accountDebtRows,
      prLoans: prLoanRows
    },
    warnings: buildWarnings({
      finance,
      distributions,
      cashDistributed,
      disbursementsExpenses,
      receiptsAuction,
      otherDeposits,
      beginningFromOpenings
    })
  };
}

function buildWarnings({
  finance,
  distributions,
  cashDistributed,
  disbursementsExpenses,
  receiptsAuction,
  otherDeposits,
  beginningFromOpenings
}) {
  const warnings = [];
  if (!beginningFromOpenings) {
    warnings.push(
      'Account opening balances were not recorded separately; beginning cash is inferred from today’s balance minus Funds activity.'
    );
  }
  if (cashDistributed > 0 || disbursementsExpenses > 0 || receiptsAuction > 0 || otherDeposits > 0) {
    warnings.push(
      'Beginning inventory is estimated as unsold inventory still on hand plus property transferred during the period. Review with counsel before filing.'
    );
  }
  if (!finance?.accounts?.length && money(finance?.accountAssetsTotal) === 0) {
    warnings.push('No bank or investment accounts are listed yet.');
  }
  const balanceCheck = distributionsNeedBalanceUpdate({
    accounts: finance?.accounts || [],
    distributions,
    fundTransactions: finance?.fundTransactions
  });
  if (balanceCheck.stale) {
    warnings.push(
      'Supporting record incomplete: A cash distribution is missing a Funds withdrawal transaction. Link distributions to a fund account (or record the withdrawal) before relying on ending Funds.'
    );
  }
  const expenses = finance?.expenses || [];
  const missingReceipts = expenses.filter((row) => !String(row.receipt_url || '').trim()).length;
  if (missingReceipts > 0) {
    warnings.push(
      `Supporting record incomplete: ${missingReceipts} expense(s) have no receipt attached.`
    );
  }
  return warnings;
}

export function buildFormalAccountingHtml(statement) {
  const s = statement || {};
  const caseLabel = s.courtCaseNumber || s.caseNumber || 'estate';
  const receiptDetailRows = (s.schedules?.receipts || s.receipts?.lines || [])
    .map(
      (row) => `<tr>
      <td>${esc(toDateLabel(row.date) || '—')}</td>
      <td>${esc(row.categoryLabel || row.category || 'Receipt')}</td>
      <td>${esc(row.memo)}</td>
      <td>${esc(row.accountName)}</td>
      <td>${formatMoney(row.amount)}</td>
    </tr>`
    )
    .join('');

  const expenseRows = (s.schedules?.expenses || [])
    .map(
      (row) => `<tr>
      <td>${esc(toDateLabel(row.date) || '—')}</td>
      <td>${esc(row.name)}</td>
      <td>${formatMoney(row.amount)}</td>
      <td>${row.receiptUrl ? `<a href="${esc(row.receiptUrl)}" target="_blank" rel="noreferrer">Receipt</a>` : '—'}</td>
    </tr>`
    )
    .join('');

  const distributionRows = (s.distributions?.lines || [])
    .map(
      (row) => `<tr>
      <td>${esc(toDateLabel(row.distributionDate) || '—')}</td>
      <td>${esc(distributionClassificationLabel(row.classification))}</td>
      <td>${esc(row.recipientName)}</td>
      <td>${formatMoney(row.cashAmount)}</td>
      <td>${formatMoney(row.propertyValue)}</td>
      <td>${esc(
        row.acknowledgementStatus === 'acknowledged'
          ? `Acknowledged ${toDateLabel(row.acknowledgedAt) || ''}`
          : acknowledgementStatusLabel(row.acknowledgementStatus)
      )}</td>
    </tr>`
    )
    .join('');

  const assetRows = (s.schedules?.accountAssets || [])
    .map(
      (row) => `<tr>
      <td>${esc(row.name)}</td>
      <td>${esc(row.institution)}</td>
      <td>${formatMoney(row.balance)}</td>
      <td>${esc(toDateLabel(row.asOf) || '—')}</td>
    </tr>`
    )
    .join('');

  const debtRows = (s.schedules?.accountDebts || [])
    .map(
      (row) => `<tr>
      <td>${esc(row.name)}</td>
      <td>${esc(row.institution)}</td>
      <td>${formatMoney(row.balance)}</td>
      <td>${esc(toDateLabel(row.asOf) || '—')}</td>
    </tr>`
    )
    .join('');

  const loanRows = (s.schedules?.prLoans || [])
    .map(
      (row) => `<tr>
      <td>${esc(toDateLabel(row.date) || '—')}</td>
      <td>${esc(row.purpose)}</td>
      <td>${formatMoney(row.amount)}</td>
    </tr>`
    )
    .join('');

  const warningList = (s.warnings || []).map((w) => `<li>${esc(w)}</li>`).join('');
  const beginningLabel = s.beginning?.fromOpenings
    ? 'from recorded openings'
    : 'inferred openings';
  const beginningGrossLabel = s.beginning?.fromOpenings
    ? 'Beginning gross assets'
    : 'Beginning gross assets (inferred)';
  const beginningNetLabel = s.beginning?.fromOpenings
    ? 'Beginning net estate'
    : 'Beginning net estate (inferred)';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>${esc(APP_NAME)} — Formal Accounting — ${esc(caseLabel)}</title>
<style>
body{font-family:Georgia,"Times New Roman",serif;color:#1c1917;max-width:860px;margin:28px auto;padding:0 20px;background:#fafaf9}
h1{font-size:1.55rem;margin:0 0 .2rem}h2{font-size:1.1rem;border-bottom:2px solid #78716c;padding-bottom:.2rem;margin:1.4rem 0 .6rem}
h3{font-size:.95rem;margin:1rem 0 .4rem}.meta,.muted{color:#57534e}
.notice{border:1px solid #a8a29e;background:#fff;padding:.75rem;margin:1rem 0}
.summary{width:100%;border-collapse:collapse;background:#fff;margin:.5rem 0 1rem}
.summary th,.summary td{border:1px solid #d6d3d1;padding:.45rem .55rem;text-align:left}
.summary th{background:#f5f5f4;width:62%;font-weight:600}
.summary td.amt{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.summary tr.total th,.summary tr.total td{font-weight:700;background:#f5f5f4}
.summary tr.section th{background:#e7e5e4;font-size:.8rem;letter-spacing:.02em;text-transform:uppercase}
table.detail{width:100%;border-collapse:collapse;background:#fff;margin:.4rem 0 1rem}
table.detail th,table.detail td{border:1px solid #d6d3d1;padding:.35rem .5rem;text-align:left;font-size:.82rem;vertical-align:top}
table.detail th{background:#f5f5f4;font-family:system-ui,sans-serif}
.toolbar{margin-bottom:1rem}
@media print{.toolbar{display:none}body{margin:.5in;background:#fff}}
</style></head><body>
<div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button></div>
<h1>${esc(APP_NAME)} — Formal Accounting Statement</h1>
<div class="meta">${esc(s.estateName || 'Estate')} · Case ${esc(caseLabel)}</div>
<div class="meta">Period: ${esc(s.periodStartLabel)} — ${esc(s.periodEndLabel)} · Method: Current balances</div>
<div class="meta"><strong>Record status:</strong> ${
  s.closedAt
    ? `Closed for records · ${esc(toDateLabel(s.closedAt) || s.closedAt)}`
    : 'Open'
}</div>

<div class="notice">
  <strong>Fiduciary period schedule — supporting documentation, not a tax return or court filing.</strong>
  ${esc(ESTATE_SUPPORTING_DOCS_LABEL)}
  Supporting documentation — not a court filing. Account balances are the source of truth for the ending estate balance.
  Receipts (including Deposit / income), expenses, and cash distributions are activity records for the court story
  and are <em>not</em> subtracted again from today’s estate balance.
  Beginning cash uses recorded account opening balances (${esc(beginningLabel)});
  beginning inventory is estimated from property still on hand plus transfers during the period.
  ${cashAvailableHintHtml('')}
</div>

${s.completeness ? formatCompletenessBannerHtml(s.completeness) : ''}

${warningList ? `<ul class="muted">${warningList}</ul>` : ''}

<h2>Summary of the accounting period</h2>
<table class="summary">
  <tr class="section"><th colspan="2">I. Assets on hand at beginning of period (${esc(beginningLabel)})</th></tr>
  <tr><th>Opening account balances</th><td class="amt">${formatMoney(s.beginning?.openingAccountAssets)}</td></tr>
  <tr><th>Inventory at start (on hand + transferred in period)</th><td class="amt">${formatMoney(s.beginning?.inventoryAtStart)}</td></tr>
  <tr><th>${esc(beginningGrossLabel)}</th><td class="amt">${formatMoney(s.beginning?.grossAssets)}</td></tr>
  <tr><th>Less liabilities carried at end of period</th><td class="amt">${formatMoney(s.liabilities?.total)}</td></tr>
  <tr class="total"><th>${esc(beginningNetLabel)}</th><td class="amt">${formatMoney(s.beginning?.netEstate)}</td></tr>

  <tr class="section"><th colspan="2">II. Receipts during period (activity)</th></tr>
  <tr><th>Paid / deposited auction sales</th><td class="amt">${formatMoney(s.receipts?.paidAuctionSales)}</td></tr>
  <tr><th>Other deposits / income</th><td class="amt">${formatMoney(s.receipts?.otherDeposits)}</td></tr>
  <tr class="total"><th>Total receipts</th><td class="amt">${formatMoney(s.receipts?.total)}</td></tr>

  <tr class="section"><th colspan="2">III. Disbursements during period (activity)</th></tr>
  <tr><th>Approved estate expenses</th><td class="amt">${formatMoney(s.disbursements?.expenses)}</td></tr>
  <tr class="total"><th>Total disbursements</th><td class="amt">${formatMoney(s.disbursements?.total)}</td></tr>

  <tr class="section"><th colspan="2">IV. Distributions to beneficiaries (activity)</th></tr>
  <tr><th>Cash distributed</th><td class="amt">${formatMoney(s.distributions?.cash)}</td></tr>
  <tr><th>Property transferred (recorded value)</th><td class="amt">${formatMoney(s.distributions?.property)}</td></tr>
  <tr class="total"><th>Total distributions</th><td class="amt">${formatMoney(s.distributions?.total)}</td></tr>

  <tr class="section"><th colspan="2">V. Assets on hand at end of period (current balances)</th></tr>
  <tr><th>Bank &amp; investment accounts</th><td class="amt">${formatMoney(s.ending?.accountAssets)}</td></tr>
  <tr><th>Other / starting cash</th><td class="amt">${formatMoney(s.ending?.otherCash)}</td></tr>
  <tr><th>Paid sales not yet deposited</th><td class="amt">${formatMoney(s.ending?.undepositedPaidSales)}</td></tr>
  <tr><th>Cash available (Funds)</th><td class="amt">${formatMoney(s.ending?.fundsAvailable)}</td></tr>
  <tr><th>Outstanding sale bids</th><td class="amt">${formatMoney(s.ending?.outstandingBids)}</td></tr>
  <tr><th>Unsold inventory (estimated)</th><td class="amt">${formatMoney(s.ending?.unsoldInventory)}</td></tr>
  <tr><th>Gross assets on hand</th><td class="amt">${formatMoney(s.ending?.grossAssets)}</td></tr>
  <tr><th>Less: listed debts</th><td class="amt">${formatMoney(s.liabilities?.accountDebts)}</td></tr>
  <tr><th>Less: PR loans to the estate</th><td class="amt">${formatMoney(s.liabilities?.prLoans)}</td></tr>
  <tr class="total"><th>Ending estate balance</th><td class="amt">${formatMoney(s.ending?.estateBalance)}</td></tr>

  <tr class="section"><th colspan="2">VI. Reconciliation aid</th></tr>
  <tr class="total"><th>Value accounted for (ending balance + distributions)</th><td class="amt">${formatMoney(s.reconciliation?.valueAccountedFor)}</td></tr>
</table>
<p class="muted">${esc(s.reconciliation?.note)}</p>

<h2>Schedule of Receipts — Money received during period</h2>
<table class="detail"><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Account</th><th>Amount</th></tr></thead>
<tbody>${receiptDetailRows || '<tr><td colspan="5">No deposits or sale proceeds recorded in this period</td></tr>'}</tbody></table>

<h2>Schedule A — Estate expenses</h2>
<table class="detail"><thead><tr><th>Date</th><th>Expense</th><th>Amount</th><th>Receipt</th></tr></thead>
<tbody>${expenseRows || '<tr><td colspan="4">No expenses recorded</td></tr>'}</tbody></table>

<h2>Schedule B — Distributions to beneficiaries</h2>
<table class="detail"><thead><tr><th>Date</th><th>Type</th><th>Recipient</th><th>Cash</th><th>Property</th><th>Receipt</th></tr></thead>
<tbody>${distributionRows || '<tr><td colspan="6">No finalized distributions</td></tr>'}</tbody></table>

<h2>Schedule C — Accounts the estate holds (ending)</h2>
<table class="detail"><thead><tr><th>Account</th><th>Institution</th><th>Balance</th><th>Balance as of</th></tr></thead>
<tbody>${assetRows || '<tr><td colspan="4">No accounts listed</td></tr>'}</tbody></table>

<h2>Schedule D — Debts the estate owes (ending)</h2>
<table class="detail"><thead><tr><th>Debt</th><th>Creditor</th><th>Amount</th><th>Balance as of</th></tr></thead>
<tbody>${debtRows || '<tr><td colspan="4">No debts listed</td></tr>'}</tbody></table>

<h2>Schedule E — PR loans to the estate</h2>
<table class="detail"><thead><tr><th>Date</th><th>Purpose</th><th>Amount</th></tr></thead>
<tbody>${loanRows || '<tr><td colspan="3">No PR loans</td></tr>'}</tbody></table>

<p class="muted">Generated ${esc(new Date().toLocaleString())} · ${esc(APP_NAME)} formal accounting v${esc(s.version)}</p>
</body></html>`;
}

export function openFormalAccountingStatement(statement, targetWindow = null) {
  try {
    const html = buildFormalAccountingHtml(statement);
    if (targetWindow && !targetWindow.closed) {
      try {
        targetWindow.document.open();
        targetWindow.document.write(html);
        targetWindow.document.close();
        return { success: true };
      } catch {
        // fall through to blob
      }
    }
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      URL.revokeObjectURL(url);
      return { success: false, error: 'Popup blocked. Allow popups and try again.' };
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return { success: true };
  } catch (err) {
    return { success: false, error: err?.message || 'Could not open formal accounting.' };
  }
}
