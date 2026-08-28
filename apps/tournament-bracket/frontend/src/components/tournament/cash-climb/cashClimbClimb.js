function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

export const CLIMB_STEP = 1;
export const MIN_OPENING_WIN = 2;

export function roundWinCost(win, numMatches, numByes) {
  const w = Math.max(0, Math.floor(Number(win) || 0));
  const matches = Math.max(0, Math.round(Number(numMatches) || 0));
  const byes = Math.max(0, Math.round(Number(numByes) || 0));
  return w * matches + Math.floor(w / 2) * byes;
}

export function futureClimbReserve(win, futureRounds, step = CLIMB_STEP) {
  const n = Math.max(0, Math.round(Number(futureRounds) || 0));
  if (n <= 0) return 0;
  const w = Math.max(0, Math.floor(Number(win) || 0));
  const s = Math.max(1, Math.round(Number(step) || 1));
  return n * w + s * (n * (n + 1)) / 2;
}

function shapeCost(win, shape, step = CLIMB_STEP) {
  const w = Math.max(0, Math.floor(Number(win) || 0));
  const s = Math.max(1, Math.round(Number(step) || 1));
  return (shape || []).reduce(
    (sum, round, i) => sum + roundWinCost(w + i * s, round.matchCount, round.byeCount),
    0
  );
}

function holdCost(win, shape) {
  const w = Math.max(0, Math.floor(Number(win) || 0));
  return (shape || []).reduce(
    (sum, round) => sum + roundWinCost(w, round.matchCount, round.byeCount),
    0
  );
}

function asShape(numMatches, numByes, remainingRounds, shape) {
  const current = {
    matchCount: Math.max(0, Math.round(Number(numMatches) || 0)),
    byeCount: Math.max(0, Math.round(Number(numByes) || 0)),
  };
  if (Array.isArray(shape) && shape.length) {
    return [{ ...current }, ...shape.slice(1).map((round) => ({
      matchCount: Math.max(0, Math.round(Number(round.matchCount) || 0)),
      byeCount: Math.max(0, Math.round(Number(round.byeCount) || 0)),
    }))];
  }
  const extra = Math.max(0, Math.round(Number(remainingRounds) || 1) - 1);
  return [current, ...Array.from({ length: extra }, () => ({ matchCount: 1, byeCount: 0 }))];
}

/**
 * Opening win is at least $2. Later rounds climb $1 when leftover can pay that
 * amount without later rounds dropping. Pay more now only if leftover can still
 * fund a $1 climb on every remaining round from that higher amount.
 */
export function climbRoundPayouts({
  remaining,
  remainingRounds,
  numMatches,
  numByes,
  lastPerWin = 0,
  shape = null,
}) {
  const left = roundMoney(Math.max(0, Number(remaining) || 0));
  const rounds = asShape(numMatches, numByes, remainingRounds, shape);
  const matches = rounds[0]?.matchCount || 0;
  const last = Math.max(0, Math.round(Number(lastPerWin) || 0));
  const climbFrom = last > 0 ? last + CLIMB_STEP : MIN_OPENING_WIN;
  const cap = matches > 0 ? Math.floor(left / matches) : Math.floor(left);

  const firstCost = (win) => roundWinCost(win, rounds[0]?.matchCount, rounds[0]?.byeCount);
  const rest = rounds.slice(1);
  const canHoldRest = (win) => firstCost(win) + holdCost(win, rest) <= left + 0.001;
  const canFullClimb = (win) => shapeCost(win, rounds) <= left + 0.001;

  let perMatch = 0;
  if (climbFrom <= cap && canHoldRest(climbFrom)) {
    perMatch = climbFrom;
    for (let w = cap; w >= climbFrom; w -= 1) {
      if (canFullClimb(w)) {
        perMatch = w;
        break;
      }
    }
  } else if (last > 0 && firstCost(last) <= left + 0.001) {
    perMatch = last;
  } else if (last === 0 && firstCost(MIN_OPENING_WIN) <= left + 0.001) {
    perMatch = MIN_OPENING_WIN;
  } else {
    for (let w = Math.max(0, cap); w >= 0; w -= 1) {
      if (firstCost(w) <= left + 0.001) {
        perMatch = w;
        break;
      }
    }
  }

  if (perMatch > 0 && left + 0.001 < perMatch) {
    perMatch = Math.max(0, Math.floor(left));
  }

  const perBye = Math.floor(perMatch / 2);
  return {
    perMatch,
    perBye,
    roundPrize: roundMoney(Math.min(left, firstCost(perMatch))),
  };
}
