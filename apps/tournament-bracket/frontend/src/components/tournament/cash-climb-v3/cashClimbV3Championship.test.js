import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { championshipSplit } from './cashClimbV3Championship.js';

describe('Cash Climb V3 championship split', () => {
  it('$1,798 combined: champion $1,438, runner-up $360', () => {
    assert.deepEqual(championshipSplit(1798), { allocation: 1798, champion: 1438, runnerUp: 360 });
  });

  it('reconciles exactly and rounds 80% to the nearest dollar for every allocation $1-$20,000', () => {
    for (let a = 1; a <= 20000; a += 1) {
      const { champion, runnerUp } = championshipSplit(a);
      assert.equal(champion + runnerUp, a);
      assert.ok(Math.abs(10 * champion - 8 * a) <= 5, `a${a}`);
      assert.ok(Number.isInteger(champion) && Number.isInteger(runnerUp) && runnerUp >= 0);
      if (a >= 2) assert.ok(champion > runnerUp, `a${a}`);
    }
  });

  it('rejects non-whole or non-positive allocations', () => {
    assert.throws(() => championshipSplit(0));
    assert.throws(() => championshipSplit(-5));
    assert.throws(() => championshipSplit(10.5));
  });
});
