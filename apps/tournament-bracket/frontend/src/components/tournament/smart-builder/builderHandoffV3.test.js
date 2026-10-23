import test from 'node:test';
import assert from 'node:assert/strict';
import { searchSync } from './builderSearch.js';
import { createHandoff, offeredOptions } from './builderHandoff.js';
import { prefillConfig } from '../showdown/operator/showdownPrefill.js';
import { createShowdownWithFormat } from '../showdown/showdownEngine.js';
import { makeOperator } from '../showdown/operator/showdownOperatorKit.js';
import { operator } from '../showdown/showdownTestKit.js';
import { buildV3Plan, v3FeasibilityProblems } from '../showdown/v3/showdownV3Plan.js';
import { v3NewEventFormula } from '../showdown/v3/showdownV3Activation.js';

const QUICK = { pass1Runs: 6, pass2Runs: 12 };
const players = (n) => Array.from({ length: n }, (_, i) => ({ name: `Player ${i + 1}` }));

function startWith(config, n) {
  const o = makeOperator(3);
  let s = createShowdownWithFormat({ presetId: 'legends', payoutVersion: 3, confirmed: true, ...config }, operator(1)());
  players(n).forEach((p) => { s = o.tap(s, 'addPlayer', p); });
  return o.tap(s, 'start', {});
}

test('the Smart Builder only offers V3 settings that the formula new events use can start', () => {
  const result = searchSync({ entrants: 17, tables: 5, entryFee: 20, targetMin: 300 }, QUICK).final;
  const v3 = offeredOptions(result.recommendation).filter((o) => o.family === 'showdown' && o.version === 3);
  assert.ok(v3.length, 'the Builder offers a V3 option');
  for (const o of v3) {
    const settings = { entrants: 17, entryFee: 20, qualifyingGames: o.qualifyingGames, playoffRaceTo: o.playoffRaceTo };
    assert.deepEqual(v3FeasibilityProblems(settings, v3NewEventFormula()), [], JSON.stringify(o));
  }
});

for (const raw of [{ entrants: 8, tables: 4, entryFee: 20, targetMin: 360 }, { entrants: 17, tables: 5, entryFee: 20, targetMin: 300 }]) {
  test(`Smart Builder V3 handoff (${raw.entrants} players) locks the same plan as a manual setup, with the formula new events use`, () => {
    const result = { ...searchSync(raw, QUICK).final, status: 'final', preliminary: false };
    const m = offeredOptions(result.recommendation).find((o) => o.family === 'showdown' && o.version === 3);
    assert.ok(m, 'the Builder offers a V3 option');
    const { handoff } = createHandoff(m, result);
    const settings = { entrants: raw.entrants, entryFee: raw.entryFee, qualifyingGames: m.qualifyingGames, playoffRaceTo: m.playoffRaceTo };
    assert.deepEqual(v3FeasibilityProblems(settings), []);
    const fromBuilder = startWith(prefillConfig(handoff, 3), raw.entrants);
    const manual = startWith({ entryFee: raw.entryFee, tableCount: raw.tables, qualifyingGames: m.qualifyingGames, playoffRaceTo: m.playoffRaceTo }, raw.entrants);
    assert.equal(fromBuilder.payoutPlan.formula, v3NewEventFormula(), 'the Builder never picks a formula of its own');
    assert.deepEqual(fromBuilder.payoutPlan, manual.payoutPlan);
    assert.deepEqual(fromBuilder.payoutPlan, buildV3Plan(settings));
  });
}
