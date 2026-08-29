import { eventRoundPlan } from './cashClimbDuration.js';
import { roundWinCost } from './cashClimbClimb.js';
import {
  buildPayoutPlan,
  kohPerWin,
  rrHoldPerWin,
  splitRrSurplus,
} from './cashClimbAllocations.js';

function money(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function rrShape(playerCount, fastest) {
  return eventRoundPlan(playerCount, null, fastest)
    .filter((round) => round.phase === 'rr')
    .map((round) => ({ matchCount: round.matchCount, byeCount: round.byeCount || 0 }));
}

function maxAffordableWin(remaining, matchCount, byeCount) {
  const matches = Math.max(0, matchCount);
  if (matches <= 0) return Math.max(0, Math.floor(remaining));
  for (let w = Math.floor(remaining / matches); w >= 0; w -= 1) {
    if (roundWinCost(w, matches, byeCount) <= remaining + 0.001) return w;
  }
  return 0;
}

/**
 * Accounting-only walk of locked RR/KOH schedules.
 * Does not play individual players; use for solvency and surplus identity.
 */
export function simulateLockedPayouts({
  entryFee,
  playerCount,
  fastestRr = false,
  extraRrRounds = 0,
  kohMatches = 5,
} = {}) {
  const pool = money((Number(entryFee) || 0) * (Number(playerCount) || 0));
  const plan = buildPayoutPlan({ prizePool: pool, playerCount });
  const planned = rrShape(playerCount, fastestRr);
  const liveRr = planned.length
    ? planned
    : [{ matchCount: Math.max(1, Math.floor(playerCount / 2)), byeCount: playerCount % 2 }];
  const extra = Math.max(0, Math.round(Number(extraRrRounds) || 0));
  const lastShape = liveRr[liveRr.length - 1];
  const rrRounds = extra
    ? [...liveRr, ...Array.from({ length: extra }, () => lastShape)]
    : liveRr;

  let rrPaid = 0;
  const rrPays = [];
  rrRounds.forEach((round, i) => {
    const remaining = money((plan.rrSpendable ?? plan.rrBudget) - rrPaid);
    let perWin = rrHoldPerWin(plan, i);
    let cost = roundWinCost(perWin, round.matchCount, round.byeCount);
    if (cost > remaining + 0.001) {
      perWin = maxAffordableWin(remaining, round.matchCount, round.byeCount);
      cost = roundWinCost(perWin, round.matchCount, round.byeCount);
    }
    rrPaid = money(rrPaid + Math.min(cost, remaining));
    rrPays.push({ perWin, cost, remaining });
  });

  let kohPaid = 0;
  const kohPays = [];
  const kohCount = Math.max(0, Math.min(5, Math.round(Number(kohMatches) || 0)));
  for (let i = 0; i < kohCount; i += 1) {
    const remaining = money(plan.kohBudget - kohPaid);
    const perWin = kohPerWin(plan, i);
    const paid = Math.min(perWin, remaining);
    kohPaid = money(kohPaid + paid);
    kohPays.push({ perWin, paid });
  }

  const rrSurplus = money(plan.rrBudget - rrPaid);
  const kohSurplus = money(plan.kohBudget - kohPaid);
  const podium = splitRrSurplus(rrSurplus);
  const distributed = money(rrPaid + kohPaid + rrSurplus + kohSurplus);

  return {
    pool,
    rrBudget: plan.rrBudget,
    kohBudget: plan.kohBudget,
    rrSpendable: plan.rrSpendable,
    podiumReserve: plan.podiumReserve,
    rrSchedule: plan.rr.schedule,
    kohSchedule: plan.kohSchedule,
    lastRrPerWin: plan.lastRrPerWin,
    championshipFloor: plan.championshipFloor,
    rrPays,
    kohPays,
    rrPaid,
    kohPaid,
    rrSurplus,
    kohSurplus,
    championshipPrize: kohSurplus,
    secondPrize: podium.second,
    thirdPrize: podium.third,
    matchPercent: pool > 0 ? money(((rrPaid + kohPaid) / pool) * 100) : 0,
    distributed,
    undistributed: money(pool - distributed),
  };
}

/** Rough 1st/2nd/3rd totals for a dominant KOH winner (accounting split of match cash). */
export function estimateFinishTotals(result, {
  firstRrShare = 0.28,
  secondRrShare = 0.22,
  thirdRrShare = 0.16,
  firstKohShare = 0.7,
  secondKohShare = 0.2,
  thirdKohShare = 0.1,
} = {}) {
  const first = money(
    result.rrPaid * firstRrShare + result.kohPaid * firstKohShare + result.championshipPrize
  );
  const second = money(
    result.rrPaid * secondRrShare + result.kohPaid * secondKohShare + result.secondPrize
  );
  const third = money(
    result.rrPaid * thirdRrShare + result.kohPaid * thirdKohShare + result.thirdPrize
  );
  return {
    first,
    second,
    third,
    firstSecondRatio: second > 0 ? money(first / second) : null,
    secondThirdRatio: third > 0 ? money(second / third) : null,
  };
}
