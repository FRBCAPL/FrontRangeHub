/**
 * Estate Vault — creditor claims register (labels / helpers).
 */

export const CREDITOR_CLAIM_STATUSES = [
  { value: 'open', label: 'Open / reviewing' },
  { value: 'allowed', label: 'Allowed' },
  { value: 'denied', label: 'Denied' },
  { value: 'paid', label: 'Paid' },
  { value: 'withdrawn', label: 'Withdrawn' }
];

export function normalizeClaimStatus(value) {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  return CREDITOR_CLAIM_STATUSES.some((s) => s.value === raw) ? raw : 'open';
}

export function claimStatusLabel(value) {
  const key = normalizeClaimStatus(value);
  return CREDITOR_CLAIM_STATUSES.find((s) => s.value === key)?.label || 'Open / reviewing';
}

/** Open + allowed are still active obligations the PR is tracking. */
export function claimIsActive(status) {
  const key = normalizeClaimStatus(status);
  return key === 'open' || key === 'allowed';
}

export function sumActiveClaimAmounts(claims = []) {
  return (claims || []).reduce((sum, row) => {
    if (!claimIsActive(row?.status)) return sum;
    const amt = Number(row?.amount);
    return sum + (Number.isFinite(amt) ? amt : 0);
  }, 0);
}
