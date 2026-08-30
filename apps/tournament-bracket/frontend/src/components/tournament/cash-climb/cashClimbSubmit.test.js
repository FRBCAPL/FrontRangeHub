import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CASH_CLIMB_SUBMIT_HASH, cashClimbSubmitHref, pendingByMatchId, pendingWinnerName, findMatchById, resolvePendingWinnerId } from './cashClimbSubmit.js';

describe('cash climb player submit helpers', () => {
  it('exposes a public submit hash route', () => {
    assert.equal(CASH_CLIMB_SUBMIT_HASH, '/tournament-bracket/submit');
    assert.match(cashClimbSubmitHref(), /#\/tournament-bracket\/submit$/);
  });

  it('keeps the latest pending row per match', () => {
    const map = pendingByMatchId([
      { match_id: 'm1', winner_id: 'a', submitted_at: '2' },
      { match_id: 'm1', winner_id: 'b', submitted_at: '1' },
      { match_id: 'm2', winner_id: 'c' },
    ]);
    assert.equal(map.m1.winner_id, 'a');
    assert.equal(map.m2.winner_id, 'c');
  });

  it('names the pending winner from the match', () => {
    const match = { player1_id: 'a', player1_name: 'Ann', player2_id: 'b', player2_name: 'Ben' };
    assert.equal(pendingWinnerName(match, { winner_id: 'b' }), 'Ben');
  });

  it('matches cloud string ids to local match ids', () => {
    const tournament = {
      matches: [{ id: 'm1', status: 'pending', player1_id: 'p1', player2_id: 'p2' }],
    };
    const match = findMatchById(tournament, 'm1');
    assert.equal(match.id, 'm1');
    assert.equal(resolvePendingWinnerId(match, { winner_id: 'p2' }), 'p2');
  });
});
