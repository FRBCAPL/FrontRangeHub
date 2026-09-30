import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addPlayer, createBreakAndRun, payRebuy, recordTurn, setAtTablePlayer, undoLast } from './breakAndRunEngine.js';
import { buildTableLineup, eligibleTablePlayers } from './breakAndRunTable.js';

function threePlayers() {
  return createBreakAndRun({
    memberFee: 10,
    openFee: 20,
    players: [
      { name: 'A', entryKind: 'member' },
      { name: 'B', entryKind: 'member' },
      { name: 'C', entryKind: 'member' },
    ],
  });
}

const lineNames = (state) => eligibleTablePlayers(state).map((p) => p.name);

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

  it('drops a $0 attempt from the line until the rebuy is paid, then joins at the back', () => {
    let state = threePlayers();
    state = setAtTablePlayer(state, state.players[0].id);
    state = recordTurn(state, state.players[0].id, { payableBalls: 0, outcome: 'scratch-break' });
    assert.deepEqual(lineNames(state), ['B', 'C']);
    assert.equal(buildTableLineup(state).atTable.name, 'B');

    state = payRebuy(state, state.players[0].id);
    assert.deepEqual(lineNames(state), ['B', 'C', 'A']);

    state = recordTurn(state, state.players[1].id, { payableBalls: 0, outcome: 'bust' });
    assert.deepEqual(lineNames(state), ['C', 'A']);
    assert.equal(buildTableLineup(state).atTable.name, 'C');
  });

  it('puts a paid rebuy behind players who bought in first', () => {
    let state = threePlayers();
    state = recordTurn(state, state.players[0].id, { payableBalls: 0, outcome: 'scratch-break' });
    state = addPlayer(state, { name: 'D', entryKind: 'member' });
    assert.deepEqual(lineNames(state), ['B', 'C', 'D']);
    state = payRebuy(state, state.players[0].id);
    assert.deepEqual(lineNames(state), ['B', 'C', 'D', 'A']);
  });

  it('shows no one at the table when nobody has a paid entry', () => {
    let state = createBreakAndRun({
      memberFee: 10,
      openFee: 20,
      players: [{ name: 'A', entryKind: 'member' }],
    });
    state = recordTurn(state, state.players[0].id, { payableBalls: 0, outcome: 'scratch-break' });
    const lineup = buildTableLineup(state);
    assert.equal(lineup.atTable, null);
    assert.equal(lineup.eligible.length, 0);
  });

  it('keeps line position when the attempt cashes out', () => {
    let state = threePlayers();
    state = recordTurn(state, state.players[0].id, { payableBalls: 1, outcome: 'cash-out' });
    assert.deepEqual(lineNames(state), ['B', 'C']);
  });

  it('undo restores the original line position', () => {
    let state = threePlayers();
    state = recordTurn(state, state.players[0].id, { payableBalls: 0, outcome: 'scratch-break' });
    assert.deepEqual(lineNames(state), ['B', 'C']);
    state = undoLast(state);
    assert.deepEqual(lineNames(state), ['A', 'B', 'C']);
  });
});
