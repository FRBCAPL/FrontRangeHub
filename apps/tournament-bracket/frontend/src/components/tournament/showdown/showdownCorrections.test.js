import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as E from './showdownEngine.js';
import { playOpen, randomRace, toBracket, toPlayoffs, shootoutEvent, settleShootouts, runToCompletion, startedEvent } from './showdownTestKit.js';

const match = (s, id) => s.matches.find((m) => m.id === id);
const paid = (s) => E.computeEarnings(s).paid;

describe('playoff corrections', () => {
  it('a result can be corrected while nothing downstream has started, without double pay', () => {
    const { s, op } = toPlayoffs(10, { seed: 2 });
    let state = E.recordResult(s, 'sf1', { score1: 5, score2: 3 }, op());
    const first = match(state, 'sf1');
    const before = paid(state);
    state = E.recordResult(state, 'sf1', { score1: 2, score2: 5 }, op());
    const fixed = match(state, 'sf1');
    assert.notEqual(fixed.winnerId, first.winnerId);
    assert.equal(paid(state), before, 'total paid unchanged');
    const e = E.computeEarnings(state);
    assert.equal(e.byPlayer[first.winnerId].playoff, 0);
    assert.equal(e.byPlayer[fixed.winnerId].playoff, state.playoffPlan.perRound.semifinal);
    assert.equal(match(state, 'f1').p1, fixed.winnerId);
    assert.ok(state.audit.some((a) => a.action === 'correct-result'));
  });

  it('once a later match has started, the operator must use Undo from here with typed confirmation', () => {
    const { s, op } = toPlayoffs(10, { seed: 2 });
    let state = E.recordResult(s, 'sf1', { score1: 5, score2: 3 }, op());
    state = E.recordResult(state, 'sf2', { score1: 5, score2: 4 }, op());
    state = E.startOnTable(state, 'f1', 1, op());
    assert.throws(() => E.recordResult(state, 'sf1', { score1: 1, score2: 5 }, op()), /Undo from here/);
    assert.throws(() => E.undoPlayoffFrom(state, 'sf1', 'yes', op()), /RESET/);
    const undone = E.undoPlayoffFrom(state, 'sf1', 'RESET', op());
    assert.equal(match(undone, 'sf1').status, 'waiting');
    assert.equal(match(undone, 'f1').status, 'waiting');
    assert.equal(match(undone, 'f1').p1, null);
    assert.equal(match(undone, 'sf2').status, 'completed', 'unrelated branch kept');
    const audit = undone.audit[undone.audit.length - 1];
    assert.equal(audit.action, 'undo-from');
    assert.deepEqual(audit.affected.sort(), ['f1', 'sf1']);
  });

  it('undoing the final of a completed event reopens playoffs and still never double-pays', () => {
    const { s, op } = startedEvent(12, { seed: 11 });
    const done = runToCompletion(s, op);
    assert.throws(() => E.undoPlayoffFrom(done, 'f1', '', op()), /RESET/);
    let state = E.undoPlayoffFrom(done, 'f1', 'RESET', op());
    assert.equal(state.status, 'playoffs');
    assert.equal(state.championId, null);
    assert.equal(paid(state), 12 * 20 - state.playoffPlan.perRound.final);
    state = playOpen(state, op, 'playoff', randomRace(5));
    state = E.completeShowdown(state, op());
    assert.equal(paid(state), 12 * 20);
  });

  it('qualifying results are frozen once locked', () => {
    const { s, op } = toBracket(8, { seed: 3 });
    assert.throws(() => E.recordResult(s, 'q1', { score1: 3, score2: 0 }, op()), /Reopen qualifying/);
  });
});

describe('reopening phases', () => {
  it('reopening qualifying needs typed confirmation once a bracket exists and invalidates everything after it', () => {
    const { s, op } = toPlayoffs(12, { seed: 6 });
    let state = E.recordResult(s, 'qf1', { score1: 5, score2: 0 }, op());
    assert.ok(Object.values(E.computeEarnings(state).byPlayer).some((r) => r.bye > 0));
    const before = E.computeEarnings(state);
    assert.throws(() => E.reopenQualifying(state, 'no', op()), /RESET/);
    state = E.reopenQualifying(state, 'RESET', op());
    assert.equal(state.status, 'qualifying');
    assert.equal(state.playoff, null);
    assert.equal(state.playoffPlan, null);
    assert.equal(state.shootouts.length, 0);
    assert.ok(state.matches.every((m) => m.phase === 'qualifying'));
    const e = E.computeEarnings(state);
    Object.values(e.byPlayer).forEach((r) => { assert.equal(r.bye, 0); assert.equal(r.playoff, 0); assert.equal(r.topUp, 0); });
    assert.equal(e.paid, 12 * state.payoutPlan.q);
    const audit = state.audit[state.audit.length - 1];
    assert.equal(audit.action, 'reopen-qualifying');
    Object.values(before.byPlayer).filter((r) => r.total).forEach((r) => assert.equal(audit.detail.earningsBefore[r.playerId], r.total, 'the audit keeps what was shown before'));
    const relocked = E.lockQualifying(state, op());
    assert.ok(['bracket', 'shootout'].includes(relocked.status));
  });

  it('reopening qualifying once top-ups are locked needs typed confirmation', () => {
    const { s, op } = toBracket(8, { seed: 1 });
    assert.ok(s.playoffPlan.topUpTotal > 0);
    assert.throws(() => E.reopenQualifying(s, '', op()), /RESET/);
    assert.equal(E.reopenQualifying(s, 'RESET', op()).status, 'qualifying');
  });

  it('reopening qualifying with nothing downstream needs no confirmation', () => {
    const { s, op } = startedEvent(8, { seed: 1 });
    const short = { ...s, status: 'bracket', qualification: { lockedAt: 'x', qualifierIds: [], tie: null, short: 4 } };
    assert.equal(E.reopenQualifying(short, '', op()).status, 'qualifying');
  });

  it('shootout racks undo in reverse order, back through the lag', () => {
    const { s, op } = shootoutEvent(8);
    const sh = E.activeShootout(s);
    let state = E.shootoutLag(s, sh.order[0], op());
    const r = E.replayShootout(E.activeShootout(state));
    state = E.shootoutRack(state, r.holderId, op());
    if (state.status !== 'shootout') return;
    state = E.shootoutUndo(state, op());
    assert.equal(E.activeShootout(state).rackWinners.length, 0);
    assert.ok(E.activeShootout(state).lagWinnerId);
    state = E.shootoutUndo(state, op());
    assert.equal(E.activeShootout(state).lagWinnerId, null);
  });

  it('a qualifying correction that changes who qualifies moves the top-ups and the playoff budget', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const { s, op } = startedEvent(10, { seed });
      let state = playOpen(s, op, 'qualifying', randomRace(3));
      state = settleShootouts(E.lockQualifying(state, op()), op);
      if (state.status !== 'bracket') continue;
      const before = state.playoffPlan;
      const out = E.standingsFor(state).rows.find((r) => !before.qualifierIds.includes(r.playerId) && r.matchWins === 1);
      if (!out) continue;
      const lost = state.matches.find((m) => m.phase === 'qualifying' && m.loserId === out.playerId);
      state = E.reopenQualifying(state, 'RESET', op());
      const fixed = lost.winnerId === lost.p1 ? { score1: 0, score2: 3 } : { score1: 3, score2: 0 };
      state = E.recordResult(state, lost.id, fixed, op());
      state = settleShootouts(E.lockQualifying(state, op()), op);
      const after = state.playoffPlan;
      const e = E.computeEarnings(state);
      assert.equal(e.byPlayer[out.playerId].qualifying, 2 * state.payoutPlan.q);
      if (!after.qualifierIds.includes(out.playerId)) continue;
      assert.notDeepEqual(after.qualifierIds.sort(), before.qualifierIds.sort());
      after.qualifierIds.forEach((id) => assert.ok(e.byPlayer[id].beforePlayoffs >= 20));
      assert.equal(e.byPlayer[out.playerId].topUp, 20 - 2 * state.payoutPlan.q);
      assert.equal(after.qualifyingPaid + after.topUpTotal + after.budget, 200);
      return;
    }
    assert.fail('no seed produced a correction that changed qualification');
  });

  it('reopening a finished shootout invalidates the bracket and resumes the shootout', () => {
    const { s, op } = shootoutEvent(8);
    let state = settleShootouts(s, op);
    state = E.confirmPlayoff(E.drawPlayoff(state, op()), op());
    assert.throws(() => E.reopenShootout(state, '', op()), /RESET/);
    state = E.reopenShootout(state, 'RESET', op());
    assert.equal(state.status, 'shootout');
    assert.equal(state.playoff, null);
    assert.ok(state.matches.every((m) => m.phase === 'qualifying'));
    assert.equal(E.replayShootout(E.activeShootout(state)).status, 'in-progress');
    state = settleShootouts(state, op);
    assert.equal(state.status, 'bracket');
    assert.equal(state.qualification.qualifierIds.length, 4);
  });

  it('a started shootout blocks withdrawal of a tied player', () => {
    const { s, op } = shootoutEvent(8);
    const sh = E.activeShootout(s);
    const started = E.shootoutLag(s, sh.order[0], op());
    assert.throws(() => E.withdrawPlayer(started, sh.groupIds[0], op()), /shootout that has started/);
  });
});
