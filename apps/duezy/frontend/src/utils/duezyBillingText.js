/** Billing copy + rules for Duezy screens. `access` is the duezy_billing_status() snapshot (or null). */
import { trialUsage } from './duezyPricingText.js';

export const TRIAL_LIMIT_MESSAGE = 'Your free trial covers up to 2 divisions. Choose a plan in Billing to add more.';
export const LOCKED_MESSAGE = 'Your leagues are read-only until you choose a plan. Everything is saved — pick a plan in Billing to keep recording.';

/** Turn database errors caused by billing rules into plain English. */
export function friendlyError(message) {
  const text = String(message || '');
  if (/duezy_trial_division_limit/.test(text)) return TRIAL_LIMIT_MESSAGE;
  const rule = text.match(/duezy_[a-z_]+: (.+)/);
  if (rule) return rule[1].charAt(0).toUpperCase() + rule[1].slice(1);
  if (/row-level security/i.test(text)) return LOCKED_MESSAGE;
  const missingColumn = /schema cache|column .* does not exist/i.test(text);
  if (/(start_date|skip_dates|grace_days|timezone)/.test(text) && missingColumn) {
    return 'League dates need a quick database update (duezy-schedule SQL). Everything else still works.';
  }
  if (/matches_per_night/.test(text) && missingColumn) {
    return 'Double play needs a quick database update (duezy-double-play SQL). Everything else still works.';
  }
  return text;
}

/** Can the owner add `count` more divisions right now? */
export function canAddDivisions(access, count = 1) {
  if (!access) return true;
  if (access.can_write === false) return false;
  const limit = access.division_limit;
  if (limit === null || limit === undefined) return true;
  return Number(access.divisions_used || 0) + count <= Number(limit);
}

/** What (if anything) the top-of-app banner should say. */
export function billingBanner(access) {
  if (!access) return null;
  switch (access.phase) {
    case 'trial': {
      const days = Number(access.days_remaining ?? 0);
      return {
        tone: days <= 5 ? 'warn' : 'info',
        text: `${days <= 0 ? 'Your free trial ends today' : `Free trial · ${days} ${days === 1 ? 'day' : 'days'} left`} · ${trialUsage(access)}`,
        cta: 'See plans',
      };
    }
    case 'grace':
      return { tone: 'warn', text: 'Your last payment didn’t go through. Update your card to keep recording.', cta: 'Fix billing' };
    case 'locked':
      return {
        tone: 'bad',
        text: access.status === 'trialing' || access.status === 'none' ? 'Your free trial has ended — your leagues are read-only.' : 'Your plan has ended — your leagues are read-only.',
        cta: 'Choose a plan',
      };
    default:
      return null;
  }
}
