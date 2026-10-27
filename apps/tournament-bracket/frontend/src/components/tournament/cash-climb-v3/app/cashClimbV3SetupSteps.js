/**
 * Guided setup steps for Cash Climb (V3). Navigation only: saving is still checked by
 * cashClimbV3SetupProblems. A step's issues are hints for the step bar and the step footer.
 */
import { CASH_CLIMB_V3_LIMITS, cashClimbV3ConfigProblems } from '../cashClimbV3Config.js';
import { playerProblems, settingsFromSetup } from './cashClimbV3Record.js';

export const CCV3_MIN_PLAYERS = CASH_CLIMB_V3_LIMITS.minEntrants;

export const CCV3_SETUP_STEPS = [
  { key: 'event', label: 'Event', hint: 'Name, date, game and house rules' },
  { key: 'money', label: 'Money & race', hint: 'Entry fee, added money and race length' },
  { key: 'players', label: 'Players', hint: 'Add everyone who is playing' },
  { key: 'review', label: 'Review & save', hint: 'Check the payouts and the draw' },
];

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const trimmed = (v) => (typeof v === 'string' ? v.trim() : '');

/** Things to fix in each step ([] = nothing to fix). */
export function ccv3StepIssues(setup) {
  const event = [];
  if (!trimmed(setup?.name)) event.push('Enter a tournament name.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed(setup?.tournamentDate))) event.push('Pick the tournament date.');
  const list = Array.isArray(setup?.players) ? setup.players : [];
  const n = list.length;
  const money = cashClimbV3ConfigProblems({ ...settingsFromSetup(setup), entrants: Math.max(n, CCV3_MIN_PLAYERS) })
    .filter((p) => !/entrants/.test(p));
  const players = [
    ...(n < CCV3_MIN_PLAYERS ? [`Add ${plural(CCV3_MIN_PLAYERS - n, 'more player', 'more players')} (at least ${CCV3_MIN_PLAYERS}).`] : []),
    ...playerProblems(list),
  ];
  return { event, money, players };
}

/** Where to open: a new tournament at the start, a saved one with a full field at Review, else Players. */
export function ccv3InitialStep(initial) {
  if (!initial) return 'event';
  return (initial.players?.length || 0) >= CCV3_MIN_PLAYERS ? 'review' : 'players';
}

export const ccv3StepIndex = (key) => CCV3_SETUP_STEPS.findIndex((st) => st.key === key);
