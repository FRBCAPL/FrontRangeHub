/**
 * Worked example for the player guide, computed by the real payout engine so it can never drift from the
 * rules: a sample event (16 players, $20 entry, race to 5), plus a 12-player field for the preliminary round.
 */
import { cashClimbV3Plan } from '../cashClimbV3Plan.js';
import { openingScoreSplit } from '../cashClimbV3Opening.js';
import { championshipSplit } from '../cashClimbV3Championship.js';
import { cashClimbV3Shape } from '../cashClimbV3Bracket.js';
import { roundHalfUpRatio } from '../cashClimbV3Money.js';

export const GUIDE_EXAMPLE = { entrants: 16, entryFee: 20, raceTo: 5, preliminaryField: 12 };

const LATER_NAMES = ['Championship', 'Semifinal', 'Quarterfinal', 'Round of 16', 'Round of 32', 'Round of 64'];

export function cashClimbV3GuideExample(example = GUIDE_EXAMPLE) {
  const { entrants, entryFee, raceTo, preliminaryField } = example;
  const plan = cashClimbV3Plan({ entrants, entryFeeCents: entryFee * 100, raceTo });
  const awards = plan?.ladder?.ladder;
  if (plan?.status !== 'valid' || !Array.isArray(awards) || !awards.length) return null;

  const config = { entryFeeCents: entryFee * 100, raceTo };
  const opening = [];
  for (let racks = 0; racks < raceTo; racks += 1) {
    const s = openingScoreSplit(config, racks);
    opening.push({ score: `${raceTo}-${racks}`, winner: s.winner, loser: s.loser });
  }
  const preliminary = [0, raceTo - 1].map((racks) => {
    const s = openingScoreSplit(config, racks, { preliminary: true });
    return { score: `${raceTo}-${racks}`, winner: s.winner, loser: s.loser };
  });

  const later = awards.map((amount, i) => ({ name: LATER_NAMES[awards.length - 1 - i] || `Round ${i + 2}`, amount }));
  const final = championshipSplit(awards[awards.length - 1]);
  const prelimShape = cashClimbV3Shape(preliminaryField);

  return {
    ...example,
    prizePool: plan.budget.prizePool,
    openingMatches: entrants / 2,
    opening,
    preliminary,
    prelimShape,
    later,
    final,
    half: (dollars) => roundHalfUpRatio(dollars, 2),
  };
}
