/** Test-only helpers for V2 payout events. */
import assert from 'node:assert/strict';
import * as E from './showdownEngine.js';
import { startedEvent, settleShootouts } from './showdownTestKit.js';
import { playoffTemplate, finalRound } from './showdownPlayoffTemplates.js';

export const FEES = [20, 25, 30, 50, 100, 200];
export const SIZES = Array.from({ length: 17 }, (_, i) => i + 8);

export const v2Event = (n, opts = {}) => startedEvent(n, { ...opts, payoutVersion: 2 });
export const win = (race, loser) => (r) => (r() < 0.5 ? [race, loser] : [loser, race]);
export const rnd = (race) => (r) => win(race, Math.floor(r() * race))(r);
export const score = (pair) => ({ score: pair });

/** Records every ready match in a phase. decide(match, index, random, state) -> {score:[a,b]} | {forfeit:[ids]}. */
export function play(state, op, phase, decide, after) {
  let s = state;
  let i = 0;
  for (let guard = 0; guard < 400; guard += 1) {
    const m = E.readyMatches(s.matches).find((x) => x.phase === phase && x.status !== 'completed');
    if (!m) break;
    const c = op();
    const d = decide(m, i, c.random, s);
    i += 1;
    s = d.forfeit ? E.recordForfeit(s, m.id, d.forfeit, c) : E.recordResult(s, m.id, { score1: d.score[0], score2: d.score[1] }, c);
    const out = after ? after(s, m) : null;
    if (out?.matches) s = out;
  }
  return s;
}

export function toV2Playoffs(n, { fee = 20, seed = 1, q = (m, i, r) => score(rnd(3)(r)) } = {}) {
  const { s, op } = v2Event(n, { fee, seed });
  let st = play(s, op, 'qualifying', q);
  st = settleShootouts(E.lockQualifying(st, op()), op);
  st = E.confirmPlayoff(E.drawPlayoff(st, op()), op());
  return { s: st, op };
}

export const finalKeyOf = (s) => finalRound(playoffTemplate(s.payoutPlan.templateId)).key;
export const isFinal = (s, m) => m.roundKey === finalKeyOf(s);
export const isFirstRound = (s, m) => m.roundKey === playoffTemplate(s.payoutPlan.templateId).rounds[0].key;

/** Invariants that must hold at every moment of a V2 event. */
export function assertSound(s, label = '') {
  const e = E.computeEarnings(s);
  assert.equal(e.payoutVersion, 2, label);
  for (const r of Object.values(e.byPlayer)) {
    for (const k of ['qualifyingRacks', 'qualifying', 'playoffRacks', 'playoff', 'bye', 'championBonus', 'total']) assert.ok(r[k] >= 0, `${label} ${r.playerId} ${k} negative`);
  }
  assert.ok(e.paid <= e.pool, `${label} paid ${e.paid} > pool ${e.pool}`);
  if (s.playoffPlan) {
    assert.ok(e.unusedReserve >= 0, `${label} racks exceed reserve`);
    assert.ok(e.paid + e.held <= e.pool, `${label} paid + held bonus must never exceed the pool`);
    if (E.championshipStatus(s).status === 'decided') assert.equal(e.paid + e.held, e.pool, `${label} once decided, paid + held = pool`);
  }
  if (s.status === 'completed') {
    assert.equal(e.paid, e.pool, `${label} completed event must pay the whole pool`);
    assert.equal(E.reconciliationProblem(s), '', label);
  }
  return e;
}

export const totals = (s) => Object.fromEntries(Object.entries(E.computeEarnings(s).byPlayer).map(([id, r]) => [id, r.total]));
