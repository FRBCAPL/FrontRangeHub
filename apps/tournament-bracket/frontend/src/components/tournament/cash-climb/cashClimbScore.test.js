import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseOptionalMatchScore, validateRecordedGames } from './cashClimbScore.js';
import { cashClimbProgress, matchTableLabel } from './cashClimbProgress.js';
import { createOpenTournament, startTournament } from './cashClimbEngine.js';

describe('Cash Climb score and progress', () => {
  it('accepts two game fields or no score', () => {
    const opts = { raceTo: 5, winnerId: 'a', player1Id: 'a', player2Id: 'b' };
    assert.equal(validateRecordedGames('', '', opts).ok, true);
    assert.equal(validateRecordedGames('', '', opts).score, null);
    assert.equal(validateRecordedGames('5', '2', opts).score, '5-2');
    assert.equal(validateRecordedGames('5', '', opts).ok, false);
    assert.equal(validateRecordedGames('3', '1', opts).ok, false);
    assert.equal(parseOptionalMatchScore('5-2', opts).ok, true);
  });

  it('labels tables from the table count', () => {
    assert.equal(matchTableLabel(0, 4), 'Table 1');
    assert.equal(matchTableLabel(3, 4), 'Table 4');
    assert.equal(matchTableLabel(4, 4), 'On deck');
    assert.equal(matchTableLabel(0, 0), 'On deck');
  });

  it('reports round and match progress', () => {
    const state = startTournament(createOpenTournament({
      players: [{ name: 'Ann' }, { name: 'Ben' }, { name: 'Cam' }, { name: 'Dee' }],
    }));
    const progress = cashClimbProgress(state);
    assert.match(progress.roundLabel, /Round 1/);
    assert.match(progress.matchLabel, /0 of \d+ matches complete/);
    assert.ok(progress.nextMatch);
  });
});
