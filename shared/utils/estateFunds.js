/**
 * Estate Funds — computed balances from opening + transactions.
 * Asset accounts only. Debts keep a manually tracked amount owed.
 */

import { formatMoney } from './estateFinance.js';

export const FUNDS_TXN_CATEGORIES = [
  'deposit',
  'expense',
  'distribution',
  'sale_proceeds',
  'adjustment',
  'transfer_in',
  'transfer_out'
];

export function fundsCategoryLabel(category) {
  switch (String(category || '').toLowerCase()) {
    case 'deposit':
      return 'Deposit / income';
    case 'expense':
      return 'Expense';
    case 'distribution':
      return 'Distribution';
    case 'sale_proceeds':
      return 'Sale proceeds';
    case 'adjustment':
      return 'Adjustment';
    case 'transfer_in':
      return 'Transfer in';
    case 'transfer_out':
      return 'Transfer out';
    default:
      return category || 'Transaction';
  }
}

/** Sum signed transaction amounts (positive in, negative out). */
export function sumFundsTransactionAmounts(transactions) {
  return (transactions || []).reduce((sum, row) => {
    const amt = Number(row?.amount);
    return sum + (Number.isFinite(amt) ? amt : 0);
  }, 0);
}

/**
 * Computed funds balance for one asset account.
 * @param {object} account — opening_balance (or legacy balance) + kind
 * @param {Array} transactions — rows for this account
 */
export function computeAccountFundsBalance(account, transactions = []) {
  if (!account || account.kind === 'debt') {
    const owed = Number(account?.balance);
    return Number.isFinite(owed) ? owed : 0;
  }
  const opening = Number(
    account.opening_balance != null ? account.opening_balance : account.balance
  );
  const base = Number.isFinite(opening) ? opening : 0;
  return base + sumFundsTransactionAmounts(transactions);
}

/** Attach computed_balance on each account using a txn list (or map). */
export function withComputedAccountBalances(accounts = [], transactions = []) {
  const byAccount = new Map();
  for (const txn of transactions || []) {
    const id = txn?.account_id;
    if (!id) continue;
    if (!byAccount.has(id)) byAccount.set(id, []);
    byAccount.get(id).push(txn);
  }
  return (accounts || []).map((account) => {
    const txns = byAccount.get(account.id) || [];
    const computed = computeAccountFundsBalance(account, txns);
    return {
      ...account,
      computed_balance: computed,
      // Prefer computed for display / snapshot sums on asset accounts
      balance: account.kind === 'debt' ? account.balance : computed
    };
  });
}

/** Actual money in estate fund accounts (asset kind). */
export function sumFundsAvailable(accounts) {
  return (accounts || []).reduce((sum, row) => {
    if (row?.kind === 'debt') return sum;
    const amt = Number(
      row.computed_balance != null ? row.computed_balance : row.balance
    );
    return sum + (Number.isFinite(amt) ? amt : 0);
  }, 0);
}

/** Display balance preferring computed_balance when present. */
export function getDisplayedFundsBalance(account) {
  if (!account) return 0;
  const n = Number(
    account.computed_balance != null ? account.computed_balance : account.balance
  );
  return Number.isFinite(n) ? n : 0;
}

/**
 * Warn-and-confirm when a funds posting would overdraw (or deepen an overdraft),
 * or when money-in is applied to an already overdrawn account.
 * Soft guard only — still allowed if the PR confirms (so they can match the bank).
 * @returns {boolean} true to proceed, false to cancel
 */
export function confirmFundsOverspendIfNeeded({
  account,
  signedDelta,
  actionLabel = 'transaction'
} = {}) {
  const delta = Number(signedDelta);
  if (!account || !Number.isFinite(delta) || delta === 0) return true;

  const current = getDisplayedFundsBalance(account);
  const projected = Math.round((current + delta) * 100) / 100;
  const name = account.account_name || 'this account';
  const label = actionLabel || 'transaction';

  if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
    return true;
  }

  if (delta < 0 && projected < 0) {
    return window.confirm(
      `This ${label} would leave ${name} at ${formatMoney(projected)} ` +
        `(currently ${formatMoney(current)}).\n\n` +
        'Estate Vault allows this so you can match the bank statement, but please confirm it is intentional.'
    );
  }

  if (delta > 0 && current < 0) {
    return window.confirm(
      `${name} is currently overdrawn at ${formatMoney(current)}.\n\n` +
        `Recording this ${label} will bring the balance to ${formatMoney(projected)}. Continue?`
    );
  }

  return true;
}
