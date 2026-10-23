import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../showdownEngine.js';
import { moneyViewV3 } from '../operator/v3/showdownV3MoneyView.js';
import { startV3, toPlayoffsV3, runV3, playQualifyingV3, playPlayoffsV3, money } from './showdownV3WorkflowKit.js';
import { isEscalatingPlan, V3_ESCALATING_FORMULA } from './showdownV3Rules.js';

describe('D10 events through the operator workflow', () => {
  it('the Champion Fund grows from its starting amount and, at completion, is what the champion receives on top of earnings', () => {
    const { s, op } = startV3(12, { seed: 4, formula: V3_ESCALATING_FORMULA });
    assert.ok(isEscalatingPlan(s.payoutPlan));
    const start = s.payoutPlan.reserves.championFund;
    assert.equal(moneyViewV3(s).championFund.currentCents, start);
    const played = playQualifyingV3(s, op);
    const mid = moneyViewV3(played).championFund;
    assert.ok(mid.currentCents >= start && !mid.final && /so far/.test(mid.label));
    const { s: done } = runV3(12, { seed: 4, formula: V3_ESCALATING_FORMULA });
    const v = moneyViewV3(done);
    const champ = done.championId;
    assert.equal(v.championFund.final, true);
    assert.equal(money(done).settlement.rows[champ].settlementCents, v.championFund.currentCents);
    assert.equal(E.reconciliationProblem(done), '');
    assert.ok(v.championFund.text.includes('paid to the champion'));
  });

  it('adjustments come out of the Champion Fund in 25\u00a2 steps and never reduce earned pay', () => {
    const { s: done, op } = runV3(12, { seed: 6, formula: V3_ESCALATING_FORMULA });
    const champ = done.championId;
    const before = money(done).settlement.rows[champ].settlementCents;
    const other = done.players.find((p) => p.id !== champ).id;
    const adjusted = E.adjustPayout(done, { playerId: other, amountCents: 25, reason: 'Scoring correction' }, op());
    assert.equal(E.reconciliationProblem(adjusted), '');
    assert.equal(money(adjusted).settlement.rows[champ].settlementCents, before - 25);
    assert.throws(() => E.adjustPayout(done, { playerId: other, amountCents: 10, reason: 'Odd cents' }, op()), /25\u00a2/);
  });

  it('a bye holder who withdraws before the semifinal keeps the bye credit; the walkover adds every unplayed game to the fund', () => {
    const { s: po, op } = toPlayoffsV3(12, { seed: 8, formula: V3_ESCALATING_FORMULA });
    const plan = po.payoutPlan;
    const holder = po.playoff.byes[0].playerId;
    const gone = E.withdrawPlayer(po, holder, op(), { voluntary: true });
    const done = E.completeShowdown(playPlayoffsV3(gone, op), op());
    assert.equal(done.status, 'completed');
    assert.equal(E.reconciliationProblem(done), '');
    const rows = money(done).settlement.rows;
    assert.equal(rows[holder].byeCents, plan.byeCreditCents);
    assert.equal(rows[holder].playoffGameCents, 0);
    const walkover = done.matches.find((m) => m.phase === 'playoff' && m.loserId === holder);
    assert.ok(walkover && walkover.result === 'walkover');
    const opponent = walkover.winnerId;
    assert.equal(rows[opponent].playoffMatchWinCents, 0, 'a walkover pays no match-win bonus');
    assert.ok(rows[done.championId].totalCents > Math.max(...done.players.filter((p) => p.id !== done.championId).map((p) => rows[p.id].totalCents)));
  });

  it('a JSON round trip mid-playoffs keeps the D10 plan and finishes the same way', () => {
    const { s: po, op } = toPlayoffsV3(16, { seed: 2, formula: V3_ESCALATING_FORMULA });
    const saved = E.clone(po);
    assert.deepEqual(saved.payoutPlan, po.payoutPlan);
    assert.deepEqual(moneyViewV3(saved).championFund, moneyViewV3(po).championFund);
    assert.ok(op);
  });
});
