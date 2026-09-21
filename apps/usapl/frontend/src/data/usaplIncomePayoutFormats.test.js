import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { usaplFormatPoolCents } from './usaplIncomePayoutFormats.js';

describe('usaplIncomePayoutFormats', () => {
  it('keeps a single-play pool whole and splits double play evenly', () => {
    assert.equal(usaplFormatPoolCents(448000, 'single'), 448000);
    assert.equal(usaplFormatPoolCents(448000, 'double'), 224000);
    assert.equal(usaplFormatPoolCents(320000, 'double'), 160000);
  });
});
