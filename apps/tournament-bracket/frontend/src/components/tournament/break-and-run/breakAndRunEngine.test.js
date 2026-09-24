import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addPlayer,
  addToPot,
  createBreakAndRun,
  endSession,
  payRebuy,
  recordTurn,
  setReserve,
  startSession,
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

  it('bust with balls still allows rebuy because payout was $0', () => {
    const start = pot(2);
    const after = recordTurn(start, start.players[0].id, {
      payableBalls: 3,
      outcome: 'bust',
    });
    assert.equal(after.totalPaidOut, 0);
    const paid = payRebuy(after, after.players[0].id);
    const rebuy = recordTurn(paid, paid.players[0].id, {
      payableBalls: 1,
      outcome: 'cash-out',
    });
    assert.equal(rebuy.turns[0].isRebuyTurn, true);
    assert.equal(rebuy.turns[0].amountWon, 3);
  });

  it('allows unlimited rebuys after unpaid attempts', () => {
    let state = pot(2);
    state = recordTurn(state, state.players[0].id, {
      payableBalls: 0,
      outcome: 'scratch-break',
    });
    state = payRebuy(state, state.players[0].id);
    state = recordTurn(state, state.players[0].id, {
      payableBalls: 0,
      outcome: 'bust',
    });
    state = payRebuy(state, state.players[0].id);
    state = recordTurn(state, state.players[0].id, {
      payableBalls: 0,
      outcome: 'scratch-break',
    });
    assert.equal(state.players[0].runs, 3);
    assert.equal(state.players[0].buyIns, 3);
  });

  it('requires paying the rebuy before recording the rebuy try', () => {
    const start = pot(2);
    const scratched = recordTurn(start, start.players[0].id, {
      payableBalls: 0,
      outcome: 'scratch-break',
    });
    assert.throws(
      () => recordTurn(scratched, scratched.players[0].id, { payableBalls: 1, outcome: 'cash-out' }),
      /rebuy first/i,
    );
    const paid = payRebuy(scratched, scratched.players[0].id);
    assert.equal(paid.currentPot, 30);
    const tryTurn = recordTurn(paid, paid.players[0].id, {
      payableBalls: 1,
      outcome: 'cash-out',
    });
    assert.equal(tryTurn.turns[0].isRebuyTurn, true);
    assert.equal(tryTurn.turns[0].amountWon, 3);
  });

  it('locks the player for the rest of the session after a cash-out payout', () => {
    const start = pot(2);
    const cashed = recordTurn(
      start,
      start.players[0].id,
      { payableBalls: 2, outcome: 'cash-out' },
    );
    assert.ok(cashed.turns[0].amountWon > 0);
    assert.throws(
      () => payRebuy(cashed, cashed.players[0].id),
      /finished for this session/i,
    );
    assert.throws(
      () => recordTurn(
        cashed,
        cashed.players[0].id,
        { payableBalls: 1, outcome: 'cash-out' },
      ),
      /finished for this session/i,
    );
  });

  it('lets a cashed-out player play again after the next session starts', () => {
    let state = pot(2);
    state = recordTurn(state, state.players[0].id, { payableBalls: 2, outcome: 'cash-out' });
    const potAfterCash = state.currentPot;
    const firstSessionId = state.currentSessionId;
    state = startSession(state, { name: 'Night 2' });
    assert.notEqual(state.currentSessionId, firstSessionId);
    assert.equal(state.currentPot, potAfterCash);
    assert.equal(state.sessions.filter((s) => s.status === 'closed').length, 1);
    assert.equal(state.sessions.filter((s) => s.status === 'open').length, 1);
    state = recordTurn(state, state.players[0].id, { payableBalls: 1, outcome: 'cash-out' });
    assert.equal(state.turns[0].attempt, 1);
    assert.equal(state.turns[0].sessionId, state.currentSessionId);
    assert.equal(state.turns[0].isRebuyTurn, false);
  });

  it('blocks turns after a session ends until a new session starts', () => {
    let state = pot(2);
    state = endSession(state);
    assert.throws(
      () => recordTurn(state, state.players[0].id, { payableBalls: 1, outcome: 'cash-out' }),
      /session has ended/i,
    );
    state = startSession(state, { name: 'Next' });
    const after = recordTurn(state, state.players[0].id, { payableBalls: 1, outcome: 'cash-out' });
    assert.equal(after.turns[0].attempt, 1);
  });

  it('stamps each turn with the current calendar day when recorded', () => {
    const start = pot(1);
    const at = new Date('2026-09-22T18:30:00.000Z');
    const after = recordTurn(
      start,
      start.players[0].id,
      { payableBalls: 0, outcome: 'scratch-break' },
      { at: at.toISOString() },
    );
    assert.equal(after.turns[0].date, '2026-09-22');
    assert.equal(after.turns[0].at, at.toISOString());
    assert.ok(after.turns[0].sessionId);
    assert.equal(after.currentSessionId, after.turns[0].sessionId);
  });
});
