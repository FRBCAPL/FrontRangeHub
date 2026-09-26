import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createBreakAndRun, recordTurn, setAtTablePlayer } from './breakAndRunEngine.js';
import { buildTableLineup, eligibleTablePlayers } from './breakAndRunTable.js';

describe('break and run table lineup', () => {
  it('puts the chosen shooter at the table and others up next', () => {
    let state = createBreakAndRun({
      memberFee: 0,
      openFee: 0,
      players: [
        { name: 'A', entryKind: 'member' },
        { name: 'B', entryKind: 'member' },
        { name: 'C', entryKind: 'member' },
      ],
    });
    state = setAtTablePlayer(state, state.players[1].id);
    const lineup = buildTableLineup(state);
    assert.equal(lineup.atTable.name, 'B');
    assert.deepEqual(lineup.upNext.map((p) => p.name), ['A', 'C']);
  });

  it('advances the table after a recorded turn', () => {
    let state = createBreakAndRun({
      memberFee: 0,
      openFee: 0,
      players: [
        { name: 'A', entryKind: 'member' },
        { name: 'B', entryKind: 'member' },
      ],
    });
    state = setAtTablePlayer(state, state.players[0].id);
    state = recordTurn(state, state.players[0].id, { payableBalls: 0, outcome: 'scratch-break' });
    const lineup = buildTableLineup(state);
    assert.equal(lineup.atTable.name, 'B');
    assert.equal(eligibleTablePlayers(state).length, 2);
  });
});
