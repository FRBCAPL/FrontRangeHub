import { formatMoney, fromCents, money, toCents } from './breakAndRunMath.js';
import { entryAmountToPot } from './breakAndRunPayout.js';
import {
  CALLED_PAYOUT_MODE,
  ORDINARY_BALL_COUNT,
  SEED_FLOOR,
  calledPotView,
  calledTurnPayoutCents,
  isCalledPayoutMode,
  seedTopUpCents,
} from './breakAndRunCalledPayout.js';

export const CALLED_OUTCOMES = ['cash-out', 'bust', 'scratch-break', 'early-ten', 'final-ten'];

function count(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

/**
 * Lock taken when the operator taps Start attempt (the player breaks).
 * It remembers the newest ledger row at that moment; entries by other players
 * after it only count toward the next attempt.
 */
export const TALLY_KEYS = ['breakBalls', 'calledBalls', 'extraBalls'];

function emptyTally() {
  return { breakBalls: 0, calledBalls: 0, extraBalls: 0 };
}

export function newAttemptLock(state, playerId, now = new Date()) {
  return {
    playerId: String(playerId),
    ledgerTopId: state?.ledger?.[0]?.id || '',
    startedAt: now.toISOString(),
    tally: emptyTally(),
  };
}

export function sanitizeAttemptLock(raw) {
  const lock = raw && typeof raw === 'object' ? raw : null;
  if (!lock || !lock.playerId) return null;
  const tally = emptyTally();
  TALLY_KEYS.forEach((key) => { tally[key] = count(lock.tally?.[key]); });
  return {
    playerId: String(lock.playerId),
    ledgerTopId: String(lock.ledgerTopId || ''),
    startedAt: String(lock.startedAt || ''),
    tally,
  };
}

/** Lock with one live ball counter moved by `delta`; balls before the 10 stay within 0–9. */
export function adjustLockTally(lock, key, delta) {
  if (!lock || !TALLY_KEYS.includes(key)) return lock;
  const tally = { ...emptyTally(), ...lock.tally };
  const others = TALLY_KEYS.filter((k) => k !== key).reduce((sum, k) => sum + count(tally[k]), 0);
  const nextValue = count(tally[key]) + Math.round(Number(delta) || 0);
  tally[key] = Math.max(0, Math.min(ORDINARY_BALL_COUNT - others, nextValue));
  return { ...lock, tally };
}

/**
 * Live view of the started attempt: locked ball values plus the running bank.
 * Null when no called-ball attempt is started.
 */
export function attemptLiveView(state) {
  const lock = state?.attemptLock;
  if (!lock || !isCalledPayoutMode(state)) return null;
  const tally = { ...emptyTally(), ...lock.tally };
  const lockedPot = lockedPotFor(state, lock.playerId);
  const view = calledPotView(lockedPot);
  const result = calledTurnPayoutCents({ potCents: toCents(lockedPot), outcome: 'cash-out', ...tally });
  return {
    playerId: lock.playerId,
    ...tally,
    luckyBalls: tally.breakBalls + tally.extraBalls,
    totalBalls: tally.breakBalls + tally.calledBalls + tally.extraBalls,
    lockedPot: view.payablePot,
    normalBall: view.normalBall,
    luckyBall: view.luckyBall,
    finalTenPays: view.finalTenPays,
    bank: fromCents(result.bankCents),
  };
}

export function isAttemptStarted(state, playerId) {
  const lock = state?.attemptLock;
  return Boolean(lock && playerId && String(lock.playerId) === String(playerId));
}

/** Pot the player's attempt is paid from: current pot minus other players' later entries. */
export function lockedPotFor(state, playerId) {
  const pot = money(state?.currentPot);
  const lock = state?.attemptLock;
  const id = String(playerId || '');
  if (!lock || String(lock.playerId) !== id) return pot;
  const ledger = state.ledger || [];
  const idx = lock.ledgerTopId ? ledger.findIndex((row) => row.id === lock.ledgerTopId) : ledger.length;
  if (idx < 0) return pot;
  const lateEntries = ledger.slice(0, idx)
    .filter((row) => (row.type === 'buy-in' || row.type === 'rebuy') && String(row.playerId) !== id)
    .reduce((sum, row) => sum + (row.potAmount != null ? money(row.potAmount) : entryAmountToPot(row.amount)), 0);
  return money(Math.max(0, pot - lateEntries));
}

export function parseCalledDetails(raw = {}) {
  let outcome = CALLED_OUTCOMES.includes(raw.outcome) ? raw.outcome : 'cash-out';
  if (raw.scratchOnBreak) outcome = 'scratch-break';
  else if (raw.busted) outcome = 'bust';
  else if (outcome === 'cash-out' && raw.finalTen) outcome = 'final-ten';
  else if (outcome === 'cash-out' && raw.earlyTen) outcome = 'early-ten';
  const scratch = outcome === 'scratch-break';
  const calledBalls = scratch ? 0 : count(raw.calledBalls);
  const breakBalls = scratch ? 0 : count(raw.breakBalls);
  const extraBalls = scratch ? 0 : count(raw.extraBalls);
  const total = calledBalls + breakBalls + extraBalls;
  if (total > ORDINARY_BALL_COUNT) {
    throw new Error(`Balls before the 10 cannot add up to more than ${ORDINARY_BALL_COUNT}.`);
  }
  return { outcome, calledBalls, breakBalls, extraBalls, total };
}

function noteFor(parsed, result) {
  const lucky = parsed.breakBalls + parsed.extraBalls;
  const ballBits = `${parsed.calledBalls} called · ${lucky} lucky`;
  const bank = formatMoney(fromCents(result.bankCents));
  switch (parsed.outcome) {
    case 'scratch-break':
      return ['scratch/foul on the break'];
    case 'bust':
      return ['bust · missed or fouled', `${bank} bank forfeited`];
    case 'early-ten':
      return ['called early 10', ballBits, `bank ${bank} + 25% bonus ${formatMoney(fromCents(result.earlyTenBonusCents))}`];
    case 'final-ten':
      return ['FINAL 10 · won the pot'];
    default:
      return ['cashed out', ballBits];
  }
}

/** Payout + turn fields for one called-ball attempt, from the locked pot. */
export function calledTurnResult(state, playerId, raw = {}, potOverride) {
  const parsed = parseCalledDetails(raw);
  const lockedPot = potOverride ?? lockedPotFor(state, playerId);
  const result = calledTurnPayoutCents({ potCents: toCents(lockedPot), ...parsed });
  const view = calledPotView(lockedPot);
  const outcome = parsed.outcome === 'bust' || parsed.outcome === 'scratch-break'
    ? parsed.outcome
    : 'cash-out';
  return {
    paid: fromCents(result.payoutCents),
    outcome,
    scratchOnBreak: parsed.outcome === 'scratch-break',
    busted: parsed.outcome === 'bust',
    earlyTen: parsed.outcome === 'early-ten',
    payableBalls: parsed.total,
    fields: {
      payoutMode: CALLED_PAYOUT_MODE,
      calledOutcome: parsed.outcome,
      calledBalls: parsed.calledBalls,
      breakBalls: parsed.breakBalls,
      extraBalls: parsed.extraBalls,
      finalTen: parsed.outcome === 'final-ten',
      bank: fromCents(result.bankCents),
      earlyTenBonus: fromCents(result.earlyTenBonusCents),
      lockedPot: money(lockedPot),
      normalBall: view.normalBall,
      luckyBall: view.luckyBall,
    },
    view,
    noteParts: noteFor(parsed, result),
  };
}

/** Short history line for a recorded called-ball turn ('' for flat turns). */
export function describeCalledTurn(turn) {
  if (!turn || turn.payoutMode !== CALLED_PAYOUT_MODE) return '';
  if (turn.scratchOnBreak) return 'Scratch/foul on the break';
  const lucky = (turn.breakBalls || 0) + (turn.extraBalls || 0);
  const balls = `${turn.calledBalls || 0} called · ${lucky} lucky`;
  if (turn.busted) return turn.bank > 0 ? `Bust · ${formatMoney(turn.bank)} bank lost` : 'Bust';
  if (turn.finalTen) return 'FINAL 10 · won the pot';
  if (turn.earlyTen) return `Early 10 · ${balls}`;
  return `Cash out · ${balls}`;
}

/** League seed still needed to keep a called-ball pot at $100 (0 when not needed). */
export function seedTopUpNeeded(state) {
  if (!state || !isCalledPayoutMode(state) || state.status !== 'in-progress') return 0;
  return fromCents(seedTopUpCents(toCents(state.currentPot)));
}

export function seedTotal(state) {
  const topUps = (state?.ledger || [])
    .filter((row) => row.type === 'seed-top-up')
    .reduce((sum, row) => sum + money(row.amount), 0);
  return money(money(state?.startingSeed) + topUps);
}

export { SEED_FLOOR };
