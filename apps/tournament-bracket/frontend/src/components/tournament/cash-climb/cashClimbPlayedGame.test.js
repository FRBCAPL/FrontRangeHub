import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePlayedGame,
  playedGameFromMatch,
  playedGameFromExtras,
  tagSubmittedBy,
  pendingSubmitterName,
  playedGameFromPending,
} from './cashClimbPlayedGame.js';

describe('cash climb played game', () => {
  it('keeps only 8/9/10-ball values', () => {
    assert.equal(normalizePlayedGame('9-Ball'), '9-Ball');
    assert.equal(normalizePlayedGame("Lagger's Choice"), '');
    assert.equal(normalizePlayedGame(''), '');
  });

  it('reads the submitted game off a match before other fields', () => {
    assert.equal(playedGameFromMatch({ played_game: '10-Ball', game_type: '8-Ball' }), '10-Ball');
    assert.equal(playedGameFromMatch({ playedGame: '9-Ball' }), '9-Ball');
    assert.equal(playedGameFromMatch({ game_type: '8-Ball' }), '');
  });

  it('reads extras without dropping a chosen game', () => {
    assert.equal(playedGameFromExtras({ playedGame: '9-Ball' }), '9-Ball');
    assert.equal(playedGameFromExtras({ played_game: '8-Ball' }), '8-Ball');
    assert.equal(playedGameFromExtras({}), undefined);
  });

  it('carries the chosen game on submitted_by when the column is missing', () => {
    assert.equal(tagSubmittedBy('Ann', '9-Ball'), 'Ann [9-Ball]');
    assert.equal(pendingSubmitterName({ submitted_by: 'Ann [9-Ball]' }), 'Ann');
    assert.equal(playedGameFromPending({ submitted_by: 'Ann [9-Ball]' }), '9-Ball');
    assert.equal(playedGameFromPending({ game_type: '10-Ball', submitted_by: 'Ann [9-Ball]' }), '10-Ball');
  });
});
