/**
 * Estate Funds — computed balances from opening + transactions.
 * Asset accounts only. Debts keep a manually tracked amount owed.
 */

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
