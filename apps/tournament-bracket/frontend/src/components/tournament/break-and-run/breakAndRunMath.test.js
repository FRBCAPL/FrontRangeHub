import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ballPayoutCents,
  equalPercents,
  fromCents,
  money,
  payoutForBallsCents,
  payoutPoolCents,
  percentSum,
  potView,
  splitByWeights,
  toCents,
} from './breakAndRunMath.js';

describe('break and run pot math', () => {
  it('takes a payout percent of the pot for a full run', () => {
    const view = potView({
      currentPot: 100,
      payoutPercent: 80,
      shareMode: 'equal',
      ballCount: 9,
    });
    assert.equal(view.currentPot, 100);
    assert.equal(view.payoutPool, 80);
    assert.equal(view.remainder, 20);
    assert.equal(view.fullRunPays, 80);
    assert.equal(money(view.ballPayouts.reduce((a, b) => a + b, 0)), 80);
  });

  it('splits equal shares and sends leftover cents to later balls', () => {
    const cents = splitByWeights(8000, [1, 1, 1, 1, 1, 1, 1, 1, 1], true);
    assert.equal(cents.reduce((a, b) => a + b, 0), 8000);
    assert.equal(cents[0], 888);
    assert.equal(cents[8], 889);
  });

  it('pays sequential balls from the front of the rack', () => {
    const balls = ballPayoutCents(toCents(90), 100, { shareMode: 'equal', ballCount: 9 });
    assert.equal(fromCents(payoutForBallsCents(balls, 9)), 90);
    assert.equal(fromCents(payoutForBallsCents(balls, 0)), 0);
    const five = fromCents(payoutForBallsCents(balls, 5));
    assert.ok(five > 0 && five < 90);
  });

  it('uses custom per-ball percents', () => {
    const percents = [5, 5, 5, 5, 5, 5, 5, 5, 60];
    assert.equal(percentSum(percents), 100);
    const view = potView({
      currentPot: 100,
      payoutPercent: 100,
      shareMode: 'custom',
      ballCount: 9,
      ballPercents: percents,
    });
    assert.equal(view.ballPayouts[8], 60);
    assert.equal(view.fullRunPays, 100);
  });

  it('keeps equal percents totaling 100', () => {
    assert.equal(percentSum(equalPercents(8)), 100);
    assert.equal(percentSum(equalPercents(9)), 100);
    assert.equal(percentSum(equalPercents(15)), 100);
  });

  it('rounds the payout pool to cents', () => {
    assert.equal(payoutPoolCents(333, 80), 266);
    assert.equal(fromCents(266), 2.66);
  });
});
