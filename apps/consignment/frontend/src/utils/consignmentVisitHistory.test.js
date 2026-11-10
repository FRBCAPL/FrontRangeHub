import { test } from 'node:test';
import assert from 'node:assert/strict';
import { topReferrers, visitMatches, visitorHistory, visitWhoLabel } from './consignmentVisitHistory.js';

const rows = [
  { id: 5, visitor_id: 'guest-aaaa1111', path: '/consignment/item/FRPL-0002', created_at: '2026-11-09T10:00:00Z' },
  { id: 4, visitor_id: 'phone', visitor_email: 'mark@example.com', path: '/consignment', created_at: '2026-11-08T10:00:00Z', referrer: 'https://www.facebook.com/groups/x' },
  { id: 3, visitor_id: 'me', path: '/consignment', created_at: '2026-11-07T10:00:00Z' },
  { id: 2, visitor_id: 'guest-aaaa1111', path: '/consignment', created_at: '2026-10-01T10:00:00Z' },
  { id: 1, visitor_id: 'laptop', visitor_email: 'Mark@Example.com', path: '/consignment/home', created_at: '2026-09-15T10:00:00Z', referrer: 'https://facebook.com/' },
];

test('groups visits by person, newest first, with first and last seen', () => {
  const people = visitorHistory(rows, 'me', '');
  assert.deepEqual(people.map((p) => [p.label, p.views, p.pageCount]), [
    ['Guest · 1111', 2, 2],
    ['mark@example.com', 2, 2],
    ['You', 1, 1],
  ]);
  const guest = people[0];
  assert.equal(guest.lastSeen, '2026-11-09T10:00:00Z');
  assert.equal(guest.firstSeen, '2026-10-01T10:00:00Z');
  assert.equal(people[1].signedIn, true);
  assert.equal(people[2].isMine, true);
});

test('guest labels tell guests apart', () => {
  assert.equal(visitWhoLabel({ visitor_id: 'abc-123-xyz9' }, false), 'Guest · xyz9');
  assert.equal(visitWhoLabel({}, false), 'Guest');
  assert.equal(visitWhoLabel({ visitor_email: 'a@b.com' }, true), 'You');
});

test('search matches who, page and source', () => {
  const label = (r) => r.path;
  assert.equal(visitMatches(rows[1], 'MARK', label), true);
  assert.equal(visitMatches(rows[0], 'frpl-0002', label), true);
  assert.equal(visitMatches(rows[1], 'facebook', label), true);
  assert.equal(visitMatches(rows[2], 'facebook', label), false);
  assert.equal(visitMatches(rows[2], '', label), true);
});

test('referrers are grouped by site', () => {
  assert.deepEqual(topReferrers(rows), [
    { source: 'Direct / in-site', views: 3 },
    { source: 'facebook.com', views: 2 },
  ]);
});
