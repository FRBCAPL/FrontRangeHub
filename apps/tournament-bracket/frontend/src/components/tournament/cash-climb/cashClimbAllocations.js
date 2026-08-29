import { eventRoundPlan } from './cashClimbDuration.js';
import { climbRoundPayouts, roundWinCost } from './cashClimbClimb.js';
import {
  KOH_MATCH_COUNT,
  KOH_MATCH_SPEND_CAP,
  KOH_MIN_GAP_OVER_RR,
  KOH_TARGET_PERCENT,
  MIN_OPENING_WIN,
  RR_CLIMB_STEP,
  RR_HOLD_BUFFER_ROUNDS,
  RR_SURPLUS_SECOND_SHARE,
  RR_SURPLUS_THIRD_SHARE,
} from './cashClimbPayoutConfig.js';

function money(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function kohLadderSum(start, step, count) {
  return count * start + step * (count * (count - 1)) / 2;
}

function rrPlanShape(playerCount, tournament) {
  return eventRoundPlan(playerCount, tournament, false)
    .filter((round) => round.phase === 'rr')
    .map((round) => ({
      matchCount: round.matchCount,
      byeCount: round.byeCount || 0,
      label: round.label,
    }));
}

export function allocateBudgets(prizePool) {
  const pool = money(prizePool);
  const kohBudget = money(Math.max(0, Math.round(pool * KOH_TARGET_PERCENT)));
  const rrBudget = money(Math.max(0, pool - kohBudget));
  return { pool, rrBudget, kohBudget };
}

export function buildKohSchedule(kohBudget, lastRrPerWin = 0) {
  const budget = Math.max(0, Math.round(Number(kohBudget) || 0));
  const matchCap = Math.max(0, Math.floor(budget * KOH_MATCH_SPEND_CAP));
  const minStart = Math.max(1, Math.round(Number(lastRrPerWin) || 0) + KOH_MIN_GAP_OVER_RR);

  let best = null;
  const consider = (start, step, count) => {
    if (start < 1 || step < 1 || count < 1) return;
    const sum = kohLadderSum(start, step, count);
    if (sum > matchCap) return;
    const above = start >= minStart ? 1 : 0;
    const score = above * 1e12 + count * 1e8 + start * 1e4 + step * 100 - sum;
    if (!best || score > best.score) best = { start, step, count, sum, score };
  };

  for (let count = KOH_MATCH_COUNT; count >= 1; count -= 1) {
    for (let step = 3; step >= 1; step -= 1) {
      const maxStart = Math.floor((matchCap - step * (count * (count - 1)) / 2) / count);
      for (let start = Math.max(1, maxStart); start >= 1; start -= 1) {
        consider(start, step, count);
      }
    }
  }

  if (!best) {
    const each = Math.max(1, Math.floor(matchCap / Math.max(1, KOH_MATCH_COUNT)) || 1);
    const schedule = Array.from({ length: KOH_MATCH_COUNT }, (_, i) => each + i);
    const scheduledSpend = schedule.reduce((sum, n) => sum + n, 0);
    return {
      schedule,
      scheduledSpend,
      championshipFloor: Math.max(0, budget - scheduledSpend),
    };
  }

  const schedule = Array.from({ length: best.count }, (_, i) => best.start + i * best.step);
  return {
    schedule,
    scheduledSpend: best.sum,
    championshipFloor: Math.max(0, budget - best.sum),
  };
}

export function buildRrSchedule(rrBudget, playerCount, tournament = null, maxPerWin = 0) {
  const budget = money(rrBudget);
  const cap = Math.max(0, Math.round(Number(maxPerWin) || 0));
  const plan = rrPlanShape(playerCount, tournament);
  const shape = plan.length
    ? plan
    : [{ matchCount: Math.max(1, Math.floor((playerCount || 2) / 2)), byeCount: (playerCount || 2) % 2 }];

  let remaining = budget;
  let lastPerWin = 0;
  const rounds = [];

  shape.forEach((round, i) => {
    const tail = shape.slice(i);
    const payouts = climbRoundPayouts({
      remaining,
      remainingRounds: tail.length,
      numMatches: round.matchCount,
      numByes: round.byeCount,
      lastPerWin,
      shape: tail,
    });
    let perWin = Math.max(0, payouts.perMatch);
    if (cap > 0) perWin = Math.min(perWin, cap);
    const cost = roundWinCost(perWin, round.matchCount, round.byeCount);
    remaining = money(Math.max(0, remaining - cost));
    lastPerWin = perWin;
    rounds.push({
      label: round.label || `Round ${i + 1}`,
      matchCount: round.matchCount,
      byeCount: round.byeCount,
      perWin,
      perBye: Math.floor(perWin / 2),
      plannedCost: cost,
    });
  });

  return {
    rounds,
    schedule: rounds.map((round) => round.perWin),
    lastPerWin,
    plannedSpend: money(budget - remaining),
    unspentInPlan: remaining,
  };
}

export function buildPayoutPlan({ prizePool, playerCount, tournament = null } = {}) {
  const { pool } = allocateBudgets(prizePool);
  const maxRr = money(pool - Math.round(pool * KOH_TARGET_PERCENT));
  let rrBudget = maxRr;
  let kohBudget = money(pool - rrBudget);

  const planWith = (nextRr) => {
    const nextKoh = money(Math.max(0, pool - nextRr));
    const kohFirstPass = buildKohSchedule(nextKoh, 0);
    const rrCap = Math.max(
      MIN_OPENING_WIN,
      (kohFirstPass.schedule[0] || MIN_OPENING_WIN) - KOH_MIN_GAP_OVER_RR
    );
    const rr = buildRrSchedule(nextRr, playerCount, tournament, rrCap);
    const koh = buildKohSchedule(nextKoh, rr.lastPerWin);
    return { rrBudget: money(nextRr), kohBudget: nextKoh, rr, koh };
  };

  let current = planWith(rrBudget);
  const lastRr = (current.rr.rounds || [])[current.rr.rounds.length - 1];
  const holdBuffer = lastRr
    ? RR_HOLD_BUFFER_ROUNDS * roundWinCost(lastRr.perWin, lastRr.matchCount, lastRr.byeCount)
    : 0;
  const rrNeed = money(current.rr.plannedSpend + holdBuffer);
  if (rrNeed + 0.001 < current.rrBudget) {
    current = planWith(rrNeed);
  }

  rrBudget = current.rrBudget;
  kohBudget = current.kohBudget;
  const rr = current.rr;
  const koh = current.koh;
  return {
    pool,
    rrBudget,
    kohBudget,
    rr,
    koh,
    lastRrPerWin: rr.lastPerWin,
    kohSchedule: koh.schedule,
    championshipFloor: koh.championshipFloor,
    podiumSecondShare: RR_SURPLUS_SECOND_SHARE,
    podiumThirdShare: RR_SURPLUS_THIRD_SHARE,
    minOpeningWin: MIN_OPENING_WIN,
    rrClimbStep: RR_CLIMB_STEP,
  };
}

export function splitRrSurplus(surplus) {
  const left = money(Math.max(0, surplus));
  let second = money(left * RR_SURPLUS_SECOND_SHARE);
  let third = money(left * RR_SURPLUS_THIRD_SHARE);
  const drift = money(left - second - third);
  if (drift) second = money(second + drift);
  return { second, third };
}

export function rrHoldPerWin(plan, extraRoundIndex) {
  const locked = plan?.rr?.schedule || [];
  if (!locked.length) return MIN_OPENING_WIN;
  if (extraRoundIndex < locked.length) return locked[extraRoundIndex];
  return locked[locked.length - 1];
}

export function kohPerWin(plan, kohMatchIndex) {
  const schedule = plan?.kohSchedule || plan?.koh?.schedule || [];
  const i = Math.max(0, Math.round(Number(kohMatchIndex) || 0));
  return schedule[Math.min(i, schedule.length - 1)] || 0;
}
