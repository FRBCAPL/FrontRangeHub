import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as E from './showdownEngine.js';
import { startedEvent, playOpen, randomRace, settleShootouts, toBracket, toPlayoffs } from './showdownTestKit.js';

const match = (s, id) => s.matches.find((m) => m.id === id);
const finish = (s, op) => {
  let state = playOpen(s, op, 'qualifying', randomRace(3));
  if (state.status === 'qualifying') state = E.lockQualifying(state, op());
  state = settleShootouts(state, op);
  if (state.status === 'bracket') state = E.confirmPlayoff(E.drawPlayoff(state, op()), op());
  state = playOpen(state, op, 'playoff', randomRace(5));
  return E.completeShowdown(state, op());
};

describe('qualifying forfeits', () => {
  it('a single forfeit is a 3–0 administrative win that pays Q and counts in stats', () => {
    const { s, op } = startedEvent(10);
    const m = match(s, 'q1');
    const next = E.recordForfeit(s, 'q1', [m.p1], op());
    const r = match(next, 'q1');
    assert.equal(r.result, 'forfeit');
    assert.equal(r.winnerId, m.p2);
    assert.equal(r.forfeitedBy[0], m.p1);
    assert.deepEqual([r.score1, r.score2], [0, 3]);
    const stats = E.standingsFor(next).stats;
    assert.equal(stats[m.p2].matchWins, 1);
    assert.equal(stats[m.p2].gamesWon, 3);
    assert.equal(stats[m.p1].gamesLost, 3);
    assert.equal(E.computeEarnings(next).byPlayer[m.p2].qualifying, next.payoutPlan.q);
    assert.equal(E.computeEarnings(next).byPlayer[m.p1].qualifying, 0);
  });

  it('a double forfeit pays nobody and moves Q to the championship', () => {
    const { s, op } = startedEvent(10);
    const m = match(s, 'q2');
    const next = E.recordForfeit(s, 'q2', [m.p1, m.p2], op());
    const r = match(next, 'q2');
    assert.equal(r.result, 'double-forfeit');
    assert.equal(r.winnerId, null);
    const stats = E.standingsFor(next).stats;
    [m.p1, m.p2].forEach((id) => assert.deepEqual([stats[id].matchWins, stats[id].gamesWon, stats[id].gamesLost], [0, 0, 0]));
    assert.equal(E.computeEarnings(next).doubleForfeits, 1);
    const locked = settleShootouts(E.lockQualifying(playOpen(next, op, 'qualifying', randomRace(3)), op()), op);
    const e = E.computeEarnings(locked);
    const plan = locked.playoffPlan;
    assert.equal(plan.qualifyingPaid, 9 * locked.payoutPlan.q);
    assert.equal(plan.doubleForfeitTransfer, locked.payoutPlan.q);
    assert.equal(plan.budget, 10 * 20 - 10 * locked.payoutPlan.q - plan.topUpTotal, 'the ladder is the same as without the double forfeit');
    assert.equal(e.championship, plan.perRound.final + locked.payoutPlan.q);
  });

  it('correcting a double forfeit reverses the championship adjustment automatically', () => {
    const { s, op } = startedEvent(10);
    const m = match(s, 'q2');
    const df = E.recordForfeit(s, 'q2', [m.p1, m.p2], op());
    const fixed = E.recordResult(df, 'q2', { score1: 3, score2: 1 }, op());
    assert.equal(E.computeEarnings(fixed).doubleForfeits, 0);
    const locked = settleShootouts(E.lockQualifying(playOpen(fixed, op, 'qualifying', randomRace(3)), op()), op);
    assert.equal(E.computeEarnings(locked).championship, locked.playoffPlan.perRound.final);
    assert.equal(locked.playoffPlan.doubleForfeitTransfer, 0);
    assert.ok(fixed.audit.some((a) => a.action === 'correct-result' && a.detail.from.result === 'double-forfeit'));
  });

  it('several double forfeits still reconcile to 100% at completion', () => {
    for (const n of [8, 13, 24]) {
      const { s, op } = startedEvent(n, { fee: 25, seed: n });
      let state = s;
      for (const id of ['q1', 'q3', 'q5']) {
        const m = match(state, id);
        state = E.recordForfeit(state, id, [m.p1, m.p2], op());
      }
      const done = finish(state, op);
      const e = E.computeEarnings(done);
      assert.equal(e.doubleForfeits, 3);
      assert.equal(e.paid, n * 25);
      assert.equal(e.byPlayer[done.championId].playoff >= done.playoffPlan.perRound.final + 3 * done.payoutPlan.q, true);
    }
  });
});

describe('withdrawals', () => {
  it('during qualifying: unfinished matches become forfeits, finished ones stand', () => {
    const { s, op } = startedEvent(10);
    const target = match(s, 'q1').p2;
    let state = E.recordResult(s, 'q1', { score1: 1, score2: 3 }, op());
    state = E.withdrawPlayer(state, target, op());
    assert.equal(match(state, 'q1').result, 'played');
    const other = state.matches.find((m) => m.id !== 'q1' && (m.p1 === target || m.p2 === target));
    assert.equal(other.result, 'forfeit');
    assert.equal(other.auto, 'withdrawal');
    assert.deepEqual(other.forfeitedBy, [target]);
    const done = finish(state, op);
    assert.ok(!done.qualification.qualifierIds.includes(target));
    assert.equal(E.computeEarnings(done).paid, 10 * 20);
    assert.equal(E.finalStandings(done).find((r) => r.playerId === target).note, 'Withdrew');
  });

  it('a forfeit win already awarded stands when the winner later withdraws', () => {
    const { s, op } = startedEvent(10);
    const m = match(s, 'q4');
    let state = E.withdrawPlayer(s, m.p1, op());
    assert.equal(match(state, 'q4').winnerId, m.p2);
    state = E.withdrawPlayer(state, m.p2, op());
    const r = match(state, 'q4');
    assert.equal(r.result, 'forfeit');
    assert.equal(r.winnerId, m.p2);
    assert.deepEqual([r.score1, r.score2], [0, 3]);
    assert.equal(E.computeEarnings(state).byPlayer[m.p2].qualifying, state.payoutPlan.q);
    assert.equal(E.computeEarnings(state).doubleForfeits, 0);
  });

  it('a played result already recorded stands when either player withdraws', () => {
    const { s, op } = startedEvent(10);
    const m = match(s, 'q2');
    let state = E.recordResult(s, 'q2', { score1: 3, score2: 1 }, op());
    state = E.withdrawPlayer(state, m.p1, op());
    state = E.withdrawPlayer(state, m.p2, op());
    const r = match(state, 'q2');
    assert.equal(r.result, 'played');
    assert.equal(r.winnerId, m.p1);
    assert.equal(E.computeEarnings(state).byPlayer[m.p1].qualifying, state.payoutPlan.q);
  });

  it('reinstating clears only the forfeits that withdrawal created', () => {
    const { s, op } = startedEvent(10);
    const m = match(s, 'q4');
    let state = E.withdrawPlayer(s, m.p1, op());
    state = E.withdrawPlayer(state, m.p2, op());
    state = E.reinstatePlayer(state, m.p1, op());
    const r = match(state, 'q4');
    assert.equal(r.result, 'forfeit', 'the cleared match is re-forfeited by the player still withdrawn');
    assert.equal(r.winnerId, m.p1);
    const p1Others = state.matches.filter((x) => x.id !== 'q4' && x.phase === 'qualifying' && (x.p1 === m.p1 || x.p2 === m.p1));
    p1Others.forEach((x) => assert.equal(x.status, 'waiting'));
  });

  it('before bracket confirmation: the next eligible player fills the vacancy', () => {
    const { s, op } = toBracket(12, { seed: 5 });
    const drawn = E.drawPlayoff(s, op());
    const leaving = s.qualification.qualifierIds[0];
    const next = E.withdrawPlayer(drawn, leaving, op());
    assert.equal(next.playoff, null, 'unconfirmed draw is cleared');
    const settled = settleShootouts(next, op);
    assert.equal(settled.status, 'bracket');
    assert.equal(settled.qualification.qualifierIds.length, 5);
    assert.equal(settled.playoffPlan.topUps[leaving], undefined, 'the player who left loses the top-up');
    settled.qualification.qualifierIds.forEach((id) => assert.ok(settled.playoffPlan.topUps[id] >= 0));
    assert.ok(!settled.qualification.qualifierIds.includes(leaving));
    const done = finish(settled, op);
    const e = E.computeEarnings(done);
    assert.equal(e.byPlayer[leaving].playoff + e.byPlayer[leaving].bye + e.byPlayer[leaving].topUp, 0);
    assert.equal(e.paid, 12 * 20);
    const audit = next.audit[next.audit.length - 1];
    assert.equal(audit.detail.earningsBefore[leaving], E.computeEarnings(drawn).byPlayer[leaving].total, 'the audit records the top-up that was withdrawn');
  });

  it('after confirmation: the opponent advances by walkover and is paid the round', () => {
    const { s, op } = toPlayoffs(18, { seed: 9 });
    const qf = match(s, 'qf2');
    const next = E.withdrawPlayer(s, qf.p1, op());
    const r = match(next, 'qf2');
    assert.equal(r.result, 'walkover');
    assert.equal(r.auto, 'withdrawal');
    assert.equal(r.winnerId, qf.p2);
    assert.equal(match(next, 'sf1').p2, qf.p2);
    assert.equal(E.computeEarnings(next).byPlayer[qf.p2].playoff, next.playoffPlan.perRound.quarterfinal);
    const done = finish(next, op);
    assert.equal(E.computeEarnings(done).paid, 18 * 20);
  });

  [12, 14, 16].forEach((n) => {
    it(`${n} entrants: a bye holder who withdraws keeps the bye and top-up; the arriving semifinal opponent gets a walkover`, () => {
      const { s, op } = toPlayoffs(n, { seed: 3 });
      const bye = s.playoff.byes[0];
      const sfId = bye.section <= 2 ? 'sf1' : 'sf2';
      const topUp = s.playoffPlan.topUps[bye.playerId];
      let state = E.withdrawPlayer(s, bye.playerId, op());
      assert.equal(E.computeEarnings(state).byPlayer[bye.playerId].bye, state.playoffPlan.bye);
      state = playOpen(state, op, 'playoff', () => [5, 1]);
      const sf = match(state, sfId);
      assert.equal(sf.result, 'walkover');
      assert.notEqual(sf.winnerId, bye.playerId);
      const done = E.completeShowdown(state, op());
      const e = E.computeEarnings(done);
      assert.equal(e.byPlayer[bye.playerId].bye, done.playoffPlan.bye);
      assert.equal(e.byPlayer[bye.playerId].topUp, topUp);
      assert.equal(e.paid, n * 20);
    });
  });

  it('a walkover winner who later withdraws forfeits their next match too; every dollar still pays out', () => {
    const { s, op } = toPlayoffs(8, { seed: 4 });
    const sf = match(s, 'sf1');
    let state = E.withdrawPlayer(s, sf.p1, op());
    state = E.withdrawPlayer(state, sf.p2, op());
    assert.equal(match(state, 'sf1').winnerId, sf.p2);
    state = E.recordResult(state, 'sf2', { score1: 5, score2: 2 }, op());
    const f = match(state, 'f1');
    assert.equal(f.result, 'walkover');
    assert.equal(f.winnerId, match(state, 'sf2').winnerId);
    const done = E.completeShowdown(state, op());
    assert.equal(done.championId, f.winnerId);
    assert.equal(E.computeEarnings(done).paid, 8 * 20);
  });

  it('a playoff result cannot advance a withdrawn player', () => {
    const { s, op } = toPlayoffs(8, { seed: 4 });
    const sf = match(s, 'sf1');
    const state = E.withdrawPlayer(s, sf.p1, op());
    assert.equal(match(state, 'sf1').result, 'walkover');
    const p1Won = sf.p1 === match(state, 'sf1').p1 ? { score1: 5, score2: 2 } : { score1: 2, score2: 5 };
    assert.throws(() => E.recordResult(state, 'sf1', p1Won, op()), /withdrawn and cannot advance/);
    assert.throws(() => E.recordForfeit(state, 'sf1', [sf.p2], op()), /withdrawn and cannot advance/);
  });

  it('withdrawal guard rails', () => {
    const { s, op } = startedEvent(8);
    assert.throws(() => E.withdrawPlayer(E.createShowdown({ players: [] }, op()), 'x', op()), /remove the player/);
    assert.throws(() => E.withdrawPlayer(E.withdrawPlayer(s, 'P1', op()), 'P1', op()), /already withdrawn/);
  });
});
