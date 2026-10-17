import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { makeOperator, setUpEvent, workBoard, workShootouts, playFullEvent, bracketView, moneyView, standingsView, queueView, shootoutView } from './showdownOperatorKit.js';
import { nextStep } from './showdownOperatorActions.js';
import { finalStandings } from '../showdownEngine.js';

function assertReconciled(s, n, fee) {
  const m = moneyView(s);
  assert.equal(m.pool, n * fee);
  assert.equal(m.paid, n * fee);
  assert.equal(m.remaining, 0);
  assert.equal(m.reconciled, true);
  assert.equal(m.ladder.total, n * fee, 'payout ladder adds up to the pool');
}

describe('operator workflows — full events through the tablet actions only', () => {
  for (const [n, fee, tables] of [[8, 20, 4], [16, 25, 5], [24, 20, 7]]) {
    it(`${n}-player event from setup to completion`, () => {
      const o = makeOperator(n);
      let s = setUpEvent(o, n, { fee, tables });
      assert.equal(s.status, 'qualifying');
      assert.match(nextStep(s), /Start the next match/);
      s = playFullEvent(o, s);
      assert.equal(s.status, 'completed');
      assert.match(nextStep(s), /Event complete/);
      assertReconciled(s, n, fee);
      const b = bracketView(s);
      assert.equal(b.qualifiers.length, n === 8 ? 4 : n === 16 ? 7 : 8);
      assert.equal(finalStandings(s)[0].playerId, s.championId);
      assert.ok(o.log.every((x) => !x.error), 'no step needed a retry or manual state edit');
    });
  }

  it('12 players: 5 qualifiers, 3 byes to the top-ranked qualifiers, each bye paid half the opening payout', () => {
    const o = makeOperator(77);
    let s = setUpEvent(o, 12);
    s = workBoard(o, s, 'qualifying');
    s = workShootouts(o, o.tap(s, 'lockQualifying'));
    s = o.tap(s, 'drawBracket');
    let b = bracketView(s);
    assert.equal(b.qualifiers.length, 5);
    assert.equal(b.byes.length, 3);
    assert.deepEqual(b.byes.map((x) => x.playerId).sort(), b.byeHolders.map((x) => x.id).sort());
    assert.deepEqual(b.byes.map((x) => x.section).sort(), [1, 3, 4]);
    assert.equal(b.byePay, Math.floor(s.playoffPlan.perRound.quarterfinal / 2));
    assert.ok(b.byePay < b.rounds[0].payout, 'a bye pays less than an opening win');
    assert.equal(moneyView(s).players.reduce((t, p) => t + p.bye, 0), 0, 'byes are not earned before confirmation');
    s = o.tap(s, 'confirmBracket');
    b = bracketView(s);
    assert.equal(moneyView(s).players.reduce((t, p) => t + p.bye, 0), 3 * b.byePay);
    assert.equal(b.rounds[0].matches.length, 1);
  });
});

describe('operator workflows — special situations', () => {
  it('a qualification shootout is run from the shootout screen', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const o = makeOperator(seed);
      let s = workBoard(o, setUpEvent(o, 8), 'qualifying', () => [3, 0]);
      s = o.tap(s, 'lockQualifying');
      if (s.status !== 'shootout') continue;
      const st = standingsView(s);
      assert.ok(st.tie.tiedIds.length > st.tie.openSpots);
      let v = shootoutView(s);
      assert.equal(v.status, 'lag');
      assert.match(nextStep(s), /lag/);
      s = o.tap(s, 'shootoutLag', v.lagPlayers[0].id);
      v = shootoutView(s);
      assert.equal(v.breaker.id, v.lagPlayers[0].id);
      s = o.tap(s, 'shootoutRack', v.challenger.id);
      s = o.tap(s, 'shootoutUndo');
      assert.equal(shootoutView(s).racks.length, 0);
      s = workShootouts(o, s);
      assert.equal(s.status, 'bracket');
      assert.equal(s.qualification.qualifierIds.length, 4);
      s = o.tap(o.tap(s, 'drawBracket'), 'confirmBracket');
      s = o.tap(workBoard(o, s, 'playoff'), 'complete');
      return assertReconciled(s, 8, 20);
    }
    assert.fail('no shootout produced');
  });

  it('a qualifying double forfeit moves Q to the championship and still reconciles', () => {
    const o = makeOperator(5);
    let s = setUpEvent(o, 12);
    const m = s.matches[0];
    s = o.tap(s, 'forfeit', m.id, [m.p1, m.p2]);
    assert.equal(queueView(s, 'qualifying').done[0].result, 'double-forfeit');
    const ladder = moneyView(s).ladder;
    assert.equal(ladder.doubleForfeitShift, s.payoutPlan.q);
    assert.equal(ladder.total, 12 * 20);
    s = playFullEvent(o, s);
    assert.equal(moneyView(s).championship, s.playoffPlan.perRound.final + s.payoutPlan.q);
    assertReconciled(s, 12, 20);
  });

  it('a withdrawal during qualifying forfeits only unfinished matches and the event completes', () => {
    const o = makeOperator(6);
    let s = setUpEvent(o, 10);
    const leaving = s.players[3].id;
    s = o.tap(s, 'withdraw', leaving);
    assert.equal(standingsView(s).rows.find((r) => r.playerId === leaving).status, 'withdrawn');
    s = playFullEvent(o, s);
    assert.ok(!s.qualification.qualifierIds.includes(leaving));
    assertReconciled(s, 10, 20);
  });

  it('a qualifying result is corrected after standings are locked (reopen, correct, relock)', () => {
    const o = makeOperator(9);
    let s = workBoard(o, setUpEvent(o, 12), 'qualifying');
    s = workShootouts(o, o.tap(s, 'lockQualifying'));
    s = o.tap(s, 'drawBracket');
    const target = s.matches.find((m) => m.phase === 'qualifying' && m.result === 'played');
    assert.match(o.tryTap(s, 'recordScore', target.id, '0', '3').error, /Reopen qualifying/);
    assert.match(o.tryTap(s, 'reopenQualifying', '').error, /RESET/);
    s = o.tap(s, 'reopenQualifying', 'reset');
    assert.equal(s.status, 'qualifying');
    const flipped = target.winnerId === target.p1 ? ['1', '3'] : ['3', '1'];
    s = o.tap(s, 'recordScore', target.id, ...flipped);
    assert.notEqual(s.matches.find((m) => m.id === target.id).winnerId, target.winnerId);
    assert.ok(s.audit.some((a) => a.action === 'correct-result'));
    s = workShootouts(o, o.tap(s, 'lockQualifying'));
    s = o.tap(o.tap(s, 'drawBracket'), 'confirmBracket');
    s = o.tap(workBoard(o, s, 'playoff'), 'complete');
    assertReconciled(s, 12, 20);
  });

  it('a playoff result is corrected after the winner advanced (undo from here, re-record)', () => {
    const o = makeOperator(10);
    let s = workBoard(o, setUpEvent(o, 18), 'qualifying');
    s = workShootouts(o, o.tap(s, 'lockQualifying'));
    s = o.tap(o.tap(s, 'drawBracket'), 'confirmBracket');
    s = o.tap(s, 'recordScore', 'qf1', '5', '2');
    s = o.tap(s, 'recordScore', 'qf2', '5', '1');
    s = o.tap(s, 'startMatch', 'sf1', 1);
    const wrong = s.matches.find((m) => m.id === 'qf1');
    assert.match(o.tryTap(s, 'recordScore', 'qf1', '2', '5').error, /Undo from here/);
    const paidBefore = moneyView(s).paid;
    s = o.tap(s, 'undoFrom', 'qf1', 'RESET');
    assert.equal(moneyView(s).paid, paidBefore - s.playoffPlan.perRound.quarterfinal);
    s = o.tap(s, 'recordScore', 'qf1', '2', '5');
    const fixed = s.matches.find((m) => m.id === 'qf1');
    assert.equal(fixed.winnerId, wrong.p2);
    assert.equal(moneyView(s).players.find((p) => p.playerId === wrong.p1).playoff, 0);
    s = o.tap(workBoard(o, s, 'playoff'), 'complete');
    assertReconciled(s, 18, 20);
  });

  it('plain-English errors stop impossible actions without changing anything', () => {
    const o = makeOperator(11);
    const s = setUpEvent(o, 8, { tables: 1 });
    const one = o.tap(s, 'startSuggested', 1);
    const busy = queueView(one, 'qualifying');
    assert.deepEqual(busy.freeTables, []);
    const r = o.tryTap(one, 'startSuggested', 1);
    assert.match(r.error, /in use|No match is ready/);
    assert.equal(r.state, one);
    const onTable = busy.onTable[0];
    const sameplayer = one.matches.find((m) => m.id !== onTable.id && [m.p1, m.p2].some((p) => [onTable.p1, onTable.p2].includes(p)));
    assert.match(o.tryTap(one, 'startMatch', sameplayer.id, 1).error, /another table|in use/);
    assert.match(o.tryTap(one, 'recordScore', onTable.id, '', '3').error, /Enter both/);
    assert.match(o.tryTap(one, 'lockQualifying').error, /Finish every/);
  });
});
