/**
 * Estate Vault — account subtypes (checking, retirement, SS, debts, …).
 * kind remains asset|debt; account_type is the human subtype.
 */

export const ASSET_ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking', countsAsFundsDefault: true },
  { value: 'savings', label: 'Savings', countsAsFundsDefault: true },
  { value: 'money_market', label: 'Money market', countsAsFundsDefault: true },
  { value: 'cd', label: 'Certificate of deposit (CD)', countsAsFundsDefault: true },
  { value: 'brokerage', label: 'Brokerage / investment', countsAsFundsDefault: true },
  { value: 'retirement', label: 'Retirement (IRA / 401k / etc.)', countsAsFundsDefault: false },
  { value: 'pension', label: 'Pension', countsAsFundsDefault: false },
  { value: 'social_security', label: 'Social Security', countsAsFundsDefault: false },
  { value: 'life_insurance', label: 'Life insurance', countsAsFundsDefault: false },
  { value: 'annuity', label: 'Annuity', countsAsFundsDefault: false },
  { value: 'other', label: 'Other asset / account', countsAsFundsDefault: false }
];

export const DEBT_ACCOUNT_TYPES = [
  { value: 'credit_card', label: 'Credit card' },
  { value: 'mortgage', label: 'Mortgage / HELOC' },
  { value: 'personal_loan', label: 'Personal / installment loan' },
  { value: 'medical', label: 'Medical bill' },
  { value: 'tax', label: 'Tax debt' },
  { value: 'other_debt', label: 'Other debt' }
];

const ASSET_BY_VALUE = Object.fromEntries(ASSET_ACCOUNT_TYPES.map((t) => [t.value, t]));
const DEBT_BY_VALUE = Object.fromEntries(DEBT_ACCOUNT_TYPES.map((t) => [t.value, t]));

export function normalizeAccountType(value, kind = 'asset') {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (kind === 'debt') {
    return DEBT_BY_VALUE[raw] ? raw : 'other_debt';
  }
  return ASSET_BY_VALUE[raw] ? raw : 'other';
}

export function accountTypeLabel(value, kind = 'asset') {
  const key = normalizeAccountType(value, kind);
  if (kind === 'debt') return DEBT_BY_VALUE[key]?.label || 'Other debt';
  return ASSET_BY_VALUE[key]?.label || 'Other asset / account';
}

/** Default for new accounts of this type (debts never count as funds). */
export function countsAsFundsDefaultForType(accountType, kind = 'asset') {
  if (kind === 'debt') return false;
  const key = normalizeAccountType(accountType, 'asset');
  return ASSET_BY_VALUE[key]?.countsAsFundsDefault !== false;
}

/** Whether an account row is included in Cash on hand / Estate Funds. */
export function accountCountsAsFunds(account) {
  if (!account || account.kind === 'debt') return false;
  if (account.counts_as_funds == null && account.countsAsFunds == null) {
    return countsAsFundsDefaultForType(account.account_type || account.accountType, 'asset');
  }
  return Boolean(
    account.counts_as_funds != null ? account.counts_as_funds : account.countsAsFunds
  );
}
