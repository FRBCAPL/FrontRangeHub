import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUsaplPlayType, usaplPlayTypeLabel } from './usaplIncomePlayType.js';

describe('usaplIncomePlayType', () => {
  it('normalizes single and double play', () => {
    assert.equal(normalizeUsaplPlayType('double'), 'double');
    assert.equal(normalizeUsaplPlayType('SINGLE'), 'single');
    assert.equal(usaplPlayTypeLabel('double'), 'Double play');
  });
});
