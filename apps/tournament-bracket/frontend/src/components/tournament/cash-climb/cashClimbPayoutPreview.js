import { buildPayoutPlan, splitRrSurplus } from './cashClimbAllocations.js';

function money(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

/** Setup-table view of the locked RR/KOH plan. */
export function buildPayoutPreview({ prizePool, playerCount, tournament = null } = {}) {
  const count = Math.round(Number(playerCount) || 0);
  const pool = money(prizePool);
  if (count < 2 || pool <= 0) return null;

  const plan = buildPayoutPlan({ prizePool: pool, playerCount: count, tournament });
  const rrRounds = (plan.rr.rounds || []).map((round, i) => ({
    roundNumber: i + 1,
    label: round.label || `Round ${i + 1}`,
    phase: 'rr',
    roundPrize: round.plannedCost,
    perWin: round.perWin,
    matchCount: round.matchCount,
    paidThisRound: round.plannedCost,
  }));
  const kohRounds = (plan.kohSchedule || []).map((perWin, i) => ({
    roundNumber: i + 1,
    label: `KOH match ${i + 1}`,
    phase: 'koh',
    roundPrize: perWin,
    perWin,
    matchCount: 1,
    paidThisRound: perWin,
  }));
  const podium = splitRrSurplus(plan.rr.unspentInPlan);

  return {
    plan,
    pool,
    available: plan.rrBudget,
    rounds: [...rrRounds, ...kohRounds],
    expectedRounds: rrRounds.length,
    rrRounds: rrRounds.length,
    kohRounds: kohRounds.length,
    rrBudget: plan.rrBudget,
    kohBudget: plan.kohBudget,
    championshipFloor: plan.championshipFloor,
    estimatedSecond: podium.second,
    estimatedThird: podium.third,
    estimatedChampionship: plan.championshipFloor,
  };
}
