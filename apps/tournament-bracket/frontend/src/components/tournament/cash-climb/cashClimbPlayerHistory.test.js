import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { playerMatchHistory } from './cashClimbPlayerHistory.js';

describe('cash climb player history', () => {
  it('lists posted wins, losses, and byes for one player', () => {
    const tournament = {
      gameType: '8-Ball',
      rounds: [
        { id: 'r1', round_number: 1, round_name: 'Round 1 (8-Ball)' },
        { id: 'r2', round_number: 2, round_name: 'Round 2 (8-Ball)' },
      ],
      matches: [
        {
          id: 'm1',
          round_id: 'r1',
          round_number: 1,
          status: 'completed',
          player1_id: 'ann',
          player1_name: 'Ann',
          player2_id: 'ben',
          player2_name: 'Ben',
          winner_id: 'ann',
          score: '1-0',
          payout_amount: 2,
          completed_at: '1',
          played_game: '9-Ball',
        },
        {
          id: 'm2',
          round_id: 'r2',
          round_number: 2,
          status: 'completed',
          is_bye: true,
          player1_id: 'ann',
          player1_name: 'Ann',
          player2_id: null,
          winner_id: 'ann',
          payout_amount: 1,
          completed_at: '2',
        },
        {
          id: 'm3',
          round_id: 'r1',
          status: 'pending',
          player1_id: 'ann',
          player2_id: 'cam',
        },
      ],
    };
    const rows = playerMatchHistory(tournament, 'ann');
    assert.equal(rows.length, 2);
    assert.equal(rows[0].roundLabel, 'Round 1 (9-Ball)');
    assert.equal(rows[0].result, 'Win');
    assert.equal(rows[0].opponent, 'Ben');
    assert.equal(rows[0].game, '9-Ball');
    assert.equal(rows[1].roundLabel, 'Round 2 (8-Ball)');
    assert.equal(rows[1].result, 'Bye');
    assert.equal(rows[1].game, '8-Ball');
  });

  it('uses setup game type when a match has no submitted game', () => {
    const tournament = {
      gameType: "Lagger's Choice",
      rounds: [{ id: 'r1', round_number: 1 }],
      matches: [{
        id: 'm1',
        round_id: 'r1',
        round_number: 1,
        status: 'completed',
        player1_id: 'ann',
        player1_name: 'Ann',
        player2_id: 'ben',
        player2_name: 'Ben',
        winner_id: 'ann',
      }],
    };
    const rows = playerMatchHistory(tournament, 'ann');
    assert.equal(rows[0].roundLabel, "Round 1 (Lagger's Choice)");
    assert.equal(rows[0].game, "Lagger's Choice");
  });
});
