import { fromCents, toCents } from './breakAndRunMath.js';

/**
 * Called-ball payout rules (Front Range Pool League working ruleset):
 * - Reserve is 20% of the pot once it is over $100; payable = pot − reserve.
 * - Called ball = payable ÷ 10, rounded down to a whole dollar.
 * - Lucky ball (break / extra balls on a made called shot) = 25% of a called ball,
 *   rounded down to $5, min $5, max $20, never more than a called ball.
 * - Early 10 = bank + 25% of (payable − bank), rounded down to a whole dollar.
 * - Final 10 = the whole payable pot, rounded down to a whole dollar.
 */
export const FLAT_PAYOUT_MODE = 'flat';
export const CALLED_PAYOUT_MODE = 'called-ball';
export const CALLED_RESERVE_RATE = 0.2;
export const SEED_FLOOR = 100;
/** Ordinary balls before the 10 (1–9). */
export const ORDINARY_BALL_COUNT = 9;

const DOLLAR = 100;
const FIVE_DOLLARS = 500;
const LUCKY_MAX = 2000;

function cents(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

function wholeDollarsDown(valueCents) {
  return Math.floor(cents(valueCents) / DOLLAR) * DOLLAR;
}

function count(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

export function normalizePayoutMode(mode) {
  return mode === CALLED_PAYOUT_MODE ? CALLED_PAYOUT_MODE : FLAT_PAYOUT_MODE;
}

export function isCalledPayoutMode(stateOrMode) {
  const mode = typeof stateOrMode === 'string' ? stateOrMode : stateOrMode?.payoutMode;
  return normalizePayoutMode(mode) === CALLED_PAYOUT_MODE;
}

/**
 * No reserve at $100 or less. Above $100 the reserve is 20% of the pot, but never
 * more than the amount over $100 — so the payable pot never shrinks as the pot grows.
 * Reserve and payable are whole dollars; leftover cents stay in the pot and carry forward.
 */
export function calledReserveCents(potCents) {
  const pot = cents(potCents);
  const floor = SEED_FLOOR * DOLLAR;
  if (pot <= floor) return 0;
  return wholeDollarsDown(Math.min(pot * CALLED_RESERVE_RATE, pot - floor));
}

export function calledPayableCents(potCents) {
  const pot = cents(potCents);
  return wholeDollarsDown(Math.max(0, pot - calledReserveCents(pot)));
}

export function normalBallCents(payableCents) {
  return wholeDollarsDown(cents(payableCents) / 10);
}

export function luckyBallCents(normalCents) {
  const normal = cents(normalCents);
  if (normal <= 0) return 0;
  const quarter = Math.floor((normal * 0.25) / FIVE_DOLLARS) * FIVE_DOLLARS;
  const bounded = Math.min(LUCKY_MAX, Math.max(FIVE_DOLLARS, quarter));
  return Math.min(normal, bounded);
}

export function bankCents({ normalCents, luckyCents, calledBalls = 0, luckyBalls = 0, payableCents } = {}) {
  const bank = count(calledBalls) * cents(normalCents) + count(luckyBalls) * cents(luckyCents);
  return payableCents == null ? bank : Math.min(cents(payableCents), bank);
}

export function earlyTenBonusCents(payableCents, currentBankCents) {
  const remaining = Math.max(0, cents(payableCents) - cents(currentBankCents));
  return wholeDollarsDown(remaining * 0.25);
}

export function finalTenCents(payableCents) {
  return wholeDollarsDown(payableCents);
}

/** Locked values for one attempt from the pot at the start of that attempt. */
export function calledBallValues(potCents) {
  const payable = calledPayableCents(potCents);
  const normal = normalBallCents(payable);
  return {
    potCents: cents(potCents),
    reserveCents: calledReserveCents(potCents),
    payableCents: payable,
    normalCents: normal,
    luckyCents: luckyBallCents(normal),
  };
}

/**
 * outcome: 'cash-out' | 'bust' | 'scratch-break' | 'early-ten' | 'final-ten'
 * breakBalls + extraBalls pay the lucky value; calledBalls pay the full value.
 */
export function calledTurnPayoutCents({
  potCents,
  outcome = 'cash-out',
  calledBalls = 0,
  breakBalls = 0,
  extraBalls = 0,
} = {}) {
  const values = calledBallValues(potCents);
  const bank = bankCents({
    normalCents: values.normalCents,
    luckyCents: values.luckyCents,
    calledBalls,
    luckyBalls: count(breakBalls) + count(extraBalls),
    payableCents: values.payableCents,
  });
  let payout = 0;
  let bonus = 0;
  if (outcome === 'cash-out') payout = bank;
  else if (outcome === 'early-ten') {
    bonus = earlyTenBonusCents(values.payableCents, bank);
    payout = Math.min(values.payableCents, bank + bonus);
  } else if (outcome === 'final-ten') payout = finalTenCents(values.payableCents);
  return { ...values, bankCents: bank, earlyTenBonusCents: bonus, payoutCents: payout };
}

export function calledPotView(currentPot) {
  const values = calledBallValues(toCents(currentPot));
  return {
    payoutMode: CALLED_PAYOUT_MODE,
    currentPot: fromCents(values.potCents),
    reserve: fromCents(values.reserveCents),
    reserveRate: CALLED_RESERVE_RATE,
    payablePot: fromCents(values.payableCents),
    perBall: fromCents(values.normalCents),
    normalBall: fromCents(values.normalCents),
    luckyBall: fromCents(values.luckyCents),
    earlyTenPays: fromCents(earlyTenBonusCents(values.payableCents, 0)),
    fullRunPays: fromCents(finalTenCents(values.payableCents)),
    finalTenPays: fromCents(finalTenCents(values.payableCents)),
    ballCount: 10,
  };
}

/** Amount of league seed needed to bring the pot back up to the $100 floor. */
export function seedTopUpCents(potCents, floorCents = SEED_FLOOR * DOLLAR) {
  return Math.max(0, cents(floorCents) - cents(potCents));
}
