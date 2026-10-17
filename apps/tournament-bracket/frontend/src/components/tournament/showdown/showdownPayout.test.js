import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPayoutPlan, playoffLadder, ladderTotal, ladderProblems, entryFeeProblem, qualifyingWinPay } from './showdownPayout.js';
import { buildPlayoffPlan, qualificationTopUps, estimatePlayoffPlan } from './showdownPlayoffPlan.js';
import { playoffTemplate } from './showdownPlayoffTemplates.js';

const FEES = [20, 21, 22, 23, 25, 27, 30, 33, 35, 40, 45, 50, 55, 60, 75, 99, 100, 125, 150, 200, 250, 500];
const FIELD = [[8, 11, 4, 'p4', 0], [12, 13, 5, 'p5', 3], [14, 15, 6, 'p6', 2], [16, 17, 7, 'p7', 1], [18, 24, 8, 'p8', 0]];

describe('showdown payout — field sizes', () => {
  FIELD.forEach(([min, max, k, templateId, byes]) => {
    it(`${min}–${max} entrants: ${k} qualifiers, ${byes} bye(s)`, () => {
      for (let n = min; n <= max; n += 1) {
        const plan = buildPayoutPlan({ entrants: n, entryFee: 20 });
        assert.equal(plan.qualifiers, k);
        assert.equal(plan.templateId, templateId);
        assert.equal(plan.byes, byes);
        assert.equal(plan.pool, n * 20);
        assert.equal(plan.qualifyingMatches, n);
      }
    });
  });

  it('5–7 qualifier fields use an 8-position bracket with no extra round', () => {
    [['p5', 1, 3], ['p6', 2, 2], ['p7', 3, 1], ['p8', 4, 0]].forEach(([id, qf, byes]) => {
      const t = playoffTemplate(id);
      assert.equal(t.positions, 8);
      assert.deepEqual(t.rounds.map((r) => [r.key, r.matches]), [['quarterfinal', qf], ['semifinal', 2], ['final', 1]]);
      assert.equal(t.byes, byes);
      assert.equal(qf * 2 + byes, t.size);
    });
    assert.deepEqual(playoffTemplate('p4').rounds.map((r) => [r.key, r.matches, r.weightX100]), [['semifinal', 2, 100], ['final', 1, 125]]);
  });
});

describe('showdown payout — qualifying pay and top-ups', () => {
  it('qualifying win pays floor(fee × 0.25)', () => {
    [[20, 5], [21, 5], [23, 5], [24, 6], [25, 6], [30, 7], [40, 10], [50, 12], [99, 24], [100, 25], [200, 50]].forEach(([fee, q]) => {
      assert.equal(qualifyingWinPay(fee), q);
      assert.equal(buildPayoutPlan({ entrants: 10, entryFee: fee }).q, q);
    });
  });

  it('tops each qualifier up to the entry fee and never reduces winnings', () => {
    assert.deepEqual(qualificationTopUps(20, ['a', 'b', 'c', 'd'], { a: 0, b: 5, c: 10, d: 25 }), { a: 20, b: 15, c: 10, d: 0 });
    assert.deepEqual(qualificationTopUps(100, ['x'], { x: 50 }), { x: 50 });
    assert.deepEqual(qualificationTopUps(30, ['x'], {}), { x: 30 });
  });

  it('playoff budget = pool − qualifying payouts − top-ups', () => {
    const payoutPlan = buildPayoutPlan({ entrants: 10, entryFee: 20 });
    const p = buildPlayoffPlan({ payoutPlan, qualifierIds: ['a', 'b', 'c', 'd'], winningsById: { a: 10, b: 10, c: 5, d: 0 } });
    assert.deepEqual(p.topUps, { a: 10, b: 10, c: 15, d: 20 });
    assert.equal(p.topUpTotal, 55);
    assert.equal(p.budget, 200 - 50 - 55);
    assert.equal(ladderTotal(p), p.budget);
    assert.equal(p.doubleForfeitTransfer, 0);
  });

  it('Q not paid for a qualifying double forfeit is held for the championship, not the ladder', () => {
    const payoutPlan = buildPayoutPlan({ entrants: 10, entryFee: 20 });
    const args = { payoutPlan, qualifierIds: ['a', 'b', 'c', 'd'], winningsById: { a: 10, b: 10, c: 5, d: 5 } };
    const clean = buildPlayoffPlan(args);
    const withDf = buildPlayoffPlan({ ...args, qualifyingPaid: 45 });
    assert.equal(withDf.budget, clean.budget);
    assert.deepEqual(withDf.perRound, clean.perRound);
    assert.equal(withDf.doubleForfeitTransfer, 5);
    assert.equal(withDf.qualifyingPaid + withDf.doubleForfeitTransfer + withDf.topUpTotal + withDf.budget, 200);
  });
});

describe('showdown payout — ladder rules', () => {
  it('weights: 4-player 1.0 / 1.25; 5–8-player 1.0 / 1.2 / 1.6', () => {
    const p4 = playoffLadder('p4', 3250);
    assert.deepEqual(p4.perRound, { semifinal: 1000, final: 1250 });
    const p8 = playoffLadder('p8', 8000);
    assert.deepEqual(p8.perRound, { quarterfinal: 1000, semifinal: 1200, final: 1600 });
    // p5: 1 QF + 3 half-value byes + 2 SF + 1 F = 1 + 1.5 + 2.4 + 1.6 = 6.5 units
    const p5 = playoffLadder('p5', 6500);
    assert.deepEqual(p5.perRound, { quarterfinal: 1000, semifinal: 1200, final: 1600 });
    assert.equal(p5.bye, 500);
  });

  it('rounding dollars go to the championship', () => {
    const l = playoffLadder('p6', 101);
    const template = playoffTemplate('p6');
    const d2 = 2 * (2 * 100 + 2 * 120 + 160) + 2 * 100;
    assert.equal(l.perRound.quarterfinal, Math.floor((2 * 101 * 100) / d2));
    assert.equal(l.perRound.semifinal, Math.floor((2 * 101 * 120) / d2));
    assert.equal(l.bye, Math.floor(l.perRound.quarterfinal / 2));
    assert.equal(l.finalRemainder, l.perRound.final - l.finalBase);
    assert.equal(ladderTotal(l), 101);
    assert.equal(template.rounds.length, 3);
  });

  it('refuses a budget that cannot meet the rules instead of bending them', () => {
    assert.throws(() => playoffLadder('p5', 5), /cannot meet the approved rules/);
    assert.throws(() => playoffLadder('p8', -1), /at least \$0/);
    assert.throws(() => playoffLadder('p4', 10.5), /whole number/);
  });

  it('ladderProblems catches every broken rule', () => {
    const ok = playoffLadder('p6', 400);
    assert.deepEqual(ladderProblems(ok), []);
    assert.match(ladderProblems({ ...ok, bye: ok.perRound.quarterfinal }).join(' '), /half an opening win|less than an opening win/);
    assert.match(ladderProblems({ ...ok, perRound: { ...ok.perRound, semifinal: ok.perRound.quarterfinal } }).join(' '), /more than quarterfinal/);
    assert.match(ladderProblems({ ...ok, budget: ok.budget + 1 }).join(' '), /playoff budget/);
  });
});

/**
 * Every qualifier win spread (a × 2 wins, b × 1 win, c × 0 wins) and every number of paying
 * qualifying wins the spread allows (the rest are double forfeits). This includes spreads real
 * circles cannot produce, so the rules are checked against more budgets than an event can reach.
 */
function* budgets(n, fee) {
  const payoutPlan = buildPayoutPlan({ entrants: n, entryFee: fee });
  const k = payoutPlan.qualifiers;
  for (let a = 0; a <= k; a += 1) {
    for (let b = 0; a + b <= k; b += 1) {
      const ids = Array.from({ length: k }, (_, i) => `q${i}`);
      const winningsById = Object.fromEntries(ids.map((id, i) => [id, (i < a ? 2 : i < a + b ? 1 : 0) * payoutPlan.q]));
      for (let wins = 2 * a + b; wins <= n; wins += 1) {
        yield { payoutPlan, ids, winningsById, wins };
      }
    }
  }
}

describe('showdown payout — every field and fee', () => {
  it('every N 8–24 × fee × win spread: whole dollars, increasing, half-value byes, 100% of the pool', () => {
    let checked = 0;
    for (let n = 8; n <= 24; n += 1) {
      for (const fee of FEES) {
        for (const { payoutPlan, ids, winningsById, wins } of budgets(n, fee)) {
          const p = buildPlayoffPlan({ payoutPlan, qualifierIds: ids, winningsById, qualifyingPaid: wins * payoutPlan.q });
          const label = `n=${n} fee=${fee} wins=${wins}`;
          assert.deepEqual(ladderProblems(p), [], label);
          assert.equal(p.doubleForfeitTransfer, (n - wins) * payoutPlan.q, label);
          assert.equal(wins * payoutPlan.q + p.doubleForfeitTransfer + p.topUpTotal + ladderTotal(p), n * fee, label);
          ids.forEach((id) => assert.ok(winningsById[id] + p.topUps[id] >= fee, label));
          const t = playoffTemplate(p.templateId);
          const amounts = t.rounds.map((r) => p.perRound[r.key]);
          amounts.slice(1).forEach((v, i) => assert.ok(v > amounts[i], label));
          if (t.byes) {
            assert.equal(p.bye, Math.floor(p.perRound.quarterfinal / 2), label);
            assert.ok(p.bye < p.perRound.quarterfinal, label);
          }
          assert.ok(p.finalRemainder >= 0, label);
          checked += 1;
        }
      }
    }
    assert.ok(checked > 50000, `checked ${checked}`);
  });

  it('matches exact rational math (no float drift)', () => {
    for (const id of ['p4', 'p5', 'p6', 'p7', 'p8']) {
      const t = playoffTemplate(id);
      const byeRound = t.rounds.find((r) => r.key === t.byeRoundKey);
      const d2 = t.rounds.reduce((s, r) => s + 2 * r.weightX100 * r.matches, 0) + (byeRound ? t.byes * byeRound.weightX100 : 0);
      for (let budget = 40; budget <= 5000; budget += 7) {
        const l = playoffLadder(id, budget);
        t.rounds.slice(0, -1).forEach((r) => {
          assert.equal(l.perRound[r.key] * d2 <= 2 * budget * r.weightX100, true);
          assert.equal((l.perRound[r.key] + 1) * d2 > 2 * budget * r.weightX100, true);
        });
      }
    }
  });

  it('setup estimate is a valid ladder for every N and fee', () => {
    for (let n = 8; n <= 24; n += 1) {
      for (const fee of FEES) {
        const e = estimatePlayoffPlan(buildPayoutPlan({ entrants: n, entryFee: fee }));
        assert.deepEqual(ladderProblems(e), []);
        assert.equal(e.estimate, true);
      }
    }
  });
});

describe('showdown payout — validation', () => {
  it('requires whole dollars of at least $20', () => {
    assert.ok(entryFeeProblem(19));
    assert.ok(entryFeeProblem(20.5));
    assert.equal(entryFeeProblem(20), '');
    assert.equal(entryFeeProblem(500), '');
  });

  it('refuses unsupported field sizes', () => {
    assert.throws(() => buildPayoutPlan({ entrants: 7, entryFee: 20 }), /at least 8/);
    assert.throws(() => buildPayoutPlan({ entrants: 25, entryFee: 20 }), /No approved Showdown rules/);
  });
});
