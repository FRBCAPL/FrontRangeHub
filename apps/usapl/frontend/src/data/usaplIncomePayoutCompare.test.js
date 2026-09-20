import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { comparePlacePayouts } from './usaplIncomePayoutCompare.js';

describe('comparePlacePayouts', () => {
  it('shows every place-count up to team size and shrinks first place', () => {
    const compare = comparePlacePayouts({
      teams: 4,
      prizeCents: 100000,
      cashPercent: 100,
      source: 'prize',
    });
    assert.deepEqual(compare.columns.map((column) => column.places), [1, 2, 3, 4]);
    assert.equal(compare.suggested, 1);
    const first = compare.rows[0].cells.map((cell) => cell.cents);
    assert.equal(first[0], 100000);
    assert.ok(first[3] < first[0]);
  });
});
