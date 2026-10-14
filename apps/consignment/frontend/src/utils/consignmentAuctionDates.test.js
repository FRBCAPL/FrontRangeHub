import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AUCTION_DAYS, auctionEndFrom, formatCountdown, formatDateTime, toLocalInputValue } from './consignmentAuctionDates.js';
import { shopParts, shopTime } from './consignmentTimeZone.js';

test('countdown formats', () => {
  assert.equal(formatCountdown(0), 'Ended');
  assert.equal(formatCountdown(65 * 1000), '1:05');
  assert.equal(formatCountdown((4 * 3600 + 12 * 60) * 1000), '4h 12m');
  assert.equal(formatCountdown((3 * 86400 + 4 * 3600 + 59) * 1000), '3d 4h');
});

// Oct 2026 in Colorado time, whatever zone the test machine is in.
const at = (d, h = 12, m = 0) => shopTime(2026, 10, d, h, m);
const weekday = (date) => {
  const p = shopParts(date);
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
};

test('ends 7 days later at the same time of day', () => {
  const end = shopParts(auctionEndFrom(at(5, 14, 37)));
  assert.equal(end.day, 12);
  assert.equal(end.hour, 14);
  assert.equal(end.minute, 37);
});

test('runs a full 7 days from any start day', () => {
  for (let day = 4; day <= 10; day += 1) {
    const start = at(day, 20, 15);
    const end = auctionEndFrom(start);
    assert.equal(weekday(end), weekday(start));
    assert.equal(Math.round((end - start) / 86400000), AUCTION_DAYS);
  }
});

test('dates show in Mountain time', () => {
  assert.match(formatDateTime(at(5, 19, 30)), /Oct 5.*7:30\sPM MDT/);
  assert.match(formatDateTime(shopTime(2026, 12, 5, 19, 30)), /Dec 5.*7:30\sPM MST/);
});

test('datetime-local value format', () => {
  assert.equal(toLocalInputValue(at(5, 9, 7)), '2026-10-05T09:07');
});
