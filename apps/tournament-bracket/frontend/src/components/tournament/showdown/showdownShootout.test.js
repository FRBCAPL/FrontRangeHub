import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createShootout, replayShootout, setLagWinner, recordRack, undoRack, rackBounds } from './showdownShootout.js';
import { seededRandom } from './showdownRandom.js';

const ids = (k) => Array.from({ length: k }, (_, i) => `S${i + 1}`);

function checkInvariants(sh, state) {
  const alive = sh.order.filter((id) => !state.eliminated.includes(id));
  if (state.status === 'in-progress') {
    const onTable = [state.holderId, state.challengerId];
    assert.equal(new Set([...onTable, ...state.queue]).size, onTable.length + state.queue.length, 'no duplicates');
    assert.deepEqual([...onTable, ...state.queue].sort(), [...alive].sort(), 'queue + table = survivors');
    state.queue.forEach((id) => assert.ok(!state.eliminated.includes(id), 'no eliminated player waiting'));
  }
  Object.entries(state.losses).forEach(([id, n]) => {
    assert.ok(n <= 2);
    assert.equal(n === 2, state.eliminated.includes(id));
  });
}

/** Walks every possible sequence of rack winners. */
function explore(sh, visit) {
  const state = replayShootout(sh);
  checkInvariants(sh, state);
  if (state.status === 'complete') { visit(sh, state); return; }
  [state.holderId, state.challengerId].forEach((w) => explore(recordRack(sh, w), visit));
}

describe('showdown shootout — every outcome for 2–6 players and every open-spot count', () => {
  for (let k = 2; k <= 6; k += 1) {
    for (let spots = 1; spots < k; spots += 1) {
      it(`${k} players, ${spots} spot(s)`, () => {
        const start = createShootout({ id: 'x', groupIds: ids(k), spots, random: seededRandom(k * 10 + spots) });
        const sh = setLagWinner(start, start.order[1]);
        const bounds = rackBounds(k, spots);
        let outcomes = 0;
        explore(sh, (final, state) => {
          outcomes += 1;
          assert.equal(state.survivors.length, spots);
          assert.equal(state.eliminated.length, k - spots);
          assert.ok(state.racks.length >= bounds.min && state.racks.length <= bounds.max, `racks=${state.racks.length}`);
          // Breaker: lag winner first, then always the incoming challenger.
          assert.equal(state.racks[0].breakerId, sh.lagWinnerId);
          state.racks.slice(1).forEach((r) => assert.equal(r.breakerId, r.challengerId));
          // Winner stays on the table.
          state.racks.slice(1).forEach((r, i) => assert.equal(r.holderId, state.racks[i].winnerId));
          // Everyone plays at least one rack before anyone is eliminated.
          const firstOut = state.racks.findIndex((r) => r.eliminatedId);
          const before = new Set(state.racks.slice(0, firstOut + 1).flatMap((r) => [r.holderId, r.challengerId]));
          assert.equal(before.size, k);
          // An eliminated player never appears in a later rack.
          state.racks.forEach((r, i) => {
            if (!r.eliminatedId) return;
            state.racks.slice(i + 1).forEach((later) => assert.ok(![later.holderId, later.challengerId].includes(r.eliminatedId)));
          });
        });
        assert.ok(outcomes > 0);
      });
    }
  }
});

describe('showdown shootout — procedure', () => {
  it('two players: two or three racks until someone has two losses', () => {
    let sh = setLagWinner(createShootout({ id: 'x', groupIds: ['A', 'B'], spots: 1, random: () => 0.99 }), 'A');
    assert.deepEqual(sh.order, ['A', 'B']);
    sh = recordRack(sh, 'A');
    let st = replayShootout(sh);
    assert.equal(st.status, 'in-progress');
    assert.equal(st.holderId, 'A');
    assert.equal(st.challengerId, 'B');
    assert.equal(st.breakerId, 'B');
    sh = recordRack(sh, 'B');
    sh = recordRack(sh, 'B');
    st = replayShootout(sh);
    assert.equal(st.status, 'complete');
    assert.deepEqual(st.survivors, ['B']);
    assert.equal(st.racks.length, 3);
  });

  it('loser goes to the back of the queue; next challenger comes from the front', () => {
    let sh = setLagWinner(createShootout({ id: 'x', groupIds: ['A', 'B', 'C', 'D'], spots: 2, random: () => 0.99 }), 'B');
    assert.deepEqual(sh.order, ['A', 'B', 'C', 'D']);
    sh = recordRack(sh, 'A');
    const st = replayShootout(sh);
    assert.equal(st.holderId, 'A');
    assert.equal(st.challengerId, 'C');
    assert.deepEqual(st.queue, ['D', 'B']);
    assert.deepEqual(st.racks[0], { n: 1, holderId: 'A', challengerId: 'B', breakerId: 'B', winnerId: 'A', loserId: 'B', eliminatedId: null, lossesAfter: { A: 0, B: 1, C: 0, D: 0 } });
  });

  it('undo removes the most recent rack exactly, then the lag', () => {
    let sh = setLagWinner(createShootout({ id: 'x', groupIds: ['A', 'B', 'C'], spots: 1, random: () => 0.99 }), 'A');
    const one = recordRack(sh, 'A');
    const two = recordRack(one, 'C');
    assert.deepEqual(replayShootout(undoRack(two)), replayShootout(one));
    sh = undoRack(undoRack(two));
    assert.equal(sh.rackWinners.length, 0);
    assert.equal(undoRack(sh).lagWinnerId, null);
  });

  it('rejects invalid input', () => {
    assert.throws(() => createShootout({ id: 'x', groupIds: ['A'], spots: 1 }));
    assert.throws(() => createShootout({ id: 'x', groupIds: ['A', 'B'], spots: 2 }));
    assert.throws(() => createShootout({ id: 'x', groupIds: ['A', 'A', 'B'], spots: 1 }));
    const sh = createShootout({ id: 'x', groupIds: ['A', 'B', 'C'], spots: 1, random: () => 0.99 });
    assert.throws(() => recordRack(sh, 'A'), /lag/);
    assert.throws(() => setLagWinner(sh, 'C'));
    const lagged = setLagWinner(sh, 'A');
    assert.throws(() => recordRack(lagged, 'C'), /not at the table/);
  });

  it('starting order is randomized', () => {
    const orders = new Set();
    for (let seed = 1; seed <= 20; seed += 1) orders.add(createShootout({ id: 'x', groupIds: ids(5), spots: 2, random: seededRandom(seed) }).order.join());
    assert.ok(orders.size > 5);
  });
});
