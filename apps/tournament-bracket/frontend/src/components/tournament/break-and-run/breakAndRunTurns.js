import { money } from './breakAndRunMath.js';
import { earnedPayableBall, resolveTurnOutcome } from './breakAndRunPayout.js';

export function systemTurnDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function formatTurnDate(value) {
  if (!value) return '';
  const [y, m, day] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !day) return '';
  return new Date(y, m - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function normalizeTurn(turn) {
  if (!turn || typeof turn !== 'object') return null;
  const balls = Math.max(0, Math.round(Number(turn.ballsMade) || 0));
  const attempt = Math.max(1, Math.round(Number(turn.attempt) || 1));
  const scratchOnBreak = Boolean(turn.scratchOnBreak);
  const outcome = resolveTurnOutcome({
    outcome: turn.outcome,
    scratchOnBreak,
    busted: turn.busted,
  });
  return {
    id: turn.id || '',
    playerId: String(turn.playerId || ''),
    playerName: String(turn.playerName || ''),
    date: String(turn.date || '').slice(0, 10),
    at: turn.at || '',
    ballsMade: balls,
    payableBalls: Math.max(0, Math.round(Number(turn.payableBalls ?? balls) || 0)),
    earlyTen: Boolean(turn.earlyTen),
    scratchOnBreak: outcome === 'scratch-break',
    busted: outcome === 'bust',
    outcome,
    amountWon: money(turn.amountWon),
    attempt,
    isRebuyTurn: Boolean(turn.isRebuyTurn) || attempt === 2,
    potAfter: money(turn.potAfter),
  };
}

export function playerTurnsOnDate(turns, playerId, date) {
  const day = String(date || '').slice(0, 10);
  const id = String(playerId || '');
  return (turns || []).filter((turn) => turn.playerId === id && turn.date === day);
}

export function canTakeTurn(state, playerId, date) {
  const list = playerTurnsOnDate(state?.turns, playerId, date);
  if (!list.length) {
    return { ok: true, attempt: 1, isRebuyTurn: false };
  }
  const first = list.find((turn) => turn.attempt === 1) || list[0];
  if (earnedPayableBall(first)) {
    return {
      ok: false,
      attempt: list.length + 1,
      isRebuyTurn: false,
      reason: 'Earned a payable ball on the first attempt, so no rebuy.',
    };
  }
  if (list.some((turn) => turn.attempt >= 2) || list.length >= 2) {
    return { ok: false, attempt: list.length + 1, isRebuyTurn: true, reason: 'Already used the one rebuy for today.' };
  }
  return { ok: true, attempt: 2, isRebuyTurn: true };
}

export function playerDayStatus(state, playerId, date) {
  const turns = playerTurnsOnDate(state?.turns, playerId, date);
  const first = turns.find((turn) => turn.attempt === 1) || null;
  const rebuyTurn = turns.find((turn) => turn.attempt === 2) || null;
  const gate = canTakeTurn(state, playerId, date);
  const firstWonNothing = Boolean(first && !earnedPayableBall(first));
  return {
    date,
    turns,
    first,
    rebuyTurn,
    firstWonNothing,
    rebuyGranted: firstWonNothing,
    canTurn: gate.ok,
    nextAttempt: gate.attempt,
    isRebuyTurn: gate.isRebuyTurn,
    wonToday: money(turns.reduce((sum, turn) => sum + (Number(turn.amountWon) || 0), 0)),
    reason: gate.reason || '',
  };
}
