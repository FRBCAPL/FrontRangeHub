import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as E from './showdownEngine.js';
import { playoffTemplate } from './showdownPlayoffTemplates.js';
import { FIELD_RULES } from './showdownFieldRules.js';
import { FEES, SIZES, toV2Playoffs, play, score, win, rnd, assertSound, totals } from './showdownV2TestKit.js';

const SCENARIOS = {
  'every match as close as possible': { q: (m, i, r) => score(win(3, 2)(r)), p: (m, i, r) => score(win(5, 4)(r)) },
  'every match a shutout': { q: (m, i, r) => score(win(3, 0)(r)), p: (m, i, r) => score(win(5, 0)(r)) },
  random: { q: (m, i, r) => score(rnd(3)(r)), p: (m, i, r) => score(rnd(5)(r)) },
};

function assertEscalates(ladder, label) {
  const t = playoffTemplate(ladder.templateId);
  const amounts = t.rounds.map((r) => ladder.perRound[r.key]);
  assert.ok(amounts[0] >= 1, `${label} opening win pays at least $1`);
  for (let i = 1; i < amounts.length; i += 1) assert.ok(amounts[i] > amounts[i - 1], `${label} ${amounts.join('/')} must rise each round`);
  if (t.byes) {
    assert.equal(ladder.bye, Math.floor(ladder.perRound[t.byeRoundKey] / 2), `${label} bye is half an opening win`);
    assert.ok(ladder.bye < ladder.perRound[t.byeRoundKey]);
  }
  assert.deepEqual(E.ladderProblems(ladder), [], label);
}

describe('V2 financial matrix: 8–24 entrants at $20, $25, $30, $50, $100, $200', () => {
  for (const [name, sc] of Object.entries(SCENARIOS)) {
    it(`${name}: valid escalating ladder, exact reconciliation, no negatives, nothing paid early`, () => {
      for (const n of SIZES) for (const fee of FEES) {
        const label = `N=${n} $${fee}`;
        let { s, op } = toV2Playoffs(n, { fee, seed: n * 7 + fee, q: sc.q });
        assertEscalates(s.playoffPlan, label);
        assert.equal(s.playoffPlan.rackReserve, 9 * E.scheduledPlayoffMatches(s.payoutPlan.templateId));
        let prev = totals(s);
        s = play(s, op, 'playoff', sc.p, (next) => {
          assertSound(next, label);
          const now = totals(next);
          Object.keys(prev).forEach((id) => assert.ok(now[id] >= prev[id], `${label} ${id} dropped while results were added`));
          prev = now;
          return next;
        });
        const before = assertSound(s, label);
        assert.equal(Object.values(before.byPlayer).reduce((x, r) => x + r.championBonus, 0), 0, `${label} no bonus before completion`);
        s = E.completeShowdown(s, op());
        const e = assertSound(s, label);
        assert.equal(e.byPlayer[s.championId].championBonus, before.championBonus, `${label} champion gets exactly the held bonus`);
      }
    });
  }

  it('worst case (most qualifying racks) is funded with an escalating ladder for every size and fee', () => {
    for (const n of SIZES) for (const fee of FEES) {
      const plan = E.buildPayoutPlan({ entrants: n, entryFee: fee });
      const preview = E.estimatePlayoffPlanV2(plan);
      assertEscalates(preview, `N=${n} $${fee} low`);
      assertEscalates(E.playoffLadder(plan.templateId, preview.range.high.budget), `N=${n} $${fee} high`);
      assert.ok(preview.range.low.budget <= preview.range.high.budget);
    }
  });

  it('every reachable budget, every whole fee $20–$200, produces a strictly escalating ladder', () => {
    for (const n of SIZES) for (let fee = 20; fee <= 200; fee += 1) {
      const plan = E.buildPayoutPlan({ entrants: n, entryFee: fee });
      const top = plan.pool - n * plan.q - E.rackReserveFor(plan.templateId);
      for (let b = top - 5 * n; b <= top; b += 1) assertEscalates(E.playoffLadder(plan.templateId, b), `N=${n} $${fee} budget ${b}`);
    }
  });

  it('covers every supported playoff size and bye layout', () => {
    const seen = new Set();
    for (const rule of FIELD_RULES) {
      const { s } = toV2Playoffs(rule.min, { seed: rule.min });
      const t = playoffTemplate(s.payoutPlan.templateId);
      assert.equal(s.playoff.byes.length, t.byes);
      assert.equal(s.payoutPlan.qualifiers, t.size);
      seen.add(`${t.id}:${t.byes}`);
    }
    assert.deepEqual([...seen].sort(), ['p4:0', 'p5:3', 'p6:2', 'p7:1', 'p8:0']);
  });
});
