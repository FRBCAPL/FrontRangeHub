import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AUCTION_DAYS, auctionEndFrom, formatCountdown, toLocalInputValue } from './consignmentAuctionDates.js';

test('countdown formats', () => {
  assert.equal(formatCountdown(0), 'Ended');
  assert.equal(formatCountdown(65 * 1000), '1:05');
  assert.equal(formatCountdown((4 * 3600 + 12 * 60) * 1000), '4h 12m');
  assert.equal(formatCountdown((3 * 86400 + 4 * 3600 + 59) * 1000), '3d 4h');
});

// Months are 0-based: new Date(2026, 9, 5) is Mon Oct 5, 2026 (local time).
const at = (d, h = 12, m = 0) => new Date(2026, 9, d, h, m);

test('ends 7 days later at the same time of day', () => {
  const end = auctionEndFrom(at(5, 14, 37));
  assert.equal(end.getDate(), 12);
  assert.equal(end.getHours(), 14);
  assert.equal(end.getMinutes(), 37);
});

test('runs a full 7 days from any start day', () => {
  for (let day = 4; day <= 10; day += 1) {
    const start = at(day, 20, 15);
    const end = auctionEndFrom(start);
    assert.equal(end.getDay(), start.getDay());
    assert.equal(Math.round((end - start) / 86400000), AUCTION_DAYS);
  }
});

test('datetime-local value format', () => {
  assert.equal(toLocalInputValue(at(5, 9, 7)), '2026-10-05T09:07');
});
