import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUCTION_DAY_CHOICES, AUCTION_DAYS, DEFAULT_AUCTION_END_HOUR, auctionEndFrom, auctionEndHour, auctionLengthDays,
  formatCountdown, formatDateTime, formatEndHour, normalizeAuctionDays, toLocalInputValue,
} from './consignmentAuctionDates.js';
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

test('a 2 AM start ends 7 days later at 8 PM, not 2 AM', () => {
  const end = shopParts(auctionEndFrom(at(5, 2, 0)));
  assert.equal(end.day, 12);
  assert.equal(end.hour, 20);
  assert.equal(end.minute, 0);
});

test('ends on the same weekday, 7 days on, from any start day and time', () => {
  for (let day = 4; day <= 10; day += 1) {
    const start = at(day, 23, 45);
    const end = auctionEndFrom(start);
    assert.equal(weekday(end), weekday(start));
    assert.equal(Math.round((end - start) / 86400000), AUCTION_DAYS);
  }
});

test('14 days and a custom end hour, across the November clock change', () => {
  const end = auctionEndFrom(at(28, 12), 14, 18);
  assert.deepEqual([shopParts(end).month, shopParts(end).day, shopParts(end).hour], [11, 11, 18]);
});

test('day choices and end hour fall back safely', () => {
  assert.deepEqual(AUCTION_DAY_CHOICES, [7, 14]);
  assert.equal(normalizeAuctionDays('14'), 14);
  assert.equal(normalizeAuctionDays(10), AUCTION_DAYS);
  assert.equal(auctionEndHour({ auction_end_hour: 19 }), 19);
  assert.equal(auctionEndHour(null), DEFAULT_AUCTION_END_HOUR);
  assert.equal(formatEndHour(20), '8 PM');
  assert.equal(formatEndHour(0), '12 AM');
  assert.equal(formatEndHour(12), '12 PM');
});

test('length of a past auction ignores late-bid extensions', () => {
  const starts = at(1, 2);
  assert.equal(auctionLengthDays({ starts_at: starts, ends_at: auctionEndFrom(starts, 14) }), 14);
  assert.equal(auctionLengthDays({ starts_at: starts, ends_at: new Date(+auctionEndFrom(starts) + 6 * 60000) }), 7);
  assert.equal(auctionLengthDays(null), AUCTION_DAYS);
});

test('dates show in Mountain time', () => {
  assert.match(formatDateTime(at(5, 19, 30)), /Oct 5.*7:30\sPM MDT/);
  assert.match(formatDateTime(shopTime(2026, 12, 5, 19, 30)), /Dec 5.*7:30\sPM MST/);
});

test('datetime-local value format', () => {
  assert.equal(toLocalInputValue(at(5, 9, 7)), '2026-10-05T09:07');
});
