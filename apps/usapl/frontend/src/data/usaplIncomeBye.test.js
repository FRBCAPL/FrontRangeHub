import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { usaplByeTeams, usaplPayingTeams } from './usaplIncomeBye.js';

describe('usaplIncomeBye', () => {
  it('bills the even count below an odd division', () => {
    assert.equal(usaplPayingTeams(4), 4);
    assert.equal(usaplPayingTeams(5), 4);
    assert.equal(usaplPayingTeams(7), 6);
    assert.equal(usaplByeTeams(5), 1);
    assert.equal(usaplByeTeams(6), 0);
  });
});
