import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createBreakAndRun } from './breakAndRunEngine.js';
import { endSession, startSession } from './breakAndRunSessions.js';
import {
  isBreakAndRunLiveNow,
  isBreakAndRunPotOpen,
  isWithinSessionWindow,
  sessionLiveWindow,
} from './breakAndRunLiveStatus.js';

const at = (date, time) => {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime();
};

function potWithSession(session) {
  let state = createBreakAndRun({ memberFee: 0, openFee: 0, players: [{ name: 'A', entryKind: 'member' }] });
  state = endSession(state);
  return startSession(state, { name: 'Night', ...session });
}

describe('breakAndRunLiveStatus', () => {
  it('counts 30 minutes before start through 1 hour after end', () => {
    const s = { date: '2026-10-04', startTime: '19:00', endTime: '23:00' };
    assert.equal(isWithinSessionWindow(s, at('2026-10-04', '18:29')), false);
    assert.equal(isWithinSessionWindow(s, at('2026-10-04', '18:30')), true);
    assert.equal(isWithinSessionWindow(s, at('2026-10-04', '23:59')), true);
    assert.equal(isWithinSessionWindow(s, at('2026-10-05', '00:01')), false);
  });

  it('treats an end time before the start as the next morning', () => {
    const s = { date: '2026-10-04', startTime: '19:00', endTime: '01:00' };
    assert.equal(isWithinSessionWindow(s, at('2026-10-05', '01:30')), true);
    assert.equal(isWithinSessionWindow(s, at('2026-10-05', '02:30')), false);
  });

  it('uses the whole day when there are no times', () => {
    const s = { date: '2026-10-04' };
    assert.equal(isWithinSessionWindow(s, at('2026-10-04', '09:00')), true);
    assert.equal(isWithinSessionWindow(s, at('2026-10-05', '00:30')), true);
    assert.equal(isWithinSessionWindow(s, at('2026-10-05', '02:00')), false);
  });

  it('has no window without a date', () => {
    assert.equal(sessionLiveWindow({ startTime: '19:00' }), null);
  });

  it('is live in the window or with the operator present, never after End session', () => {
    const state = potWithSession({ date: '2026-10-04', startTime: '19:00', endTime: '23:00' });
    assert.equal(isBreakAndRunLiveNow(state, { now: at('2026-10-04', '20:00') }), true);
    assert.equal(isBreakAndRunLiveNow(state, { now: at('2026-10-06', '20:00') }), false);
    assert.equal(isBreakAndRunLiveNow(state, { now: at('2026-10-06', '20:00'), operatorPresent: true }), true);
    const ended = endSession(state);
    assert.equal(isBreakAndRunLiveNow(ended, { now: at('2026-10-04', '20:00'), operatorPresent: true }), false);
    assert.equal(isBreakAndRunPotOpen(ended), true);
  });
});
