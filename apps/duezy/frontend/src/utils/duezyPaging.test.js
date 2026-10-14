import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchAllPages } from './duezyPaging.js';

/** A fake query over `total` rows that, like Supabase, never returns more than `cap` rows per request. */
function fakeTable(total, cap = 1000) {
  const calls = [];
  const build = () => ({
    range: async (from, to) => {
      calls.push([from, to]);
      const end = Math.min(to + 1, from + cap, total);
      return { data: Array.from({ length: Math.max(0, end - from) }, (_, i) => ({ id: from + i })), error: null };
    },
  });
  return { build, calls };
}

test('loads every row past the 1,000-row cap', async () => {
  const { build, calls } = fakeTable(2345);
  const { data, error } = await fetchAllPages(build);
  assert.equal(error, null);
  assert.equal(data.length, 2345);
  assert.equal(new Set(data.map((r) => r.id)).size, 2345);
  assert.deepEqual(calls, [[0, 999], [1000, 1999], [2000, 2999]]);
});

test('an exact multiple of the page size takes one extra (empty) request', async () => {
  const { build, calls } = fakeTable(2000);
  const { data } = await fetchAllPages(build);
  assert.equal(data.length, 2000);
  assert.equal(calls.length, 3);
});

test('small and empty tables take one request', async () => {
  for (const total of [0, 7]) {
    const { build, calls } = fakeTable(total);
    const { data } = await fetchAllPages(build);
    assert.equal(data.length, total);
    assert.equal(calls.length, 1);
  }
});

test('max stops early and trims the last page', async () => {
  const { build, calls } = fakeTable(9000);
  const { data } = await fetchAllPages(build, { max: 2500 });
  assert.equal(data.length, 2500);
  assert.deepEqual(calls, [[0, 999], [1000, 1999], [2000, 2499]]);
});

test('an error stops and is passed back', async () => {
  let n = 0;
  const build = () => ({
    range: async () => (n++ === 0 ? { data: Array(1000).fill({}), error: null } : { data: null, error: { message: 'boom' } }),
  });
  const { data, error } = await fetchAllPages(build);
  assert.equal(data, null);
  assert.equal(error.message, 'boom');
});
