import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateShowdown } from './builderSimShowdown.js';
import { simulateCashClimb, withSeededMathRandom, withSimulatedClock } from './builderSimCashClimb.js';
import { evaluateCandidate } from './builderEvaluate.js';
import { candidateList, guarantees } from './builderCandidates.js';
import { DEFAULT_ASSUMPTIONS, assumptionsWith, percentile, seedFor, seededRandom } from './builderTiming.js';

const a = DEFAULT_ASSUMPTIONS;
const sum = (xs) => xs.reduce((t, x) => t + x, 0);
const byId = (id) => candidateList().find((c) => c.id === id);
const showdownArgs = { entrants: 8, tables: 4, entryFee: 20, qualifyingRaceTo: 3, playoffRaceTo: 5 };

test('same seed, same Showdown event (V1, V2, V3)', () => {
  [1, 2].forEach((version) => {
    const x = simulateShowdown({ ...showdownArgs, version, seed: 7 }, a);
    assert.deepEqual(simulateShowdown({ ...showdownArgs, version, seed: 7 }, a), x);
    assert.notDeepEqual(simulateShowdown({ ...showdownArgs, version, seed: 8 }, a).total, x.total);
  });
  const v3 = { entrants: 8, tables: 4, entryFee: 20, version: 3, qualifyingGames: 7, playoffRaceTo: 5, seed: 11 };
  assert.deepEqual(simulateShowdown(v3, a), simulateShowdown(v3, a));
});

test('same seed, same Cash Climb event, and Math.random is restored', () => {
  const original = Math.random;
  const args = { entrants: 11, tables: 3, entryFee: 20, raceTo: 1, kohRaceTo: 2, seed: 5 };
  assert.deepEqual(simulateCashClimb(args, a), simulateCashClimb(args, a));
  assert.equal(Math.random, original);
  assert.throws(() => withSeededMathRandom(() => 0.5, () => { throw new Error('boom'); }), /boom/);
  assert.equal(Math.random, original);
  assert.equal(withSeededMathRandom(() => 0.25, () => Math.random()), 0.25);
  assert.equal(Math.random, original);
});

test('the simulated clock is restored and makes King of the Hill runs repeatable', () => {
  const RealDate = Date;
  assert.throws(() => withSimulatedClock(() => { throw new Error('boom'); }), /boom/);
  assert.equal(Date, RealDate);
  const stamps = withSimulatedClock(() => [new Date().toISOString(), new Date().toISOString(), new Date(2020, 0, 2).getFullYear()]);
  assert.ok(stamps[0] < stamps[1]);
  assert.equal(stamps[2], 2020);
  assert.equal(Date, RealDate);
  for (let seed = 1; seed <= 12; seed += 1) {
    const args = { entrants: 16, tables: 4, entryFee: 20, raceTo: 1, kohRaceTo: 1 + (seed % 3), seed };
    assert.deepEqual(simulateCashClimb(args, a), simulateCashClimb(args, a), `seed ${seed}`);
  }
});

test('V1 and V2 play identical schedules, so their times match', () => {
  for (let seed = 1; seed <= 5; seed += 1) {
    const v1 = simulateShowdown({ ...showdownArgs, version: 1, seed }, a);
    const v2 = simulateShowdown({ ...showdownArgs, version: 2, seed }, a);
    assert.equal(v1.total, v2.total);
    assert.equal(v1.games, v2.games);
  }
});

test('every simulated payout reconciles to the pool', () => {
  const cases = [
    simulateShowdown({ ...showdownArgs, version: 1, seed: 3 }, a),
    simulateShowdown({ ...showdownArgs, version: 2, entrants: 12, seed: 3 }, a),
    simulateShowdown({ entrants: 10, tables: 4, entryFee: 25, version: 3, qualifyingGames: 6, playoffRaceTo: 4, seed: 3 }, a),
    simulateCashClimb({ entrants: 9, tables: 4, entryFee: 20, raceTo: 2, kohRaceTo: 3, seed: 3 }, a),
    simulateCashClimb({ entrants: 16, tables: 4, entryFee: 15, raceTo: 1, kohRaceTo: 1, seed: 3 }, a),
  ];
  cases.forEach((r) => {
    assert.ok(r.pool > 0);
    assert.ok(Math.abs(sum(r.payouts) - r.pool) < 0.01, `paid ${sum(r.payouts)} of ${r.pool}`);
    assert.ok(r.payouts.every((x) => x >= 0));
    assert.ok(r.total > 0 && r.tableMin > 0);
  });
});

test('evaluation: guarantees hold, money reconciles, estimates are labelled uncalibrated', () => {
  const inputs = { entrants: 9, tables: 4, entryFee: 20 };
  ['cc-1-2', 'cc-2-3', 'v1', 'v2', 'v3-6-4'].forEach((id) => {
    const m = evaluateCandidate(byId(id), inputs, a, { runs: 8 });
    assert.equal(m.calibrated, false);
    assert.match(m.estimateNote, /estimate/i);
    assert.equal(m.reconciled, true, id);
    assert.equal(m.guaranteesHeld, true, id);
    assert.ok(m.p50 <= m.p80);
    assert.equal(m.guaranteedGames, guarantees(byId(id)).games);
  });
});

test('evaluation is repeatable for the same inputs', () => {
  const inputs = { entrants: 8, tables: 4, entryFee: 20 };
  const c = byId('v3-7-5');
  assert.deepEqual(evaluateCandidate(c, inputs, a, { runs: 5 }), evaluateCandidate(c, inputs, a, { runs: 5 }));
});

test('slower games make events longer; assumptions are validated', () => {
  const slow = assumptionsWith({ minutesPerGame: 14 });
  const args = { ...showdownArgs, version: 1, seed: 9 };
  assert.ok(simulateShowdown(args, slow).total > simulateShowdown(args, a).total);
  assert.throws(() => assumptionsWith({ minutesPerGame: 0 }));
  assert.throws(() => assumptionsWith({ field: 'pro' }));
  assert.throws(() => { DEFAULT_ASSUMPTIONS.minutesPerGame = 1; });
});

test('timing helpers', () => {
  assert.equal(percentile([5, 1, 4, 2, 3], 80), 4);
  assert.equal(percentile([5, 1, 4, 2, 3], 50), 3);
  assert.equal(seedFor('v1', 8, 4), seedFor('v1', 8, 4));
  assert.notEqual(seedFor('v1', 8, 4), seedFor('v2', 8, 4));
  const r1 = seededRandom(42);
  const r2 = seededRandom(42);
  assert.deepEqual([r1(), r1(), r1()], [r2(), r2(), r2()]);
});

test('simulations never touch browser storage', () => {
  const touched = [];
  const spy = { getItem: (k) => touched.push(`get ${k}`), setItem: (k) => touched.push(`set ${k}`), removeItem: (k) => touched.push(`remove ${k}`) };
  const had = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { value: spy, configurable: true, writable: true });
  try {
    simulateShowdown({ ...showdownArgs, version: 2, seed: 1 }, a);
    simulateCashClimb({ entrants: 8, tables: 4, entryFee: 20, raceTo: 1, kohRaceTo: 2, seed: 1 }, a);
  } finally {
    if (had) Object.defineProperty(globalThis, 'localStorage', had); else delete globalThis.localStorage;
  }
  assert.deepEqual(touched, []);
});
