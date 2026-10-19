import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as E from './showdownEngine.js';
import { settleShootouts } from './showdownTestKit.js';
import { earningsDropDetails, previewReopenQualifying, previewReopenShootout, previewUndoFrom } from './operator/showdownEarningsDrop.js';
import { reopenQualifyingCopy } from './operator/showdownConfirmCopy.js';
import { v2Event, toV2Playoffs, play, score, rnd, win, isFinal, assertSound, totals } from './showdownV2TestKit.js';

function completedV2(n, seed) {
  let { s, op } = toV2Playoffs(n, { seed });
  s = play(s, op, 'playoff', (m, i, r) => score(win(5, 1)(r)));
  return { s: E.completeShowdown(s, op()), op };
}

/** A V2 event whose cutoff shootout has been decided (status bracket). */
function v2ShootoutDecided() {
  for (let seed = 1; seed <= 400; seed += 1) {
    const { s, op } = v2Event(12, { seed });
    const locked = E.lockQualifying(play(s, op, 'qualifying', (m, i, r) => score(rnd(3)(r))), op());
    if (locked.status === 'shootout' && locked.qualification.tie) return { s: settleShootouts(locked, op), op, locked };
  }
  throw new Error('no seed produced a cutoff shootout');
}

describe('V2 corrections, reopening and cash warnings', () => {
  it('a qualifying correction before lock re-derives racks; nothing is paid twice', () => {
    let { s, op } = v2Event(8, { seed: 11 });
    const m = E.readyMatches(s.matches).find((x) => x.phase === 'qualifying');
    s = E.recordResult(s, m.id, { score1: 3, score2: 2 }, op());
    s = E.recordResult(s, m.id, { score1: 3, score2: 0 }, op());
    const e = E.computeEarnings(s);
    assert.equal(e.byPlayer[m.p2].qualifyingRacks, 0);
    assert.equal(e.byPlayer[m.p1].qualifyingRacks, 3);
    assert.equal(e.paid, 3 + 5);
  });

  it('a playoff correction that lowers racks warns about the cash decrease; earnings follow', () => {
    let { s, op } = toV2Playoffs(14, { seed: 12 });
    const m = E.readyMatches(s.matches).find((x) => x.phase === 'playoff');
    s = E.recordResult(s, m.id, { score1: 5, score2: 4 }, op());
    const lower = () => E.recordResult(s, m.id, { score1: 5, score2: 0 }, {});
    const warn = earningsDropDetails(s, lower);
    assert.match(warn[0], /Earnings shown will go down for/);
    assert.match(warn[1], /settle the difference/);
    const after = lower();
    assert.equal(totals(s)[m.p2] - totals(after)[m.p2], 4, 'loser loses exactly the 4 corrected racks');
    assertSound(after);
    assert.deepEqual(earningsDropDetails(s, () => E.recordResult(s, m.id, { score1: 5, score2: 4 }, {})), [], 'no warning when nothing drops');
  });

  it('undoing the final after completion removes the champion bonus, warns, and pays it again on re-completion', () => {
    let { s, op } = completedV2(16, 13);
    const champ = s.championId;
    const bonus = E.computeEarnings(s).byPlayer[champ].championBonus;
    assert.ok(bonus > 0);
    const final = s.matches.find((m) => isFinal(s, m));
    const warn = earningsDropDetails(s, previewUndoFrom(s, final.id));
    assert.match(warn.join(' '), /Earnings shown will go down/);
    let undone = E.undoPlayoffFrom(s, final.id, 'RESET', op());
    assert.equal(undone.status, 'playoffs');
    assert.equal(E.computeEarnings(undone).byPlayer[champ].championBonus, 0, 'no bonus while the event is not complete');
    assertSound(undone);
    undone = play(undone, op, 'playoff', (m, i, r) => score(win(5, 1)(r)));
    undone = E.completeShowdown(undone, op());
    assertSound(undone);
  });

  it('reopening qualifying clears the V2 plan; relocking after a correction recomputes it from the new racks', () => {
    const { s, op } = completedV2(12, 14);
    const old = s.playoffPlan;
    assert.match(reopenQualifyingCopy(s).details.join(' '), /qualifying games won and the playoff game reserve/);
    assert.ok(earningsDropDetails(s, previewReopenQualifying(s)).length, 'reopening warns: playoff earnings and bonus go away');
    let r = E.reopenQualifying(s, 'RESET', op());
    assert.equal(r.playoffPlan, null);
    assert.equal(r.status, 'qualifying');
    const m = r.matches.find((x) => x.phase === 'qualifying' && x.result === 'played' && x.score1 + x.score2 < 5);
    const p1Won = m.winnerId === m.p1;
    const added = 5 - (m.score1 + m.score2);
    r = E.recordResult(r, m.id, { score1: p1Won ? 3 : 2, score2: p1Won ? 2 : 3 }, op());
    r = settleShootouts(E.lockQualifying(r, op()), op);
    assert.equal(r.playoffPlan.qualifyingRacks, old.qualifyingRacks + added);
    assert.equal(r.playoffPlan.budget, old.budget - added);
    assertSound(r);
  });

  it('reopening a shootout keeps the locked V2 payouts exactly as they were', () => {
    const { s, op, locked } = v2ShootoutDecided();
    assert.ok(locked.playoffPlan, 'V2 payouts are locked as soon as qualifying closes, even with a shootout pending');
    const plan = s.playoffPlan;
    assert.equal(plan.lockedAt, locked.playoffPlan.lockedAt, 'deciding the shootout did not relock');
    assert.ok(earningsDropDetails(s, previewReopenShootout(s)).length === 0, 'nothing drops: no bracket yet');
    let r = E.reopenShootout(s, 'RESET', op());
    assert.deepEqual({ ...r.playoffPlan, qualifierIds: [] }, { ...plan, qualifierIds: [] });
    r = settleShootouts(r, op);
    assert.equal(r.playoffPlan.lockedAt, plan.lockedAt);
    assert.equal(r.playoffPlan.budget, plan.budget);
    assertSound(r);
  });
});
