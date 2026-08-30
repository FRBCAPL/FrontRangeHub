import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { elimChampion, elimFormatLabel, withElimStatus } from './elimStatus.js';

describe('elimination save status', () => {
  it('treats a single-elim final winner as complete', () => {
    const t = withElimStatus({
      name: 'Friday',
      type: 'single',
      entrantNames: ['Ann', 'Ben'],
      rounds: [{ matches: [{ winner: 'Ann' }] }],
    });
    assert.equal(elimChampion(t), 'Ann');
    assert.equal(t.status, 'completed');
    assert.ok(t.id);
  });

  it('treats a double-elim grand final winner as complete', () => {
    const t = withElimStatus({
      type: 'double',
      entrantNames: ['Ann', 'Ben'],
      grandFinal: { winner: 'Ben' },
    });
    assert.equal(t.status, 'completed');
    assert.equal(t.champion, 'Ben');
    assert.equal(elimFormatLabel('double'), 'Double elimination');
  });

  it('keeps an unfinished bracket in progress', () => {
    const t = withElimStatus({
      type: 'single',
      entrantNames: ['Ann', 'Ben'],
      rounds: [{ matches: [{ winner: null }] }],
    });
    assert.equal(t.status, 'in-progress');
  });
});
