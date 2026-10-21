import test from 'node:test';
import assert from 'node:assert/strict';
import { searchSync } from './builderSearch.js';
import { estimateSetup, setupCandidate } from './builderSetupEstimate.js';
import { UNCALIBRATED_NOTE } from './builderFlags.js';

test('the setup estimate equals the refined Help me choose estimate for the same settings', () => {
  const raw = { entrants: 8, tables: 4, entryFee: 20, targetMin: 360, minutesPerGame: 10 };
  const rec = searchSync(raw).final.recommendation;
  const shown = [rec.primary, rec.fullerEvent, ...rec.alternatives].filter((m) => m?.family === 'showdown' && m.refined);
  assert.ok(shown.length >= 2);
  shown.forEach((m) => {
    const est = estimateSetup({ ...m, entrants: 8, tables: 4, entryFee: 20, minutesPerGame: 10 });
    assert.equal(est.p50, m.p50, m.id);
    assert.equal(est.p80, m.p80, m.id);
  });
});

test('phases, pace and the uncalibrated note', () => {
  const base = { version: 3, entrants: 8, tables: 4, entryFee: 20, qualifyingGames: 7, playoffRaceTo: 3, minutesPerGame: 10 };
  const est = estimateSetup(base, { runs: 12 });
  assert.equal(est.note, UNCALIBRATED_NOTE);
  assert.ok(est.qualifyingP50 > 0 && est.playoffsP50 > 0 && est.p80 >= est.p50);
  assert.ok(est.qualifyingP50 + est.playoffsP50 <= est.p80 + 30);
  assert.ok(estimateSetup({ ...base, minutesPerGame: 12 }, { runs: 12 }).p50 > est.p50);
  assert.ok(estimateSetup({ ...base, qualifyingGames: 10 }, { runs: 12 }).p50 > est.p50);
});

test('candidate ids match the Builder, so the same settings use the same seeds', () => {
  assert.equal(setupCandidate({ version: 3, qualifyingGames: 9, playoffRaceTo: 3 }).id, 'v3-9-3');
  assert.equal(setupCandidate({ version: 1, qualifyingRaceTo: 3, playoffRaceTo: 5 }).id, 'v1');
  assert.equal(setupCandidate({ version: 2, qualifyingRaceTo: 4, playoffRaceTo: 5 }).id, 'v2-4-5');
});
