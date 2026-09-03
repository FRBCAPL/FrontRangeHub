import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { usaplVegasPendingSlots, usaplVegasSeedBoard, usaplVegasSeedResult, usaplWinnerTickerItems } from './usaplVegasSeeds.js';

function division(overrides) {
  return {
    id: 'd1',
    name: 'Wednesday Double Play',
    shortName: '13861 / 13061',
    format: 'Not running · Double play 8-ball & 10-ball',
    playStarts: '2026-01-07',
    lastWeek: '2026-04-01',
    archived: true,
    leagueNumbers: '13861/13061',
    winnerTeam: '',
    winnerTeamB: '',
    ...overrides,
  };
}

describe('usaplVegasSeedBoard', () => {
  it('ranks by division wins, with more wins as the higher seed', () => {
    const board = usaplVegasSeedBoard([
      division({
        id: 'a',
        winnerTeam: 'Rack Attack',
        winnerTeamB: 'Rack Attack',
      }),
      division({
        id: 'b',
        leagueNumbers: '23861/23061',
        lastWeek: '2026-08-01',
        winnerTeam: 'Break Time',
        winnerTeamB: '',
      }),
    ], 2026);

    assert.equal(board[0].name, 'Rack Attack');
    assert.equal(board[0].wins, 2);
    assert.equal(board[0].seedLabel, '#1');
    assert.equal(board[0].displayName, 'Rack Attack (2)');
    assert.equal(board[1].name, 'Break Time');
    assert.equal(board[1].wins, 1);
    assert.equal(board[1].seedLabel, '#2');
  });

  it('counts posted winners on current nights, not only archived', () => {
    const board = usaplVegasSeedBoard([
      division({
        archived: false,
        format: 'Double play 8-ball & 10-ball',
        winnerTeam: 'Cue Crew',
        winnerTeamB: 'Side Pocket',
      }),
    ], 2026);

    assert.equal(board.length, 2);
    assert.equal(board[0].wins, 1);
    assert.equal(board[0].seedLabel, 'T-1');
    assert.equal(board[1].seedLabel, 'T-1');
  });

  it('lists past titles that still need a winner', () => {
    const pending = usaplVegasPendingSlots([
      division({ winnerTeam: '', winnerTeamB: '' }),
    ], 2026);
    assert.equal(pending.length, 2);
    assert.match(pending[0].label, /13861/);
    assert.match(pending[1].label, /13061/);
  });

  it('drops inactive teams from seeding and moves remaining winners up', () => {
    const board = usaplVegasSeedBoard([
      division({
        id: 'a',
        winnerTeam: 'Rack Attack',
        winnerTeamB: 'Rack Attack',
      }),
      division({
        id: 'b',
        leagueNumbers: '23861/23061',
        lastWeek: '2026-08-01',
        winnerTeam: 'Break Time',
        winnerTeamB: '',
      }),
    ], 2026, [{ teamName: 'Rack Attack', reason: 'No longer active' }]);

    assert.equal(board.length, 1);
    assert.equal(board[0].name, 'Break Time');
    assert.equal(board[0].seedLabel, '#1');
    assert.equal(board[0].eligible, true);
  });

  it('keeps DQ teams listed as winners but not seeded', () => {
    const result = usaplVegasSeedResult([
      division({
        winnerTeam: 'Rack Attack',
        winnerTeamB: 'Rack Attack',
      }),
    ], 2026, [{ teamName: 'Rack Attack' }]);
    assert.equal(result.board.length, 0);
    assert.equal(result.ineligible[0].name, 'Rack Attack');
    assert.equal(result.ineligible[0].wins, 2);
    assert.equal(result.ineligible[0].seedLabel, 'DQ');
    assert.equal(result.ineligible[0].reason, 'No longer active');
  });

  it('ticker lists each team once with division numbers and seed', () => {
    const result = usaplVegasSeedResult([
      division({
        id: 'a',
        winnerTeam: 'Rack Attack',
        winnerTeamB: 'Rack Attack',
      }),
      division({
        id: 'b',
        leagueNumbers: '23861/23061',
        lastWeek: '2026-08-01',
        winnerTeam: 'Break Time',
        winnerTeamB: '',
      }),
    ], 2026, [{ teamName: 'Rack Attack' }]);
    const items = usaplWinnerTickerItems([...result.board, ...result.ineligible]);
    assert.equal(items.length, 2);
    assert.equal(items[0].text, 'Break Time · 23861 · #1 seed');
    assert.equal(items[1].text, 'Rack Attack · 13861 · 13061 · not eligible');
  });
});
