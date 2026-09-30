import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toCents } from './breakAndRunMath.js';
import {
  calledPayableCents,
  calledPotView,
  calledTurnPayoutCents,
  earlyTenBonusCents,
  finalTenCents,
  luckyBallCents,
  normalBallCents,
  seedTopUpCents,
} from './breakAndRunCalledPayout.js';

const dollars = (valueCents) => valueCents / 100;

describe('called-ball payout rules', () => {
  it('holds no reserve: the whole pot is payable', () => {
    for (const pot of [90, 100, 150, 625, 2000]) {
      assert.equal(dollars(calledPayableCents(toCents(pot))), pot);
    }
    const view = calledPotView(625);
    assert.equal(view.reserve, 0);
    assert.equal(view.payablePot, 625);
    assert.equal(view.finalTenPays, 625);
  });

  it('payable is whole dollars; cents stay in the pot', () => {
    const view = calledPotView(123.45);
    assert.equal(view.payablePot, 123);
    assert.equal(view.currentPot, 123.45);
    assert.equal(calledPotView(99.6).payablePot, 99);
  });

  it('called ball is pot ÷ 10 rounded down to a whole dollar', () => {
    assert.equal(dollars(normalBallCents(toCents(200))), 20);
    assert.equal(dollars(normalBallCents(toCents(537))), 53);
    assert.equal(dollars(normalBallCents(toCents(1000))), 100);
    assert.equal(dollars(normalBallCents(toCents(9))), 0);
  });

  it('lucky ball matches the ruleset table', () => {
    const table = [
      [200, 5], [300, 5], [400, 10], [500, 10],
      [600, 15], [700, 15], [800, 20], [1000, 20],
    ];
    for (const [payable, lucky] of table) {
      const normal = normalBallCents(toCents(payable));
      assert.equal(dollars(luckyBallCents(normal)), lucky, `payable ${payable}`);
    }
  });

  it('lucky ball is never more than a called ball on small pots', () => {
    assert.equal(dollars(luckyBallCents(toCents(3))), 3);
    assert.equal(dollars(luckyBallCents(0)), 0);
  });

  it('called ball plus one extra ball on a $500 pot adds $60', () => {
    const result = calledTurnPayoutCents({
      potCents: toCents(500),
      outcome: 'cash-out',
      calledBalls: 1,
      extraBalls: 1,
    });
    assert.equal(dollars(result.payoutCents), 60);
  });

  it('early 10 pays bank + 25% of what is left', () => {
    assert.equal(dollars(earlyTenBonusCents(toCents(500), toCents(130))), 92);
    const result = calledTurnPayoutCents({
      potCents: toCents(500),
      outcome: 'early-ten',
      calledBalls: 2,
      breakBalls: 3,
    });
    assert.equal(dollars(result.bankCents), 130);
    assert.equal(dollars(result.payoutCents), 222);
  });

  it('early 10 with an empty bank pays 25% of the pot', () => {
    const result = calledTurnPayoutCents({ potCents: toCents(500), outcome: 'early-ten' });
    assert.equal(dollars(result.payoutCents), 125);
  });

  it('final 10 wins the whole pot rounded down to whole dollars', () => {
    assert.equal(dollars(finalTenCents(toCents(349.6))), 349);
    const result = calledTurnPayoutCents({
      potCents: toCents(437.5),
      outcome: 'final-ten',
      calledBalls: 2,
      breakBalls: 7,
    });
    assert.equal(dollars(result.payoutCents), 437);
  });

  it('bust and scratch on the break pay nothing', () => {
    for (const outcome of ['bust', 'scratch-break']) {
      const result = calledTurnPayoutCents({ potCents: toCents(625), outcome, calledBalls: 5 });
      assert.equal(result.payoutCents, 0);
    }
  });

  it('seed top-up brings the pot back to $100', () => {
    assert.equal(dollars(seedTopUpCents(toCents(60))), 40);
    assert.equal(dollars(seedTopUpCents(toCents(150))), 0);
  });
});
