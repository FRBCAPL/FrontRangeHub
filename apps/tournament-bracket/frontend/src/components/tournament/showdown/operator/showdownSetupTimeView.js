/** What the setup time estimate is worked out for, and how its minutes are shown. Display only. */
import { payoutVersionOf } from '../showdownPayoutVersion.js';
import { fieldRuleFor, supportedFieldRange } from '../showdownFieldRules.js';
import { entryFeeProblem } from '../showdownPayout.js';
import { previewEntrants } from '../showdownPlannedPlayers.js';

export const PACES = { min: 5, max: 15, default: 10 };
/** A valid stand-in when the fee box is blank or invalid: the fee changes the money, not the time. */
const STAND_IN_FEE = 20;

/** `{ settings }` for the estimate worker, or `{ problem }` when there is nothing to estimate yet. */
export function setupEstimateSettings(state, minutesPerGame) {
  const s = state.settings || {};
  const entrants = previewEntrants(state);
  if (!fieldRuleFor(entrants)) {
    const { min, max } = supportedFieldRange();
    return { problem: `The time estimate appears once there are ${min}\u2013${max} players entered or expected.` };
  }
  const fee = Number(s.entryFee);
  return {
    settings: {
      version: payoutVersionOf(state),
      entrants,
      tables: Number(s.tableCount),
      entryFee: entryFeeProblem(fee) ? STAND_IN_FEE : fee,
      qualifyingRaceTo: Number(s.qualifyingRaceTo),
      qualifyingGames: Number(s.qualifyingGames),
      playoffRaceTo: Number(s.playoffRaceTo),
      minutesPerGame,
    },
  };
}

export function formatMinutes(min) {
  const m = Math.round(Math.abs(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r} min`;
  return r ? `${h} hr ${r} min` : `${h} hr`;
}
