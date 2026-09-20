import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUsaplTeamPlayers, weeklyTeamDuesCents } from './usaplIncomeTeamSize.js';

describe('usaplIncomeTeamSize', () => {
  it('computes weekly team dues from player dues', () => {
    assert.equal(normalizeUsaplTeamPlayers('4'), 4);
    assert.equal(weeklyTeamDuesCents(1000, 5), 5000);
    assert.equal(weeklyTeamDuesCents(1000, 4), 4000);
  });
});
