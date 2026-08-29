import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitFinishAwards } from './cashClimbFinishAwards.js';
import { splitRrSurplus } from './cashClimbAllocations.js';

describe('Cash Climb finish awards', () => {
  it('keeps unused KOH as championship when the champion is already ahead', () => {
    const awards = splitFinishAwards({
      rrSurplus: 36,
      kohSurplus: 27,
      firstMatchPaid: 72,
      secondMatchPaid: 19,
      thirdMatchPaid: 24,
    });
    const podium = splitRrSurplus(36);
    assert.equal(awards.transferredToChampion, 0);
    assert.equal(awards.championship, 27);
    assert.equal(awards.second, podium.second);
    assert.equal(awards.third, podium.third);
    assert.ok(awards.firstTotal >= awards.secondTotal);
  });

  it('moves unused RR to the champion when 2nd would otherwise finish ahead', () => {
    const awards = splitFinishAwards({
      rrSurplus: 48,
      kohSurplus: 10,
      firstMatchPaid: 16,
      secondMatchPaid: 2,
      thirdMatchPaid: 4,
    });
    assert.ok(awards.transferredToChampion > 0);
    assert.ok(awards.firstTotal >= awards.secondTotal);
    assert.ok(awards.firstTotal >= awards.thirdTotal);
    assert.equal(
      Math.round((awards.championship + awards.second + awards.third) * 100) / 100,
      58
    );
  });
});
