import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseOptionalMatchScore } from './cashClimbScore.js';
import { estimateCashClimbDuration } from './cashClimbDuration.js';
import { previewPrizeSchedule } from './cashClimbSchedule.js';

describe('optional match score', () => {
  const ids = { winnerId: 'a', player1Id: 'a', player2Id: 'b', raceTo: 5 };

  it('allows a blank score', () => {
    assert.deepEqual(parseOptionalMatchScore('', ids), { ok: true, score: null });
    assert.deepEqual(parseOptionalMatchScore('   ', ids), { ok: true, score: null });
  });

  it('accepts a race-to legal player1-player2 score', () => {
    assert.deepEqual(parseOptionalMatchScore('5-3', ids), { ok: true, score: '5-3' });
    assert.deepEqual(parseOptionalMatchScore('2-5', { ...ids, winnerId: 'b' }), { ok: true, score: '2-5' });
  });

  it('rejects scores above the race-to', () => {
    const result = parseOptionalMatchScore('9-0', ids);
    assert.equal(result.ok, false);
    assert.match(result.error, /race to 5/i);
  });

  it('rejects a score that does not match the selected winner', () => {
    const result = parseOptionalMatchScore('2-5', ids);
    assert.equal(result.ok, false);
    assert.match(result.error, /other player/i);
  });

  it('rejects non-numeric scores', () => {
    const result = parseOptionalMatchScore('forfeit', ids);
    assert.equal(result.ok, false);
  });
});

describe('two-player duration and prize preview', () => {
  it('estimates one opening round then King of the Hill', () => {
    const estimate = estimateCashClimbDuration({ playerCount: 2, raceTo: 3, tableCount: 1 });
    assert.equal(estimate.rrRounds, 1);
    assert.equal(estimate.earlyKoh, true);
    assert.equal(estimate.kohPlayers, 2);
  });

  it('shows leftover cents when per-win amounts do not consume the round pool', () => {
    const preview = previewPrizeSchedule(
      [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }, { id: 'd', name: 'D' }, { id: 'e', name: 'E' }, { id: 'f', name: 'F' }],
      'double',
      120,
      12
    );
    assert.ok(preview.rounds.length > 0);
    const withLeftover = preview.rounds.find((r) => r.leftover > 0);
    assert.ok(withLeftover, 'at least one round should carry leftover cents');
    assert.ok(Math.abs(withLeftover.paidThisRound + withLeftover.leftover - withLeftover.roundPrize) < 0.001);
  });
});
