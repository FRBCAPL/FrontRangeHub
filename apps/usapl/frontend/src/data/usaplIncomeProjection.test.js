import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  attachIncomeWeekTotals,
  centsToDollars,
  parseIncomeSplitList,
  parsePositiveInt,
  projectUsaplIncome,
} from './usaplIncomeProjection.js';

describe('usaplIncomeProjection', () => {
  it('projects from weekly team dues', () => {
    assert.equal(parsePositiveInt('5'), 5);
    const result = projectUsaplIncome({
      teams: 10,
      playersPerTeam: 5,
      weeks: 10,
      playerDuesDollars: 10,
      playType: 'single',
      splits: {
        10: { single: { 5: { prize: 20, csi: 10, lo: 20 } } },
      },
    });
    assert.equal(result.team_dues_cents, 5000);
    assert.equal(result.gross_cents, 500000);
    assert.equal(result.prize_cents, 200000);
    assert.equal(result.play_type, 'single');
    assert.equal(centsToDollars(result.csi_cents), '$1,000.00');
    assert.equal(result.csi_week_cents, 10000);
    assert.equal(result.lo_week_cents, 20000);
  });

  it('uses different chart rows for 4-player and 5-player teams', () => {
    const splits = {
      10: {
        single: {
          4: { prize: 16, csi: 8, lo: 16 },
          5: { prize: 20, csi: 10, lo: 20 },
        },
      },
    };
    const four = projectUsaplIncome({
      teams: 10,
      playersPerTeam: 4,
      weeks: 10,
      playerDuesDollars: 10,
      playType: 'single',
      splits,
    });
    const five = projectUsaplIncome({
      teams: 10,
      playersPerTeam: 5,
      weeks: 10,
      playerDuesDollars: 10,
      playType: 'single',
      splits,
    });
    assert.equal(four.team_dues_cents, 4000);
    assert.equal(five.team_dues_cents, 5000);
    assert.equal(four.prize_cents, 160000);
    assert.equal(five.prize_cents, 200000);
  });

  it('parses saved dues, play type, and players without chart dollars', () => {
    const rows = parseIncomeSplitList([
      { dues_cents: 1000, play_type: 'double', players: 4 },
      { dues_cents: 1500, play_type: 'single', players: 5 },
    ]);
    assert.equal(rows[0].play_type, 'double');
    assert.equal(rows[0].players, 4);
    assert.equal(rows[0].team_dues_cents, 8000);
    assert.equal(rows[1].dues_cents, 1500);
  });

  it('allows zero on a chart line and requires the three buckets to equal one-match dues', () => {
    const result = projectUsaplIncome({
      teams: 2,
      playersPerTeam: 1,
      weeks: 1,
      playerDuesDollars: 10,
      playType: 'single',
      splits: { 10: { single: { 1: { prize: 0, csi: 2.5, lo: 7.5 } } } },
    });
    assert.equal(result.prize_cents, 0);
    assert.equal(result.csi_cents, 500);
    assert.throws(() => projectUsaplIncome({
      teams: 1,
      playersPerTeam: 1,
      weeks: 1,
      playerDuesDollars: 10,
      playType: 'single',
      splits: { 10: { single: { 1: { prize: 9, csi: 2, lo: 0 } } } },
    }), /add up to one team/);
  });

  it('doubles dues and the three buckets for double play', () => {
    const result = projectUsaplIncome({
      teams: 4,
      playersPerTeam: 5,
      weeks: 1,
      playerDuesDollars: 10,
      playType: 'double',
      splits: { 10: { double: { 5: { prize: 25, csi: 16, lo: 9 } } } },
    });
    assert.equal(result.team_dues_cents, 10000);
    assert.equal(result.gross_cents, 40000);
    assert.equal(result.prize_cents, 20000);
    assert.equal(result.csi_cents, 12800);
    assert.equal(result.lo_cents, 7200);
    assert.equal(result.prize_cents + result.csi_cents + result.lo_cents, result.gross_cents);
  });

  it('doubles an undoubled league payload when play is double', () => {
    const attached = attachIncomeWeekTotals({
      teams: 4,
      weeks: 16,
      players_per_team: 5,
      player_dues_cents: 1000,
      team_dues_cents: 5000,
      prize_cents: 224000,
      csi_cents: 64000,
      lo_cents: 32000,
    }, 'double');
    assert.equal(attached.team_dues_cents, 10000);
    assert.equal(attached.gross_cents, 640000);
    assert.equal(attached.prize_cents, 448000);
    assert.equal(attached.prize_cents + attached.csi_cents + attached.lo_cents, attached.gross_cents);
  });

  it('does not double a payload that already includes both matches', () => {
    const attached = attachIncomeWeekTotals({
      teams: 4,
      weeks: 16,
      players_per_team: 5,
      player_dues_cents: 1000,
      team_dues_cents: 10000,
      play_type: 'double',
      prize_cents: 448000,
      csi_cents: 128000,
      lo_cents: 64000,
    }, 'double');
    assert.equal(attached.team_dues_cents, 10000);
    assert.equal(attached.prize_cents, 448000);
    assert.equal(attached.gross_cents, 640000);
  });

  it('uses the even team count below an odd division because of the weekly bye', () => {
    const splits = { 10: { double: { 5: { prize: 25, csi: 16, lo: 9 } } } };
    const four = projectUsaplIncome({
      teams: 4,
      playersPerTeam: 5,
      weeks: 16,
      playerDuesDollars: 10,
      playType: 'double',
      splits,
    });
    const five = projectUsaplIncome({
      teams: 5,
      playersPerTeam: 5,
      weeks: 16,
      playerDuesDollars: 10,
      playType: 'double',
      splits,
    });
    assert.equal(five.paying_teams, 4);
    assert.equal(five.gross_cents, four.gross_cents);
    assert.equal(five.prize_cents, four.prize_cents);
    assert.equal(five.gross_cents, 640000);
    assert.equal(five.prize_cents, 320000);
    assert.equal(five.prize_cents + five.csi_cents + five.lo_cents, five.gross_cents);
  });

  it('scales an undoubled odd-division payload down to paying teams', () => {
    const attached = attachIncomeWeekTotals({
      teams: 5,
      weeks: 16,
      players_per_team: 5,
      player_dues_cents: 1000,
      team_dues_cents: 5000,
      prize_cents: 200000,
      csi_cents: 128000,
      lo_cents: 72000,
    }, 'double');
    assert.equal(attached.paying_teams, 4);
    assert.equal(attached.team_dues_cents, 10000);
    assert.equal(attached.gross_cents, 640000);
    assert.equal(attached.prize_cents, 320000);
    assert.equal(attached.prize_cents + attached.csi_cents + attached.lo_cents, attached.gross_cents);
  });
});
