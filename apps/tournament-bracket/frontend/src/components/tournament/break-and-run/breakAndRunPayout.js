import { fromCents, money, toCents } from './breakAndRunMath.js';

export const USAPL_BALL_COUNT = 10;
/** @deprecated use USAPL_BALL_COUNT */
export const LEGENDS_BALL_COUNT = USAPL_BALL_COUNT;

export const DEFAULT_EVENT_NAME = 'USAPL 10-Ball Break & Run';

export function parseMoneyFee(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return money(fallback);
  return money(n);
}

export function clampReserveCents(potCents, reserveCents) {
  const pot = Math.max(0, Math.round(Number(potCents) || 0));
  const reserve = Math.max(0, Math.round(Number(reserveCents) || 0));
  return Math.min(pot, reserve);
}

export function payablePotCents(potCents, reserveCents = 0) {
  const pot = Math.max(0, Math.round(Number(potCents) || 0));
  return Math.max(0, pot - clampReserveCents(pot, reserveCents));
}

export function perBallCents(payableCents, ballCount = USAPL_BALL_COUNT) {
  const pot = Math.max(0, Math.round(Number(payableCents) || 0));
  const n = Math.max(1, Math.round(Number(ballCount) || USAPL_BALL_COUNT));
  return Math.round(pot / n);
}

export function turnPayoutCents({
  potCents,
  reserveCents = 0,
  payableBalls = 0,
  earlyTen = false,
  ballCount = USAPL_BALL_COUNT,
  outcome = 'cash-out',
  scratchOnBreak = false,
  busted = false,
} = {}) {
  const resolved = resolveTurnOutcome({ outcome, scratchOnBreak, busted });
  if (resolved !== 'cash-out') return 0;
  const payable = payablePotCents(potCents, reserveCents);
  const balls = Math.max(0, Math.round(Number(payableBalls) || 0));
  const units = balls + (earlyTen ? 2 : 0);
  return Math.min(payable, units * perBallCents(payable, ballCount));
}

/** cash-out | bust | scratch-break */
export function resolveTurnOutcome({ outcome, scratchOnBreak, busted } = {}) {
  if (scratchOnBreak || outcome === 'scratch-break') return 'scratch-break';
  if (busted || outcome === 'bust') return 'bust';
  if (outcome === 'cash-out' || !outcome) return 'cash-out';
  return 'cash-out';
}

export function potView(currentPot, reserve = 0, ballCount = USAPL_BALL_COUNT) {
  const potCents = toCents(currentPot);
  const reserveHeld = fromCents(clampReserveCents(potCents, toCents(reserve)));
  const payableCents = payablePotCents(potCents, toCents(reserve));
  const per = fromCents(perBallCents(payableCents, ballCount));
  return {
    currentPot: fromCents(potCents),
    reserve: reserveHeld,
    payablePot: fromCents(payableCents),
    perBall: per,
    earlyTenPays: money(per * 2),
    fullRunPays: fromCents(Math.min(payableCents, perBallCents(payableCents, ballCount) * ballCount)),
    ballCount,
  };
}

/** @deprecated use potView */
export function legendsPotView(currentPot, ballCount = USAPL_BALL_COUNT) {
  return potView(currentPot, 0, ballCount);
}

export function earnedPayableBall(turn) {
  if (!turn) return false;
  if (Number(turn.payableBalls) > 0) return true;
  if (turn.earlyTen) return true;
  if (turn.payableBalls == null && money(turn.amountWon) > 0) return true;
  return false;
}
