import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CALLED_PAYOUT_MODE,
  addPlayer,
  cancelAttempt,
  createBreakAndRun,
  eventSnapshot,
  isAttemptStarted,
  payRebuy,
  previewTurn,
  recordTurn,
  seedTopUpNeeded,
  setAtTablePlayer,
  setReserve,
  startAttempt,
  topUpSeed,
  undoLast,
} from './breakAndRunEngine.js';

/** 3 member entries ($9 each to pot) + seed. */
function calledPot(seed) {
  return createBreakAndRun({
    payoutMode: CALLED_PAYOUT_MODE,
    memberFee: 10,
    openFee: 20,
    startingSeed: seed,
    players: [
      { name: 'A', entryKind: 'member' },
      { name: 'B', entryKind: 'member' },
      { name: 'C', entryKind: 'member' },
    ],
  });
}

describe('break and run called-ball pots', () => {
  it('shows called / lucky / early 10 / final 10 values on a $500 pot with no reserve', () => {
    const snap = eventSnapshot(calledPot(473));
    assert.equal(snap.payoutMode, CALLED_PAYOUT_MODE);
    assert.equal(snap.currentPot, 500);
    assert.equal(snap.reserve, 0);
    assert.equal(snap.payablePot, 500);
    assert.equal(snap.normalBall, 50);
    assert.equal(snap.luckyBall, 10);
    assert.equal(snap.earlyTenPays, 125);
    assert.equal(snap.finalTenPays, 500);
  });

  it('cash out pays called balls full and break balls lucky', () => {
    let state = calledPot(473);
    const a = state.players[0].id;
    state = recordTurn(state, a, { outcome: 'cash-out', calledBalls: 2, breakBalls: 1 });
    assert.equal(state.turns[0].amountWon, 110);
    assert.equal(state.turns[0].calledBalls, 2);
    assert.equal(state.turns[0].breakBalls, 1);
    assert.equal(state.currentPot, 390);
  });

  it('early 10 pays bank + 25% of what is left', () => {
    let state = calledPot(473);
    state = recordTurn(state, state.players[0].id, { outcome: 'early-ten', calledBalls: 2, breakBalls: 3 });
    assert.equal(state.turns[0].bank, 130);
    assert.equal(state.turns[0].amountWon, 222);
    assert.equal(state.turns[0].earlyTen, true);
  });

  it('bust keeps the balls for history but pays $0', () => {
    let state = calledPot(473);
    state = recordTurn(state, state.players[0].id, { outcome: 'bust', calledBalls: 4 });
    assert.equal(state.turns[0].amountWon, 0);
    assert.equal(state.turns[0].busted, true);
    assert.equal(state.currentPot, 500);
  });

  it('final 10 wins the whole pot and asks for a $100 re-seed', () => {
    let state = calledPot(473);
    state = recordTurn(state, state.players[0].id, { outcome: 'final-ten', calledBalls: 5, breakBalls: 4 });
    assert.equal(state.turns[0].amountWon, 500);
    assert.equal(state.turns[0].finalTen, true);
    assert.equal(state.currentPot, 0);
    assert.equal(seedTopUpNeeded(state), 100);
  });

  it('tops the pot back up to $100 after a jackpot, and undo removes the seed', () => {
    let state = calledPot(100);
    state = recordTurn(state, state.players[0].id, { outcome: 'final-ten' });
    assert.equal(state.turns[0].amountWon, 127);
    assert.equal(state.currentPot, 0);
    assert.equal(seedTopUpNeeded(state), 100);
    state = topUpSeed(state);
    assert.equal(state.currentPot, 100);
    assert.equal(eventSnapshot(state).seedTotal, 200);
    assert.equal(seedTopUpNeeded(state), 0);
    state = undoLast(state);
    assert.equal(state.currentPot, 0);
  });

  it('locks the pot at Start attempt; later entries count for the next attempt', () => {
    let state = calledPot(473);
    state = startAttempt(state, state.players[0].id);
    assert.equal(isAttemptStarted(state, state.players[0].id), true);
    state = addPlayer(state, { name: 'D', entryKind: 'member' });
    assert.equal(state.currentPot, 509);
    const preview = previewTurn(state, state.players[0].id, { outcome: 'final-ten' });
    assert.equal(preview.payout, 500);
    state = recordTurn(state, state.players[0].id, { outcome: 'final-ten' });
    assert.equal(state.turns[0].amountWon, 500);
    assert.equal(state.currentPot, 9);
  });

  it('entries paid before Start attempt count toward that attempt', () => {
    let state = calledPot(473);
    state = setAtTablePlayer(state, state.players[0].id);
    state = addPlayer(state, { name: 'D', entryKind: 'member' });
    state = startAttempt(state, state.players[0].id);
    state = recordTurn(state, state.players[0].id, { outcome: 'final-ten' });
    assert.equal(state.turns[0].amountWon, 509);
  });

  it('moving the line after a turn does not lock the next player', () => {
    let state = calledPot(473);
    state = recordTurn(state, state.players[0].id, { outcome: 'bust' });
    assert.equal(state.attemptLock, null);
    assert.equal(isAttemptStarted(state, state.players[1].id), false);
    const preview = previewTurn(state, state.players[1].id, { outcome: 'final-ten' });
    assert.equal(preview.attemptStarted, false);
  });

  it('recording a turn clears the lock, and cancel removes a wrong start', () => {
    let state = calledPot(473);
    state = startAttempt(state, state.players[1].id);
    state = cancelAttempt(state);
    assert.equal(state.attemptLock, null);
    state = startAttempt(state, state.players[0].id);
    state = recordTurn(state, state.players[0].id, { outcome: 'bust' });
    assert.equal(state.attemptLock, null);
  });

  it('a rebuy must be paid before Start attempt', () => {
    let state = calledPot(473);
    const a = state.players[0].id;
    state = recordTurn(state, a, { outcome: 'scratch-break' });
    assert.throws(() => startAttempt(state, a), /rebuy first/);
    state = payRebuy(state, a);
    state = startAttempt(state, a);
    assert.equal(isAttemptStarted(state, a), true);
  });

  it('rejects more than 9 balls before the 10', () => {
    const state = calledPot(473);
    assert.throws(
      () => recordTurn(state, state.players[0].id, { outcome: 'cash-out', calledBalls: 6, breakBalls: 4 }),
      /more than 9/,
    );
  });

  it('called-ball pots have no reserve to set', () => {
    assert.throws(() => setReserve(calledPot(100), 50), /no reserve/);
  });

  it('preview matches the recorded payout', () => {
    const state = calledPot(473);
    const details = { outcome: 'cash-out', calledBalls: 3, extraBalls: 2 };
    const preview = previewTurn(state, state.players[1].id, details);
    const after = recordTurn(state, state.players[1].id, details);
    assert.equal(preview.payout, 170);
    assert.equal(after.turns[0].amountWon, preview.payout);
    assert.equal(after.currentPot, preview.potAfter);
  });
});
