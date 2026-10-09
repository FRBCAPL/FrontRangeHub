import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consignmentVisitIsPublic, consignmentVisitPageLabel } from './consignmentVisitPages.js';
import { summarizeVisits } from './consignmentVisitStats.js';

test('admin and print-tag pages are not counted', () => {
  assert.equal(consignmentVisitIsPublic('/consignment'), true);
  assert.equal(consignmentVisitIsPublic('/consignment/item/FRPL-0001'), true);
  assert.equal(consignmentVisitIsPublic('/consignment/admin'), false);
  assert.equal(consignmentVisitIsPublic('/consignment/admin?tab=auctions'), false);
  assert.equal(consignmentVisitIsPublic('/consignment/tag/FRPL-0001'), false);
  assert.equal(consignmentVisitIsPublic('/usapl'), false);
  assert.equal(consignmentVisitIsPublic('/consignmentx'), false);
});

test('page labels', () => {
  assert.equal(consignmentVisitPageLabel('/consignment'), 'Shop');
  assert.equal(consignmentVisitPageLabel('/consignment/'), 'Shop');
  assert.equal(consignmentVisitPageLabel('/consignment/home'), 'Home');
  assert.equal(consignmentVisitPageLabel('/consignment/sell?step=2'), 'Sell an item');
  assert.equal(consignmentVisitPageLabel('/consignment/item/FRPL-0002'), 'Item FRPL-0002');
});

test('summary leaves out my own views and counts unique visitors', () => {
  const now = new Date(2026, 9, 9, 15);
  const today = new Date(2026, 9, 9, 10).toISOString();
  const earlier = new Date(2026, 9, 5, 10).toISOString();
  const rows = [
    { id: 1, visitor_id: 'me-browser', path: '/consignment', created_at: today },
    { id: 2, visitor_id: 'other-1', visitor_email: 'Mark@Example.com', path: '/consignment', created_at: today },
    { id: 3, visitor_id: 'guest-1', path: '/consignment', created_at: today },
    { id: 4, visitor_id: 'guest-1', path: '/consignment/item/FRPL-0001', created_at: earlier },
    { id: 5, visitor_id: 'phone', visitor_email: 'admin@example.com', path: '/consignment/home', created_at: earlier },
  ];
  const stats = summarizeVisits(rows, (r) => consignmentVisitPageLabel(r.path), 'me-browser', 'ADMIN@example.com', now);
  assert.equal(stats.mineViews, 2);
  assert.equal(stats.views, 3);
  assert.equal(stats.visitors, 2);
  assert.equal(stats.todayViews, 2);
  assert.equal(stats.todayVisitors, 2);
  assert.deepEqual(stats.pages.map((p) => [p.label, p.views, p.visitors]), [['Shop', 2, 2], ['Item FRPL-0001', 1, 1]]);
  assert.deepEqual(stats.recent.map((r) => r.whoLabel), ['You', 'Mark@Example.com', 'Guest', 'Guest', 'You']);
});
