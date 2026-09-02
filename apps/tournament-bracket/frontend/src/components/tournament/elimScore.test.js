import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseElimScore } from './elimScore.js';

describe('elim match score', () => {
  it('requires a winner with more games', () => {
    const bad = parseElimScore('5', '7', 'ann', 'ann', 'ben');
    assert.equal(bad.ok, false);
    const good = parseElimScore('7', '5', 'ann', 'ann', 'ben');
    assert.equal(good.ok, true);
    assert.equal(good.score, '7-5');
  });
});
