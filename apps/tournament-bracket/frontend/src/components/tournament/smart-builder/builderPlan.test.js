import test from 'node:test';
import assert from 'node:assert/strict';
import { runSmartBuilder } from './builderPlan.js';
import { UNCALIBRATED_NOTE } from './builderFlags.js';

const RUNS = 20;
const golden = () => runSmartBuilder({ entrants: 16, tables: 4, entryFee: 20, targetMin: 360 }, { runs: RUNS });

// Regression case for the default timing assumptions. A deliberate timing-model or calibration change may
// change these picks; update the case then, rather than treating the times as rules.
test('16 players, 4 tables, 6 hours (default assumptions): V3 3 games / race 3 comfortable, Cash Climb 1/2 shown as the fuller event', () => {
  const r = golden();
  const { primary, fullerEvent, nothingFits } = r.recommendation;
  assert.equal(nothingFits, false);
  assert.equal(primary.id, 'v3-3-3');
  assert.equal(primary.fit, 'comfortable');
  assert.equal(fullerEvent.id, 'cc-1-2');
  assert.equal(fullerEvent.fit, 'tight');
  assert.equal(r.recommendation.rows.find((m) => m.id === 'cc-1-1').fit, 'comfortable');
  assert.ok(r.recommendation.rows.filter((m) => m.family === 'showdown' && m.version !== 3).every((m) => m.fit === 'over'));
  assert.equal(r.note, UNCALIBRATED_NOTE);
  assert.ok(r.evaluated.every((m) => m.calibrated === false && m.reconciled && m.guaranteesHeld));
});

test('the same inputs give the same recommendation', () => {
  const strip = (r) => JSON.stringify(r.recommendation);
  assert.equal(strip(golden()), strip(golden()));
});

test('every candidate is accounted for: evaluated, skipped as over, or ineligible with a reason', () => {
  const r = runSmartBuilder({ entrants: 8, tables: 4, entryFee: 20, targetMin: 300 }, { runs: 6 });
  assert.equal(r.evaluated.length + r.skipped.length + r.ineligible.length, 99);
  r.skipped.forEach((s) => assert.equal(s.candidate.version, 3));
  r.ineligible.forEach((x) => assert.ok(x.problems.length > 0));
  const { primary, close } = r.recommendation;
  assert.ok(['comfortable', 'tight'].includes(primary.fit));
  close.forEach((m) => assert.ok(m.p80 > 300 && m.p80 <= 330));
});

test('bad inputs return problems and no recommendation', () => {
  const r = runSmartBuilder({ entrants: 8, tables: 0, targetMin: 300 });
  assert.ok(r.problems.length > 0);
  assert.equal(r.recommendation, null);
});
