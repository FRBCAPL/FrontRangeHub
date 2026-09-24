import { money } from './breakAndRunMath.js';
import { systemTurnDate } from './breakAndRunTurns.js';

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `bnr-s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeSession(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').trim();
  if (!id) return null;
  const status = raw.status === 'closed' || raw.endedAt ? 'closed' : 'open';
  return {
    id,
    name: String(raw.name || 'Session').trim() || 'Session',
    startedAt: raw.startedAt || '',
    endedAt: raw.endedAt || '',
    date: String(raw.date || '').slice(0, 10),
    venue: String(raw.venue || '').trim(),
    status,
  };
}

export function ensureSessions(state) {
  const sessions = (state.sessions || []).map(normalizeSession).filter(Boolean);
  let currentSessionId = String(state.currentSessionId || '').trim();
  let turns = state.turns || [];
  let ledger = state.ledger || [];

  if (!sessions.length) {
    const first = {
      id: uid(),
      name: 'Opening session',
      startedAt: new Date().toISOString(),
      endedAt: '',
      date: systemTurnDate(),
      venue: '',
      status: 'open',
    };
    turns = turns.map((turn) => (
      turn.sessionId ? turn : { ...turn, sessionId: first.id }
    ));
    ledger = ledger.map((row) => {
      if (row.sessionId) return row;
      if (row.type === 'buy-in' || row.type === 'rebuy' || row.type === 'turn' || row.type === 'payout') {
        return { ...row, sessionId: first.id };
      }
      return row;
    });
    return { sessions: [first], currentSessionId: first.id, turns, ledger };
  }

  if (!currentSessionId || !sessions.some((s) => s.id === currentSessionId)) {
    const open = sessions.find((s) => s.status === 'open');
    currentSessionId = open?.id || sessions[sessions.length - 1].id;
  }
  return { sessions, currentSessionId, turns, ledger };
}

export function startSession(state, config = {}) {
  const next = JSON.parse(JSON.stringify(state));
  const ensured = ensureSessions(next);
  next.sessions = ensured.sessions;
  next.currentSessionId = ensured.currentSessionId;

  const open = next.sessions.find((s) => s.id === next.currentSessionId && s.status === 'open');
  if (open) {
    open.status = 'closed';
    open.endedAt = new Date().toISOString();
  }

  const session = {
    id: uid(),
    name: String(config.name || `Session ${next.sessions.length + 1}`).trim() || `Session ${next.sessions.length + 1}`,
    startedAt: new Date().toISOString(),
    endedAt: '',
    date: String(config.date || systemTurnDate()).slice(0, 10),
    venue: String(config.venue || '').trim(),
    status: 'open',
  };
  next.sessions = [...next.sessions, session];
  next.currentSessionId = session.id;
  next.ledger = [
    {
      id: uid(),
      at: session.startedAt,
      type: 'session-start',
      sessionId: session.id,
      amount: 0,
      potAfter: money(next.currentPot),
      note: `Session started · ${session.name}${session.venue ? ` · ${session.venue}` : ''}`,
    },
    ...(next.ledger || []),
  ];
  return next;
}

export function endSession(state) {
  const next = JSON.parse(JSON.stringify(state));
  const ensured = ensureSessions(next);
  next.sessions = ensured.sessions;
  next.currentSessionId = ensured.currentSessionId;
  const open = next.sessions.find((s) => s.id === next.currentSessionId && s.status === 'open');
  if (!open) throw new Error('No open session to end.');
  open.status = 'closed';
  open.endedAt = new Date().toISOString();
  next.ledger = [
    {
      id: uid(),
      at: open.endedAt,
      type: 'session-end',
      sessionId: open.id,
      amount: 0,
      potAfter: money(next.currentPot),
      note: `Session ended · ${open.name} · pot ${money(next.currentPot)} carries forward`,
    },
    ...(next.ledger || []),
  ];
  return next;
}
