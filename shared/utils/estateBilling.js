/**
 * Estate Vault billing — entitlement helpers (client-safe).
 */

export const ESTATE_BILLING_PLAN = {
  slug: 'standard_monthly',
  name: 'Estate Vault Standard',
  amountCents: 2999,
  interval: 'month',
  trialDays: 30,
  graceDays: 7,
  priceLabel: '$29.99/month per estate'
};

export function formatBillingMoney(cents = ESTATE_BILLING_PLAN.amountCents) {
  return `$${(Number(cents) / 100).toFixed(Number(cents) % 100 === 0 ? 0 : 2)}`;
}

/** Human-readable phase for banners. */
export function billingPhaseLabel(phase) {
  switch (String(phase || '')) {
    case 'trial':
      return 'Free trial';
    case 'grace':
      return 'Grace period';
    case 'active':
      return 'Active';
    case 'grandfathered':
      return 'Early access';
    case 'comp':
      return 'Complimentary';
    case 'locked':
      return 'Paused — renewal required';
    default:
      return 'Billing';
  }
}

export function billingBannerTone(phase) {
  switch (String(phase || '')) {
    case 'grace':
      return 'warn';
    case 'locked':
      return 'block';
    case 'trial':
      return 'info';
    default:
      return 'ok';
  }
}

export function billingDaysPhrase(daysRemaining) {
  if (daysRemaining == null || Number.isNaN(Number(daysRemaining))) return '';
  const n = Math.max(0, Math.ceil(Number(daysRemaining)));
  if (n <= 0) return 'ends today';
  if (n === 1) return '1 day left';
  return `${n} days left`;
}

export function isBillingLocked(access) {
  if (!access) return false;
  if (access.migrationMissing) return false;
  return access.allowed === false || access.phase === 'locked';
}

export function lockedPortalMessage(access) {
  return (
    access?.message ||
    'This estate is paused — the Personal Representative needs to renew Estate Vault to reopen it.'
  );
}
