import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addPlayer,
  addToPot,
  createBreakAndRun,
  recordTurn,
  setReserve,
  undoLast,
} from './breakAndRunEngine.js';
import { money } from './breakAndRunMath.js';

function pot(players = 2) {
  return createBreakAndRun({
    name: 'Friday B&R',
    memberFee: 10,
    openFee: 20,
    players: Array.from({ length: players }, (_, i) => ({
      name: `P${i + 1}`,
      entryKind: 'member',
    })),
  });
}

describe('break and run engine', () => {
  it('opens a pot from member entries', () => {
    const event = pot(4);
    assert.equal(event.kind, 'break-and-run');
    assert.equal(event.currentPot, 40);
    assert.equal(event.ballCount, 10);
    assert.equal(event.players[0].buyIns, 1);
    assert.equal(event.players[0].paidIn, 10);
    assert.equal(event.players[0].entryKind, 'member');
  });

  it('charges open fee for non-members', () => {
    const event = createBreakAndRun({
      players: [
        { name: 'Tour', entryKind: 'member' },
        { name: 'Open', entryKind: 'open' },
      ],
    });
    assert.equal(event.currentPot, 30);
    assert.equal(event.players[1].paidIn, 20);
  });

  it('maps legacy tournament entry kind to member', () => {
    const event = createBreakAndRun({
      players: [{ name: 'Legacy', entryKind: 'tournament' }],
    });
    assert.equal(event.players[0].entryKind, 'member');
    assert.equal(event.players[0].paidIn, 10);
  });

  it('pays pot divided by 10 per payable ball and keeps the rest', () => {
    const start = createBreakAndRun({
      startingSeed: 500,
      memberFee: 0,
      openFee: 0,
      players: [{ name: 'A', entryKind: 'member' }],
    });
    const after = recordTurn(start, start.players[0].id, { payableBalls: 5, earlyTen: true });
    assert.equal(after.totalPaidOut, 350);
    assert.equal(after.currentPot, 150);
    assert.equal(after.turns[0].earlyTen, true);
  });

  it('holds reserve out of payouts', () => {
    const start = createBreakAndRun({
      startingSeed: 500,
      reserve: 100,
      memberFee: 0,
      openFee: 0,
      players: [{ name: 'A', entryKind: 'member' }],
    });
    const after = recordTurn(start, start.players[0].id, { payableBalls: 5, earlyTen: true });
    assert.equal(after.totalPaidOut, 280);
    assert.equal(after.currentPot, 220);
    assert.equal(after.reserve, 100);
  });

  it('lets the operator change reserve mid-event', () => {
    const start = pot(2);
    const next = setReserve(start, 15);
    assert.equal(next.reserve, 15);
  });

  it('pays a partial run and keeps unpaid ball shares in the pot', () => {
    const start = pot(5);
    const after = recordTurn(start, start.players[0].id, { payableBalls: 3 });
    assert.equal(after.totalPaidOut, 15);
    assert.equal(money(after.currentPot + after.totalPaidOut), 50);
  });

  it('adds later player entries to the live pot', () => {
    let event = pot(1);
    event = addPlayer(event, { name: 'Late', entryKind: 'tournament' });
    assert.equal(event.currentPot, 20);
  });

  it('undoes the last payout', () => {
    const start = pot(2);
    const paid = recordTurn(start, start.players[0].id, { payableBalls: 4 });
    const undone = undoLast(paid);
    assert.equal(undone.currentPot, start.currentPot);
    assert.equal(undone.totalPaidOut, 0);
    assert.equal(undone.players[0].won, 0);
  });

  it('can add or take house money from the pot', () => {
    const added = addToPot(pot(2), 5, 'Seed');
    assert.equal(added.currentPot, 25);
    const taken = addToPot(added, -5, 'House');
    assert.equal(taken.currentPot, 20);
  });

  it('scratch on the break pays nothing even if balls were entered', () => {
    const start = pot(2);
    const after = recordTurn(start, start.players[0].id, {
      payableBalls: 8,
      earlyTen: true,
      scratchOnBreak: true,
    });
    assert.equal(after.totalPaidOut, 0);
    assert.equal(after.currentPot, 20);
    assert.equal(after.turns[0].scratchOnBreak, true);
    assert.equal(after.turns[0].outcome, 'scratch-break');
    assert.equal(after.turns[0].earlyTen, false);
  });

  it('cash out pays payable balls', () => {
    const start = createBreakAndRun({
      startingSeed: 500,
      memberFee: 0,
      openFee: 0,
      players: [{ name: 'A', entryKind: 'member' }],
    });
    const after = recordTurn(start, start.players[0].id, {
      payableBalls: 5,
      outcome: 'cash-out',
    });
    assert.equal(after.totalPaidOut, 250);
    assert.equal(after.turns[0].outcome, 'cash-out');
  });

  it('bust pays nothing even when balls were made', () => {
    const start = createBreakAndRun({
      startingSeed: 500,
      memberFee: 0,
      openFee: 0,
      players: [{ name: 'A', entryKind: 'member' }],
    });
    const after = recordTurn(start, start.players[0].id, {
      payableBalls: 5,
      outcome: 'bust',
    });
    assert.equal(after.totalPaidOut, 0);
    assert.equal(after.currentPot, 500);
    assert.equal(after.turns[0].outcome, 'bust');
    assert.equal(after.turns[0].busted, true);
    assert.equal(after.turns[0].payableBalls, 5);
    assert.equal(after.turns[0].amountWon, 0);
  });

  it('bust with payable balls blocks rebuy', () => {
    const start = pot(2);
    const after = recordTurn(start, start.players[0].id, {
      payableBalls: 3,
      outcome: 'bust',
    });
    assert.equal(after.totalPaidOut, 0);
    assert.throws(
      () => recordTurn(after, after.players[0].id, { payableBalls: 1, outcome: 'cash-out' }),
      /no rebuy/i,
    );
  });

  it('zero balls still allows one rebuy even after a bust with no payable balls', () => {
    const start = pot(2);
    const first = recordTurn(start, start.players[0].id, {
      payableBalls: 0,
      outcome: 'bust',
    });
    const rebuy = recordTurn(first, first.players[0].id, {
      payableBalls: 2,
      outcome: 'cash-out',
    });
    assert.equal(rebuy.turns[0].isRebuyTurn, true);
    assert.ok(rebuy.totalPaidOut > 0);
  });
});
