import { test } from 'node:test';
import assert from 'node:assert/strict';
import { itemEndsAt, sortMyItems } from './consignmentMyItemsSort.js';

const items = [
  { id: 'sold', status: 'sold', created_at: '2026-11-09T00:00:00Z', expires_at: '2026-11-12T00:00:00Z' },
  { id: 'case-late', status: 'available', sale_method: 'consignment', expires_at: '2026-12-20T00:00:00Z', created_at: '2026-10-01T00:00:00Z' },
  { id: 'pending', status: 'pending', created_at: '2026-11-10T00:00:00Z' },
  { id: 'auction-soon', status: 'available', sale_method: 'auction', auction: { status: 'live', ends_at: '2026-11-11T21:52:00Z' }, created_at: '2026-11-01T00:00:00Z' },
  { id: 'auction-unsold', status: 'available', sale_method: 'auction', auction: { status: 'ended_no_bids', ends_at: '2026-11-05T00:00:00Z' }, created_at: '2026-10-20T00:00:00Z' },
  { id: 'case-soon', status: 'available', sale_method: 'consignment', expires_at: '2026-11-15T00:00:00Z', created_at: '2026-09-01T00:00:00Z' },
];

test('ending soonest first, then the rest newest first', () => {
  assert.deepEqual(sortMyItems(items).map((i) => i.id), [
    'auction-soon', 'case-soon', 'case-late', 'pending', 'sold', 'auction-unsold',
  ]);
});

test('only running listings have an end time', () => {
  assert.equal(itemEndsAt(items[0]), null);
  assert.equal(itemEndsAt(items[4]), null);
  assert.equal(itemEndsAt(items[3]), Date.parse('2026-11-11T21:52:00Z'));
  assert.equal(itemEndsAt({ status: 'available', sale_method: 'consignment' }), null);
});

test('does not change the original list', () => {
  const copy = [...items];
  sortMyItems(items);
  assert.deepEqual(items, copy);
});
