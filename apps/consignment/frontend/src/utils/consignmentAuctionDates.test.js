import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultAuctionEnd, formatCountdown, toLocalInputValue } from './consignmentAuctionDates.js';

test('countdown formats', () => {
  assert.equal(formatCountdown(0), 'Ended');
  assert.equal(formatCountdown(65 * 1000), '1:05');
  assert.equal(formatCountdown((4 * 3600 + 12 * 60) * 1000), '4h 12m');
  assert.equal(formatCountdown((3 * 86400 + 4 * 3600 + 59) * 1000), '3d 4h');
});

// Months are 0-based: new Date(2026, 9, 5) is Mon Oct 5, 2026 (local time).
const at = (d, h = 12, m = 0) => new Date(2026, 9, d, h, m);

test('7 days from Monday snaps back to Sunday 9 PM', () => {
  const end = defaultAuctionEnd(at(5), 7);
  assert.equal(end.getDay(), 0);
  assert.equal(end.getHours(), 21);
  assert.equal(end.getDate(), 11);
});

test('7 days from Thursday snaps forward to Sunday 9 PM', () => {
  const end = defaultAuctionEnd(at(8), 7);
  assert.equal(end.getDay(), 0);
  assert.equal(end.getDate(), 18);
});

test('7 days from Sunday lands on the next Sunday', () => {
  const end = defaultAuctionEnd(at(4), 7);
  assert.equal(end.getDate(), 11);
  assert.equal(end.getHours(), 21);
});

test('without snapping, ends 9 PM on start + days', () => {
  const end = defaultAuctionEnd(at(5), 5, { snapToWeekday: false });
  assert.equal(end.getDate(), 10);
  assert.equal(end.getHours(), 21);
});

test('never ends within 24 hours of the start', () => {
  // 3 days from Saturday 10 PM = Tuesday → nearest Sunday is the one just after the start.
  const start = at(10, 22);
  const end = defaultAuctionEnd(start, 3);
  assert.ok(end.getTime() - start.getTime() >= 24 * 60 * 60 * 1000);
  assert.equal(end.getDay(), 0);
});

test('datetime-local value format', () => {
  assert.equal(toLocalInputValue(at(5, 9, 7)), '2026-10-05T09:07');
});
