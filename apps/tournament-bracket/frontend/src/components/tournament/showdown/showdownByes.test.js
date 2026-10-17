import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as E from './showdownEngine.js';
import { startedEvent, playOpen, randomRace, settleShootouts } from './showdownTestKit.js';

const qualifyingPaid = (s) => Object.values(E.computeEarnings(s).byPlayer).reduce((sum, r) => sum + r.qualifying, 0);

/** First seed whose random qualifying leaves a tie across the last bye (and no cutoff tie). */
function byeShootoutEvent(n) {
  for (let seed = 1; seed <= 400; seed += 1) {
    const { s, op } = startedEvent(n, { seed });
    const state = E.lockQualifying(playOpen(s, op, 'qualifying', randomRace(3)), op());
    if (state.status === 'shootout' && state.qualification.byeTie) return { s: state, op };
  }
  throw new Error(`no seed produced a bye tie for ${n} entrants`);
}

/** Every match 3–0 to p1: the whole field ties, so a cutoff shootout comes first, then a bye shootout. */
function allTiedEvent(n) {
  const { s, op } = startedEvent(n, { seed: 1 });
  return { s: E.lockQualifying(playOpen(s, op, 'qualifying', () => [3, 0]), op()), op };
}

function settleOne(state, op) {
  let s = state;
  const id = E.activeShootout(s).id;
  for (let guard = 0; guard < 100 && E.activeShootout(s)?.id === id; guard += 1) {
    const c = op();
    const active = E.activeShootout(s);
    if (!active.lagWinnerId) { s = E.shootoutLag(s, active.order[0], c); continue; }
    const r = E.replayShootout(active);
    s = E.shootoutRack(s, c.random() < 0.5 ? r.holderId : r.challengerId, c);
  }
  return s;
}

describe('showdown byes — bye shootout', () => {
  [12, 13, 14, 15, 16, 17].forEach((n) => {
    it(`${n} entrants: a tie across the last bye is decided by a bye shootout among the tied qualifiers only`, () => {
      const { s, op } = byeShootoutEvent(n);
      const byes = s.payoutPlan.byes;
      const q = s.qualification;
      assert.equal(q.tie, null, 'qualification itself is settled');
      assert.equal(q.qualifierIds.length, s.payoutPlan.qualifiers);
      assert.ok(q.byeTie.tiedIds.length > q.byeTie.openSpots, 'the tied group is larger than the byes left');
      assert.equal(q.byeIds.length + q.byeTie.openSpots, byes);
      q.byeTie.tiedIds.forEach((id) => assert.ok(q.qualifierIds.includes(id), 'only qualifiers take part'));
      const active = E.activeShootout(s);
      assert.equal(active.kind, 'bye');
      assert.deepEqual([...active.groupIds].sort(), [...q.byeTie.tiedIds].sort());

      assert.ok(s.playoffPlan, 'top-ups and the ladder are locked once the qualifiers are known');
      const paidBefore = E.computeEarnings(s).paid;
      const standingsBefore = JSON.stringify(E.standingsFor(s).rows);
      const settled = settleOne(s, op);
      assert.equal(settled.status, 'bracket');
      assert.equal(E.computeEarnings(settled).paid, paidBefore, 'shootout racks pay nothing');
      assert.equal(JSON.stringify(E.standingsFor(settled).rows), standingsBefore, 'shootout racks leave stats alone');
      assert.deepEqual(settled.playoffPlan.perRound, s.playoffPlan.perRound);

      const survivors = E.replayShootout(settled.shootouts[settled.shootouts.length - 1]).survivors;
      assert.equal(survivors.length, q.byeTie.openSpots, 'the shootout stops when the players left equal the open byes');
      assert.deepEqual([...settled.qualification.byeIds].sort(), [...q.byeIds, ...survivors].sort());
      const losers = q.byeTie.tiedIds.filter((id) => !survivors.includes(id));
      losers.forEach((id) => assert.ok(settled.qualification.qualifierIds.includes(id), 'bye-shootout losers stay in the playoffs'));

      const drawn = E.confirmPlayoff(E.drawPlayoff(settled, op()), op());
      assert.deepEqual(drawn.playoff.byes.map((b) => b.playerId).sort(), [...settled.qualification.byeIds].sort());
      const e = E.computeEarnings(drawn);
      drawn.playoff.byes.forEach((b) => assert.equal(e.byPlayer[b.playerId].bye, drawn.playoffPlan.bye));
      losers.forEach((id) => assert.equal(e.byPlayer[id].bye, 0));
      const done = E.completeShowdown(playOpen(drawn, op, 'playoff', randomRace(5)), op());
      assert.equal(E.reconciliationProblem(done), '');
      E.finalStandings(done).filter((r) => losers.includes(r.playerId)).forEach((r) => assert.ok(!r.note.includes('Lost in shootout')));
    });
  });

  [12, 14, 16].forEach((n) => {
    it(`${n} entrants, whole field tied: cutoff shootout first, then one bye shootout among all qualifiers`, () => {
      const { s, op } = allTiedEvent(n);
      assert.equal(s.status, 'shootout');
      assert.equal(E.activeShootout(s).kind, 'cutoff');
      assert.equal(s.playoffPlan, null, 'nothing is locked while the cutoff is open');
      const afterCutoff = settleOne(s, op);
      assert.equal(afterCutoff.status, 'shootout');
      const bye = E.activeShootout(afterCutoff);
      assert.equal(bye.kind, 'bye');
      assert.deepEqual([...bye.groupIds].sort(), [...afterCutoff.qualification.qualifierIds].sort());
      assert.equal(bye.spots, afterCutoff.payoutPlan.byes);
      afterCutoff.qualification.qualifierIds.forEach((id) => {
        assert.equal(afterCutoff.playoffPlan.topUps[id], 20 - 5, 'every qualifier has one win and is topped up to the fee');
      });
      const done = settleOne(afterCutoff, op);
      assert.equal(done.status, 'bracket');
      assert.equal(done.qualification.byeIds.length, done.payoutPlan.byes);
      const finals = E.finalStandings(E.confirmPlayoff(E.drawPlayoff(done, op()), op()));
      const cutoffOut = E.replayShootout(done.shootouts[0]).eliminated;
      finals.filter((r) => cutoffOut.includes(r.playerId)).forEach((r) => assert.ok(r.note.includes('Lost in shootout')));
    });
  });

  it('a bye shootout can be undone rack by rack and reopened after the draw', () => {
    const { s, op } = byeShootoutEvent(14);
    const active = E.activeShootout(s);
    let state = E.shootoutLag(s, active.order[1], op());
    const r = E.replayShootout(E.activeShootout(state));
    state = E.shootoutRack(state, r.holderId, op());
    if (state.status === 'shootout') {
      state = E.shootoutUndo(E.shootoutUndo(state, op()), op());
      assert.equal(E.activeShootout(state).lagWinnerId, null);
    }
    state = settleShootouts(state, op);
    state = E.drawPlayoff(state, op());
    assert.throws(() => E.reopenShootout(state, '', op()), /RESET/);
    const reopened = E.reopenShootout(state, 'RESET', op());
    assert.equal(reopened.status, 'shootout');
    assert.equal(E.activeShootout(reopened).kind, 'bye');
    assert.equal(reopened.playoff, null);
    assert.deepEqual(reopened.playoffPlan.topUps, state.playoffPlan.topUps, 'top-ups do not depend on byes');
    assert.equal(settleShootouts(reopened, op).status, 'bracket');
  });

  it('a started bye shootout blocks withdrawal of a player in it; before it starts the tie is recalculated', () => {
    const { s, op } = byeShootoutEvent(16);
    const active = E.activeShootout(s);
    const started = E.shootoutLag(s, active.order[0], op());
    assert.throws(() => E.withdrawPlayer(started, active.groupIds[0], op()), /shootout that has started/);
    const leaving = active.groupIds[0];
    const next = settleShootouts(E.withdrawPlayer(s, leaving, op()), op);
    assert.equal(next.status, 'bracket');
    assert.ok(!next.qualification.qualifierIds.includes(leaving));
    assert.equal(next.qualification.qualifierIds.length, 7);
    assert.equal(next.qualification.byeIds.length, 1);
    assert.equal(next.playoffPlan.topUps[leaving], undefined);
  });

  it('reopening qualifying clears bye shootouts, byes and the locked plan', () => {
    const { s, op } = byeShootoutEvent(13);
    const state = E.reopenQualifying(settleShootouts(s, op), 'RESET', op());
    assert.equal(state.shootouts.length, 0);
    assert.equal(state.playoffPlan, null);
    assert.equal(state.qualification, null);
    assert.equal(E.computeEarnings(state).paid, qualifyingPaid(state));
  });
});
