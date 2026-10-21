import test from 'node:test';
import assert from 'node:assert/strict';
import { searchSteps, searchSync, certainlyAbove } from './builderSearch.js';
import { nearBoundary, shownOptions } from './builderRefine.js';
import { prepareInputs } from './builderPlan.js';
import { evaluateCandidate } from './builderEvaluate.js';
import { familyOf } from './builderCandidates.js';
import { percentile, seededRandom } from './builderTiming.js';
import { CLOSE_MARGIN_MIN, REFINE_BAND_MIN } from './builderFlags.js';

const QUICK = { pass1Runs: 6, pass2Runs: 12 };
const EIGHT = { entrants: 8, tables: 4, entryFee: 20, targetMin: 300 };

test('one preliminary result, then one final result, each labelled', () => {
  const steps = [...searchSteps(EIGHT, QUICK)];
  const kinds = steps.filter((s) => s.type !== 'progress').map((s) => s.type);
  assert.deepEqual(kinds, ['preliminary', 'final']);
  assert.equal(steps.at(-1).type, 'final');
  const [p, f] = steps.filter((s) => s.type !== 'progress').map((s) => s.result);
  assert.equal(p.status, 'preliminary');
  assert.equal(p.preliminary, true);
  assert.equal(f.status, 'final');
  assert.equal(f.preliminary, false);
  assert.ok(steps.filter((s) => s.type === 'progress').length === f.runs.simulations);
});

test('the final recommendation is built only from refined estimates', () => {
  [EIGHT, { ...EIGHT, targetMin: 360 }, { ...EIGHT, entrants: 12, targetMin: 300 }].forEach((raw) => {
    const { final } = searchSync(raw, QUICK);
    shownOptions(final.recommendation).forEach((m) => {
      assert.equal(m.refined, true, m.id);
      assert.equal(m.runs, QUICK.pass2Runs, m.id);
    });
  });
});

test('refined estimates equal a direct evaluation with the same number of runs (same seeds)', () => {
  const { final } = searchSync(EIGHT, QUICK);
  const { inputs, a } = prepareInputs(EIGHT);
  const refined = final.evaluated.filter((m) => m.refined);
  assert.ok(refined.length > 0);
  refined.forEach((m) => {
    const direct = evaluateCandidate(final.evaluated.find((x) => x.id === m.id), inputs, a, { runs: QUICK.pass2Runs });
    assert.equal(m.p80, direct.p80, m.id);
    assert.equal(m.p50, direct.p50, m.id);
    assert.equal(m.breakEvenShare, direct.breakEvenShare, m.id);
  });
});

test('same inputs give the same preliminary and final results', () => {
  const x = searchSync(EIGHT, QUICK);
  const y = searchSync(EIGHT, QUICK);
  assert.equal(JSON.stringify(y.final), JSON.stringify(x.final));
  assert.equal(JSON.stringify(y.preliminary), JSON.stringify(x.preliminary));
});

test('unrefined estimates are far from every class boundary or certainly Over', () => {
  const { final } = searchSync({ ...EIGHT, targetMin: 360 }, QUICK);
  final.evaluated.filter((m) => !m.refined).forEach((m) => {
    assert.ok(m.earlyStop || !nearBoundary(m.p80, 360), `${m.id} at ${m.p80}`);
  });
});

test('certainlyAbove is exact: once true, the P80 of the planned runs exceeds the limit whatever comes next', () => {
  const random = seededRandom(3);
  for (let trial = 0; trial < 400; trial += 1) {
    const planned = 4 + Math.floor(random() * 30);
    const totals = Array.from({ length: planned }, () => Math.round(random() * 100));
    for (let k = 1; k <= planned; k += 1) {
      if (!certainlyAbove(totals.slice(0, k), planned, 50)) continue;
      const worst = [...totals.slice(0, k), ...Array(planned - k).fill(0)];
      assert.ok(percentile(worst, 80) > 50, `planned ${planned}, stopped at ${k}`);
      assert.ok(percentile(totals.slice(0, k), 80) > 50);
      break;
    }
  }
});

test('early-stopped candidates really are Over at the full quick run count', () => {
  const raw = { entrants: 16, tables: 4, entryFee: 20, targetMin: 300 };
  const { final } = searchSync(raw, QUICK);
  const { inputs, a } = prepareInputs(raw);
  const stopped = final.evaluated.filter((m) => m.earlyStop);
  assert.ok(stopped.length > 0);
  stopped.forEach((m) => {
    const full = evaluateCandidate(m, inputs, a, { runs: QUICK.pass1Runs });
    assert.ok(full.p80 > 300 + CLOSE_MARGIN_MIN + REFINE_BAND_MIN, m.id);
  });
  assert.ok(final.recommendation.rows.filter((r) => r.earlyStop).every((r) => r.fit === 'over'));
});

test('V3 pruning never drops a setting that would fit or be Close (brute force at the same runs)', () => {
  [EIGHT, { ...EIGHT, entrants: 12, targetMin: 360 }].forEach((raw) => {
    const { final } = searchSync(raw, { pass1Runs: 6, pass2Runs: 6 });
    const { inputs, a } = prepareInputs(raw);
    assert.ok(final.skipped.length > 0);
    final.skipped.forEach(({ candidate }) => {
      const brute = evaluateCandidate(candidate, inputs, a, { runs: 6 });
      assert.ok(brute.p80 > raw.targetMin + CLOSE_MARGIN_MIN, `${candidate.id} P80 ${brute.p80}`);
    });
  });
});

test('every candidate is accounted for, and every family that fits is shown', () => {
  const { final } = searchSync({ ...EIGHT, targetMin: 360 }, QUICK);
  assert.equal(final.evaluated.length + final.skipped.length + final.ineligible.length, 99);
  const fittingFamilies = new Set(final.recommendation.rows.filter((r) => ['comfortable', 'tight'].includes(r.fit)).map(familyOf));
  const shownFamilies = new Set(shownOptions(final.recommendation).map(familyOf));
  assert.deepEqual([...shownFamilies].sort(), [...fittingFamilies].sort());
  assert.ok(final.evaluated.every((m) => m.reconciled && m.guaranteesHeld && m.calibrated === false));
});

test('bad inputs give a final result with problems and no preliminary', () => {
  const steps = [...searchSteps({ entrants: 8, tables: 0, targetMin: 300 })];
  assert.equal(steps.length, 1);
  assert.equal(steps[0].type, 'final');
  assert.ok(steps[0].result.problems.length > 0);
  assert.equal(steps[0].result.recommendation, null);
  assert.ok(searchSync({ entrants: 8, minutesPerGame: 0, targetMin: 300 }).final.problems.length > 0);
});

// Regression case for the default timing assumptions. A deliberate timing-model or calibration change may
// change these picks; update the case then, rather than treating the times as rules.
test('16 players, 4 tables, 6 hours (default assumptions): V3 3 games / race 3 comfortable with 4 games as the fuller event', () => {
  const { final } = searchSync({ entrants: 16, tables: 4, entryFee: 20, targetMin: 360 });
  const { primary, fullerEvent } = final.recommendation;
  assert.deepEqual([primary.id, primary.fit, fullerEvent.id, fullerEvent.fit], ['v3-3-3', 'comfortable', 'v3-4-3', 'tight']);
});
