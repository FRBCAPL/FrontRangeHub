/** Billing copy + rules for Duezy screens. `access` is the duezy_billing_status() snapshot (or null). */
import { trialUsage } from './duezyPricingText.js';

export const TRIAL_LIMIT_MESSAGE = 'Your free trial covers up to 2 divisions. Choose a plan in Billing to add more.';
export const TEST_LEAGUE_TAKEN = 'You already have a test league. Use Reset on it to start over, or archive it first.';
export const LOCKED_MESSAGE = 'Your leagues are read-only until you choose a plan. Pick a plan in Billing to keep recording.';

const shortDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/**
 * When a read-only account's leagues will be deleted, in words.
 * Null when nothing is scheduled (not locked, or the retention SQL isn't run yet).
 */
export function deletionNote(access) {
  if (!access?.delete_on) return null;
  const days = Number(access.days_until_delete ?? 0);
  const date = shortDate(access.delete_on);
  if (days <= 0) return 'Your leagues are scheduled for deletion — choose a plan now to keep them.';
  if (days <= 7) return `Your leagues will be deleted in ${days} ${days === 1 ? 'day' : 'days'} (${date}) — choose a plan to keep them.`;
  return `Your leagues will be deleted on ${date} — choose a plan to keep them.`;
}

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
  if (/duezy_leagues_one_test_idx/.test(text)) return TEST_LEAGUE_TAKEN;
  if (/(is_test|test_seed|duezy_test_reset)/.test(text) && /does not exist|schema cache|could not find/i.test(text)) {
    return 'Test leagues need a quick database update (duezy-test-league SQL). Everything else still works.';
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
    case 'locked': {
      const ended = access.status === 'trialing' || access.status === 'none' ? 'Your free trial has ended' : 'Your plan has ended';
      const note = deletionNote(access);
      const lastWeek = !access.delete_on || Number(access.days_until_delete ?? 0) <= 7;
      return {
        tone: lastWeek ? 'bad' : 'warn',
        text: note ? `${ended} and your leagues are read-only. ${note}` : `${ended} — your leagues are read-only.`,
        cta: 'Choose a plan',
      };
    }
    default:
      return null;
  }
}
