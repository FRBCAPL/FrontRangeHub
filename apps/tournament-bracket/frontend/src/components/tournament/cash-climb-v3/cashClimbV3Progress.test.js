import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fixtureEvent, playOut, record } from './cashClimbV3TestKit.js';
import { matchOccupants, matchReadiness, readyMatchIds, recordMatchResult, survivors } from './cashClimbV3Progress.js';
import { ledgerProblems, ledgerSummary } from './cashClimbV3Ledger.js';

const W = (winner, loserRacks = 3) => ({ outcome: 'completed', winner, loserRacks });
const occ = (e, id) => matchOccupants(e, id).map((o) => (o.kind === 'player' ? o.id : o.kind));

describe('Cash Climb V3 progression: full brackets', () => {
  for (const [name, n, matches] of [['n8', 8, 7], ['n16', 16, 15], ['n24', 24, 23], ['n32', 32, 31]]) {
    it(`plays a normal ${n}-player bracket to one champion with ${matches} matches`, () => {
      const e = playOut(fixtureEvent(name));
      assert.equal(e.order.length, matches);
      assert.ok(e.order.every((id) => e.matches[id].status === 'completed'));
      assert.equal(e.matches[e.championshipId].winner, 'p1');
      assert.deepEqual(survivors(e), ['p1']);
      assert.deepEqual(ledgerProblems(e.ledger), []);
    });
  }

  it('advances preliminary winners into their assigned main slots, losers go nowhere', () => {
    let e = fixtureEvent('n24');
    assert.deepEqual(occ(e, 'O1'), ['pending', 'pending']);
    assert.equal(matchReadiness(e, 'O1'), 'waiting');
    assert.deepEqual(occ(e, 'O5'), ['p17', 'p18']);
    e = record(e, 'P1', W('p2', 4));
    assert.deepEqual(occ(e, 'O1'), ['p2', 'pending']);
    e = record(e, 'P2', W('p3', 0));
    assert.deepEqual(occ(e, 'O1'), ['p2', 'p3']);
    assert.equal(matchReadiness(e, 'O1'), 'ready');
    assert.ok(!e.order.filter((id) => e.matches[id].stage !== 'preliminary').some((id) => occ(e, id).includes('p1')));
  });

  it('wires every match to the downstream slot its winner fills', () => {
    const e = fixtureEvent('n12odd');
    assert.deepEqual(e.matches.P3.feedsTo, { matchId: 'O2', slot: 0 });
    assert.deepEqual(e.matches.O4.feedsTo, { matchId: 'L1-2', slot: 1 });
    assert.equal(e.matches[e.championshipId].feedsTo, null);
    assert.ok(e.matches[e.championshipId].championship);
  });
});

describe('Cash Climb V3 progression: the seven outcomes', () => {
  it('1. completed: the winner advances', () => {
    const e = record(fixtureEvent('n16'), 'O1', W('p2', 6));
    assert.equal(e.matches.O1.status, 'completed');
    assert.deepEqual(occ(e, 'L1-1'), ['p2', 'pending']);
  });

  it('2. single pre-match forfeit: the other player advances', () => {
    const e = record(fixtureEvent('n16'), 'O1', { outcome: 'forfeit', forfeiting: 'p1' });
    assert.equal(e.matches.O1.status, 'forfeit');
    assert.equal(e.matches.O1.winner, 'p2');
    assert.deepEqual(occ(e, 'L1-1'), ['p2', 'pending']);
  });

  it('3. double pre-match forfeit: no winner, the downstream position is vacant', () => {
    const e = record(fixtureEvent('n16'), 'O1', { outcome: 'double-forfeit' });
    assert.equal(e.matches.O1.winner, null);
    assert.deepEqual(occ(e, 'L1-1'), ['vacant', 'pending']);
    assert.equal(matchReadiness(e, 'L1-1'), 'waiting');
  });

  it('4. single mid-match withdrawal: the other player advances', () => {
    const e = record(fixtureEvent('n16'), 'O1', { outcome: 'withdrawal', withdrawing: 'p2', racks: { p1: 5, p2: 3 } });
    assert.equal(e.matches.O1.status, 'withdrawal');
    assert.deepEqual(occ(e, 'L1-1'), ['p1', 'pending']);
  });

  it('5. double mid-match withdrawal: no winner', () => {
    const e = record(fixtureEvent('n16'), 'O1', { outcome: 'double-withdrawal', racks: { p1: 5, p2: 3 } });
    assert.equal(e.matches.O1.winner, null);
    assert.deepEqual(occ(e, 'L1-1'), ['vacant', 'pending']);
  });

  it('6. automatic advancement against a vacant position', () => {
    let e = record(fixtureEvent('n16'), 'O1', { outcome: 'double-forfeit' });
    const r = recordMatchResult(e, 'O2', W('p4'));
    e = r.event;
    assert.deepEqual(r.autoResolved, ['L1-1']);
    assert.equal(e.matches['L1-1'].status, 'walkover');
    assert.equal(e.matches['L1-1'].winner, 'p4');
    assert.deepEqual(occ(e, 'L2-1'), ['p4', 'pending']);
  });

  it('7. both positions vacant: void, and the vacancy carries forward', () => {
    let e = record(fixtureEvent('n16'), 'O1', { outcome: 'double-forfeit' });
    e = record(e, 'O2', { outcome: 'double-withdrawal', racks: { p3: 2, p4: 2 } });
    assert.equal(e.matches['L1-1'].status, 'void');
    assert.equal(e.matches['L1-1'].winner, null);
    assert.deepEqual(occ(e, 'L2-1'), ['vacant', 'pending']);
    assert.ok(!ledgerSummary(e.ledger).earnedByPlayer.vacant);
  });

  it('cascading double forfeits void whole subtrees and walk the survivor through', () => {
    let e = fixtureEvent('n16');
    for (const id of ['O1', 'O2', 'O3', 'O4']) e = record(e, id, { outcome: 'double-forfeit' });
    assert.deepEqual(['L1-1', 'L1-2', 'L2-1'].map((id) => e.matches[id].status), ['void', 'void', 'void']);
    assert.deepEqual(occ(e, 'L3-1'), ['vacant', 'pending']);
    e = playOut(e);
    assert.equal(e.matches['L3-1'].status, 'walkover');
    assert.equal(e.matches['L3-1'].winner, 'p9');
    assert.deepEqual(ledgerProblems(e.ledger), []);
  });
});

describe('Cash Climb V3 progression: validation and repeats', () => {
  it('recording the identical result twice changes nothing', () => {
    const e1 = record(fixtureEvent('n16'), 'O1', { outcome: 'withdrawal', withdrawing: 'p2', racks: { p1: 5, p2: 3 } });
    const r = recordMatchResult(e1, 'O1', { outcome: 'withdrawal', withdrawing: 'p2', racks: { p2: 3, p1: 5 } });
    assert.equal(r.changed, false);
    assert.equal(r.event, e1);
    assert.equal(r.event.ledger.entries.length, e1.ledger.entries.length);
  });

  it('rejects a different result for a resolved match (no corrections)', () => {
    const e = record(fixtureEvent('n16'), 'O1', W('p1'));
    assert.throws(() => recordMatchResult(e, 'O1', W('p2')), /already has a result/);
    assert.throws(() => recordMatchResult(e, 'O1', W('p1', 4)), /already has a result/);
  });

  it('rejects results for matches that are not ready, unknown matches and bad inputs', () => {
    const e = fixtureEvent('n16');
    assert.throws(() => recordMatchResult(e, 'L1-1', W('p1')), /not ready/);
    assert.throws(() => recordMatchResult(e, 'X9', W('p1')), /Unknown match/);
    assert.throws(() => recordMatchResult(e, 'O1', W('p3')), /one of the two players/);
    assert.throws(() => recordMatchResult(e, 'O1', W('p1', 7)), /0 to 6/);
    assert.throws(() => recordMatchResult(e, 'O1', { outcome: 'withdrawal', withdrawing: 'p1', racks: { p1: 7, p2: 3 } }), /0 to 6/);
    assert.throws(() => recordMatchResult(e, 'O1', { outcome: 'double-withdrawal', racks: { p1: 1 } }), /exactly the two players/);
    assert.throws(() => recordMatchResult(e, 'O1', { outcome: 'walkover', winner: 'p1' }), /valid match outcome/);
    assert.throws(() => recordMatchResult(e, 'L1-1', { outcome: 'void' }), /not ready/);
  });

  it('never mutates the event passed in', () => {
    const e = fixtureEvent('n16');
    const before = JSON.stringify(e);
    record(e, 'O1', W('p1'));
    assert.equal(JSON.stringify(e), before);
  });

  it('lists ready matches in play order', () => {
    assert.deepEqual(readyMatchIds(fixtureEvent('n12odd')), ['P1', 'P2', 'P3', 'P4', 'O3', 'O4']);
  });
});
