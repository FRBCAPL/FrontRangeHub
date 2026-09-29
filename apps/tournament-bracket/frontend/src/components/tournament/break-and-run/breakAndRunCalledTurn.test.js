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
  it('shows called / lucky / early 10 / final 10 values on a $625 pot', () => {
    const snap = eventSnapshot(calledPot(598));
    assert.equal(snap.payoutMode, CALLED_PAYOUT_MODE);
    assert.equal(snap.currentPot, 625);
    assert.equal(snap.reserve, 125);
    assert.equal(snap.payablePot, 500);
    assert.equal(snap.normalBall, 50);
    assert.equal(snap.luckyBall, 10);
    assert.equal(snap.earlyTenPays, 125);
    assert.equal(snap.finalTenPays, 500);
  });

  it('cash out pays called balls full and break balls lucky', () => {
    let state = calledPot(598);
    const a = state.players[0].id;
    state = recordTurn(state, a, { outcome: 'cash-out', calledBalls: 2, breakBalls: 1 });
    assert.equal(state.turns[0].amountWon, 110);
    assert.equal(state.turns[0].calledBalls, 2);
    assert.equal(state.turns[0].breakBalls, 1);
    assert.equal(state.currentPot, 515);
  });

  it('early 10 pays bank + 25% of what is left', () => {
    let state = calledPot(598);
    state = recordTurn(state, state.players[0].id, { outcome: 'early-ten', calledBalls: 2, breakBalls: 3 });
    assert.equal(state.turns[0].bank, 130);
    assert.equal(state.turns[0].amountWon, 222);
    assert.equal(state.turns[0].earlyTen, true);
  });

  it('bust keeps the balls for history but pays $0', () => {
    let state = calledPot(598);
    state = recordTurn(state, state.players[0].id, { outcome: 'bust', calledBalls: 4 });
    assert.equal(state.turns[0].amountWon, 0);
    assert.equal(state.turns[0].busted, true);
    assert.equal(state.currentPot, 625);
  });

  it('final 10 wins the payable pot and leaves the 20% reserve', () => {
    let state = calledPot(598);
    state = recordTurn(state, state.players[0].id, { outcome: 'final-ten', calledBalls: 5, breakBalls: 4 });
    assert.equal(state.turns[0].amountWon, 500);
    assert.equal(state.turns[0].finalTen, true);
    assert.equal(state.currentPot, 125);
    assert.equal(seedTopUpNeeded(state), 0);
  });

  it('tops the pot back up to $100 after a small jackpot, and undo removes the seed', () => {
    let state = calledPot(100);
    state = recordTurn(state, state.players[0].id, { outcome: 'final-ten' });
    // pot 127 → reserve $25 → payable $102
    assert.equal(state.turns[0].amountWon, 102);
    assert.equal(state.currentPot, 25);
    assert.equal(seedTopUpNeeded(state), 75);
    state = topUpSeed(state);
    assert.equal(state.currentPot, 100);
    assert.equal(eventSnapshot(state).seedTotal, 175);
    assert.equal(seedTopUpNeeded(state), 0);
    state = undoLast(state);
    assert.equal(state.currentPot, 25);
  });

  it('locks the pot at Start attempt; later entries count for the next attempt', () => {
    let state = calledPot(598);
    state = startAttempt(state, state.players[0].id);
    assert.equal(isAttemptStarted(state, state.players[0].id), true);
    state = addPlayer(state, { name: 'D', entryKind: 'member' });
    assert.equal(state.currentPot, 634);
    const preview = previewTurn(state, state.players[0].id, { outcome: 'final-ten' });
    assert.equal(preview.payout, 500);
    state = recordTurn(state, state.players[0].id, { outcome: 'final-ten' });
    assert.equal(state.turns[0].amountWon, 500);
    assert.equal(state.currentPot, 134);
  });

  it('entries paid before Start attempt count toward that attempt', () => {
    let state = calledPot(598);
    state = setAtTablePlayer(state, state.players[0].id);
    state = addPlayer(state, { name: 'D', entryKind: 'member' });
    state = startAttempt(state, state.players[0].id);
    state = recordTurn(state, state.players[0].id, { outcome: 'final-ten' });
    // pot 634 → reserve $126 → payable $508
    assert.equal(state.turns[0].amountWon, 508);
  });

  it('moving the line after a turn does not lock the next player', () => {
    let state = calledPot(598);
    state = recordTurn(state, state.players[0].id, { outcome: 'bust' });
    assert.equal(state.attemptLock, null);
    assert.equal(isAttemptStarted(state, state.players[1].id), false);
    const preview = previewTurn(state, state.players[1].id, { outcome: 'final-ten' });
    assert.equal(preview.attemptStarted, false);
  });

  it('recording a turn clears the lock, and cancel removes a wrong start', () => {
    let state = calledPot(598);
    state = startAttempt(state, state.players[1].id);
    state = cancelAttempt(state);
    assert.equal(state.attemptLock, null);
    state = startAttempt(state, state.players[0].id);
    state = recordTurn(state, state.players[0].id, { outcome: 'bust' });
    assert.equal(state.attemptLock, null);
  });

  it('a rebuy must be paid before Start attempt', () => {
    let state = calledPot(598);
    const a = state.players[0].id;
    state = recordTurn(state, a, { outcome: 'scratch-break' });
    assert.throws(() => startAttempt(state, a), /rebuy first/);
    state = payRebuy(state, a);
    state = startAttempt(state, a);
    assert.equal(isAttemptStarted(state, a), true);
  });

  it('rejects more than 9 balls before the 10', () => {
    const state = calledPot(598);
    assert.throws(
      () => recordTurn(state, state.players[0].id, { outcome: 'cash-out', calledBalls: 6, breakBalls: 4 }),
      /more than 9/,
    );
  });

  it('reserve is set by the rules for called-ball pots', () => {
    assert.throws(() => setReserve(calledPot(100), 50), /20% once the pot is over \$100/);
  });

  it('preview matches the recorded payout', () => {
    const state = calledPot(598);
    const details = { outcome: 'cash-out', calledBalls: 3, extraBalls: 2 };
    const preview = previewTurn(state, state.players[1].id, details);
    const after = recordTurn(state, state.players[1].id, details);
    assert.equal(preview.payout, 170);
    assert.equal(after.turns[0].amountWon, preview.payout);
    assert.equal(after.currentPot, preview.potAfter);
  });
});
