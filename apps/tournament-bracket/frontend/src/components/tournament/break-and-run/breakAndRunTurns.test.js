import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canTakeTurn, playerDayStatus, systemTurnDate } from './breakAndRunTurns.js';
import { createBreakAndRun, recordTurn } from './breakAndRunEngine.js';

function pot() {
  return createBreakAndRun({
    name: 'Turns',
    memberFee: 10,
    openFee: 10,
    players: [
      { name: 'A', entryKind: 'member' },
      { name: 'B', entryKind: 'member' },
    ],
  });
}

describe('break and run turns', () => {
  it('uses the system date and grants one rebuy only for zero payable balls', () => {
    const start = pot();
    const date = '2026-09-21';
    const afterMiss = recordTurn(start, start.players[0].id, { payableBalls: 0, scratchOnBreak: true, date });
    const turn = afterMiss.turns[0];
    assert.equal(turn.date, date);
    assert.equal(turn.payableBalls, 0);
    assert.equal(turn.amountWon, 0);
    assert.equal(afterMiss.currentPot, 20);
    assert.equal(afterMiss.players[0].buyIns, 1);
    const status = playerDayStatus(afterMiss, start.players[0].id, date);
    assert.equal(status.rebuyGranted, true);
    assert.equal(status.canTurn, true);

    const afterRebuyTurn = recordTurn(afterMiss, start.players[0].id, { payableBalls: 2, date });
    assert.equal(afterRebuyTurn.turns[0].attempt, 2);
    assert.equal(afterRebuyTurn.players[0].buyIns, 2);
    assert.equal(canTakeTurn(afterRebuyTurn, start.players[0].id, date).ok, false);
    assert.ok(afterRebuyTurn.currentPot > 0);
  });

  it('does not grant a rebuy after at least one payable ball', () => {
    const start = pot();
    const date = systemTurnDate();
    const afterWin = recordTurn(start, start.players[0].id, { payableBalls: 1, date });
    assert.ok(afterWin.turns[0].payableBalls >= 1);
    assert.equal(afterWin.players[0].buyIns, 1);
    assert.equal(canTakeTurn(afterWin, start.players[0].id, date).ok, false);
  });

  it('allows a new first attempt on a new date', () => {
    const start = pot();
    const firstDay = recordTurn(start, start.players[0].id, { payableBalls: 0, date: '2026-09-21' });
    const nextDay = recordTurn(firstDay, start.players[0].id, { payableBalls: 0, date: '2026-09-22' });
    assert.equal(nextDay.turns.filter((turn) => turn.attempt === 1).length, 2);
  });
});
