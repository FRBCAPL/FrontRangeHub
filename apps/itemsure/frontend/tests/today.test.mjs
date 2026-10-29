import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTodayTasks, MAX_LOW_SHOWN } from '../src/utils/itemsureToday.js';

const paths = {
  item: (id) => `/item/${id}`,
  shopping: '/shop',
  count: (id) => `/count/${id}`,
  review: (id) => `/review/${id}`,
};
const rec = (n, extra = {}) => ({
  target_id: `t${n}`, item_id: `i${n}`, item_name: `Item ${n}`, location_name: 'Legends', area_name: 'Bar',
  unit_symbol: 'btl', status: 'low', on_hand: '1', need: '8', external: '8', external_at_most: null, transfers: [], ...extra,
});

test('nothing to do gives an empty list', () => {
  assert.deepEqual(buildTodayTasks({ recs: [], plans: [], sessions: [], paths }), []);
  assert.deepEqual(buildTodayTasks({ paths }), []);
});

test('low items come first with what to do, and link to the item', () => {
  const [task] = buildTodayTasks({ recs: [rec(1)], paths });
  assert.equal(task.title, 'Item 1 is running low');
  assert.equal(task.detail, 'Legends \u00b7 Bar: 1 btl left. Buy 8 btl.');
  assert.equal(task.to, '/item/i1');
  assert.equal(task.tone, 'danger');
});

test('a move is suggested before buying, unless moving is switched off', () => {
  const r = rec(1, { transfers: [{ quantity: '5', same_location: true, area_name: 'Storeroom', location_name: 'Legends' }], external: '3' });
  assert.match(buildTodayTasks({ recs: [r], paths })[0].detail, /Move 5 btl from Storeroom\.$/);
  assert.match(buildTodayTasks({ recs: [r], showMoves: false, paths })[0].detail, /Buy 8 btl\.$/);
});

test('many low items are capped, with a link to the rest', () => {
  const recs = Array.from({ length: MAX_LOW_SHOWN + 2 }, (_, i) => rec(i));
  const tasks = buildTodayTasks({ recs, paths });
  assert.equal(tasks.length, MAX_LOW_SHOWN + 1);
  assert.equal(tasks.at(-1).title, '2 more items running low');
  assert.equal(tasks.at(-1).to, '/shop');
});

test('topping up, planned moves, and counts each get one line', () => {
  const tasks = buildTodayTasks({
    recs: [rec(1, { status: 'below_par' }), rec(2, { status: 'below_par' })],
    plans: [{ id: 'p1' }],
    sessions: [
      { id: 'c1', name: 'Friday bar', status: 'in_progress' },
      { id: 'c2', name: 'Thursday', status: 'submitted' },
      { id: 'c3', name: 'Done one', status: 'submitted' },
      { id: 'c4', name: 'Old', status: 'cancelled' },
    ],
    reviews: { c3: { decision: 'approved' } },
    canApprove: true,
    paths,
  });
  assert.deepEqual(tasks.map((t) => t.title), [
    '2 items need topping up',
    '1 planned move to finish',
    'Count in progress: Friday bar',
    'Count waiting for approval: Thursday',
  ]);
  assert.equal(tasks[3].to, '/review/c2');
});

test('only approvers see counts waiting for approval; no moves line when moving is off', () => {
  const tasks = buildTodayTasks({ plans: [{ id: 'p1' }], sessions: [{ id: 'c2', name: 'Thursday', status: 'submitted' }], showMoves: false, paths });
  assert.deepEqual(tasks, []);
});
