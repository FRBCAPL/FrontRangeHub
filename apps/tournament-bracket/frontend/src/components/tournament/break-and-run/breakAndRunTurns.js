import { money } from './breakAndRunMath.js';
import { resolveTurnOutcome } from './breakAndRunPayout.js';

export function systemTurnDate(now = new Date()) {
  const d = now instanceof Date ? now : new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

function turnTimeMs(turn) {
  if (!turn) return 0;
  if (turn.at) {
    const t = Date.parse(turn.at);
    if (Number.isFinite(t)) return t;
  }
  const day = String(turn.date || '').slice(0, 10);
  const [y, m, d] = day.split('-').map(Number);
  if (y && m && d) return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  return 0;
}

function sessionIdOf(state) {
  return String(state?.currentSessionId || '').trim();
}

export function currentSession(state) {
  const id = sessionIdOf(state);
  if (!id) return null;
  return (state.sessions || []).find((s) => String(s.id) === id) || null;
}

export function playerTurnsChronological(turns, playerId, sessionId = '') {
  const id = String(playerId || '');
  const sid = String(sessionId || '').trim();
  return (turns || [])
    .filter((turn) => {
      if (String(turn.playerId) !== id) return false;
      if (!sid) return true;
      return String(turn.sessionId || '') === sid;
    })
    .slice()
    .sort((a, b) => turnTimeMs(a) - turnTimeMs(b));
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
    sessionId: String(turn.sessionId || ''),
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
    isRebuyTurn: Boolean(turn.isRebuyTurn) || attempt > 1,
    potAfter: money(turn.potAfter),
  };
}

export function playerTurnsOnDate(turns, playerId, date, sessionId = '') {
  const day = String(date || '').slice(0, 10);
  const id = String(playerId || '');
  const sid = String(sessionId || '').trim();
  return (turns || []).filter((turn) => {
    if (turn.playerId !== id || turn.date !== day) return false;
    if (!sid) return true;
    return String(turn.sessionId || '') === sid;
  });
}

/** True when a rebuy fee for this session is waiting for the next recorded attempt. */
export function hasPendingRebuyPayment(state, playerId) {
  const id = String(playerId || '');
  const sid = sessionIdOf(state);
  const rebuyPays = (state?.ledger || []).filter((row) => (
    row.type === 'rebuy'
    && String(row.playerId) === id
    && (!sid || String(row.sessionId || '') === sid)
  )).length;
  const rebuyTries = (state?.turns || []).filter((turn) => (
    String(turn.playerId) === id
    && (turn.isRebuyTurn || Number(turn.attempt) > 1)
    && (!sid || String(turn.sessionId || '') === sid)
  )).length;
  return rebuyPays > rebuyTries;
}

/**
 * Unlimited rebuys while the last attempt in this session paid $0.
 * Cash-out with a payout ends play for the current session only.
 */
export function canTakeTurn(state, playerId) {
  const session = currentSession(state);
  const sid = session ? String(session.id) : '';
  if (!session || !sid) {
    return {
      ok: false,
      attempt: 1,
      isRebuyTurn: false,
      reason: 'Start a session before recording turns.',
    };
  }
  if (session.status !== 'open') {
    return {
      ok: false,
      attempt: 1,
      isRebuyTurn: false,
      reason: 'This session has ended. Start a new session to continue.',
    };
  }
  const chron = playerTurnsChronological(state?.turns, playerId, sid);
  if (!chron.length) {
    return { ok: true, attempt: 1, isRebuyTurn: false };
  }
  const last = chron[chron.length - 1];
  const nextAttempt = chron.length + 1;
  if (money(last.amountWon) > 0) {
    return {
      ok: false,
      attempt: nextAttempt,
      isRebuyTurn: true,
      sessionDone: true,
      reason: 'Cashed out — finished for this session. They can play again when the next session starts.',
    };
  }
  return { ok: true, attempt: nextAttempt, isRebuyTurn: true };
}

export function playerDayStatus(state, playerId, date, now = new Date()) {
  const sid = sessionIdOf(state);
  const chron = playerTurnsChronological(state?.turns, playerId, sid);
  const last = chron.length ? chron[chron.length - 1] : null;
  const dayTurns = playerTurnsOnDate(state?.turns, playerId, date || systemTurnDate(now), sid);
  const gate = canTakeTurn(state, playerId);
  const rebuyPaid = hasPendingRebuyPayment(state, playerId);
  const lastWonNothing = Boolean(last && money(last.amountWon) <= 0);
  return {
    date: date || systemTurnDate(now),
    sessionId: sid,
    turns: dayTurns,
    allTurns: chron,
    first: chron[0] || null,
    last,
    rebuyTurn: chron.length > 1 ? chron[chron.length - 1] : null,
    firstWonNothing: lastWonNothing,
    rebuyGranted: Boolean(gate.ok && gate.isRebuyTurn && lastWonNothing),
    rebuyPaid,
    needsRebuyPay: Boolean(gate.ok && gate.isRebuyTurn && !rebuyPaid),
    canTurn: gate.ok,
    nextAttempt: gate.attempt,
    isRebuyTurn: gate.isRebuyTurn,
    sessionDone: Boolean(gate.sessionDone),
    wonToday: money(dayTurns.reduce((sum, turn) => sum + (Number(turn.amountWon) || 0), 0)),
    reason: gate.reason || '',
  };
}
