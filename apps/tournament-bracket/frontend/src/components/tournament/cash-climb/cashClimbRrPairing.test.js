import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pairKey, pairRrRound, rrHistoryFromMatches } from './cashClimbRrPairing.js';

const players = (names) => names.map((name) => ({ id: name, name }));

describe('cash climb RR pairing', () => {
  it('pairs everyone once and shuffles with the given random', () => {
    const { matches, bye } = pairRrRound(players(['A', 'B', 'C', 'D']), {}, () => 0);
    assert.equal(bye, null);
    assert.equal(matches.length, 2);
    const ids = matches.flatMap((m) => [m.player1.id, m.player2.id]).sort();
    assert.deepEqual(ids, ['A', 'B', 'C', 'D']);
  });

  it('avoids a rematch when another pairing exists', () => {
    const history = rrHistoryFromMatches([
      { player1_id: 'A', player2_id: 'B', status: 'completed' },
      { player1_id: 'C', player2_id: 'D', status: 'completed' },
    ]);
    const { matches } = pairRrRound(players(['A', 'B', 'C', 'D']), history, () => 0);
    const keys = matches.map((m) => pairKey(m.player1.id, m.player2.id)).sort();
    assert.equal(keys.includes(pairKey('A', 'B')), false);
    assert.equal(keys.includes(pairKey('C', 'D')), false);
  });

  it('rotates the bye to someone who has not sat yet', () => {
    const history = rrHistoryFromMatches([
      { is_bye: true, player1_id: 'A', status: 'completed' },
      { player1_id: 'B', player2_id: 'C', status: 'completed' },
    ]);
    const { bye, matches } = pairRrRound(players(['A', 'B', 'C']), history, () => 0);
    assert.ok(bye);
    assert.notEqual(bye.id, 'A');
    assert.equal(matches.length, 1);
  });

  it('rematches only when every remaining pair has already played', () => {
    const history = rrHistoryFromMatches([
      { player1_id: 'A', player2_id: 'B', status: 'completed' },
    ]);
    const { matches } = pairRrRound(players(['A', 'B']), history, () => 0);
    assert.equal(matches.length, 1);
    assert.equal(pairKey(matches[0].player1.id, matches[0].player2.id), pairKey('A', 'B'));
  });
});
