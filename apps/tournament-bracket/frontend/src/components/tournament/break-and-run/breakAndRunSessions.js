import { money } from './breakAndRunMath.js';
import { systemTurnDate } from './breakAndRunTurns.js';
import { canTakeTurn, sessionPlayerIdList } from './breakAndRunTurns.js';

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `bnr-s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeIdList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((id) => String(id || '').trim()).filter(Boolean);
}

/** Players enrolled in the open session who can still take a turn. */
export function playersNeedingCarryDecision(state) {
  if (!state) return [];
  return (state.players || []).filter((player) => {
    if (!sessionPlayerIdList(state).includes(String(player.id))) return false;
    return Boolean(canTakeTurn(state, player.id).ok);
  });
}


/** Normalize "HH:MM" or "H:MM" time strings; empty if invalid. */
export function normalizeSessionTime(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '';
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return '';
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return '';
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function formatSessionTime(value) {
  const time = normalizeSessionTime(value);
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatSessionDate(value) {
  if (!value) return '';
  const [y, m, day] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !day) return '';
  return new Date(y, m - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Human-readable session line for operator + public boards (name · date · time). Location is shown separately on public. */
export function formatSessionDetails(session, { includeStatus = false, includeVenue = true } = {}) {
  if (!session) return '';
  const start = formatSessionTime(session.startTime);
  const end = formatSessionTime(session.endTime);
  const timeLabel = start && end ? `${start} – ${end}` : start || end || '';
  const bits = [
    session.name || '',
    formatSessionDate(session.date),
    timeLabel,
  ];
  if (includeVenue && session.venue) bits.push(session.venue);
  if (includeStatus) {
    bits.push(session.status === 'open' ? 'Session open' : 'Session ended');
  }
  return bits.filter(Boolean).join(' · ');
}

/** True when the continuous pot is open and a play session is currently running. */
export function hasOpenBreakAndRunSession(state) {
  if (!state || state.status === 'completed' || state.status === 'ended') return false;
  const id = String(state.currentSessionId || '').trim();
  if (!id) return false;
  const session = (state.sessions || []).find((s) => String(s.id) === id);
  return Boolean(session && session.status === 'open');
}

export function isBreakAndRunSessionLive(state) {
  return hasOpenBreakAndRunSession(state);
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
    startTime: normalizeSessionTime(raw.startTime),
    endTime: normalizeSessionTime(raw.endTime),
    venue: String(raw.venue || '').trim(),
    status,
  };
}

function sessionPayload(config = {}, fallbackName = 'Session') {
  return {
    name: String(config.name || fallbackName).trim() || fallbackName,
    date: String(config.date || systemTurnDate()).slice(0, 10),
    startTime: normalizeSessionTime(config.startTime),
    endTime: normalizeSessionTime(config.endTime),
    venue: String(config.venue || '').trim(),
  };
}

export function ensureSessions(state) {
  const sessions = (state.sessions || []).map(normalizeSession).filter(Boolean);
  let currentSessionId = String(state.currentSessionId || '').trim();
  let turns = state.turns || [];
  let ledger = state.ledger || [];

  if (!sessions.length) {
    const details = sessionPayload({}, 'Opening session');
    const first = {
      id: uid(),
      ...details,
      startedAt: new Date().toISOString(),
      endedAt: '',
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
  let next = JSON.parse(JSON.stringify(state));
  const ensured = ensureSessions(next);
  next.sessions = ensured.sessions;
  next.currentSessionId = ensured.currentSessionId;

  const open = next.sessions.find((s) => s.id === next.currentSessionId && s.status === 'open');
  if (open) {
    next = endSession(next, {
      carryIds: Array.isArray(config.carryIds) ? config.carryIds : next.pendingCarryIds,
    });
  }

  const details = sessionPayload(config, `Session ${(next.sessions || []).length + 1}`);
  const session = {
    id: uid(),
    ...details,
    startedAt: new Date().toISOString(),
    endedAt: '',
    status: 'open',
  };
  next.sessions = [...(next.sessions || []), session];
  next.currentSessionId = session.id;

  const carried = normalizeIdList(next.pendingCarryIds);
  const roster = new Set((next.players || []).map((p) => String(p.id)));
  next.sessionPlayerIds = carried.filter((id) => roster.has(id));
  next.pendingCarryIds = [];
  next.atTablePlayerId = next.sessionPlayerIds[0] || '';

  const detailLine = formatSessionDetails(session);
  const carryNote = next.sessionPlayerIds.length
    ? ` · ${next.sessionPlayerIds.length} carried forward`
    : ' · no players carried forward';
  next.ledger = [
    {
      id: uid(),
      at: session.startedAt,
      type: 'session-start',
      sessionId: session.id,
      amount: 0,
      potAfter: money(next.currentPot),
      note: `Session started · ${detailLine || session.name}${carryNote}`,
    },
    ...(next.ledger || []),
  ];
  return next;
}

export function updateCurrentSession(state, config = {}) {
  const next = JSON.parse(JSON.stringify(state));
  const ensured = ensureSessions(next);
  next.sessions = ensured.sessions;
  next.currentSessionId = ensured.currentSessionId;
  const session = next.sessions.find((s) => s.id === next.currentSessionId);
  if (!session) throw new Error('No session to update.');
  const details = sessionPayload(config, session.name);
  session.name = details.name;
  session.date = details.date;
  session.startTime = details.startTime;
  session.endTime = details.endTime;
  session.venue = details.venue;
  next.ledger = [
    {
      id: uid(),
      at: new Date().toISOString(),
      type: 'session-update',
      sessionId: session.id,
      amount: 0,
      potAfter: money(next.currentPot),
      note: `Session details updated · ${formatSessionDetails(session) || session.name}`,
    },
    ...(next.ledger || []),
  ];
  return next;
}

export function endSession(state, { carryIds } = {}) {
  const next = JSON.parse(JSON.stringify(state));
  const ensured = ensureSessions(next);
  next.sessions = ensured.sessions;
  next.currentSessionId = ensured.currentSessionId;
  const open = next.sessions.find((s) => s.id === next.currentSessionId && s.status === 'open');
  if (!open) throw new Error('No open session to end.');

  const activeIds = new Set(playersNeedingCarryDecision(next).map((p) => String(p.id)));
  const requested = Array.isArray(carryIds) ? normalizeIdList(carryIds) : [];
  const carried = requested.filter((id) => activeIds.has(id));
  const ended = [...activeIds].filter((id) => !carried.includes(id));

  open.status = 'closed';
  open.endedAt = new Date().toISOString();
  next.pendingCarryIds = carried;
  next.sessionPlayerIds = [];
  next.atTablePlayerId = '';

  const bits = [`Session ended · ${formatSessionDetails(open) || open.name}`];
  bits.push(`pot ${money(next.currentPot)} carries forward`);
  if (carried.length) bits.push(`${carried.length} carried to next session`);
  if (ended.length) bits.push(`${ended.length} turn${ended.length === 1 ? '' : 's'} ended`);

  next.ledger = [
    {
      id: uid(),
      at: open.endedAt,
      type: 'session-end',
      sessionId: open.id,
      amount: 0,
      potAfter: money(next.currentPot),
      note: bits.join(' · '),
    },
    ...(next.ledger || []),
  ];
  return next;
}
