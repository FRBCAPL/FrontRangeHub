/**
 * Randomized V3 event runner shared by the simulation tests. `mode` picks the formula the event is locked
 * with: 'escalating' (D10), 'equal' (equal-rate plans locked before D10) or 'legacy'.
 */
import assert from 'node:assert/strict';
import { seededRandom } from '../showdownRandom.js';
import { playoffTemplate } from '../showdownPlayoffTemplates.js';
import { v3FeasibilityProblems, buildV3EqualRatePlan } from './showdownV3Plan.js';
import { buildV3LegacyPlan } from './showdownV3PlanLegacy.js';
import { v3UnitCents, V3_ESCALATING_FORMULA } from './showdownV3Rules.js';
import { v3Event, playQualifying, qualify, playPlayoffs, earnings } from './showdownV3TestKit.js';

export const SIM_FEES = [20, 25, 30, 50, 100, 200];

const builds = (fn, c) => { try { fn(c); return true; } catch { return false; } };

function feasible(c, mode) {
  if (mode === 'legacy') return builds(buildV3LegacyPlan, c);
  if (mode === 'equal') return builds(buildV3EqualRatePlan, c);
  return !v3FeasibilityProblems(c, V3_ESCALATING_FORMULA).length;
}

export function randomConfig(r, seed, mode = 'escalating', fees = SIM_FEES) {
  for (;;) {
    const c = {
      entrants: 8 + Math.floor(r() * 17), entryFee: fees[Math.floor(r() * fees.length)],
      qualifyingGames: 5 + Math.floor(r() * 11), playoffRaceTo: 3 + Math.floor(r() * 7), seed,
      legacy: mode === 'legacy', equalRate: mode === 'equal', escalating: mode === 'escalating',
    };
    if (feasible(c, mode)) return c;
  }
}

export function outcomeFor(status, script) {
  if (status.championId) return 'completed';
  if (!status.aliveIds.length) return 'abandoned';
  if (script.interruptAt === 'final') return 'interrupted-final';
  if (script.interruptAt) return 'interrupted';
  throw new Error('The playoffs stopped without an outcome.');
}

/** One event with random withdrawals, walkovers, double forfeits and interruptions. */
export function simulate(seed, mode = 'escalating', fees = SIM_FEES) {
  const r = seededRandom(seed * 977 + 13);
  const config = randomConfig(r, seed, mode, fees);
  let ev = v3Event(config);
  const quits = {};
  const nQuits = Math.floor(r() * 3);
  for (let i = 0; i < nQuits; i += 1) quits[ev.playerIds[Math.floor(r() * ev.playerIds.length)]] = Math.floor(r() * 2);
  ev = qualify(playQualifying(ev, { quits }), Object.keys(quits));
  const keys = playoffTemplate(ev.plan.templateId).rounds.map((x) => x.key);
  const script = { quitAt: {}, midMatch: r() < 0.5 };
  if (r() < 0.3) script.quitAt[ev.qualifierIds[Math.floor(r() * ev.qualifierIds.length)]] = keys[Math.floor(r() * keys.length)];
  if (r() < 0.15) {
    const semi = keys[keys.length - 2];
    for (let i = 0; i < 2; i += 1) script.quitAt[ev.qualifierIds[Math.floor(r() * ev.qualifierIds.length)]] = semi;
  }
  if (r() < 0.1) ev.qualifierIds.forEach((id) => { script.quitAt[id] = keys[0]; });
  if (r() < 0.3) script.interruptAt = r() < 0.7 ? keys[keys.length - 1] : keys[Math.floor(r() * keys.length)];
  ev = playPlayoffs(ev, script);
  const withdrawnIds = [...Object.keys(quits), ...Object.keys(script.quitAt)];
  const probe = earnings(ev, { outcome: 'in-progress', withdrawnIds });
  const outcome = outcomeFor(probe.status, script);
  return { ev, quits, script, withdrawnIds, outcome, e: earnings(ev, { outcome, withdrawnIds }) };
}

/** Every match played to completion; odd seeds use lopsided skills so qualifying totals reach the extremes. */
export function simulateClean(seed, mode = 'escalating', fees = SIM_FEES) {
  const r = seededRandom(seed * 7919 + 3);
  let ev = v3Event(randomConfig(r, seed, mode, fees));
  if (seed % 2) ev.skills = Object.fromEntries(Object.entries(ev.skills).map(([id, v]) => [id, v * 8]));
  ev = playPlayoffs(qualify(playQualifying(ev)));
  return { ev, e: earnings(ev, { outcome: 'completed' }) };
}

export function assertReconciles(runs) {
  runs.forEach(({ ev, e, outcome }, i) => {
    const s = e.settlement;
    const unit = v3UnitCents(ev.plan);
    const where = `event ${i + 1} (${ev.plan.entrants}p $${ev.plan.entryFee} G${ev.plan.qualifyingGames} race ${ev.plan.playoffRaceTo}, ${outcome})`;
    assert.equal(s.ok, true, `${where}: ${s.problems.join('; ')}`);
    assert.equal(s.paidCents + s.heldCents + s.unawardedCents, ev.plan.poolCents, where);
    assert.equal(s.heldCents, 0, where);
    Object.values(s.rows).forEach((row) => {
      assert.ok(row.totalCents >= row.earnedCents && row.totalCents % unit === 0, where);
    });
    if (outcome === 'abandoned') assert.equal(s.paidCents + s.unawardedCents, ev.plan.poolCents, where);
    else assert.equal(s.unawardedCents, 0, where);
  });
}
