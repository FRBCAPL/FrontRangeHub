import test from 'node:test';
import assert from 'node:assert/strict';
import { sellerCountsLabel, sellerItemCounts, sellerMatches } from './consignmentSellerItems.js';

const account = { id: 'u1', email: 'Pat@Example.com' };

test('sellerMatches prefers the account id, falls back to email', () => {
  assert.equal(sellerMatches({ user_id: 'u1', email: 'other@x.com' }, account), true);
  assert.equal(sellerMatches({ user_id: 'u2', email: 'pat@example.com' }, account), false);
  assert.equal(sellerMatches({ user_id: null, email: ' pat@example.com ' }, account), true);
  assert.equal(sellerMatches({ user_id: null, email: '' }, { id: 'u1', email: '' }), false);
  assert.equal(sellerMatches(null, account), false);
});

test('sellerItemCounts groups by status and owed payouts', () => {
  const rows = [
    { seller: { user_id: 'u1' }, status: 'pending' },
    { seller: { user_id: 'u1' }, status: 'available' },
    { seller: { user_id: 'u1' }, status: 'sold', seller_paid_at: null },
    { seller: { user_id: 'u1' }, status: 'sold', seller_paid_at: '2026-10-01' },
    { seller: { user_id: 'u2' }, status: 'sold' },
  ];
  assert.deepEqual(sellerItemCounts(rows, account), { pending: 1, listed: 1, sold: 2, owed: 1 });
});

test('sellerCountsLabel', () => {
  assert.equal(sellerCountsLabel({ pending: 0, listed: 2, sold: 1, owed: 1 }), '2 listed · 1 sold · 1 owed payout');
  assert.equal(sellerCountsLabel({ pending: 0, listed: 0, sold: 0, owed: 0 }), 'No items yet');
});
