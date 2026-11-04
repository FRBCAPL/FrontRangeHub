import test from 'node:test';
import assert from 'node:assert/strict';
import { failureKind, MAX_REQUEST_DAYS, PIECE_DAYS, planImport, sameSecret } from '../../../../supabase/functions/itemsure-clover/schedule.js';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const now = Date.parse('2026-11-09T06:07:00Z');
const span = (pieces) => [Date.parse(pieces[0][0]), Date.parse(pieces.at(-1)[1])];

function assertNoGaps(pieces) {
  for (let i = 1; i < pieces.length; i += 1) assert.equal(pieces[i][0], pieces[i - 1][1], 'pieces must touch');
  for (const [from, to] of pieces) {
    assert.ok(Date.parse(to) > Date.parse(from));
    assert.ok(Date.parse(to) - Date.parse(from) <= PIECE_DAYS * DAY);
    assert.ok(PIECE_DAYS <= MAX_REQUEST_DAYS);
  }
}

test('first weekly import: one week plus a day of overlap, from a whole hour, up to now', () => {
  const pieces = planImport({ okThrough: null, frequency: 'weekly', now });
  const [from, to] = span(pieces);
  assert.equal(to, now);
  assert.equal(from, Math.floor((now - 8 * DAY) / HOUR) * HOUR);
  assertNoGaps(pieces);
  assert.equal(pieces.length, 2);
});

test('first daily import: one day plus a day of overlap', () => {
  const [from, to] = span(planImport({ okThrough: null, frequency: 'daily', now }));
  assert.equal(to, now);
  assert.equal(from, Math.floor((now - 2 * DAY) / HOUR) * HOUR);
});

test('next imports start 24 hours before the last one reached', () => {
  const last = '2026-11-02T06:03:00Z';
  const pieces = planImport({ okThrough: last, frequency: 'weekly', now });
  const [from, to] = span(pieces);
  assert.equal(from, Math.floor((Date.parse(last) - DAY) / HOUR) * HOUR);
  assert.equal(to, now);
  assertNoGaps(pieces);
});

test('catching up after a long outage: no gaps, every piece within the request limit', () => {
  const last = '2026-08-01T00:00:00Z';
  const pieces = planImport({ okThrough: last, frequency: 'daily', now });
  const [from, to] = span(pieces);
  assert.equal(from, Date.parse('2026-07-31T00:00:00Z'));
  assert.equal(to, now);
  assertNoGaps(pieces);
  assert.ok(pieces.length > 10);
});

test('just ran: still re-checks the last day', () => {
  const pieces = planImport({ okThrough: new Date(now - 5 * 60 * 1000).toISOString(), frequency: 'weekly', now });
  const [from, to] = span(pieces);
  assert.equal(to, now);
  assert.ok(now - from >= DAY && now - from < DAY + 2 * HOUR);
});

test('a refused token or merchant pauses; anything else retries', () => {
  assert.equal(failureKind(401), 'auth');
  assert.equal(failureKind(403), 'auth');
  assert.equal(failureKind(404), 'auth');
  assert.equal(failureKind(429), 'retry');
  assert.equal(failureKind(500), 'retry');
  assert.equal(failureKind(null), 'retry');
});

test('the scheduler key must match exactly, and must be set', () => {
  assert.equal(sameSecret('abc123', 'abc123'), true);
  assert.equal(sameSecret('abc124', 'abc123'), false);
  assert.equal(sameSecret('abc12', 'abc123'), false);
  assert.equal(sameSecret('', ''), false);
  assert.equal(sameSecret(null, undefined), false);
  assert.equal(sameSecret('anything', ''), false);
});
