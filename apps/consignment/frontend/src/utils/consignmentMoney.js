/** FRPL sale margin: pre-tax sale price minus the protected seller payout. */
export function frplRevenue(actualSellingPrice, sellerPayout) {
  return Math.round((Number(actualSellingPrice) - Number(sellerPayout)) * 100) / 100;
}

function cents(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

export function feesTotal(fees) {
  return cents((fees || []).reduce((sum, f) => sum + Number(f.amount || 0), 0));
}

/** Gross = all fees paid + sale margin (if sold). Net = gross − transaction fee. */
export function revenueSummary(item, fees) {
  const fee = feesTotal(fees);
  const margin = item?.status === 'sold' ? cents(item.frpl_revenue) : 0;
  const gross = cents(fee + margin);
  const txn = cents(item?.transaction_fee);
  return { fees: fee, margin, gross, transactionFee: txn, net: cents(gross - txn) };
}

export function formatDollars(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '$0';
  const hasCents = Math.round(v * 100) % 100 !== 0;
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/** Register tax is calculated at Legends — never on this site. */
export function priceWithTaxLabel(n) {
  return `${formatDollars(n)} + applicable sales tax`;
}

export function itemPriceLabel(item) {
  if (item?.sale_method === 'auction') return 'Online auction';
  return priceWithTaxLabel(item?.selling_price);
}
