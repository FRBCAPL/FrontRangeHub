/**
 * Estate Vault — closing readiness.
 *
 * Aggregates signals the app already tracks into a plain-language checklist the
 * Personal Representative can review before closing the estate for records.
 * Pure and side-effect free so it can be unit tested and reused in exports.
 *
 * Nothing here blocks closing — a PR keeps authority to close whenever they
 * choose. Items are advisory: `done` (green), `warn` (needs attention), or
 * `info` (optional context).
 */

import { formatEstateDisplayDate } from './estateInventoryConstants.js';
import { formatMoney } from './estateFinance.js';

function toTime(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Did cash leave the estate (finalized distribution) without a matching Funds
 * withdrawal transaction? Prefer fundTransactions when available; fall back to
 * account touch timestamps for pre-migration estates.
 *
 * @returns {{
 *   stale: boolean,
 *   latestDistributionAt: number|null,
 *   latestAccountTouchAt: number|null,
 *   missingDistributions: Array<{id: string, name: string}>,
 *   staleAccounts: Array<{id: string, name: string}>
 * }}
 */
export function distributionsNeedBalanceUpdate({
  accounts = [],
  distributions = [],
  fundTransactions = null
} = {}) {
  const cashDistributions = (distributions || []).filter(
    (row) => row?.status === 'finalized' && Number(row?.cash_total) > 0
  );
  if (!cashDistributions.length) {
    return {
      stale: false,
      latestDistributionAt: null,
      latestAccountTouchAt: null,
      missingDistributions: [],
      staleAccounts: []
    };
  }

  const latestDistributionAt = cashDistributions.reduce((max, row) => {
    const t = toTime(row.finalized_at || row.distribution_date || row.created_at);
    return t && t > max ? t : max;
  }, 0);

  const mapDist = (row) => ({
    id: String(row.id || ''),
    name:
      String(row.title || row.label || '').trim() ||
      `Distribution ${formatEstateDisplayDate(row.distribution_date || row.finalized_at) || String(row.id || '').slice(0, 8)}`
  });

  if (Array.isArray(fundTransactions)) {
    const covered = new Set(
      (fundTransactions || [])
        .filter((txn) => txn?.category === 'distribution' && txn?.distribution_id)
        .map((txn) => String(txn.distribution_id))
    );
    const missingDistributions = cashDistributions
      .filter((row) => row?.id && !covered.has(String(row.id)))
      .map(mapDist);
    return {
      stale: missingDistributions.length > 0,
      latestDistributionAt: latestDistributionAt || null,
      latestAccountTouchAt: null,
      missingDistributions,
      staleAccounts: []
    };
  }

  const assetAccounts = (accounts || []).filter((row) => row?.kind !== 'debt');
  const latestAccountTouchAt = assetAccounts.reduce((max, row) => {
    const t = toTime(row.updated_at || row.as_of_date);
    return t && t > max ? t : max;
  }, 0);

  const stale =
    latestDistributionAt > 0 &&
    (latestAccountTouchAt === 0 || latestAccountTouchAt < latestDistributionAt);

  const staleAccounts = stale
    ? assetAccounts.map((row) => ({
        id: String(row.id || ''),
        name: String(row.account_name || row.name || 'Account').trim() || 'Account'
      }))
    : [];

  return {
    stale,
    latestDistributionAt: latestDistributionAt || null,
    latestAccountTouchAt: latestAccountTouchAt || null,
    missingDistributions: stale ? cashDistributions.map(mapDist) : [],
    staleAccounts
  };
}

/**
 * @param {object} params
 * @param {object} params.settings estate_settings row
 * @param {object} [params.finance] getFinanceSummary data
 * @param {Array}  [params.distributions] finalized/void distribution rows (with recipients)
 * @param {number} [params.pendingReviewCount]
 * @param {number} [params.heirCount]
 * @param {boolean} [params.claimsEnded]
 * @returns {{ items: Array, readyCount: number, totalCount: number, warnings: number, canClose: boolean, alreadyClosed: boolean, balanceStale: boolean }}
 */
export function buildClosingChecklist({
  settings = {},
  finance = {},
  distributions = [],
  pendingReviewCount = 0,
  heirCount = 0,
  claimsEnded = false
} = {}) {
  const alreadyClosed = Boolean(settings.closed_at);
  const inventoryComplete = Boolean(settings.inventory_completed_at);
  const finalized = (distributions || []).filter((row) => row?.status === 'finalized');
  const distributionCount = finalized.length;
  const pendingAcknowledgements = finalized.reduce(
    (count, row) =>
      count +
      (row.recipients || []).filter(
        (recipient) => {
          const s = String(recipient.acknowledgement_status || 'pending').toLowerCase();
          return s === 'pending' || s === 'noticed' || s === 'reminded';
        }
      ).length,
    0
  );
  const outstandingBids = Number(finance.outstandingBids || 0);
  const { stale: balanceStale } = distributionsNeedBalanceUpdate({
    accounts: finance.accounts || [],
    distributions,
    fundTransactions: finance.fundTransactions
  });

  const items = [
    {
      key: 'inventory',
      label: 'Inventory certified complete',
      status: inventoryComplete ? 'done' : 'warn',
      detail: inventoryComplete
        ? `Marked complete ${formatEstateDisplayDate(settings.inventory_completed_at) || ''}`
        : 'Mark the inventory complete on the estate progress timeline.'
    },
    {
      key: 'pending_review',
      label: 'Helper review queue clear',
      status: Number(pendingReviewCount) === 0 ? 'done' : 'warn',
      detail:
        Number(pendingReviewCount) === 0
          ? 'No submissions waiting for PR review.'
          : `${pendingReviewCount} item(s) still awaiting PR review.`
    },
    {
      key: 'claims',
      label: 'Claims / probate window ended',
      status: claimsEnded ? 'done' : 'warn',
      detail: claimsEnded
        ? 'Creditor claims period has closed.'
        : 'Closing before the claims window ends can expose you to late creditor claims.'
    },
    {
      key: 'auction',
      label: 'Sale/auction money settled',
      status: outstandingBids > 0 ? 'warn' : 'done',
      detail:
        outstandingBids > 0
          ? `${finance.outstandingBids ? formatMoney(finance.outstandingBids) : ''} in winning bids not yet collected.`
          : 'No outstanding auction bids.'
    },
    {
      key: 'distributions',
      label: 'Distributions recorded',
      status: distributionCount > 0 ? 'done' : 'info',
      detail:
        distributionCount > 0
          ? `${distributionCount} distribution batch(es) on record.`
          : 'If the estate distributed cash or property, record it before closing.'
    },
    {
      key: 'receipts',
      label: 'Receipts acknowledged',
      status:
        distributionCount === 0
          ? 'info'
          : pendingAcknowledgements === 0
            ? 'done'
            : 'warn',
      detail:
        distributionCount === 0
          ? 'No distributions to acknowledge yet.'
          : pendingAcknowledgements === 0
            ? 'Every recipient acknowledged receipt.'
            : `${pendingAcknowledgements} recipient acknowledgement(s) still pending.`
    },
    {
      key: 'balances',
      label: 'Funds withdrawals match cash distributions',
      status: balanceStale ? 'warn' : 'done',
      detail: balanceStale
        ? 'A cash distribution is missing a Funds withdrawal transaction. Finalize with a fund account selected, or record the withdrawal under Transactions.'
        : 'Cash distributions are reflected in Estate Funds.'
    },
    {
      key: 'family',
      label: 'Family / heirs configured',
      status: Number(heirCount) > 0 ? 'done' : 'info',
      detail:
        Number(heirCount) > 0
          ? `${heirCount} family member(s) on record.`
          : 'No heirs were added. That is fine for some estates.'
    },
    {
      key: 'court_pack',
      label: 'Court-supporting pack & formal accounting',
      status: 'info',
      detail:
        'Generate supporting formal accounting and the sealed evidence pack for your records. Review with counsel before filing.'
    }
  ];

  const readyCount = items.filter((item) => item.status === 'done').length;
  const warnings = items.filter((item) => item.status === 'warn').length;

  return {
    items,
    readyCount,
    totalCount: items.length,
    warnings,
    canClose: !alreadyClosed,
    alreadyClosed,
    balanceStale
  };
}
