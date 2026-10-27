import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FIXTURES, dollarsOf, fixtureEvent, playOut, record } from './cashClimbV3TestKit.js';
import { ledgerProblems, ledgerSummary } from './cashClimbV3Ledger.js';
import { recordMatchResult } from './cashClimbV3Progress.js';
import { settleCashClimbV3, settlementStatus } from './cashClimbV3Settlement.js';

const W = (winner, loserRacks = 3) => ({ outcome: 'completed', winner, loserRacks });
const DF = { outcome: 'double-forfeit' };

function reconciled(e) {
  const s = ledgerSummary(e.ledger);
  assert.deepEqual(ledgerProblems(e.ledger), []);
  assert.equal(s.earnedCents + s.unsettledCents + s.operatorRetainedCents, s.prizePoolCents);
  assert.equal(s.unsettledCents, 0);
  return s;
}

describe('Cash Climb V3 settlement: normal', () => {
  it('pays unawarded money 80/20 to the finalists and distributes the whole pool ($100, 16 players, all 7-3)', () => {
    const e = settleCashClimbV3(playOut(fixtureEvent('n16')));
    assert.equal(e.settlement.mode, 'normal');
    assert.equal(e.settlement.finalistBonusCents, 12000, '8 openings x ($100 - $64 - $21)');
    assert.equal(dollarsOf(e.ledger, 'settlement:finalist-bonus-champion:p1'), 96);
    assert.equal(dollarsOf(e.ledger, 'settlement:finalist-bonus-runner-up:p9'), 24);
    const s = reconciled(e);
    assert.equal(s.earnedCents, s.prizePoolCents);
    assert.equal(s.operatorRetainedCents, 0);
  });

  it('reconciles every fixture field size fully', () => {
    for (const name of Object.keys(FIXTURES)) {
      const s = reconciled(settleCashClimbV3(playOut(fixtureEvent(name), { loserRacks: 0 })));
      assert.equal(s.earnedCents, s.prizePoolCents, name);
    }
  });

  it('folds interrupted-match leftovers into the finalist bonus (player withdraws after winning earlier matches)', () => {
    const e = settleCashClimbV3(playOut(fixtureEvent('n16'), {
      decide: (_, id, [a, b]) => (id === 'L2-1' ? { outcome: 'withdrawal', withdrawing: a, racks: { [a]: 4, [b]: 2 } } : W(a)),
    }));
    assert.equal((ledgerSummary(e.ledger).earnedByPlayer.p1) / 100, 64 + 70);
    assert.equal(e.settlement.championId, 'p5');
    assert.equal(e.settlement.finalistBonusCents, 12000 + 13000);
    assert.equal(dollarsOf(e.ledger, 'settlement:finalist-bonus-champion:p5'), 200);
    assert.equal(dollarsOf(e.ledger, 'settlement:finalist-bonus-runner-up:p9'), 50);
    reconciled(e);
  });

  it('settling twice changes nothing; recording after settlement is refused', () => {
    const e = settleCashClimbV3(playOut(fixtureEvent('n8')));
    assert.equal(settleCashClimbV3(e), e);
    assert.throws(() => recordMatchResult(e, 'O1', W('p1')), /already settled/);
  });

  it('refuses to settle while matches remain', () => {
    const e = fixtureEvent('n8');
    assert.equal(settlementStatus(e).ready, false);
    assert.throws(() => settleCashClimbV3(e), /still to be resolved/);
  });
});

describe('Cash Climb V3 settlement: exceptional', () => {
  it('sole survivor: earnings stand, path half-awards paid, no finalist bonus, the rest is operator-retained', () => {
    let e = record(fixtureEvent('n8'), 'O1', W('p1'));
    for (const id of ['O2', 'O3', 'O4']) e = record(e, id, DF);
    assert.equal(e.matches['L1-1'].status, 'walkover');
    assert.equal(e.matches['L1-2'].status, 'void');
    assert.equal(e.matches['L2-1'].status, 'walkover');
    e = settleCashClimbV3(e);
    assert.equal(e.settlement.mode, 'exceptional');
    assert.equal(dollarsOf(e.ledger, 'L1-1:walkover-award:p1'), 55);
    assert.equal(dollarsOf(e.ledger, 'L2-1:champion-walkover-award:p1'), 72, 'half of round_half_up(0.8 x 180) = 144');
    const s = reconciled(e);
    assert.equal(s.earnedByPlayer.p1 / 100, 64 + 55 + 72);
    assert.equal(s.earnedByPlayer.p2 / 100, 21);
    assert.equal(s.operatorRetainedCents, 80000 - (64 + 21 + 55 + 72) * 100);
    assert.ok(!e.ledger.entries.some((x) => x.type.startsWith('finalist-bonus')));
  });

  it('zero survivors: nobody is paid and the whole pool is operator-retained', () => {
    let e = fixtureEvent('n8');
    for (const id of ['O1', 'O2', 'O3', 'O4']) e = record(e, id, DF);
    assert.ok(e.order.every((id) => e.matches[id].status !== 'open'));
    e = settleCashClimbV3(e);
    assert.equal(e.settlement.championId, null);
    const s = reconciled(e);
    assert.equal(s.earnedCents, 0);
    assert.equal(s.operatorRetainedCents, 80000);
  });

  it('zero survivors after some play: earlier winnings are never revoked', () => {
    let e = fixtureEvent('n8');
    for (const id of ['O1', 'O2', 'O3', 'O4']) e = record(e, id, W(e.matches[id].slots[0].entrant));
    e = record(e, 'L1-1', DF);
    e = record(e, 'L1-2', { outcome: 'double-withdrawal', racks: { p5: 3, p7: 3 } });
    assert.equal(e.matches['L2-1'].status, 'void');
    e = settleCashClimbV3(e);
    const s = reconciled(e);
    assert.equal(s.earnedCents, 4 * 85 * 100);
    assert.equal(s.operatorRetainedCents, 80000 - 34000);
  });

  it('championship pre-match forfeit settles as exceptional (one finalist remains)', () => {
    const e = settleCashClimbV3(playOut(fixtureEvent('n16odd'), { decide: (ev, id, [a, b]) => (id === ev.championshipId ? { outcome: 'forfeit', forfeiting: b } : W(a)) }));
    assert.equal(e.settlement.mode, 'exceptional');
    assert.equal(e.settlement.runnerUpId, null);
    const s = reconciled(e);
    assert.equal(s.operatorRetainedCents, (258 - 103) * 100 + 12000);
  });
});

describe('Cash Climb V3 settlement: interrupted championship (approved rule)', () => {
  const interrupted = (result) => playOut(fixtureEvent('n8'), { decide: (ev, id, [a, b]) => (id === ev.championshipId ? result(a, b) : W(a)) });

  it('one finalist withdraws: the other is champion by withdrawal, no new award, the balance is operator-retained', () => {
    const e = settleCashClimbV3(interrupted((a, b) => ({ outcome: 'withdrawal', withdrawing: b, racks: { [a]: 6, [b]: 5 } })));
    assert.equal(e.settlement.mode, 'exceptional');
    assert.equal(e.settlement.championId, 'p1');
    assert.equal(e.settlement.championBasis, 'withdrawal');
    assert.equal(e.settlement.runnerUpId, null);
    assert.ok(!e.ledger.entries.some((x) => x.matchId === e.championshipId || x.matchId === null));
    const s = reconciled(e);
    assert.equal(s.earnedByPlayer.p1 / 100, 64 + 110, 'earlier winnings stand');
    assert.equal(s.earnedByPlayer.p5 / 100, 64 + 110);
    assert.equal(s.operatorRetainedCents, 18000 + 6000, 'championship allocation plus opening leftovers');
  });

  it('both finalists withdraw: no champion, earlier winnings stand, the balance is operator-retained', () => {
    const e = settleCashClimbV3(interrupted((a, b) => ({ outcome: 'double-withdrawal', racks: { [a]: 6, [b]: 6 } })));
    assert.equal(settlementStatus({ ...e, settlement: null }).mode, 'exceptional');
    assert.equal(e.settlement.championId, null);
    assert.equal(e.settlement.championBasis, null);
    assert.equal(e.settlement.finalistBonusCents, 0);
    const s = reconciled(e);
    assert.equal(s.earnedCents, 80000 - 24000);
    assert.equal(s.operatorRetainedCents, 24000);
  });

  it('the pre-match championship forfeit rule is unchanged', () => {
    const e = settleCashClimbV3(interrupted((a, b) => ({ outcome: 'forfeit', forfeiting: b })));
    assert.equal(e.settlement.championBasis, 'forfeit');
    assert.equal(dollarsOf(e.ledger, 'L2-1:champion-forfeit-award:p1'), 72);
    reconciled(e);
  });
});
