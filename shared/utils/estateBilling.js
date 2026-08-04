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
  /** Only the PR's first owned estate gets the free trial. */
  trialOnFirstEstateOnly: true,
  priceLabel: '$29.99/month per estate'
};

export function formatBillingMoney(cents = ESTATE_BILLING_PLAN.amountCents) {
  return `$${(Number(cents) / 100).toFixed(Number(cents) % 100 === 0 ? 0 : 2)}`;
}

/** One-line soft pricing for landings / create / What is Vault. */
export function estatePricingBlurbShort() {
  const price = formatBillingMoney();
  return (
    `Your first estate includes a ${ESTATE_BILLING_PLAN.trialDays}-day free trial.` + 
     `\nBilled at ${price}/month after the 30 days.` +
    `\nAdditional estates start at ${price}/month. ` +
    `\nFamily, helpers, and the public sale are always free with paid PR access.`
  );
}

/** Slightly longer FAQ-style answer. */
export function estatePricingFaqAnswer() {
  const price = formatBillingMoney();
  return (
    `Estate Vault is billed per estate (per case), not per heir or helper. ` +
    `Only your first estate as Personal Representative includes a ${ESTATE_BILLING_PLAN.trialDays}-day free trial. ` +
    `After that first trial, ${price}/month keeps that estate open. ` +
    `If you open another estate, it starts at ${price}/month with a ${ESTATE_BILLING_PLAN.graceDays}-day grace period to subscribe — no second free trial. ` +
    `You can cancel in the Stripe customer portal when an estate is finished. ` +
    `If a subscription lapses, there is a ${ESTATE_BILLING_PLAN.graceDays}-day grace period with warnings; ` +
    `then Personal Representative, family, helper, and auction access for that estate pause until renewed. ` +
    `Checkout may show Stripe business name (for example FRPL) while the product line says Estate Vault Standard.`
  );
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

/** Phases where billing is paid / complimentary and home banner should be hidden. */
export function isBillingQuietPhase(phase) {
  return ['active', 'grandfathered', 'comp'].includes(String(phase || ''));
}

/**
 * Home banner: show for trial / grace / locked (and canceling active).
 * Hide when subscribed (active) or grandfathered / comp.
 */
export function shouldShowHomeBillingBanner(access) {
  if (!access || access.migrationMissing) return false;
  if (access.cancel_at_period_end && access.phase === 'active') return true;
  if (isBillingQuietPhase(access.phase)) return false;
  return (
    access.phase === 'trial' ||
    access.phase === 'grace' ||
    access.phase === 'locked' ||
    isBillingLocked(access)
  );
}

export function lockedPortalMessage(access) {
  return (
    access?.message ||
    'This estate is paused — the Personal Representative needs to renew Estate Vault to reopen it.'
  );
}

/** Clear copy when the estate is frozen after trial/grace without payment. */
export function frozenEstateBannerMessage(access, priceLabel) {
  const price = priceLabel || formatBillingMoney(access?.amount_cents);
  if (access?.needs_subscribe_no_trial) {
    return (
      access.message ||
      `This additional estate is frozen. Subscribe at ${price}/mo to reopen Personal Representative, family, helper, and auction access.`
    );
  }
  return (
    access?.message ||
    `This estate is frozen — the free trial ended without a subscription. Subscribe at ${price}/mo to reopen Personal Representative, family, helper, and auction access.`
  );
}
