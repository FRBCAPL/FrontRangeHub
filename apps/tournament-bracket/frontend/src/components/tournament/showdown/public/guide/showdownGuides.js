/** Picks the guide for a payout version and builds the "What's different" comparison (V3 | V2 | V1). */
import { showdownRaceGuide } from '../../showdownNewPlayerGuide.js';
import { showdownV3Guide } from '../v3/showdownV3Guide.js';
import { qualifyingWinPay } from '../../showdownPayout.js';
import {
  MIN_ENTRY_FEE, V1_QUALIFYING_RACE_TO, V1_PLAYOFF_RACE_TO, V2_QUALIFYING_RACE_TO, V2_PLAYOFF_RACE_TO, V2_RACK_PAY,
} from '../../showdownRules.js';
import { V3_QUALIFYING_GAMES, V3_PLAYOFF_RACE_TO } from '../../v3/showdownV3Rules.js';
import { v3GuideCopy } from '../../v3/showdownV3NewEventCopy.js';

export function showdownGuideFor(version) {
  return Number(version) === 3 ? showdownV3Guide() : showdownRaceGuide(version);
}

/** Columns follow the tab order: V3, V2, V1. */
export function showdownGuideCompare(copy = v3GuideCopy().compare) {
  const fee = MIN_ENTRY_FEE;
  const win = `$${qualifyingWinPay(fee)} on a $${fee} entry`;
  const g = V3_QUALIFYING_GAMES;
  const r = V3_PLAYOFF_RACE_TO;
  return {
    versions: [3, 2, 1],
    rows: [
      { label: 'Qualifying matches', cells: [`${g.min}\u2013${g.max} games, all played; ties possible`, `Race to ${V2_QUALIFYING_RACE_TO}`, `Race to ${V1_QUALIFYING_RACE_TO} (can vary)`] },
      { label: 'Playoff matches', cells: [`Race to ${r.min}\u2013${r.max}`, `Race to ${V2_PLAYOFF_RACE_TO}`, `Race to ${V1_PLAYOFF_RACE_TO} (can vary)`] },
      { label: 'Standings ranked by', cells: ['Qualifying dollars', 'Match wins', 'Match wins'] },
      { label: 'Each game you win', cells: [copy.game, `$${V2_RACK_PAY}, win or lose`, 'Nothing on its own'] },
      { label: 'Each qualifying match win', cells: ['Nothing extra', win, win] },
      { label: 'Qualifiers topped up to the entry fee', cells: ['No', 'No', 'Yes'] },
      { label: 'Each playoff match win', cells: [copy.playoffWin, 'Pays more each round', 'Pays more each round'] },
      { label: 'Extra money to the champion', cells: [copy.champion, 'Unused playoff game money and unwon payouts', 'Leftover rounding dollars'] },
      { label: 'Payouts set', cells: ['All of them, when the event starts', 'Playoff pay, when qualifying ends', 'Top-ups and playoff pay, when qualifying ends'] },
    ],
  };
}
