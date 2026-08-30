import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { matchWithPendingDraft } from './cashClimbSubmit.js';

describe('cash climb pending draft', () => {
  it('seeds the result form from a player submit', () => {
    const match = {
      id: 'm1',
      player1_id: 'ann',
      player1_name: 'Ann',
      player2_id: 'ben',
      player2_name: 'Ben',
      status: 'pending',
      winner_id: null,
      score: null,
    };
    const draft = matchWithPendingDraft(match, {
      match_id: 'm1',
      winner_id: 'ben',
      score: '3-5',
      game_type: '9-Ball',
    });
    assert.equal(draft.winner_id, 'ben');
    assert.equal(draft.score, '3-5');
    assert.equal(draft.played_game, '9-Ball');
    assert.equal(draft.status, 'pending');
  });
});
