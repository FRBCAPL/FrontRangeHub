import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as E from './showdownEngine.js';
import { fourteenPlayerEvent, V1_TOTALS } from './showdownV2Fixture14.js';
import { moneyView, resultsView } from './operator/showdownBoardView.js';
import { legacyFormatProblem } from './showdownState.js';

const totals = (state) => Object.fromEntries(Object.entries(E.computeEarnings(state).byPlayer).map(([id, r]) => [id, r.total]));

describe('the real 14-player $20 event', () => {
  it('V1 (no payoutVersion field): still pays its original $280, $83 champion, every player unchanged', () => {
    const s = fourteenPlayerEvent(1);
    assert.equal(s.payoutVersion, undefined);
    assert.equal(E.payoutVersionOf(s), 1);
    assert.equal(legacyFormatProblem(s), '', 'completed V1 event is not treated as obsolete');
    const e = E.computeEarnings(s);
    assert.equal(e.paid, 280);
    assert.deepEqual(totals(s), V1_TOTALS);
    assert.equal(e.byPlayer.P10.topUp, 10, 'V1 top-ups still credited');
    assert.equal(E.reconciliationProblem(s), '');
    assert.equal(moneyView(s).payoutVersion, 1, 'V1 money view is the V1 one, labeled explicitly');
    assert.ok(moneyView(s).ladder.rows.some((r) => r.key === 'topUp'));
  });

  it('V2: $280 total, $83 champion, QF $14 / SF $17 / championship $28 / bye $7, $5 champion bonus', () => {
    const s = fourteenPlayerEvent(2);
    const plan = s.playoffPlan;
    assert.equal(plan.qualifyingRacks, 61);
    assert.equal(plan.rackReserve, 45);
    assert.equal(plan.budget, 280 - 70 - 61 - 45);
    assert.deepEqual(plan.perRound, { quarterfinal: 14, semifinal: 17, final: 28 });
    assert.equal(plan.bye, 7);
    const e = E.computeEarnings(s);
    assert.equal(e.paid, 280);
    assert.equal(e.playoffRacksPaid, 40);
    assert.equal(e.unusedReserve, 5);
    assert.equal(e.championBonus, 5);
    assert.equal(e.byPlayer.P10.total, 83);
    assert.deepEqual(
      { qr: e.byPlayer.P10.qualifyingRacks, q: e.byPlayer.P10.qualifying, pr: e.byPlayer.P10.playoffRacks, p: e.byPlayer.P10.playoff, bye: e.byPlayer.P10.bye, bonus: e.byPlayer.P10.championBonus },
      { qr: 6, q: 10, pr: 10, p: 17 + 28, bye: 7, bonus: 5 },
    );
    assert.deepEqual(totals(s), { P10: 83, P2: 55, P14: 32, P9: 26, P7: 12, P13: 13, P1: 10, P3: 9, P4: 9, P5: 10, P11: 8, P12: 9, P6: 0, P8: 4 });
    assert.equal(E.reconciliationProblem(s), '');
    const v = moneyView(s);
    assert.equal(v.ladder.total, 280, 'payout schedule rows add up to the pool');
    assert.equal(resultsView(s).championBonus, 5);
  });

  it('V2 before completion holds the champion bonus: nothing is paid early and nothing is overpaid', () => {
    const s = { ...fourteenPlayerEvent(2), status: 'playoffs', championId: null, completedAt: null };
    const e = E.computeEarnings(s);
    assert.equal(e.byPlayer.P10.championBonus, 0);
    assert.equal(e.paid, 275);
    assert.equal(e.held, 5);
    assert.equal(E.reconciliationProblem(s), '', 'can be completed: paid + held bonus = pool');
  });
});
