import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CALLED_PAYOUT_MODE,
  addPlayer,
  adjustAttemptTally,
  attemptLiveView,
  createBreakAndRun,
  recordTurn,
  startAttempt,
} from './breakAndRunEngine.js';

function startedPot() {
  const state = createBreakAndRun({
    payoutMode: CALLED_PAYOUT_MODE,
    memberFee: 10,
    openFee: 20,
    startingSeed: 473,
    players: [
      { name: 'A', entryKind: 'member' },
      { name: 'B', entryKind: 'member' },
      { name: 'C', entryKind: 'member' },
    ],
  });
  return startAttempt(state, state.players[0].id);
}

describe('break and run live attempt tally', () => {
  it('shows locked values with an empty bank when the attempt starts', () => {
    const live = attemptLiveView(startedPot());
    assert.equal(live.lockedPot, 500);
    assert.equal(live.normalBall, 50);
    assert.equal(live.luckyBall, 10);
    assert.equal(live.totalBalls, 0);
    assert.equal(live.bank, 0);
  });

  it('builds the bank from break, called and extra balls at locked values', () => {
    let state = startedPot();
    state = adjustAttemptTally(state, 'breakBalls', 1);
    state = adjustAttemptTally(state, 'calledBalls', 1);
    state = adjustAttemptTally(state, 'calledBalls', 1);
    const live = attemptLiveView(state);
    assert.equal(live.calledBalls, 2);
    assert.equal(live.luckyBalls, 1);
    assert.equal(live.totalBalls, 3);
    assert.equal(live.bank, 110);
  });

  it('keeps locked values when someone else buys in mid-attempt', () => {
    let state = startedPot();
    state = adjustAttemptTally(state, 'calledBalls', 1);
    state = addPlayer(state, { name: 'D', entryKind: 'member' });
    const live = attemptLiveView(state);
    assert.equal(live.lockedPot, 500);
    assert.equal(live.bank, 50);
  });

  it('never goes below zero or past nine balls before the 10', () => {
    let state = startedPot();
    state = adjustAttemptTally(state, 'extraBalls', -1);
    assert.equal(attemptLiveView(state).extraBalls, 0);
    state = adjustAttemptTally(state, 'calledBalls', 7);
    state = adjustAttemptTally(state, 'breakBalls', 5);
    assert.equal(attemptLiveView(state).breakBalls, 2);
    assert.equal(attemptLiveView(state).totalBalls, 9);
  });

  it('clears when the turn is recorded', () => {
    let state = startedPot();
    state = adjustAttemptTally(state, 'calledBalls', 1);
    state = recordTurn(state, state.players[0].id, { outcome: 'cash-out', calledBalls: 1 });
    assert.equal(attemptLiveView(state), null);
  });

  it('refuses a tally with no started attempt', () => {
    const state = createBreakAndRun({ payoutMode: CALLED_PAYOUT_MODE, players: [{ name: 'A' }] });
    assert.throws(() => adjustAttemptTally(state, 'calledBalls', 1), /Start attempt/);
  });
});
