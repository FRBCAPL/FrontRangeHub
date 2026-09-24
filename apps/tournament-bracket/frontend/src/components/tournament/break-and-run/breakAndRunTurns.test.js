import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canTakeTurn, playerDayStatus, systemTurnDate } from './breakAndRunTurns.js';
import { createBreakAndRun, payRebuy, recordTurn, startSession } from './breakAndRunEngine.js';

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
  it('grants unlimited rebuys after $0 and locks after a cash-out in the same session', () => {
    const start = pot();
    const date = systemTurnDate();
    const afterMiss = recordTurn(start, start.players[0].id, {
      payableBalls: 0,
      scratchOnBreak: true,
      date,
    });
    const turn = afterMiss.turns[0];
    assert.equal(turn.payableBalls, 0);
    assert.equal(turn.amountWon, 0);
    assert.ok(turn.sessionId);
    assert.equal(afterMiss.currentPot, 20);
    assert.equal(afterMiss.players[0].buyIns, 1);
    const status = playerDayStatus(afterMiss, start.players[0].id, date);
    assert.equal(status.rebuyGranted, true);
    assert.equal(status.canTurn, true);
    assert.equal(status.needsRebuyPay, true);

    const paid = payRebuy(afterMiss, start.players[0].id);
    const afterRebuyTurn = recordTurn(paid, start.players[0].id, { payableBalls: 2, date });
    assert.equal(afterRebuyTurn.turns[0].attempt, 2);
    assert.equal(afterRebuyTurn.players[0].buyIns, 2);
    assert.equal(canTakeTurn(afterRebuyTurn, start.players[0].id).ok, false);
    assert.equal(canTakeTurn(afterRebuyTurn, start.players[0].id).sessionDone, true);
    assert.ok(afterRebuyTurn.currentPot > 0);
  });

  it('does not grant a rebuy after a cash-out payout', () => {
    const start = pot();
    const date = systemTurnDate();
    const afterWin = recordTurn(start, start.players[0].id, { payableBalls: 1, date });
    assert.ok(afterWin.turns[0].payableBalls >= 1);
    assert.ok(afterWin.turns[0].amountWon > 0);
    assert.equal(afterWin.players[0].buyIns, 1);
    assert.equal(canTakeTurn(afterWin, start.players[0].id).ok, false);
    assert.equal(canTakeTurn(afterWin, start.players[0].id).sessionDone, true);
  });

  it('resets eligibility when a new session starts', () => {
    const start = pot();
    const cashed = recordTurn(start, start.players[0].id, { payableBalls: 1 });
    assert.equal(canTakeTurn(cashed, start.players[0].id).ok, false);
    const next = startSession(cashed, { name: 'Next night' });
    assert.equal(canTakeTurn(next, start.players[0].id).ok, true);
    assert.equal(canTakeTurn(next, start.players[0].id).isRebuyTurn, false);
  });
});
