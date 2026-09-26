import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  breakAndRunDisplayEventId,
  breakAndRunPhoneHash,
  breakAndRunTvHash,
  buildBreakAndRunPublicBoard,
  buildBreakAndRunTvBoard,
  isBreakAndRunDisplayPath,
} from './breakAndRunDisplay.js';
import { createBreakAndRun, endSession, recordTurn, startSession, updateCurrentSession } from './breakAndRunEngine.js';

describe('break and run public display', () => {
  it('builds pot board numbers from a live event', () => {
    const start = createBreakAndRun({
      startingSeed: 500,
      tournamentFee: 0,
      openFee: 0,
      players: [{ name: 'A', entryKind: 'tournament' }],
    });
    const after = recordTurn(start, start.players[0].id, { payableBalls: 5, earlyTen: true });
    const board = buildBreakAndRunPublicBoard(after);
    assert.equal(board.currentPot, 150);
    assert.equal(board.perBall, 15);
    assert.equal(board.earlyTenPays, 30);
    assert.equal(board.turns[0].playerName, 'A');
    assert.equal(board.winners[0].playerName, 'A');
    assert.ok(board.winners[0].amountLabel.includes('350') || board.winners[0].amountLabel.includes('$350'));
  });

  it('includes current session details on the public board', () => {
    let state = createBreakAndRun({
      name: 'Friday B&R',
      memberFee: 0,
      openFee: 0,
      players: [{ name: 'A', entryKind: 'member' }],
    });
    state = updateCurrentSession(state, {
      name: 'Friday night',
      date: '2026-09-26',
      startTime: '19:00',
      endTime: '23:00',
      venue: 'Legends',
    });
    const board = buildBreakAndRunPublicBoard(state);
    assert.match(board.sessionLabel, /Friday night/);
    assert.equal(board.sessionVenue, 'Legends');
    assert.doesNotMatch(board.sessionLabel, /Legends/);
    assert.match(board.sessionLabel, /7:00 PM/);
  });

  it('parses tv and phone paths', () => {
    assert.equal(isBreakAndRunDisplayPath('/tournament-bracket/break-and-run/tv/abc'), true);
    assert.equal(isBreakAndRunDisplayPath('/tournament-bracket/break-and-run/view/abc'), true);
    assert.equal(breakAndRunDisplayEventId('/tournament-bracket/break-and-run/tv/abc%201'), 'abc 1');
    assert.equal(breakAndRunTvHash('x'), '/tournament-bracket/break-and-run/tv/x');
    assert.equal(breakAndRunPhoneHash('x'), '/tournament-bracket/break-and-run/view/x');
  });

  it('marks live only while a session is open', () => {
    let state = createBreakAndRun({
      memberFee: 0,
      openFee: 0,
      players: [{ name: 'A', entryKind: 'member' }],
    });
    assert.equal(buildBreakAndRunPublicBoard(state).live, true);
    assert.equal(buildBreakAndRunTvBoard(state).sessionOpen, true);
    state = endSession(state);
    const publicBoard = buildBreakAndRunPublicBoard(state);
    assert.equal(publicBoard.live, false);
    assert.equal(publicBoard.statusLabel, 'Between sessions');
    assert.equal(buildBreakAndRunTvBoard(state).sessionOpen, false);
  });

  it('limits the TV board to the current open session', () => {
    let state = createBreakAndRun({
      startingSeed: 500,
      memberFee: 0,
      openFee: 0,
      players: [{ name: 'A', entryKind: 'member' }],
    });
    state = recordTurn(state, state.players[0].id, { payableBalls: 5, earlyTen: true });
    state = endSession(state);
    state = startSession(state, {
      name: 'Night two',
      date: '2026-09-27',
      startTime: '19:00',
      endTime: '23:00',
      venue: 'Legends',
    });
    const tv = buildBreakAndRunTvBoard(state);
    assert.equal(tv.sessionOpen, true);
    assert.equal(tv.sessionAttempts, 0);
    assert.equal(tv.turns.length, 0);
    assert.match(tv.sessionLabel, /Night two/);
  });
});
