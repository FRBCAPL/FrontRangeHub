import test from 'node:test';
import assert from 'node:assert/strict';
import { searchSync } from './builderSearch.js';
import { recommend } from './builderRank.js';
import { createHandoff, handoffNote, handoffProblem, offeredOptions, CASH_CLIMB_MAX_TABLES } from './builderHandoff.js';

const QUICK = { pass1Runs: 6, pass2Runs: 12 };
const EIGHT = { entrants: 8, tables: 4, entryFee: 20, targetMin: 360 };
const finalFor = (raw) => ({ ...searchSync(raw, QUICK).final, status: 'final', preliminary: false });
const RESULT = finalFor(EIGHT);
const offered = offeredOptions(RESULT.recommendation);
const pick = (family, version) => offered.find((m) => m.family === family && (version === undefined || m.version === version));

/** A final result built from fixed rows, for inputs a real search would take long to reach. */
function fixture(rows, inputs) {
  const all = rows.map((r) => ({ refined: true, flags: [], guaranteedGames: 3, guaranteedMatches: 2, finalRace: 3, ...r }));
  return { status: 'final', preliminary: false, inputs, recommendation: recommend(all, inputs.targetMin) };
}

test('a real 8-player result offers every format, and each card hands over its own settings only', () => {
  const cc = pick('cash-climb');
  const v1 = pick('showdown', 1);
  const v2 = pick('showdown', 2);
  const v3 = pick('showdown', 3);
  [cc, v1, v2, v3].forEach((m, i) => assert.ok(m, `format ${i} offered`));
  assert.deepEqual(createHandoff(cc, RESULT).handoff, {
    family: 'cash-climb', plannedPlayers: 8, settings: { raceTo: cc.raceTo, kohRaceTo: cc.kohRaceTo, tableCount: 4, entryFee: 20 },
  });
  assert.deepEqual(createHandoff(v1, RESULT).handoff, { family: 'showdown', version: 1, plannedPlayers: 8, settings: { entryFee: 20, tableCount: 4 } });
  assert.deepEqual(createHandoff(v2, RESULT).handoff, { family: 'showdown', version: 2, plannedPlayers: 8, settings: { entryFee: 20, tableCount: 4 } });
  assert.deepEqual(createHandoff(v3, RESULT).handoff, {
    family: 'showdown', version: 3, plannedPlayers: 8, settings: { entryFee: 20, tableCount: 4, qualifyingGames: v3.qualifyingGames, playoffRaceTo: v3.playoffRaceTo },
  });
});

test('nothing simulated crosses over, and a handoff cannot be changed after it is made', () => {
  offered.forEach((m) => {
    const { handoff } = createHandoff(m, RESULT);
    const keys = JSON.stringify(handoff);
    ['p50', 'p80', 'runs', 'id', 'matches', 'players', 'payout', 'champion', 'fit', 'refined'].forEach((k) => assert.ok(!keys.includes(`"${k}"`), `${m.id}: ${k}`));
    assert.ok(Object.isFrozen(handoff) && Object.isFrozen(handoff.settings));
    assert.throws(() => { handoff.settings.entryFee = 999; }, TypeError);
  });
});

test('the best option and the fuller-event alternative can each be chosen on their own', () => {
  const rec = RESULT.recommendation;
  assert.ok(rec.fullerEvent, 'this result has a fuller-event alternative');
  const best = createHandoff(rec.primary, RESULT).handoff;
  const fuller = createHandoff(rec.fullerEvent, RESULT).handoff;
  assert.notDeepEqual(best.settings, fuller.settings);
  assert.deepEqual(createHandoff(rec.primary, RESULT).handoff, best, 'choosing the fuller event left the first handoff alone');
  rec.alternatives.forEach((m) => assert.equal(createHandoff(m, RESULT).problem, undefined, m.id));
});

test('preliminary, unfinished, stale or unlisted options are refused', () => {
  const m = RESULT.recommendation.primary;
  assert.match(handoffProblem(m, { ...RESULT, preliminary: true }), /final recommendations/);
  assert.match(handoffProblem(m, { ...RESULT, status: 'refining' }), /final recommendations/);
  assert.match(handoffProblem(m, null), /final recommendations/);
  assert.match(handoffProblem({ ...m }, RESULT), /Only a recommended option/, 'a copy is not the listed card');
  const hidden = RESULT.recommendation.rows.find((r) => !offered.includes(r));
  assert.match(handoffProblem(hidden, RESULT), /Only a recommended option/);
  assert.match(handoffProblem(m, RESULT, { currentInputs: { ...EIGHT, entrants: 9 } }), /inputs changed/);
  assert.match(handoffProblem(m, RESULT, { currentInputs: { ...EIGHT, targetMin: 300 } }), /inputs changed/);
  assert.equal(handoffProblem(m, RESULT, { currentInputs: { ...EIGHT, minutesPerGame: 10 } }), '');
  assert.equal(createHandoff(m, RESULT, { currentInputs: { ...EIGHT, tables: 5 } }).handoff, undefined);
});

test('options that are not fully refined, or do not fit, are refused', () => {
  const inputs = { ...EIGHT };
  const cc = { family: 'cash-climb', id: 'cc-1-1', raceTo: 1, kohRaceTo: 1, p50: 200, p80: 220 };
  const unrefined = fixture([{ ...cc, refined: false }], inputs);
  assert.match(handoffProblem(unrefined.recommendation.primary, unrefined), /not been fully checked/);
  const over = fixture([{ ...cc, p80: 370 }], inputs);
  assert.equal(over.recommendation.nothingFits, true);
  assert.deepEqual(offeredOptions(over.recommendation), [], 'a nothing-fits result offers no cards');
  assert.match(handoffProblem(over.recommendation.close[0], over), /Only a recommended option/);
});

test('settings the setup screens cannot show are refused with the reason', () => {
  const v1 = { family: 'showdown', version: 1, id: 'v1', qualifyingRaceTo: 3, playoffRaceTo: 5, p50: 200, p80: 220 };
  const cc = { family: 'cash-climb', id: 'cc-1-1', raceTo: 1, kohRaceTo: 1, p50: 200, p80: 220 };
  for (const tables of [3, 8]) {
    const r = fixture([v1], { ...EIGHT, tables });
    assert.match(handoffProblem(r.recommendation.primary, r), /offers 4 to 7 tables/, `${tables} tables`);
  }
  const many = fixture([cc], { ...EIGHT, tables: CASH_CLIMB_MAX_TABLES + 1 });
  assert.match(handoffProblem(many.recommendation.primary, many), /up to 48 tables/);
  const atMax = fixture([cc], { ...EIGHT, tables: CASH_CLIMB_MAX_TABLES });
  assert.equal(handoffProblem(atMax.recommendation.primary, atMax), '');
  const cents = fixture([cc], { ...EIGHT, entryFee: 12.5 });
  assert.match(handoffProblem(cents.recommendation.primary, cents), /whole-dollar entry fee/);
});

test('the engines re-check every option at handoff time', () => {
  const v3 = { family: 'showdown', version: 3, id: 'v3-7-5', qualifyingGames: 7, playoffRaceTo: 5, p50: 200, p80: 220 };
  const tooFew = fixture([v3], { ...EIGHT, entrants: 7 });
  assert.match(handoffProblem(tooFew.recommendation.primary, tooFew), /entrants/i);
  const badRace = fixture([{ family: 'cash-climb', id: 'cc-x', raceTo: 22, kohRaceTo: 1, p50: 200, p80: 220 }], EIGHT);
  assert.match(handoffProblem(badRace.recommendation.primary, badRace), /more than 21/);
});

test('a Showdown already open on this tablet never blocks a card; Showdown cards say its confirmation comes first', () => {
  offered.forEach((m) => {
    assert.equal(handoffProblem(m, RESULT, { showdownOpen: true }), '', m.id);
    const note = handoffNote(m, { showdownOpen: true });
    if (m.family === 'showdown') assert.match(note, /already open on this tablet\. You will be asked to confirm setting it aside/, m.id);
    else assert.match(note, /Opens the normal setup screen/, m.id);
    assert.match(handoffNote(m), /Opens the normal setup screen/);
  });
});

test('making a handoff touches no storage, network or cloud', () => {
  const calls = [];
  const saved = { fetch: globalThis.fetch, localStorage: globalThis.localStorage, sessionStorage: globalThis.sessionStorage };
  const spy = (name) => new Proxy({}, { get: (_, key) => (...args) => { calls.push(`${name}.${String(key)}`); return args.length ? undefined : null; } });
  globalThis.fetch = (...args) => { calls.push('fetch'); return saved.fetch?.(...args); };
  globalThis.localStorage = spy('localStorage');
  globalThis.sessionStorage = spy('sessionStorage');
  try {
    offered.forEach((m) => createHandoff(m, RESULT, { currentInputs: EIGHT }));
  } finally {
    Object.assign(globalThis, saved);
  }
  assert.deepEqual(calls, []);
});
