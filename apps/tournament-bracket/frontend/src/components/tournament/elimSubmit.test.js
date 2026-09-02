import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildSingleElimination } from './bracketLogic.js';
import { applyElimWinner, playableElimMatches } from './elimMatches.js';
import { elimSubmitEventId, elimSubmitHash, isElimSubmitPath } from './elimSubmit.js';

describe('elim submit routes', () => {
  it('builds and reads an event submit path', () => {
    assert.equal(elimSubmitHash(), '/tournament-bracket/elim');
    assert.equal(elimSubmitHash('abc 1'), '/tournament-bracket/elim/abc%201');
    assert.equal(elimSubmitEventId('/tournament-bracket/elim/abc%201'), 'abc 1');
    assert.equal(elimSubmitEventId('/tournament-bracket/elim'), '');
    assert.equal(isElimSubmitPath('/tournament-bracket/elim/abc'), true);
    assert.equal(isElimSubmitPath('/tournament-bracket'), false);
  });
});

describe('elim playable matches', () => {
  it('lists ready single-elim matches and applies a winner', () => {
    const { rounds } = buildSingleElimination(['Ann', 'Ben', 'Cam', 'Dee']);
    const tournament = { type: 'single', name: 'Friday', entrantNames: ['Ann', 'Ben', 'Cam', 'Dee'], rounds };
    const open = playableElimMatches(tournament);
    assert.equal(open.length, 2);
    const first = open[0];
    const next = applyElimWinner(tournament, first.id, first.player1_name, '7-5');
    assert.equal(playableElimMatches(next).length, 1);
    const played = next.rounds[0].matches.find((m) => m.matchId === first.id);
    assert.equal(played.score, '7-5');
    const advanced = next.rounds[1].matches[0];
    assert.equal(advanced.slot1 === first.player1_name || advanced.slot2 === first.player1_name, true);
  });
});
