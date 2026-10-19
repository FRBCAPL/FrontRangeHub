import React from 'react';
import { money } from './showdownView.js';

const roundsText = (r) => (r.perRound.quarterfinal !== undefined
  ? `quarterfinal ${money(r.perRound.quarterfinal)}, semifinal ${money(r.perRound.semifinal)}, championship ${money(r.perRound.final)}`
  : `semifinal ${money(r.perRound.semifinal)}, championship ${money(r.perRound.final)}`);

/** Provisional warning above the table. V1 keeps its original estimate wording. */
export function PayoutEstimateWarning({ ladder }) {
  if (!ladder.estimate) return null;
  if (ladder.payoutVersion !== 2) {
    return (
      <p className="sd-warn">
        Estimate only. Top-ups and the playoff payouts lock when qualifying ends, because they depend on how many
        qualifying wins the qualifiers have. This estimate assumes {ladder.twoWin} qualifier{ladder.twoWin === 1 ? '' : 's'} went 2&ndash;0 and the rest 1&ndash;1.
      </p>
    );
  }
  const { low, high } = ladder.range;
  return (
    <p className="sd-warn">
      Provisional. Playoff payouts lock when qualifying ends, because every qualifying game won is paid first.
      The playoff budget will be between {money(low.budget)} (every qualifying match 3&ndash;2) and {money(high.budget)} (every match 3&ndash;0).
      The table shows the lowest case: {roundsText(low)}{ladder.byes ? `, bye ${money(low.bye)}` : ''}.
      At the highest: {roundsText(high)}{ladder.byes ? `, bye ${money(high.bye)}` : ''}. Forfeits leave fewer games won and can only raise playoff pay.
    </p>
  );
}

/** How the schedule works, under the table. */
export function PayoutNotes({ ladder }) {
  if (ladder.payoutVersion !== 2) {
    return (
      <p className="sd-note">
        Each qualifying win pays {money(ladder.q)}, and players keep it whether or not they qualify. Each of the {ladder.qualifiers} qualifiers
        is topped up to the {money(ladder.entryFee)} entry fee. The rest of the pool ({money(ladder.budget)}) pays playoff wins
        {ladder.byes ? ` and ${ladder.byes} quarterfinal bye${ladder.byes === 1 ? '' : 's'} (half a quarterfinal win each)` : ''}.
        The championship includes any rounding remainder{ladder.finalRemainder ? ` (${money(ladder.finalRemainder)})` : ''}.
        {ladder.doubleForfeitShift ? ` Qualifying double forfeits moved ${money(ladder.doubleForfeitShift)} to the championship.` : ''}
      </p>
    );
  }
  return (
    <p className="sd-note">
      Every game won in a played match pays $1, to the winner and the loser. Each qualifying win pays {money(ladder.q)}, kept whether or not
      the player qualifies. After qualifying pay, qualifying games won and the playoff game reserve ({money(ladder.rackReserve)}),
      the rest ({money(ladder.budget)}) pays playoff wins{ladder.byes ? ` and ${ladder.byes} quarterfinal bye${ladder.byes === 1 ? '' : 's'} (half a quarterfinal win each)` : ''};
      each round pays more than the one before. Forfeits, walkovers and automatic advances pay no per-game money.
      When the event is completed, the champion also gets the champion bonus: every unused playoff game dollar plus any match-win payout nobody won.
    </p>
  );
}
