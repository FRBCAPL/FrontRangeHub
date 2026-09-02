import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createElimTournament, hasElimResults, shuffledDraw } from './elimSeed.js';

describe('elim random draw', () => {
  it('keeps the same players in a new order', () => {
    const names = ['Ann', 'Ben', 'Cam', 'Dee'];
    const { names: next } = shuffledDraw(names, names.map((name) => ({ name })), () => 0);
    assert.deepEqual([...next].sort(), [...names].sort());
    assert.equal(next.length, names.length);
  });

  it('builds a randomly seeded single-elim bracket', () => {
    const t = createElimTournament({
      name: 'Friday',
      type: 'single',
      entrantNames: ['Ann', 'Ben', 'Cam', 'Dee'],
    }, { random: () => 0 });
    const round1Names = t.rounds[0].matches.flatMap((m) => [m.slot1, m.slot2]);
    assert.deepEqual([...round1Names].sort(), ['Ann', 'Ben', 'Cam', 'Dee']);
    assert.equal(hasElimResults(t), false);
  });
});
