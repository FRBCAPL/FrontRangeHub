export { roundMoney } from '@shared/utils/estateFinance.js';

/** Split cents exactly so displayed recipient amounts always equal the total. */
export function equalCashAllocations(total, recipientKeys = []) {
  const keys = (recipientKeys || []).filter(Boolean);
  if (!keys.length) return {};
  const totalCents = Math.max(0, Math.round((Number(total) || 0) * 100));
  const base = Math.floor(totalCents / keys.length);
  let remainder = totalCents - base * keys.length;
  return keys.reduce((result, key) => {
    const cents = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    result[key] = cents / 100;
    return result;
  }, {});
}

export function buildDistributionRecipients({
  heirs = [],
  allocationMethod = 'equal',
  cashTotal = 0,
  selectedCashKeys = [],
  customCash = {},
  itemAssignments = {},
  transferNotes = ''
} = {}) {
  const cash =
    allocationMethod === 'equal'
      ? equalCashAllocations(cashTotal, selectedCashKeys)
      : customCash;
  const total = Object.values(cash).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0
  );

  return (heirs || [])
    .map((heir) => {
      const key = heir.sibling_key;
      const cashAmount = roundMoney(cash[key] || 0);
      const itemIds = Object.entries(itemAssignments)
        .filter(([, recipientKey]) => recipientKey === key)
        .map(([itemId]) => itemId);
      const sharePercent =
        total > 0 ? Math.round((cashAmount / total) * 1000000) / 10000 : 0;
      return {
        siblingKey: key,
        recipientName: heir.preferred_name || heir.display_name,
        cashAmount,
        sharePercent,
        itemIds,
        transferNotes
      };
    })
    .filter((row) => row.cashAmount > 0 || row.itemIds.length > 0);
}

