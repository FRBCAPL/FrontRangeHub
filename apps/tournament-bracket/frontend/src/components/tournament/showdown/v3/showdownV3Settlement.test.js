import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { v3Event, playQualifying, qualify, playPlayoffs, earnings } from './showdownV3TestKit.js';
import { splitHalfUnits, splitUnits } from './showdownV3Settlement.js';
import { v3UnitCents } from './showdownV3Rules.js';
import { v3AdjustmentAudit } from './showdownV3Adjustments.js';
import { v3InterruptedResult } from './showdownV3Results.js';

const cfg = (entrants, extra = {}) => ({ entrants, entryFee: 50, qualifyingGames: 7, playoffRaceTo: 5, seed: 7, ...extra });

function run(config, { quits, script, withdrawnIds = [] } = {}) {
  const ev = qualify(playQualifying(v3Event(config), { quits }), withdrawnIds);
  return playPlayoffs(ev, script);
}

const sum = (rows, f) => Object.values(rows).reduce((s, r) => s + r[f], 0);

describe('V3 settlement', () => {
  it('normal completion pays the whole pool; the champion takes the remainder as the bonus', () => {
    const ev = run(cfg(16));
    const { settlement: s, status } = earnings(ev, { outcome: 'completed' });
    assert.equal(s.ok, true, s.problems.join('; '));
    assert.equal(s.paidCents, ev.plan.poolCents);
    assert.deepEqual(s.bonusRecipients, [status.championId]);
    assert.equal(s.rows[status.championId].settlementCents, s.remainderCents);
    assert.equal(sum(s.rows, 'byeCents'), ev.plan.byes * ev.plan.ladder.bye * 100);
  });

  it('in progress, the remainder is held and nothing is over-paid', () => {
    const ev = qualify(playQualifying(v3Event(cfg(13))));
    const { settlement: s } = earnings(ev, { outcome: 'in-progress' });
    assert.equal(s.ok, true, s.problems.join('; '));
    assert.equal(s.paidCents + s.heldCents, ev.plan.poolCents);
  });

  it('walkovers pay the match win but no unplayed games; mid-match walkovers keep the games played', () => {
    const base = qualify(playQualifying(v3Event(cfg(8))));
    const quitter = base.qualifierIds[0];
    const ev = playPlayoffs(base, { quitAt: { [quitter]: 'semifinal' } });
    const sf = ev.playoffs.find((m) => m.result === 'walkover');
    assert.ok(sf && sf.loserId === quitter);
    assert.equal(sf.score1 + sf.score2, 0);
    const { playoffs, settlement } = earnings(ev, { outcome: 'completed', withdrawnIds: [quitter] });
    assert.ok(playoffs.rows[sf.winnerId].matchWinCents >= ev.plan.ladder.perRound.semifinal * 100);
    assert.equal(settlement.ok, true, settlement.problems.join('; '));

    const ev2 = playPlayoffs(qualify(playQualifying(v3Event(cfg(8, { seed: 11 })))), { quitAt: {}, midMatch: true });
    assert.equal(earnings(ev2, { outcome: 'completed' }).settlement.ok, true);
  });

  it('champion by walkover is paid the championship; a double-forfeit semifinal leaves an empty final position', () => {
    const base = qualify(playQualifying(v3Event(cfg(8, { seed: 3 }))));
    const ev = playPlayoffs(base, { quitAt: Object.fromEntries(base.qualifierIds.map((id) => [id, 'semifinal'])) });
    // everyone quit: abandonment
    const { settlement: a } = earnings(ev, { outcome: 'abandoned', withdrawnIds: base.qualifierIds });
    assert.equal(a.ok, true, a.problems.join('; '));
    assert.equal(a.unawardedCents, a.remainderCents);
    assert.ok(a.unawardedCents > 0 && a.disclosures[0].startsWith('Exception'));
    assert.equal(a.paidCents + a.unawardedCents, ev.plan.poolCents);
    assert.equal(sum(a.rows, 'settlementCents'), 0);

    const sf1 = ev.playoffs.find((m) => m.id === 'sf1');
    const pair = [sf1.p1, sf1.p2];
    const ev2 = playPlayoffs(base, { quitAt: { [pair[0]]: 'semifinal', [pair[1]]: 'semifinal' } });
    const final = ev2.playoffs.find((m) => m.roundKey === 'final');
    assert.equal(final.result, 'champion-walkover');
    const { settlement: c, playoffs } = earnings(ev2, { outcome: 'completed', withdrawnIds: pair });
    assert.equal(c.ok, true, c.problems.join('; '));
    assert.equal(playoffs.rows[final.winnerId].matchWinCents, (ev.plan.ladder.perRound.semifinal + ev.plan.ladder.perRound.final) * 100);
  });

  for (const [legacy, unit] of [[false, 25], [true, 50]]) {
    it(`an interrupted final splits the remainder between the finalists in ${unit}\u00a2 units, higher seed first (${legacy ? 'original' : 'equal-rate'} plan)`, () => {
      const ev = run(cfg(18, { seed: 5, legacy }), { script: { interruptAt: 'final' } });
      assert.equal(v3UnitCents(ev.plan), unit);
      const e = earnings(ev, { outcome: 'interrupted-final' });
      const s = e.settlement;
      assert.equal(s.ok, true, s.problems.join('; '));
      assert.equal(s.bonusRecipients.length, 2);
      const [hi, lo] = s.bonusRecipients;
      assert.ok(ev.qualifierIds.indexOf(hi) < ev.qualifierIds.indexOf(lo));
      const diff = s.rows[hi].settlementCents - s.rows[lo].settlementCents;
      assert.ok(diff === 0 || diff === unit);
      assert.ok(Object.values(s.rows).every((r) => r.settlementCents % unit === 0));
      assert.equal(s.paidCents, ev.plan.poolCents);
      assert.equal(earnings(ev, { outcome: 'completed' }).settlement.ok, false, 'there is no champion');
    });
  }

  it('a player who withdraws during qualifying keeps every qualifying game they won', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const quitter = 'P3';
      const ev = run(cfg(16, { seed }), { quits: { [quitter]: 1 }, withdrawnIds: [quitter] });
      const e = earnings(ev, { outcome: 'completed', withdrawnIds: [quitter] });
      assert.equal(e.settlement.ok, true, e.settlement.problems.join('; '));
      assert.ok(!ev.qualifierIds.includes(quitter));
      const won = ev.qualifying.filter((m) => m.p1 === quitter || m.p2 === quitter)
        .reduce((sum, m) => sum + (m.p1 === quitter ? m.score1 : m.score2), 0);
      assert.equal(e.qualifying.rows[quitter].totalCents, won * ev.plan.rates.r1, `seed ${seed}`);
      assert.equal(e.settlement.rows[quitter].totalCents, won * ev.plan.rates.r1, `seed ${seed}`);
      assert.equal(e.settlement.paidCents, ev.plan.poolCents);
    }
  });

  it('an original-formula event still settles to the cent with its own rates and ladder', () => {
    const ev = run(cfg(16, { legacy: true }));
    assert.equal(ev.plan.formula, undefined);
    assert.deepEqual(ev.plan.rates, { r1: 200, r2: 300, playoff: 300 });
    const { settlement: s, status } = earnings(ev, { outcome: 'completed' });
    assert.equal(s.ok, true, s.problems.join('; '));
    assert.equal(s.paidCents, ev.plan.poolCents);
    assert.deepEqual(s.bonusRecipients, [status.championId]);
  });

  it('an interruption before the final splits among the players still alive (approved rule, nothing pending)', () => {
    const ev = run(cfg(20, { seed: 9 }), { script: { interruptAt: 'semifinal' } });
    const { settlement: s, status } = earnings(ev, { outcome: 'interrupted' });
    assert.equal(s.ok, true, s.problems.join('; '));
    assert.equal(status.aliveIds.length, 4);
    assert.deepEqual(s.pendingApproval, []);
    assert.equal(s.proposedOperatorRetainedCents, 0);
    assert.equal(s.paidCents, ev.plan.poolCents);
  });

  it('an interruption during qualifying splits among everyone still entered', () => {
    const ev = v3Event(cfg(9));
    playQualifying(ev);
    ev.qualifying = ev.qualifying.map((m, i) => (i > 4 ? { ...m, status: 'waiting', result: null, score1: null, score2: null } : m));
    ev.qualifying[5] = v3InterruptedResult(ev.qualifying[5], 2, 1, { games: 7 }, 'now');
    const { settlement: s } = earnings({ ...ev, qualifierIds: [] }, { outcome: 'interrupted', withdrawnIds: ['P1'] });
    assert.equal(s.ok, true, s.problems.join('; '));
    assert.equal(s.bonusRecipients.length, 8);
    assert.equal(s.paidCents, ev.plan.poolCents);
  });

  it('a withdrawn finalist cannot be settled as an interrupted final', () => {
    const ev = run(cfg(10, { seed: 2 }), { script: { interruptAt: 'final' } });
    const final = ev.playoffs.find((m) => m.roundKey === 'final');
    const { settlement: s } = earnings(ev, { outcome: 'interrupted-final', withdrawnIds: [final.p1] });
    assert.equal(s.ok, false);
  });

  it('splits are exact in 50\u00a2 units', () => {
    assert.deepEqual(splitHalfUnits(350, ['a', 'b']), { a: 200, b: 150 });
    assert.deepEqual(splitHalfUnits(300, ['a', 'b', 'c']), { a: 100, b: 100, c: 100 });
    assert.deepEqual(splitHalfUnits(250, ['a', 'b', 'c']), { a: 100, b: 100, c: 50 });
  });

  it('splits are exact in 25\u00a2 units, extra units to the earliest recipients', () => {
    assert.deepEqual(splitUnits(175, ['a', 'b'], 25), { a: 100, b: 75 });
    assert.deepEqual(splitUnits(75, ['a', 'b', 'c', 'd'], 25), { a: 25, b: 25, c: 25, d: 0 });
    assert.deepEqual(splitUnits(325, ['a', 'b', 'c'], 25), { a: 125, b: 100, c: 100 });
    for (let cents = 0; cents <= 2500; cents += 25) {
      for (let n = 1; n <= 8; n += 1) {
        const parts = Object.values(splitUnits(cents, Array.from({ length: n }, (_, i) => `p${i}`), 25));
        assert.equal(parts.reduce((a, b) => a + b, 0), cents);
        assert.ok(parts.every((c) => c % 25 === 0) && Math.max(...parts) - Math.min(...parts) <= 25);
      }
    }
  });
});

describe('V3 operator adjustments', () => {
  const by = 'operator-1'; const at = '2026-10-18T12:00:00Z';

  it('are funded from the remainder, audited, and never exceed the pool', () => {
    const ev = run(cfg(12));
    const before = earnings(ev, { outcome: 'completed' }).settlement;
    const champ = before.bonusRecipients[0];
    const other = ev.playerIds.find((id) => id !== champ);
    const adj = { id: 'a1', playerId: other, amountCents: 500, reason: 'Scoring error in q3', by, at };
    const after = earnings(ev, { outcome: 'completed', adjustments: [adj] }).settlement;
    assert.equal(after.ok, true, after.problems.join('; '));
    assert.equal(after.rows[other].adjustmentCents, 500);
    assert.equal(after.rows[champ].settlementCents, before.rows[champ].settlementCents - 500);
    assert.equal(after.paidCents, ev.plan.poolCents);
    assert.deepEqual(v3AdjustmentAudit(adj).details.fundedFrom, 'remainder');

    const tooBig = { ...adj, id: 'a2', amountCents: before.remainderCents + 50 };
    const bad = earnings(ev, { outcome: 'completed', adjustments: [tooBig] }).settlement;
    assert.equal(bad.ok, false);
    assert.match(bad.problems[0], /left undistributed/);
  });

  it('never reduce earned pay; reject missing reasons and odd cents; a negative entry only takes back an earlier adjustment', () => {
    const ev = run(cfg(12, { seed: 4 }));
    const p = earnings(ev, { outcome: 'completed' }).status.championId;
    const entry = (adj, id = 'x') => ({ id, playerId: p, by, at, reason: 'r', ...adj });
    const check = (...adjs) => earnings(ev, { outcome: 'completed', adjustments: adjs }).settlement;
    assert.match(check(entry({ amountCents: -50 })).problems[0], /Earned pay cannot be reduced/);
    assert.match(check(entry({ amountCents: -1000000, acknowledgedReduction: true })).problems[0], /Earned pay cannot be reduced/);
    assert.match(check(entry({ amountCents: 50, reason: ' ' })).problems[0], /reason/);
    assert.match(check(entry({ amountCents: 10 })).problems[0], /multiple of 25\u00a2/);
    assert.equal(check(entry({ amountCents: 25 })).ok, true);
    const takeBack = check(entry({ amountCents: 100 }, 'a'), entry({ amountCents: -100 }, 'b'));
    assert.equal(takeBack.ok, true, takeBack.problems.join('; '));
    assert.match(check(entry({ amountCents: 100 }, 'a'), entry({ amountCents: -150 }, 'b')).problems[0], /Earned pay cannot be reduced/);
  });

  it('an original-formula event keeps 50\u00a2 adjustment steps', () => {
    const ev = run(cfg(12, { seed: 4, legacy: true }));
    const p = earnings(ev, { outcome: 'completed' }).status.championId;
    const check = (amountCents) => earnings(ev, { outcome: 'completed', adjustments: [{ id: 'x', playerId: p, by, at, reason: 'r', amountCents }] }).settlement;
    assert.match(check(25).problems[0], /An adjustment must be a non-zero multiple of 50\u00a2\./);
    assert.equal(check(50).ok, true);
  });
});
