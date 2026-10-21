/**
 * Guided setup steps. Navigation only: every step's controls are the normal setup controls, and the
 * start is still checked by setupProblems. A step's status is a hint for the step bar.
 */
import { entryFeeProblem } from '../showdownPayout.js';
import { isPayoutV3 } from '../showdownPayoutVersion.js';
import { fieldRuleFor } from '../showdownFieldRules.js';
import { v3SettingsOf, v3SettingsProblems } from '../v3/showdownV3Event.js';
import { previewEntrants } from '../showdownPlannedPlayers.js';

export const SETUP_STEPS = [
  { key: 'event', label: 'Event', hint: 'Format, name, date and venue' },
  { key: 'settings', label: 'Settings', hint: 'Fee, tables and match lengths, with time and money' },
  { key: 'players', label: 'Players', hint: 'Add everyone who is playing' },
  { key: 'review', label: 'Review & start', hint: 'Check the payouts and start qualifying' },
];

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Things to fix in each step ([] = nothing to fix). */
export function stepIssues(state) {
  const s = state.settings || {};
  const event = String(state.name || '').trim() ? [] : ['Enter an event name.'];
  const fee = entryFeeProblem(s.entryFee);
  const count = previewEntrants(state);
  const v3 = isPayoutV3(state) && fieldRuleFor(count)
    ? v3SettingsProblems({ ...v3SettingsOf(state), entrants: count }).filter((p) => !/Entry fee/.test(p))
    : [];
  const n = (state.players || []).length;
  const min = Number(s.minEntrants);
  const max = Number(s.maxEntrants);
  const players = n < min ? [`Add ${plural(min - n, 'more player', 'more players')} (minimum ${min}).`]
    : n > max ? [`Remove ${plural(n - max, 'player', 'players')} (maximum ${max}).`] : [];
  return { event, settings: [...(fee ? [fee] : []), ...v3], players };
}

/** Where to open: a new event at the start, an event with players at Players, a full field at Review. */
export function initialStep(state) {
  const n = (state.players || []).length;
  if (n >= Number(state.settings?.minEntrants)) return 'review';
  return n > 0 ? 'players' : 'event';
}

export const stepIndex = (key) => SETUP_STEPS.findIndex((st) => st.key === key);
