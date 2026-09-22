import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  breakAndRunDisplayEventId,
  breakAndRunPhoneHash,
  breakAndRunTvHash,
  buildBreakAndRunPublicBoard,
  isBreakAndRunDisplayPath,
} from './breakAndRunDisplay.js';
import { createBreakAndRun, recordTurn } from './breakAndRunEngine.js';

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

  it('parses tv and phone paths', () => {
    assert.equal(isBreakAndRunDisplayPath('/tournament-bracket/break-and-run/tv/abc'), true);
    assert.equal(isBreakAndRunDisplayPath('/tournament-bracket/break-and-run/view/abc'), true);
    assert.equal(breakAndRunDisplayEventId('/tournament-bracket/break-and-run/tv/abc%201'), 'abc 1');
    assert.equal(breakAndRunTvHash('x'), '/tournament-bracket/break-and-run/tv/x');
    assert.equal(breakAndRunPhoneHash('x'), '/tournament-bracket/break-and-run/view/x');
  });
});
