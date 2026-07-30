/** EstateIt fiduciary snapshot helpers — admin only */

export function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '$0.00';
  const abs = Math.abs(n).toFixed(2);
  return n < 0 ? `-$${abs}` : `$${abs}`;
}

/** Leading/winning bids not yet marked paid / deposited. */
export function sumOutstandingBids(items) {
  return (items || []).reduce((sum, item) => {
    if (item?.auction_paid_at) return sum;
    const bid = Number(item?.highest_bid);
    if (!Number.isFinite(bid) || bid <= 0) return sum;
    return sum + bid;
  }, 0);
}

/** Winning bids marked paid / deposited (auction_paid_at set). */
export function sumPaidAuctionSales(items) {
  return (items || []).reduce((sum, item) => {
    if (!item?.auction_paid_at) return sum;
    const bid = Number(item?.highest_bid);
    if (!Number.isFinite(bid) || bid <= 0) return sum;
    return sum + bid;
  }, 0);
}

/** @deprecated Prefer sumOutstandingBids + sumPaidAuctionSales */
export function sumAuctionGross(items) {
  return sumOutstandingBids(items) + sumPaidAuctionSales(items);
}

export function sumExpenses(expenses) {
  return (expenses || []).reduce((sum, row) => {
    const amt = Number(row?.amount);
    return sum + (Number.isFinite(amt) ? amt : 0);
  }, 0);
}

export function sumPrLoans(loans) {
  return (loans || []).reduce((sum, row) => {
    const amt = Number(row?.amount);
    return sum + (Number.isFinite(amt) ? amt : 0);
  }, 0);
}

/** Balances of listed bank / investment accounts (kind === 'asset'). */
export function sumAccountAssets(accounts) {
  return (accounts || []).reduce((sum, row) => {
    if (row?.kind === 'debt') return sum;
    const amt = Number(row?.balance);
    return sum + (Number.isFinite(amt) ? amt : 0);
  }, 0);
}

/** Balances of listed liabilities (kind === 'debt'). */
export function sumAccountDebts(accounts) {
  return (accounts || []).reduce((sum, row) => {
    if (row?.kind !== 'debt') return sum;
    const amt = Number(row?.balance);
    return sum + (Number.isFinite(amt) ? amt : 0);
  }, 0);
}

/**
 * PR-entered value of tangible property that has no market bid yet. Once an
 * item has a bid, the bid replaces the estimate so the same asset is not
 * counted twice. Distributed and archived records stay in history only.
 */
export function sumUnsoldInventoryValue(items) {
  return (items || []).reduce((sum, item) => {
    if (item?.auction_paid_at) return sum;
    if (Number(item?.highest_bid) > 0) return sum;
    if (item?.legal_status === 'distributed' || item?.legal_status === 'archived') return sum;
    const value = Number(item?.estimated_value);
    return sum + (Number.isFinite(value) && value > 0 ? value : 0);
  }, 0);
}

/**
 * Fiduciary snapshot math.
 * Estate balance (netDistributable) = what the estate holds − what it owes.
 *
 * Listed account balances are today's truth. Paid auction deposits and paid
 * expenses stay as activity records only — their effect should already be
 * reflected in those balances. estateCashOnHand remains paid + other for
 * detail views only.
 */
export function computeFinanceSnapshot({
  prLoansTotal = 0,
  outstandingBids = 0,
  expensesTotal = 0,
  paidAuctionSales = 0,
  otherCashOnHand = 0,
  accountAssetsTotal = 0,
  accountDebtsTotal = 0,
  unsoldInventoryValue = 0
}) {
  const loans = Number(prLoansTotal) || 0;
  const outstanding = Number(outstandingBids) || 0;
  const expenses = Number(expensesTotal) || 0;
  const paid = Number(paidAuctionSales) || 0;
  const other = Number(otherCashOnHand) || 0;
  const accountAssets = Number(accountAssetsTotal) || 0;
  const accountDebts = Number(accountDebtsTotal) || 0;
  const inventoryValue = Number(unsoldInventoryValue) || 0;
  const estateCashOnHand = paid + other;
  const netCashRemaining = paid - expenses;
  const grossEstateValue = other + accountAssets + outstanding + inventoryValue;
  const totalLiabilities = accountDebts + loans;
  return {
    accountingMethod: 'current_balances',
    prLoansTotal: loans,
    outstandingBids: outstanding,
    auctionSalesGross: outstanding + paid,
    expensesTotal: expenses,
    paidAuctionSales: paid,
    otherCashOnHand: other,
    estateCashOnHand,
    netCashRemaining,
    accountAssetsTotal: accountAssets,
    accountDebtsTotal: accountDebts,
    unsoldInventoryValue: inventoryValue,
    paidAuctionSalesCounted: 0,
    expensesCounted: 0,
    grossEstateValue,
    totalLiabilities,
    netDistributable: grossEstateValue - totalLiabilities
  };
}
