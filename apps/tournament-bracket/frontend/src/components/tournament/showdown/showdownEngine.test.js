import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as E from './showdownEngine.js';
import { startedEvent, runToCompletion, playOpen, randomRace, settleShootouts, operator, names } from './showdownTestKit.js';
import { qualifyingScheduleProblems } from './showdownQualifying.js';

describe('showdown engine — full simulated events', () => {
  for (let n = 8; n <= 24; n += 1) {
    it(`${n} entrants: start to champion, every dollar paid exactly once`, () => {
      for (const [seed, fee] of [[1, 20], [2, 23], [3, 40], [4, 21]]) {
        const { s, op } = startedEvent(n, { fee, tables: 1 + (seed % 7), seed: seed * 1000 + n });
        assert.deepEqual(qualifyingScheduleProblems(s.matches, s.players.map((p) => p.id)), []);
        const done = runToCompletion(s, op);
        assert.equal(done.status, 'completed');
        const earnings = E.computeEarnings(done);
        assert.equal(earnings.paid, n * fee, `n=${n} fee=${fee}`);
        assert.equal(E.reconciliationProblem(done), '');
        Object.values(earnings.byPlayer).forEach((row) => assert.ok(row.total >= 0 && Number.isInteger(row.total)));
        const plan = done.payoutPlan;
        const qualifyingPaid = Object.values(earnings.byPlayer).reduce((sum, r) => sum + r.qualifying, 0);
        assert.equal(qualifyingPaid, n * plan.q);
        const ladder = done.playoffPlan;
        const byePaid = Object.values(earnings.byPlayer).reduce((sum, r) => sum + r.bye, 0);
        assert.equal(byePaid, plan.byes * ladder.bye);
        const qualifiers = new Set(done.qualification.qualifierIds);
        Object.values(earnings.byPlayer).forEach((r) => {
          if (qualifiers.has(r.playerId)) assert.ok(r.beforePlayoffs >= fee, `qualifier ${r.playerId} has $${r.beforePlayoffs} before playoffs`);
          else assert.equal(r.topUp, 0);
        });
        assert.equal(qualifyingPaid + ladder.topUpTotal + ladder.budget, n * fee);
        const champion = earnings.byPlayer[done.championId];
        assert.ok(champion.playoff >= ladder.perRound.final);
        const standings = E.finalStandings(done);
        assert.equal(standings.length, n);
        assert.equal(standings[0].playerId, done.championId);
        assert.equal(standings[0].stage, 'Champion');
      }
    });
  }

  it('audit log records operator, time, action and affected records', () => {
    const { s, op } = startedEvent(8, { seed: 7 });
    const done = runToCompletion(s, op);
    const actions = done.audit.map((a) => a.action);
    ['create', 'start', 'assign-table', 'result', 'lock-qualifying', 'draw-bracket', 'confirm-bracket', 'complete'].forEach((a) => assert.ok(actions.includes(a), a));
    done.audit.forEach((a) => {
      assert.ok(a.at);
      assert.equal(a.by, 'operator@test');
      assert.ok(Array.isArray(a.affected));
    });
  });
});

describe('showdown engine — setup rules', () => {
  it('blocks fewer than 8, more than the event maximum, unsupported sizes and bad fees', () => {
    const op = operator(1);
    const base = (n, extra = {}) => E.createShowdown({ players: names(n), ...extra }, op());
    assert.match(E.setupProblems(base(7)).join(' '), /at least 8/);
    assert.match(E.setupProblems(base(10, { maxEntrants: 9 })).join(' '), /at most 9/);
    assert.match(E.setupProblems(base(25, { maxEntrants: 40 })).join(' '), /No approved Showdown rules for 25/);
    assert.match(E.setupProblems(base(8, { entryFee: 19 })).join(' '), /at least \$20/);
    assert.match(E.setupProblems(base(8, { entryFee: 20.5 })).join(' '), /whole-dollar/);
    assert.match(E.setupProblems(base(8, { minEntrants: 6 })).join(' '), /below 8/);
    assert.deepEqual(E.setupProblems(base(8)), []);
    assert.throws(() => E.startShowdown(base(7), op()), /at least 8/);
  });

  it('locks the entrant list once qualifying begins; table count stays editable', () => {
    const { s, op } = startedEvent(10);
    assert.throws(() => E.addPlayer(s, { name: 'Late' }, op()), /locked/);
    assert.throws(() => E.removePlayer(s, 'P1', op()), /locked/);
    assert.throws(() => E.updateSettings(s, { entryFee: 30 }, op()), /Only the table count/);
    assert.equal(E.updateSettings(s, { tableCount: 7 }, op()).settings.tableCount, 7);
  });

  it('rejects scores that are not a valid race', () => {
    const { s, op } = startedEvent(8);
    assert.throws(() => E.recordResult(s, 'q1', { score1: 3, score2: 3 }, op()));
    assert.throws(() => E.recordResult(s, 'q1', { score1: 2, score2: 1 }, op()));
    assert.throws(() => E.recordResult(s, 'q1', { score1: 4, score2: 1 }, op()));
    assert.equal(E.recordResult(s, 'q1', { score1: 1, score2: 3 }, op()).matches[0].winnerId, s.matches[0].p2);
  });

  it('cannot lock qualifying until every match is finished', () => {
    const { s, op } = startedEvent(8);
    assert.throws(() => E.lockQualifying(s, op()), /Finish every/);
  });
});

describe('showdown engine — forced shootout through the engine', () => {
  it('a tie across the cutoff opens a shootout; shootout racks pay nothing and leave stats alone', () => {
    // 8 players, every match 3–0 to the lower slot player: circle winners form a pattern with ties.
    for (let seed = 1; seed <= 60; seed += 1) {
      const { s, op } = startedEvent(8, { seed });
      let state = playOpen(s, op, 'qualifying', () => [3, 0]);
      state = E.lockQualifying(state, op());
      if (state.status !== 'shootout') continue;
      const before = JSON.stringify(E.standingsFor(state).rows);
      const qualifyingPaid = (st) => Object.values(E.computeEarnings(st).byPlayer).reduce((sum, r) => sum + r.qualifying, 0);
      const paidBefore = qualifyingPaid(state);
      assert.equal(E.computeEarnings(state).paid, paidBefore, 'no top-ups until the cutoff is decided');
      state = settleShootouts(state, op);
      assert.equal(JSON.stringify(E.standingsFor(state).rows), before);
      assert.equal(qualifyingPaid(state), paidBefore);
      assert.equal(E.computeEarnings(state).paid, paidBefore + state.playoffPlan.topUpTotal, 'only top-ups are added');
      assert.equal(state.status, 'bracket');
      assert.equal(state.qualification.qualifierIds.length, 4);
      return;
    }
    assert.fail('no seed produced a cutoff tie');
  });
});
