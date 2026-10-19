import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { seededRandom } from '../showdownRandom.js';
import { playoffTemplate } from '../showdownPlayoffTemplates.js';
import { v3FeasibilityProblems } from './showdownV3Plan.js';
import { buildV3LegacyPlan } from './showdownV3PlanLegacy.js';
import { isEqualRatePlan, v3UnitCents } from './showdownV3Rules.js';
import { v3Event, playQualifying, qualify, playPlayoffs, earnings } from './showdownV3TestKit.js';

const FEES = [20, 25, 30, 50, 100, 200];
const EVENTS = 1500;

const LEGACY_EVENTS = 300;

function legacyFeasible(c) {
  try { buildV3LegacyPlan(c); return true; } catch { return false; }
}

function randomConfig(r, seed, legacy) {
  for (;;) {
    const c = {
      entrants: 8 + Math.floor(r() * 17), entryFee: FEES[Math.floor(r() * FEES.length)],
      qualifyingGames: 5 + Math.floor(r() * 11), playoffRaceTo: 3 + Math.floor(r() * 7), seed, legacy,
    };
    if (legacy ? legacyFeasible(c) : !v3FeasibilityProblems(c).length) return c;
  }
}

function outcomeFor(status, script) {
  if (status.championId) return 'completed';
  if (!status.aliveIds.length) return 'abandoned';
  if (script.interruptAt === 'final') return 'interrupted-final';
  if (script.interruptAt) return 'interrupted';
  throw new Error('The playoffs stopped without an outcome.');
}

function simulate(seed, legacy = false) {
  const r = seededRandom(seed * 977 + 13);
  const config = randomConfig(r, seed, legacy);
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

function assertReconciles(runs) {
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

describe(`V3 randomized events (${EVENTS})`, () => {
  const runs = Array.from({ length: EVENTS }, (_, i) => simulate(i + 1));

  it('every event reconciles exactly to the pool in 25\u00a2 units within every budget', () => {
    assert.ok(runs.every(({ ev }) => isEqualRatePlan(ev.plan)));
    assertReconciles(runs);
    runs.forEach(({ ev, e }, i) => {
      const where = `event ${i + 1}`;
      assert.ok(e.qualifying.matches.every((m) => m.withinBudget), where);
      assert.ok(e.qualifying.unusedCents >= 0 && e.playoffs.unusedGameReserveCents >= 0, where);
      e.qualifying.credits.forEach((c) => assert.ok(c.games <= c.unplayed, where));
    });
  });

  it('covers every outcome, withdrawals, double forfeits, byes and walkovers', () => {
    const outcomes = new Set(runs.map((x) => x.outcome));
    ['completed', 'interrupted-final', 'interrupted', 'abandoned'].forEach((o) => assert.ok(outcomes.has(o), o));
    const results = new Set(runs.flatMap((x) => [...x.ev.qualifying, ...x.ev.playoffs].map((m) => m.result)));
    ['played', 'forfeit', 'double-forfeit', 'walkover', 'interrupted', 'champion-walkover'].forEach((k) => assert.ok(results.has(k), k));
    assert.ok(runs.some((x) => x.ev.byeIds.length > 0));
    assert.ok(runs.some((x) => x.ev.shootouts.length > 0));
    const races = new Set(runs.map((x) => x.ev.plan.playoffRaceTo));
    for (let k = 3; k <= 9; k += 1) assert.ok(races.has(k), `race ${k}`);
  });

  it('every remaining qualifier earned at least as much in qualifying as every remaining non-qualifier', () => {
    runs.forEach(({ ev, e, withdrawnIds }, i) => {
      const out = new Set(withdrawnIds);
      const q = new Set(ev.qualifierIds);
      const rows = e.qualifying.rows;
      const minQ = Math.min(...ev.qualifierIds.filter((id) => !out.has(id)).map((id) => rows[id].totalCents));
      const maxN = Math.max(...ev.playerIds.filter((id) => !q.has(id) && !out.has(id)).map((id) => rows[id].totalCents));
      if (Number.isFinite(minQ) && Number.isFinite(maxN)) assert.ok(minQ >= maxN, `event ${i + 1}`);
    });
  });

  it('with no withdrawals or interruptions the champion out-earns the runner-up', () => {
    runs.filter((x) => !x.withdrawnIds.length && x.outcome === 'completed').forEach(({ ev, e }, i) => {
      const final = ev.playoffs.find((m) => m.roundKey === 'final');
      const rows = e.settlement.rows;
      assert.ok(rows[final.winnerId].totalCents > rows[final.loserId].totalCents, `event ${i + 1}`);
    });
  });

  it('equal rates: the bridge match pays the same for both players, so no qualifying reserve is left unused', () => {
    const checked = runs.filter((x) => x.ev.plan.entrants % 2 === 1 && !Object.keys(x.quits).length);
    assert.ok(checked.length > 100);
    checked.forEach(({ e }) => assert.equal(e.qualifying.unusedCents, 0));
  });
});

const CLEAN_EVENTS = 1000;

/** Every match played to completion; odd seeds use lopsided skills so qualifying totals reach the extremes. */
function simulateClean(seed) {
  const r = seededRandom(seed * 7919 + 3);
  let ev = v3Event(randomConfig(r, seed, false));
  if (seed % 2) ev.skills = Object.fromEntries(Object.entries(ev.skills).map(([id, v]) => [id, v * 8]));
  ev = playPlayoffs(qualify(playQualifying(ev)));
  return { ev, e: earnings(ev, { outcome: 'completed' }) };
}

describe(`V3 equal-rate finishing order in completed events (${CLEAN_EVENTS})`, () => {
  const runs = Array.from({ length: CLEAN_EVENTS }, (_, i) => simulateClean(i + 1));

  it('the champion out-earns the runner-up, who out-earns both semifinal losers', () => {
    runs.forEach(({ ev, e }, i) => {
      const where = `event ${i + 1} (${ev.plan.entrants}p $${ev.plan.entryFee} G${ev.plan.qualifyingGames} race ${ev.plan.playoffRaceTo})`;
      assert.equal(e.settlement.ok, true, where);
      const keys = playoffTemplate(ev.plan.templateId).rounds.map((x) => x.key);
      const final = ev.playoffs.find((m) => m.roundKey === keys[keys.length - 1]);
      const semiLosers = ev.playoffs.filter((m) => m.roundKey === keys[keys.length - 2]).map((m) => m.loserId);
      const total = (id) => e.settlement.rows[id].totalCents;
      assert.ok(total(final.winnerId) > total(final.loserId), where);
      semiLosers.forEach((id) => assert.ok(total(final.loserId) > total(id), where));
      assert.ok(total(final.winnerId) - total(final.loserId) >= ev.plan.guarantees.margins.championCents, where);
      semiLosers.forEach((id) => assert.ok(total(final.loserId) - total(id) >= ev.plan.guarantees.margins.runnerUpCents, where));
    });
  });

  it('covers byes and the playoff layouts', () => {
    assert.ok(runs.some((x) => x.ev.byeIds.length > 0));
    assert.equal(new Set(runs.map((x) => x.ev.plan.templateId)).size >= 4, true);
  });
});

describe(`V3 randomized events locked with the original formula (${LEGACY_EVENTS})`, () => {
  const runs = Array.from({ length: LEGACY_EVENTS }, (_, i) => simulate(i + 1, true));

  it('every event reconciles exactly to the pool in 50\u00a2 units', () => {
    assert.ok(runs.every(({ ev }) => !isEqualRatePlan(ev.plan) && v3UnitCents(ev.plan) === 50));
    assertReconciles(runs);
  });

  it('odd fields without forfeits: the unused qualifying reserve is exactly the bridge saving', () => {
    const checked = runs.filter((x) => x.ev.plan.entrants % 2 === 1 && !Object.keys(x.quits).length);
    assert.ok(checked.length > 20);
    checked.forEach(({ ev, e }) => {
      const bridge = ev.qualifying.find((m) => m.slot === ev.plan.entrants);
      assert.equal(e.qualifying.unusedCents, bridge.score1 * (ev.plan.rates.r2 - ev.plan.rates.r1));
    });
  });
});
