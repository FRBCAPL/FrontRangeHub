import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countNewListings, newListingsLabel } from './consignmentNewListings.js';

const NOW = Date.parse('2026-10-11T12:00:00Z');
const daysAgo = (d) => new Date(NOW - d * 24 * 60 * 60 * 1000).toISOString();

test('counts case items from intake_at, falling back to created_at', () => {
  const items = [
    { status: 'available', sale_method: 'fixed', intake_at: daysAgo(1), created_at: daysAgo(10) },
    { status: 'available', sale_method: 'fixed', intake_at: daysAgo(5), created_at: daysAgo(1) },
    { status: 'available', sale_method: 'fixed', created_at: daysAgo(2) },
    { status: 'available', sale_method: 'fixed', created_at: daysAgo(1), is_example: true },
    { status: 'available', sale_method: 'auction', created_at: daysAgo(1) },
  ];
  assert.deepEqual(countNewListings({ items, now: NOW }), { shelf: 2, auction: 0 });
});

test('counts live auctions started in the last 3 days', () => {
  const auctions = [
    { status: 'live', starts_at: daysAgo(0.5) },
    { status: 'live', starts_at: daysAgo(4) },
    { status: 'ended_no_bids', starts_at: daysAgo(1) },
  ];
  assert.deepEqual(countNewListings({ auctions, now: NOW }), { shelf: 0, auction: 1 });
});

test('labels', () => {
  assert.equal(newListingsLabel({ shelf: 0, auction: 0 }), '');
  assert.equal(newListingsLabel({ shelf: 0, auction: 1 }), 'New auction');
  assert.equal(newListingsLabel({ shelf: 0, auction: 2 }), '2 new auctions');
  assert.equal(newListingsLabel({ shelf: 1, auction: 0 }), 'New item');
  assert.equal(newListingsLabel({ shelf: 3, auction: 0 }), '3 new items');
  assert.equal(newListingsLabel({ shelf: 1, auction: 2 }), '3 new listings');
});
