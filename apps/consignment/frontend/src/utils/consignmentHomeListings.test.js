import test from 'node:test';
import assert from 'node:assert/strict';
import { forSaleListings, homeRow, shopCounts } from './consignmentHomeListings.js';

const rows = [
  { id: 'a', status: 'available', sale_method: 'consignment', created_at: '2026-11-01' },
  { id: 'b', status: 'available', sale_method: 'auction', created_at: '2026-11-03' },
  { id: 'c', status: 'available', sale_method: 'auction', created_at: '2026-11-04' },
  { id: 'd', status: 'sold', sale_method: 'consignment', created_at: '2026-11-05' },
  { id: 'e', status: 'available', sale_method: 'consignment', is_example: true, created_at: '2026-11-06' },
  { id: 'f', status: 'available', sale_method: 'consignment', created_at: '2026-10-01', intake_at: '2026-11-07' },
];

test('for sale: real, available, auctions only while live', () => {
  const list = forSaleListings(rows, { b: { status: 'live' }, c: { status: 'ended_no_bids' } });
  assert.deepEqual(list.map((r) => r.id), ['a', 'b', 'f']);
  assert.deepEqual(shopCounts(list), { case: 2, auctions: 1, total: 3 });
});

test('home row: newest first (intake date wins), topped up with examples', () => {
  const list = forSaleListings(rows, { b: { status: 'live' } });
  const examples = [{ id: 'x1', is_example: true }, { id: 'x2', is_example: true }];
  assert.deepEqual(homeRow(list, examples, 4).map((r) => r.id), ['f', 'c', 'b', 'a']);
  assert.deepEqual(homeRow(list.slice(0, 1), examples, 4).map((r) => r.id), ['a', 'x1', 'x2']);
  assert.deepEqual(homeRow([], [], 4), []);
});
