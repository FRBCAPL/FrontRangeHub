import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultAuctionEnd, formatCountdown, meetsMinimumLength, toLocalInputValue } from './consignmentAuctionDates.js';

test('countdown formats', () => {
  assert.equal(formatCountdown(0), 'Ended');
  assert.equal(formatCountdown(65 * 1000), '1:05');
  assert.equal(formatCountdown((4 * 3600 + 12 * 60) * 1000), '4h 12m');
  assert.equal(formatCountdown((3 * 86400 + 4 * 3600 + 59) * 1000), '3d 4h');
});

// Months are 0-based: new Date(2026, 9, 5) is Mon Oct 5, 2026 (local time).
const at = (d, h = 12, m = 0) => new Date(2026, 9, d, h, m);

test('7 days from Monday moves forward to the following Sunday 9 PM', () => {
  const end = defaultAuctionEnd(at(5), 7);
  assert.equal(end.getDay(), 0);
  assert.equal(end.getHours(), 21);
  assert.equal(end.getDate(), 18);
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
  const end = defaultAuctionEnd(at(5), 10, { snapToWeekday: false });
  assert.equal(end.getDate(), 15);
  assert.equal(end.getHours(), 21);
});

test('lengths under the minimum are raised to 7 days', () => {
  const end = defaultAuctionEnd(at(5), 3, { snapToWeekday: false });
  assert.equal(end.getDate(), 12);
});

test('never shorter than 7 days, from any start day or hour', () => {
  for (let day = 4; day <= 10; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      for (const snapToWeekday of [true, false]) {
        const start = at(day, hour, 30);
        const end = defaultAuctionEnd(start, 7, { snapToWeekday });
        assert.ok(meetsMinimumLength(end, start), `${start} snap=${snapToWeekday} → ${end}`);
        if (snapToWeekday) assert.equal(end.getDay(), 0);
      }
    }
  }
});

test('datetime-local value format', () => {
  assert.equal(toLocalInputValue(at(5, 9, 7)), '2026-10-05T09:07');
});
