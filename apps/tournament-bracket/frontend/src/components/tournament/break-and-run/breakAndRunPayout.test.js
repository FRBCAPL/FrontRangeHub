import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fromCents, toCents } from './breakAndRunMath.js';
import { potView, turnPayoutCents } from './breakAndRunPayout.js';

describe('USAPL 10-ball payout', () => {
  it('divides the full pot by 10 when reserve is zero', () => {
    const view = potView(500, 0, 10);
    assert.equal(view.perBall, 50);
    assert.equal(view.earlyTenPays, 100);
    assert.equal(view.fullRunPays, 500);
    assert.equal(view.payablePot, 500);
    assert.equal(view.reserve, 0);
  });

  it('holds reserve out of per-ball math', () => {
    const view = potView(500, 100, 10);
    assert.equal(view.payablePot, 400);
    assert.equal(view.reserve, 100);
    assert.equal(view.perBall, 40);
    assert.equal(view.earlyTenPays, 80);
    assert.equal(view.fullRunPays, 400);
  });

  it('pays from payable pot only: 5 balls + early 10 with $100 reserve', () => {
    const paid = turnPayoutCents({
      potCents: toCents(500),
      reserveCents: toCents(100),
      payableBalls: 5,
      earlyTen: true,
    });
    assert.equal(fromCents(paid), 280);
  });

  it('pays the no-reserve example: 5 payable balls plus a called early 10', () => {
    const paid = turnPayoutCents({
      potCents: toCents(500),
      payableBalls: 5,
      earlyTen: true,
    });
    assert.equal(fromCents(paid), 350);
  });

  it('pays nothing for a scratch or zero payable balls', () => {
    assert.equal(turnPayoutCents({ potCents: toCents(500), reserveCents: toCents(100), payableBalls: 0 }), 0);
  });
});
