/** EstateIt fiduciary snapshot helpers — single source for money math & display */

/** Round to cents (banker's half-up via Math.round). */
export function roundMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '$0.00';
  const abs = Math.abs(n).toFixed(2);
  return n < 0 ? `-$${abs}` : `$${abs}`;
}

/**
 * Map SQL estate_compute_finance_snapshot() JSON → PR camelCase snapshot fields.
 * Prefer these totals everywhere (PR + heir) so numbers stay identical.
 * Keep in lockstep with supabase-migrations/estate-shared-finance-snapshot-2026-08.sql
 */
export function mapSqlFinanceSnapshot(sql = {}) {
  if (!sql || sql.success === false) return null;
  const accountAssetsTotal = roundMoney(sql.account_assets_total);
  const otherCashOnHand = roundMoney(sql.other_cash);
  const undepositedPaidSales = roundMoney(sql.undeposited_paid_sales);
  const fundsAvailable = roundMoney(
    sql.funds_available != null
      ? sql.funds_available
      : accountAssetsTotal + otherCashOnHand + undepositedPaidSales
  );
  const outstandingBids = roundMoney(sql.outstanding_bids);
  const unsoldInventoryValue = roundMoney(sql.unsold_inventory);
  const nonCashAssets = roundMoney(
    sql.non_cash_assets != null
      ? sql.non_cash_assets
      : outstandingBids + unsoldInventoryValue
  );
  const paidAuctionSales = roundMoney(sql.paid_auction_sales);
  const expensesTotal = roundMoney(sql.expenses_total);
  const prLoansTotal = roundMoney(sql.pr_loans_total);
  const accountDebtsTotal = roundMoney(sql.account_debts_total);
  const totalLiabilities = roundMoney(
    sql.total_liabilities != null
      ? sql.total_liabilities
      : accountDebtsTotal + prLoansTotal
  );
  const grossEstateValue = roundMoney(
    sql.gross_assets != null ? sql.gross_assets : fundsAvailable + nonCashAssets
  );
  const netDistributable = roundMoney(
    sql.estate_balance != null ? sql.estate_balance : grossEstateValue - totalLiabilities
  );
  return {
    accountingMethod:
      sql.accounting_method === 'funds_transactions'
        ? 'funds_transactions'
        : 'current_balances',
    prLoansTotal,
    outstandingBids,
    auctionSalesGross: roundMoney(outstandingBids + paidAuctionSales),
    expensesTotal,
    paidAuctionSales,
    undepositedPaidSales,
    otherCashOnHand,
    estateCashOnHand: roundMoney(paidAuctionSales + otherCashOnHand),
    netCashRemaining: roundMoney(paidAuctionSales - expensesTotal),
    accountAssetsTotal,
    accountDebtsTotal,
    unsoldInventoryValue,
    fundsAvailable,
    nonCashAssets,
    paidAuctionSalesCounted: 0,
    expensesCounted: 0,
    grossEstateValue,
    totalLiabilities,
    netDistributable
  };
}

/** Leading/winning bids not yet marked paid / deposited. */
export function sumOutstandingBids(items) {
  return roundMoney(
    (items || []).reduce((sum, item) => {
      if (item?.auction_paid_at) return sum;
      const bid = Number(item?.highest_bid);
      if (!Number.isFinite(bid) || bid <= 0) return sum;
      return sum + bid;
    }, 0)
  );
}

/** Winning bids marked paid / deposited (auction_paid_at set). */
export function sumPaidAuctionSales(items) {
  return roundMoney(
    (items || []).reduce((sum, item) => {
      if (!item?.auction_paid_at) return sum;
      const bid = Number(item?.highest_bid);
      if (!Number.isFinite(bid) || bid <= 0) return sum;
      return sum + bid;
    }, 0)
  );
}

/**
 * Paid auction sales that are NOT yet in Estate Funds (no sale_proceeds txn
 * for the item). Keeps collected money in the estate picture until deposited.
 * @param {object[]} items
 * @param {Iterable<string>|Set<string>} depositedItemIds item ids with a Funds sale_proceeds row
 */
export function sumUndepositedPaidSales(items, depositedItemIds = []) {
  const deposited =
    depositedItemIds instanceof Set
      ? depositedItemIds
      : new Set([...(depositedItemIds || [])].filter(Boolean).map(String));
  return roundMoney(
    (items || []).reduce((sum, item) => {
      if (!item?.auction_paid_at) return sum;
      if (deposited.has(String(item.id))) return sum;
      const bid = Number(item?.highest_bid);
      if (!Number.isFinite(bid) || bid <= 0) return sum;
      return sum + bid;
    }, 0)
  );
}

/** Item ids that already have a Funds sale_proceeds deposit. */
export function saleProceedsDepositedItemIds(transactions = []) {
  const ids = new Set();
  for (const txn of transactions || []) {
    if (txn?.category !== 'sale_proceeds') continue;
    if (txn?.item_id) ids.add(String(txn.item_id));
  }
  return ids;
}

/** @deprecated Prefer sumOutstandingBids + sumPaidAuctionSales */
export function sumAuctionGross(items) {
  return roundMoney(sumOutstandingBids(items) + sumPaidAuctionSales(items));
}

export function sumExpenses(expenses) {
  return roundMoney(
    (expenses || []).reduce((sum, row) => {
      const amt = Number(row?.amount);
      return sum + (Number.isFinite(amt) ? amt : 0);
    }, 0)
  );
}

export function sumPrLoans(loans) {
  return roundMoney(
    (loans || []).reduce((sum, row) => {
      const amt = Number(row?.amount);
      return sum + (Number.isFinite(amt) ? amt : 0);
    }, 0)
  );
}

/** Balances of listed bank / investment accounts (kind === 'asset'). */
export function sumAccountAssets(accounts) {
  return roundMoney(
    (accounts || []).reduce((sum, row) => {
      if (row?.kind === 'debt') return sum;
      const amt = Number(row?.balance);
      return sum + (Number.isFinite(amt) ? amt : 0);
    }, 0)
  );
}

/** Balances of listed liabilities (kind === 'debt'). */
export function sumAccountDebts(accounts) {
  return roundMoney(
    (accounts || []).reduce((sum, row) => {
      if (row?.kind !== 'debt') return sum;
      const amt = Number(row?.balance);
      return sum + (Number.isFinite(amt) ? amt : 0);
    }, 0)
  );
}

/**
 * PR-entered value of tangible property that has no market bid yet. Once an
 * item has a bid, the bid replaces the estimate so the same asset is not
 * counted twice. Distributed and archived records stay in history only.
 */
export function sumUnsoldInventoryValue(items) {
  return roundMoney(
    (items || []).reduce((sum, item) => {
      if (item?.auction_paid_at) return sum;
      if (Number(item?.highest_bid) > 0) return sum;
      if (item?.legal_status === 'distributed' || item?.legal_status === 'archived') return sum;
      const value = Number(item?.estimated_value);
      return sum + (Number.isFinite(value) && value > 0 ? value : 0);
    }, 0)
  );
}

/**
 * Fiduciary snapshot math.
 * Estate balance (netDistributable) = what the estate holds − what it owes.
 *
 * Estate Funds (cash available) =
 *   listed fund account balances + other cash + paid sales not yet deposited.
 * Non-cash assets (estimates / outstanding bids) are shown separately and do
 * not change Funds until money is received.
 *
 * Paid sales that already have a sale_proceeds Funds txn must NOT also be
 * passed as undepositedPaidSales (that would double-count).
 *
 * When fundsAreTransactionComputed is true, accountAssetsTotal is already the
 * sum of opening_balance + transactions (not a second manual edit).
 */
export function computeFinanceSnapshot({
  prLoansTotal = 0,
  outstandingBids = 0,
  expensesTotal = 0,
  paidAuctionSales = 0,
  undepositedPaidSales = 0,
  otherCashOnHand = 0,
  accountAssetsTotal = 0,
  accountDebtsTotal = 0,
  unsoldInventoryValue = 0,
  fundsAreTransactionComputed = false
}) {
  const loans = roundMoney(prLoansTotal);
  const outstanding = roundMoney(outstandingBids);
  const expenses = roundMoney(expensesTotal);
  const paid = roundMoney(paidAuctionSales);
  const undeposited = roundMoney(undepositedPaidSales);
  const other = roundMoney(otherCashOnHand);
  const accountAssets = roundMoney(accountAssetsTotal);
  const accountDebts = roundMoney(accountDebtsTotal);
  const inventoryValue = roundMoney(unsoldInventoryValue);
  const estateCashOnHand = roundMoney(paid + other);
  const netCashRemaining = roundMoney(paid - expenses);
  const fundsAvailable = roundMoney(other + accountAssets + undeposited);
  const nonCashAssets = roundMoney(outstanding + inventoryValue);
  const grossEstateValue = roundMoney(fundsAvailable + nonCashAssets);
  const totalLiabilities = roundMoney(accountDebts + loans);
  return {
    accountingMethod: fundsAreTransactionComputed
      ? 'funds_transactions'
      : 'current_balances',
    prLoansTotal: loans,
    outstandingBids: outstanding,
    auctionSalesGross: roundMoney(outstanding + paid),
    expensesTotal: expenses,
    paidAuctionSales: paid,
    undepositedPaidSales: undeposited,
    otherCashOnHand: other,
    estateCashOnHand,
    netCashRemaining,
    accountAssetsTotal: accountAssets,
    accountDebtsTotal: accountDebts,
    unsoldInventoryValue: inventoryValue,
    fundsAvailable,
    nonCashAssets,
    /** @deprecated Always 0 — paid sales enter Funds via deposit or undepositedPaidSales */
    paidAuctionSalesCounted: 0,
    /** @deprecated Always 0 — expenses enter Funds via expense transactions */
    expensesCounted: 0,
    grossEstateValue,
    totalLiabilities,
    netDistributable: roundMoney(grossEstateValue - totalLiabilities)
  };
}
