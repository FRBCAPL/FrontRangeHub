import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createOpenTournament, startTournament, recordMatchResult, getCurrentRound, getRoundMatches } from './cashClimbEngine.js';
import { cashClimbMoneyLocked, updateOpenTournament } from './cashClimbEdit.js';

describe('edit open Cash Climb', () => {
  it('updates name, date, race, and tables after start', () => {
    let state = startTournament(createOpenTournament({
      name: 'Friday Cash Climb',
      entryFee: 20,
      raceTo: 5,
      tableCount: 4,
      players: [{ name: 'Ann' }, { name: 'Ben' }, { name: 'Cam' }, { name: 'Dee' }],
    }));
    state = updateOpenTournament(state, {
      name: ' Saturday Climb ',
      tournamentDate: '2026-08-29',
      gameType: '9-Ball',
      raceTo: 7,
      tableCount: 2,
      entryFee: 20,
      placeCount: 1,
    });
    assert.equal(state.name, 'Saturday Climb');
    assert.equal(state.tournamentDate, '2026-08-29');
    assert.equal(state.gameType, '9-Ball');
    assert.equal(state.raceTo, 7);
    assert.equal(state.tableCount, 2);
  });

  it('rebuilds the prize pool if no real match has been played', () => {
    let state = startTournament(createOpenTournament({
      entryFee: 20,
      placeCount: 1,
      players: [{ name: 'Ann' }, { name: 'Ben' }, { name: 'Cam' }, { name: 'Dee' }],
    }));
    assert.equal(state.totalPrizePool, 80);
    assert.equal(cashClimbMoneyLocked(state), false);
    state = updateOpenTournament(state, {
      name: state.name,
      tournamentDate: state.tournamentDate,
      gameType: state.gameType,
      raceTo: state.raceTo,
      tableCount: state.tableCount,
      entryFee: 25,
      placeCount: 1,
    });
    assert.equal(state.totalPrizePool, 100);
    assert.equal(state.firstPlacePrize, 20);
    const matchScheduled = state.prizeSchedule.reduce((sum, n) => sum + n, 0);
    assert.ok(Math.abs(matchScheduled - 80) < 0.02);
  });

  it('does not change prize money after a real match is recorded', () => {
    let state = startTournament(createOpenTournament({
      entryFee: 20,
      players: [{ name: 'Ann' }, { name: 'Ben' }, { name: 'Cam' }, { name: 'Dee' }],
    }));
    const match = getRoundMatches(state, getCurrentRound(state).id).find((m) => m.status === 'pending');
    state = recordMatchResult(state, match.id, match.player1_id);
    assert.equal(cashClimbMoneyLocked(state), true);
    const pool = state.totalPrizePool;
    const paid = state.stats.reduce((sum, p) => sum + p.total_payout, 0);
    state = updateOpenTournament(state, {
      name: 'Still Friday',
      tournamentDate: state.tournamentDate,
      gameType: state.gameType,
      raceTo: 9,
      tableCount: 6,
      entryFee: 99,
      placeCount: 4,
    });
    assert.equal(state.name, 'Still Friday');
    assert.equal(state.raceTo, 9);
    assert.equal(state.tableCount, 6);
    assert.equal(state.totalPrizePool, pool);
    assert.equal(state.stats.reduce((sum, p) => sum + p.total_payout, 0), paid);
  });
});
