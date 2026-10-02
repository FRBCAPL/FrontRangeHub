import { hasOpenBreakAndRunSession } from './breakAndRunSessions.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export const LIVE_LEAD_MS = 30 * MINUTE;
export const LIVE_GRACE_MS = HOUR;
/** A session with a start time but no end time counts as this long. */
export const DEFAULT_SESSION_MS = 6 * HOUR;

function atLocalTime(date, time) {
  const [y, m, d] = String(date).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const [hh, mm] = time ? time.split(':').map(Number) : [0, 0];
  return new Date(y, m - 1, d, hh || 0, mm || 0).getTime();
}

/** Scheduled play window in ms ({ start, end }) including lead/grace, or null when the session has no date. */
export function sessionLiveWindow(session) {
  if (!session?.date) return null;
  const dayStart = atLocalTime(session.date, '');
  if (dayStart == null) return null;
  const startTime = session.startTime || '';
  const endTime = session.endTime || '';
  let start = startTime ? atLocalTime(session.date, startTime) : dayStart;
  let end;
  if (endTime) end = atLocalTime(session.date, endTime);
  else if (startTime) end = start + DEFAULT_SESSION_MS;
  else end = dayStart + 24 * HOUR;
  if (end <= start) end += 24 * HOUR;
  if (startTime) start -= LIVE_LEAD_MS;
  return { start, end: end + LIVE_GRACE_MS };
}

export function isWithinSessionWindow(session, now = Date.now()) {
  const window = sessionLiveWindow(session);
  return Boolean(window && now >= window.start && now <= window.end);
}

function openSession(state) {
  const id = String(state?.currentSessionId || '');
  return (state?.sessions || []).find((s) => String(s.id) === id) || null;
}

/**
 * Public "Live" status: the session must still be open (operator hasn't ended it)
 * and either it's within its scheduled time or the operator screen is open right now.
 */
export function isBreakAndRunLiveNow(state, { now = Date.now(), operatorPresent = false } = {}) {
  if (!hasOpenBreakAndRunSession(state)) return false;
  return Boolean(operatorPresent) || isWithinSessionWindow(openSession(state), now);
}

export function isBreakAndRunPotOpen(state) {
  return Boolean(state) && state.status !== 'completed' && state.status !== 'ended';
}
