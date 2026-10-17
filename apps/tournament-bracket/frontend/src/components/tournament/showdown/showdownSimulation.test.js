import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as E from './showdownEngine.js';
import { playoffTemplate } from './showdownPlayoffTemplates.js';
import { startedEvent, settleShootouts } from './showdownTestKit.js';

const FEES = [20, 21, 25, 27, 30, 40, 50, 75, 100, 200];
const reload = (s) => JSON.parse(JSON.stringify(s));

/** Plays one phase with random outcomes: mostly played, sometimes a forfeit or a double forfeit. */
function chaosPhase(state, op, phase, raceTo) {
  let s = state;
  for (let guard = 0; guard < 300; guard += 1) {
    const ready = E.readyMatches(s.matches).filter((m) => m.phase === phase);
    if (!ready.length) break;
    const m = ready[0];
    const c = op();
    const roll = c.random();
    if (roll < 0.06) s = E.recordForfeit(s, m.id, [m.p1, m.p2], c);
    else if (roll < 0.12) s = E.recordForfeit(s, m.id, [c.random() < 0.5 ? m.p1 : m.p2], c);
    else {
      const loser = Math.floor(c.random() * raceTo);
      s = E.recordResult(s, m.id, c.random() < 0.5 ? { score1: raceTo, score2: loser } : { score1: loser, score2: raceTo }, c);
    }
  }
  return s;
}

function checkInvariants(s, label) {
  const e = E.computeEarnings(s);
  const plan = s.payoutPlan;
  Object.values(e.byPlayer).forEach((r) => {
    assert.ok(Number.isInteger(r.total) && r.total >= 0, label);
    assert.equal(r.total, r.qualifying + r.topUp + r.bye + r.playoff, label);
  });
  assert.ok(e.paid <= plan.pool, `${label}: never more than the pool`);
  const ladder = s.playoffPlan;
  if (!ladder) return e;
  assert.deepEqual(E.ladderProblems(ladder), [], label);
  const qualifiers = new Set(s.qualification.qualifierIds);
  Object.values(e.byPlayer).forEach((r) => {
    if (qualifiers.has(r.playerId)) assert.ok(r.beforePlayoffs >= plan.entryFee, `${label}: qualifier below the fee`);
    else assert.equal(r.topUp, 0, label);
  });
  assert.equal(ladder.qualifyingScheduled + ladder.topUpTotal + ladder.budget, plan.pool, label);
  if (s.playoff?.confirmedAt) {
    assert.equal(s.playoff.byes.length, playoffTemplate(plan.templateId).byes, label);
    assert.deepEqual(s.playoff.byes.map((b) => b.playerId).sort(), [...s.qualification.byeIds].sort(), label);
    s.playoff.byes.forEach((b) => assert.equal(e.byPlayer[b.playerId].bye, ladder.bye, label));
  }
  return e;
}

describe('showdown randomized simulation', () => {
  it('300 events, N 8–24, mixed fees, forfeits, double forfeits, withdrawals and shootouts', () => {
    let completed = 0;
    let unresolved = 0;
    let withByeShootout = 0;
    for (let i = 0; i < 300; i += 1) {
      const n = 8 + (i % 17);
      const fee = FEES[i % FEES.length];
      const { s, op } = startedEvent(n, { fee, tables: 1 + (i % 6), seed: 5000 + i });
      const label = `event ${i} n=${n} fee=${fee}`;
      let state = s;
      if (i % 5 === 0) state = E.withdrawPlayer(state, state.players[i % n].id, op());
      state = chaosPhase(state, op, 'qualifying', 3);
      state = E.lockQualifying(state, op());
      if (state.shootouts.some((x) => x.kind === 'bye') || state.qualification.byeTie) withByeShootout += 1;
      state = settleShootouts(state, op);
      if (state.shootouts.some((x) => x.kind === 'bye')) withByeShootout += 1;
      if (state.qualification.short) continue;
      checkInvariants(state, `${label} (bracket)`);
      state = E.confirmPlayoff(E.drawPlayoff(state, op()), op());
      checkInvariants(state, `${label} (confirmed)`);
      if (i % 7 === 0) {
        const id = state.qualification.qualifierIds[i % state.qualification.qualifierIds.length];
        state = E.withdrawPlayer(state, id, op());
      }
      state = chaosPhase(state, op, 'playoff', 5);
      const e = checkInvariants(state, `${label} (played)`);
      assert.deepEqual(E.computeEarnings(reload(state)), e, `${label}: reload gives the same money`);
      const champ = E.championshipStatus(state);
      if (champ.status === 'decided') {
        const done = E.completeShowdown(state, op());
        assert.equal(E.computeEarnings(done).paid, n * fee, label);
        assert.equal(E.reconciliationProblem(done), '');
        completed += 1;
      } else {
        assert.equal(champ.status, 'unresolved', label);
        assert.throws(() => E.completeShowdown(state, op()), /Championship unresolved/);
        assert.equal(e.paid, n * fee - e.championship, `${label}: only the held championship is unpaid`);
        unresolved += 1;
      }
    }
    assert.ok(completed > 200, `completed ${completed}`);
    assert.ok(unresolved > 0, 'the run includes unresolved championships');
    assert.ok(withByeShootout > 0, 'the run includes bye shootouts');
  });
});
