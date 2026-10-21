import test from 'node:test';
import assert from 'node:assert/strict';
import { searchSync } from './builderSearch.js';
import { createHandoff, handoffProblem, offeredOptions } from './builderHandoff.js';
import { cashClimbSetupStart } from '../cash-climb/cashClimbSetupStart.js';
import { OPEN_TOURNAMENT_STRUCTURE } from '../cash-climb/openTournamentStructure.js';
import { createOpenTournament, startTournament } from '../cash-climb/cashClimbEngine.js';
import { prefillConfig } from '../showdown/operator/showdownPrefill.js';
import { confirmPick, initialPick, pickProblem } from '../showdown/operator/showdownFormatPick.js';
import { createShowdownWithFormat, setupProblems } from '../showdown/showdownEngine.js';
import { makeOperator } from '../showdown/operator/showdownOperatorKit.js';
import { freshStorage } from '../showdown/cloud/showdownCloudTestKit.js';

const QUICK = { pass1Runs: 6, pass2Runs: 12 };
const INPUTS = [
  { entrants: 8, tables: 4, entryFee: 20, targetMin: 360 },
  { entrants: 12, tables: 5, entryFee: 25, targetMin: 300 },
];
const results = INPUTS.map((raw) => ({ raw, result: { ...searchSync(raw, QUICK).final, status: 'final', preliminary: false } }));
const options = (family, version) => results.flatMap(({ raw, result }) => offeredOptions(result.recommendation)
  .filter((m) => m.family === family && (version === undefined || m.version === version))
  .map((m) => ({ raw, result, m })));
const names = (n) => Array.from({ length: n }, (_, i) => ({ name: `Player ${i + 1}` }));

/** Picker, create, players, start: the ShowdownApp steps with an injected deterministic clock and ids. */
function runShowdown(version, config, players) {
  const pick = confirmPick(initialPick(null, version), true);
  assert.equal(pickProblem(pick), '');
  const o = makeOperator(7);
  let s = createShowdownWithFormat({ ...config, presetId: 'legends', payoutVersion: pick.selected, confirmed: true }, o.op());
  players.forEach((p) => { s = o.tap(s, 'addPlayer', p); });
  assert.deepEqual(setupProblems(s), []);
  return o.tap(s, 'start');
}

for (const version of [1, 2, 3]) {
  test(`V${version}: a recommendation creates and starts with the same settings and payout plan as a hand-made event`, () => {
    const store = freshStorage();
    const cases = options('showdown', version);
    assert.ok(cases.length, `a V${version} option is offered`);
    cases.forEach(({ raw, result, m }) => {
      assert.equal(handoffProblem(m, result, { currentInputs: raw }), '');
      const { handoff } = createHandoff(m, result, { currentInputs: raw });
      const config = prefillConfig(handoff, version);
      const players = names(handoff.plannedPlayers);
      const fromBuilder = runShowdown(version, config, players);
      const byHand = runShowdown(version, { ...handoff.settings }, players);
      assert.notEqual(fromBuilder.status, 'setup');
      assert.equal(fromBuilder.payoutVersion, version);
      assert.deepEqual(fromBuilder.settings, byHand.settings);
      assert.deepEqual(fromBuilder.payoutPlan, byHand.payoutPlan);
      assert.ok(fromBuilder.payoutPlan, 'the payout plan is locked at start');
      assert.equal(fromBuilder.settings.entryFee, raw.entryFee);
      assert.equal(fromBuilder.settings.tableCount, m.tables ?? raw.tables);
      Object.entries(handoff.settings).forEach(([k, v]) => assert.equal(fromBuilder.settings[k], v, k));
      assert.equal(fromBuilder.players.length, raw.entrants);
    });
    assert.equal(store.size, 0, 'nothing was written to browser storage');
  });
}

test('Cash Climb: a recommendation starts with the same races, tables, fee and prize pool as a hand-made event', () => {
  const cases = options('cash-climb');
  assert.ok(cases.length, 'a Cash Climb option is offered');
  cases.forEach(({ raw, result, m }) => {
    const { handoff } = createHandoff(m, result, { currentInputs: raw });
    const form = cashClimbSetupStart(handoff);
    const fromForm = {
      raceTo: Number(form.raceToMode === 'other' ? form.otherRaceTo : form.raceToMode),
      kohRaceTo: Number(form.kohRaceToMode === 'other' ? form.otherKohRaceTo : form.kohRaceToMode),
      tableCount: Number(form.tableCountMode === 'other' ? form.otherTableCount : form.tableCountMode),
      entryFee: Number(form.entryFee),
    };
    assert.deepEqual(fromForm, { ...handoff.settings });
    const base = { name: 'Cash Climb', tournamentDate: '2026-10-20', gameType: OPEN_TOURNAMENT_STRUCTURE.gameRules.gameType, players: names(handoff.plannedPlayers) };
    const fromBuilder = startTournament(createOpenTournament({ ...base, ...fromForm }));
    const byHand = startTournament(createOpenTournament({ ...base, raceTo: m.raceTo, kohRaceTo: m.kohRaceTo, tableCount: raw.tables, entryFee: raw.entryFee }));
    ['raceTo', 'kohRaceTo', 'tableCount', 'entryFee', 'totalPrizePool', 'payoutModel', 'status'].forEach((k) => {
      assert.deepEqual(fromBuilder[k], byHand[k], k);
    });
    assert.equal(fromBuilder.totalPrizePool, raw.entryFee * raw.entrants);
    assert.equal(fromBuilder.players.length, raw.entrants);
  });
});
