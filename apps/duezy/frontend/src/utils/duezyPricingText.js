/** Plain-English pricing lines. `access` is the duezy_billing_status() snapshot (or null). */
import { money } from './duezyMath.js';
import { capFor, priceFor, TRIAL_DIVISIONS } from './duezyPricing.js';

export const PRICING_RULE = 'Leagues are free. You pay for divisions, counted across all your leagues — every league has at least one division.';

const per = (interval) => (interval === 'year' ? 'yr' : 'mo');

/**
 * What adding `adding` divisions does to this account, or null when there's nothing to say
 * (comp, locked, or over the trial limit — the limit note covers that).
 */
export function divisionCostNote(access, adding = 1) {
  if (!access || adding <= 0) return null;
  const used = Number(access.divisions_used) || 0;
  if (access.phase === 'trial' && !access.has_subscription) {
    const limit = Number(access.division_limit) || TRIAL_DIVISIONS;
    if (used + adding > limit) return null;
    const after = used + adding;
    return adding === 1
      ? `This uses ${after} of your ${limit} free-trial divisions.`
      : `This uses ${after} of your ${limit} free-trial divisions (${adding} new).`;
  }
  if (access.has_subscription && access.phase !== 'comp') {
    const interval = access.plan_interval === 'year' ? 'year' : 'month';
    const before = priceFor(Math.max(1, used), interval);
    const next = priceFor(Math.max(1, used + adding), interval);
    const what = adding === 1 ? 'This adds 1 division' : `This adds ${adding} divisions`;
    if (next > before) {
      const when = interval === 'year'
        ? 'The difference for the rest of your year is charged now.'
        : 'The difference for the rest of this month goes on your next bill.';
      const monthly = interval === 'year' ? ` (${money(before / 10)} to ${money(next / 10)} a month)` : '';
      return `${what} — your plan goes from ${money(before)} to ${money(next)}/${per(interval)}${monthly}. ${when}`;
    }
    return before >= capFor(interval)
      ? `${what} — you’re at the ${money(before)}/${per(interval)}${interval === 'year' ? ` (${money(before / 10)} a month)` : ''} cap, so no price change.`
      : `${what} — included in your current plan, no price change.`;
  }
  return null;
}

/** "1 of 2 divisions used" for the trial banner. */
export function trialUsage(access) {
  const limit = Number(access?.division_limit) || TRIAL_DIVISIONS;
  return `${Number(access?.divisions_used) || 0} of ${limit} divisions used`;
}
