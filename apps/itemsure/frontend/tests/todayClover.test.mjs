import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCloverTasks, cloverProblem, daysSince, STALE_TAKE_DAYS } from '../src/utils/itemsureTodayClover.js';
import { buildTodayTasks } from '../src/utils/itemsureToday.js';
import { itemsNotOnClover, matchedItemIds } from '../src/utils/itemsurePosMatch.js';

const NOW = Date.parse('2026-11-04T20:00:00Z');
const daysAgo = (n) => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();
const fixPaths = { posSetup: '/pos', itemsNoClover: '/items?clover=unmatched' };
const keys = (tasks) => tasks.map((t) => t.key);

test('cloverProblem: a broken connection first, then paused imports, otherwise nothing', () => {
  assert.equal(cloverProblem({ status: 'error', last_error: 'Token was deleted.' }, { on: true, paused: true, error: 'x' }), 'Token was deleted.');
  assert.equal(cloverProblem({ status: 'error' }, null), 'Clover stopped answering.');
  assert.equal(cloverProblem({ status: 'active' }, { on: true, paused: true, error: 'Clover said no.' }), 'Automatic sales imports are paused: Clover said no.');
  assert.equal(cloverProblem({ status: 'active' }, { on: true, paused: false, error: 'One try failed.' }), null);
  assert.equal(cloverProblem({ status: 'active' }, { on: false, paused: true }), null);
  assert.equal(cloverProblem(null, null), null);
});

test('daysSince counts whole days and ignores missing dates', () => {
  assert.equal(daysSince(daysAgo(8), NOW), 8);
  assert.equal(daysSince(daysAgo(7.9), NOW), 7);
  assert.equal(daysSince(null, NOW), null);
});

test('every Clover line, in order: problem, take-off, buttons, amounts, items', () => {
  const tasks = buildCloverTasks({
    problem: 'Token was deleted.', takeOn: true, stockThrough: daysAgo(10),
    unmatchedButtons: 12, amounts: 3, guessed: 0, sizes: 0, unmatchedItems: 9,
  }, fixPaths, NOW);
  assert.deepEqual(keys(tasks), ['clover-problem', 'clover-take', 'clover-buttons', 'pos-setup', 'clover-items']);
  assert.equal(tasks[0].tone, 'danger');
  assert.equal(tasks[0].to, '/pos');
  assert.equal(tasks[1].title, 'Clover sales not taken off stock in 10 days');
  assert.equal(tasks[1].to, null);
  assert.equal(tasks[2].title, '12 Clover buttons not matched yet');
  assert.equal(tasks[4].title, '9 items not matched to Clover');
  assert.equal(tasks[4].to, '/items?clover=unmatched');
});

test('take-off reminder only when switched on and 8 or more days behind', () => {
  const at = (days, takeOn = true) => keys(buildCloverTasks({ takeOn, stockThrough: daysAgo(days) }, fixPaths, NOW));
  assert.deepEqual(at(STALE_TAKE_DAYS), ['clover-take']);
  assert.deepEqual(at(STALE_TAKE_DAYS - 1), []);
  assert.deepEqual(at(30, false), []);
  assert.deepEqual(keys(buildCloverTasks({ takeOn: true, stockThrough: null }, fixPaths, NOW)), []);
});

test('people who cannot fix Clover settings only see the take-off reminder', () => {
  const clover = { problem: 'x', takeOn: true, stockThrough: daysAgo(9), unmatchedButtons: 2, amounts: 1, unmatchedItems: 4 };
  assert.deepEqual(keys(buildCloverTasks(clover, {}, NOW)), ['clover-take']);
});

test('one button and one item use singular words; zero shows nothing', () => {
  const tasks = buildCloverTasks({ unmatchedButtons: 1, unmatchedItems: 1 }, fixPaths, NOW);
  assert.equal(tasks[0].title, '1 Clover button not matched yet');
  assert.equal(tasks[1].title, '1 item not matched to Clover');
  assert.deepEqual(buildCloverTasks({ unmatchedButtons: 0, unmatchedItems: 0 }, fixPaths, NOW), []);
  assert.deepEqual(buildCloverTasks(null, fixPaths, NOW), []);
});

test('Clover lines come after stock and counts on Today', () => {
  const tasks = buildTodayTasks({
    recs: [{ target_id: 't', item_id: 'i', item_name: 'Rum', location_name: 'Legends', area_name: 'Bar', unit_symbol: 'btl', status: 'low', on_hand: '1', need: '2', transfers: [] }],
    sessions: [{ id: 'c1', name: 'Friday', status: 'in_progress' }],
    clover: { problem: 'Token was deleted.' },
    paths: { item: (id) => `/item/${id}`, count: (id) => `/count/${id}`, ...fixPaths },
    now: NOW,
  });
  assert.deepEqual(keys(tasks), ['low:t', 'count:c1', 'clover-problem']);
});

test('itemsNotOnClover skips matched, archived, and Not sold in Clover items', () => {
  const items = [
    { id: 'rum', is_active: true },
    { id: 'gin', is_active: true },
    { id: 'old', is_active: false },
    { id: 'napkins', is_active: true, notSoldInPos: true },
  ];
  const matched = matchedItemIds(new Map([['shot', ['rum']], ['mojito', ['rum']]]));
  assert.deepEqual(itemsNotOnClover(items, matched).map((i) => i.id), ['gin']);
  assert.deepEqual(itemsNotOnClover(items, new Set()).map((i) => i.id), ['rum', 'gin']);
});
