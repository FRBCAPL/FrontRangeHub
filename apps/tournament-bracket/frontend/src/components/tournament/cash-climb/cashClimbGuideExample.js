/**
 * Worked example for the King of the Hill guide, computed by the real payout plan (the same one the setup
 * screen previews): 16 players, $20 entry. Round counts are the plan; a real night can run shorter or longer.
 */
import { buildPayoutPreview } from './cashClimbPayoutPreview.js';
import { splitRrSurplus } from './cashClimbAllocations.js';

export const KOH_GUIDE_EXAMPLE = { entrants: 16, entryFee: 20 };

export function cashClimbGuideExample(example = KOH_GUIDE_EXAMPLE) {
  const { entrants, entryFee } = example;
  const preview = buildPayoutPreview({ prizePool: entrants * entryFee, playerCount: entrants });
  if (!preview) return null;
  const { plan } = preview;
  const rr = (plan.rr.rounds || []).map((r, i) => ({ round: i + 1, win: r.perWin, bye: r.perBye, matches: r.matchCount }));
  const koh = (plan.kohSchedule || []).map((pay, i) => ({ match: i + 1, pay }));
  const kohMatchTotal = koh.reduce((sum, m) => sum + m.pay, 0);
  return {
    ...example,
    pool: preview.pool,
    rrBudget: plan.rrBudget,
    kohBudget: plan.kohBudget,
    podiumReserve: plan.podiumReserve,
    rr,
    koh,
    kohMatchTotal,
    championship: Math.round((plan.kohBudget - kohMatchTotal) * 100) / 100,
    podium: splitRrSurplus(plan.podiumReserve),
  };
}
