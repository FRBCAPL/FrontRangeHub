import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dollarsOf, fixtureEvent, playOut, record } from './cashClimbV3TestKit.js';
import { ledgerProblems, ledgerSummary } from './cashClimbV3Ledger.js';

const W = (winner, loserRacks = 3) => ({ outcome: 'completed', winner, loserRacks });
const earned = (e, p) => (ledgerSummary(e.ledger).earnedByPlayer[p] || 0) / 100;

/** n16 at $100 race to 7 with p1 reaching the semifinal: O1 7-3, L1-1 7-3. */
function p1ToSemifinal(name = 'n16') {
  let e = fixtureEvent(name);
  e = record(e, 'O1', W('p1'));
  e = record(e, 'O2', W('p3'));
  e = record(e, 'L1-1', W('p1'));
  return e;
}

describe('Cash Climb V3 payouts: opening matches', () => {
  it('a completed opening match pays the exact Score-Split ($100, race 7: 7-3 = $64 / $21, 7-0 = $100 / $0)', () => {
    let e = record(fixtureEvent('n16'), 'O1', W('p1', 3));
    assert.equal(dollarsOf(e.ledger, 'O1:score-split-winner:p1'), 64);
    assert.equal(dollarsOf(e.ledger, 'O1:score-split-loser:p2'), 21);
    e = record(e, 'O2', W('p3', 0));
    assert.equal(dollarsOf(e.ledger, 'O2:score-split-winner:p3'), 100);
    assert.ok(!e.ledger.entries.some((x) => x.playerId === 'p4'), 'a $0 loser award is not posted');
  });

  it('a completed preliminary match pays the half-scale Score-Split ($32 / $11 at 7-3)', () => {
    const e = record(fixtureEvent('n24'), 'P1', W('p1', 3));
    assert.equal(dollarsOf(e.ledger, 'P1:score-split-winner:p1'), 32);
    assert.equal(dollarsOf(e.ledger, 'P1:score-split-loser:p2'), 11);
  });

  it('an opening match interrupted at 5-3 pays base rack earnings only ($36 / $21), no premium or shutout', () => {
    const e = record(fixtureEvent('n16'), 'O1', { outcome: 'withdrawal', withdrawing: 'p2', racks: { p1: 5, p2: 3 } });
    assert.deepEqual(e.ledger.entries.map((x) => [x.key, x.cents / 100]), [['O1:rack-earnings:p1', 36], ['O1:rack-earnings:p2', 21]]);
  });

  it('a double withdrawal pays both players their racks; a preliminary pays half rate ($18 / $11 at 5-3)', () => {
    let e = record(fixtureEvent('n16'), 'O1', { outcome: 'double-withdrawal', racks: { p1: 5, p2: 3 } });
    assert.equal(earned(e, 'p1') + earned(e, 'p2'), 57);
    e = record(fixtureEvent('n24'), 'P1', { outcome: 'withdrawal', withdrawing: 'p1', racks: { p1: 5, p2: 3 } });
    assert.equal(dollarsOf(e.ledger, 'P1:rack-earnings:p1'), 18);
    assert.equal(dollarsOf(e.ledger, 'P1:rack-earnings:p2'), 11);
  });

  it('a single forfeit pays half the opening reserve, rounded half up ($125 entry: M $125 -> $63, H $63 -> $32)', () => {
    let e = record(fixtureEvent('n12odd'), 'O3', { outcome: 'forfeit', forfeiting: 'p9' });
    assert.equal(dollarsOf(e.ledger, 'O3:forfeit-award:p10'), 63);
    e = record(e, 'P1', { outcome: 'forfeit', forfeiting: 'p2' });
    assert.equal(dollarsOf(e.ledger, 'P1:forfeit-award:p1'), 32);
    assert.equal(earned(e, 'p9') + earned(e, 'p2'), 0);
  });

  it('a double forfeit pays nothing', () => {
    const e = record(fixtureEvent('n16'), 'O1', { outcome: 'double-forfeit' });
    assert.equal(e.ledger.entries.length, 0);
  });
});

describe('Cash Climb V3 payouts: later rounds', () => {
  it('a completed later-round match pays the fixed scheduled award to the winner', () => {
    const e = p1ToSemifinal();
    assert.equal(dollarsOf(e.ledger, 'L1-1:match-award:p1'), 70);
    assert.equal(earned(e, 'p3'), 64 + 0, 'the later-round loser gets nothing new');
    assert.equal(earned(e, 'p1'), 64 + 70);
  });

  it('half-pay forfeits round odd awards half up ($71 -> $36, $129 -> $65, $193 -> $97)', () => {
    let e = fixtureEvent('n16odd');
    e = record(e, 'O1', W('p1'));
    e = record(e, 'O2', W('p3'));
    e = record(e, 'L1-1', { outcome: 'forfeit', forfeiting: 'p3' });
    assert.equal(dollarsOf(e.ledger, 'L1-1:forfeit-award:p1'), 36);
    e = record(e, 'O3', W('p5'));
    e = record(e, 'O4', W('p7'));
    e = record(e, 'L1-2', W('p5'));
    e = record(e, 'L2-1', { outcome: 'forfeit', forfeiting: 'p5' });
    assert.equal(dollarsOf(e.ledger, 'L2-1:forfeit-award:p1'), 65);
    const f = playOut(fixtureEvent('n12odd'), { decide: (_, id, [a, b]) => (id === 'L1-1' ? { outcome: 'forfeit', forfeiting: b } : W(a)) });
    assert.equal(dollarsOf(f.ledger, 'L1-1:forfeit-award:p1'), 97);
  });

  it('a walkover pays half the scheduled award ($70 -> $35)', () => {
    let e = record(fixtureEvent('n16'), 'O1', { outcome: 'double-forfeit' });
    e = record(e, 'O2', W('p3'));
    assert.equal(dollarsOf(e.ledger, 'L1-1:walkover-award:p3'), 35);
  });

  it('an interrupted later-round match pays nothing new and keeps earlier winnings', () => {
    let e = p1ToSemifinal();
    e = record(e, 'O3', W('p5'));
    e = record(e, 'O4', W('p7'));
    e = record(e, 'L1-2', W('p5'));
    e = record(e, 'L2-1', { outcome: 'withdrawal', withdrawing: 'p1', racks: { p1: 4, p5: 2 } });
    assert.equal(earned(e, 'p1'), 134, 'p1 keeps $64 + $70 after withdrawing');
    assert.equal(e.ledger.entries.filter((x) => x.matchId === 'L2-1').length, 0);
    assert.equal(e.matches['L2-1'].winner, 'p5');
    assert.deepEqual(ledgerProblems(e.ledger), []);
  });
});

describe('Cash Climb V3 payouts: championship', () => {
  it('a completed championship splits 80/20, rounded half up ($258 -> $206 / $52; $362 -> $290 / $72)', () => {
    let e = playOut(fixtureEvent('n16odd'));
    assert.equal(dollarsOf(e.ledger, 'L3-1:champion-share:p1'), 206);
    assert.equal(dollarsOf(e.ledger, 'L3-1:runner-up-share:p9'), 52);
    e = playOut(fixtureEvent('n12odd'));
    assert.equal(dollarsOf(e.ledger, 'L2-1:champion-share:p1'), 290);
    assert.equal(dollarsOf(e.ledger, 'L2-1:runner-up-share:p9'), 72);
  });

  it('a championship pre-match forfeit pays half the rounded 80% share and no runner-up award ($206 -> $103; $290 -> $145)', () => {
    for (const [name, final, champ, half] of [['n16odd', 'L3-1', 'p1', 103], ['n12odd', 'L2-1', 'p1', 145]]) {
      const e = playOut(fixtureEvent(name), { decide: (ev, id, [a, b]) => (id === final ? { outcome: 'forfeit', forfeiting: b } : W(a)) });
      assert.equal(dollarsOf(e.ledger, `${final}:champion-forfeit-award:${champ}`), half, name);
      assert.equal(e.ledger.entries.filter((x) => x.matchId === final).length, 1, name);
    }
  });

  it('an interrupted championship pays nothing new', () => {
    const e = playOut(fixtureEvent('n8'), { decide: (ev, id, [a, b]) => (id === ev.championshipId ? { outcome: 'withdrawal', withdrawing: b, racks: { [a]: 6, [b]: 5 } } : W(a)) });
    assert.equal(e.ledger.entries.filter((x) => x.matchId === e.championshipId).length, 0);
    assert.deepEqual(ledgerProblems(e.ledger), []);
  });
});
