import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addShopDays, shopDateKey, shopParts, shopTime } from './consignmentTimeZone.js';

test('Colorado wall clock in summer (MDT, UTC-6) and winter (MST, UTC-7)', () => {
  assert.equal(shopTime(2026, 7, 4, 12).toISOString(), '2026-07-04T18:00:00.000Z');
  assert.equal(shopTime(2026, 12, 25, 12).toISOString(), '2026-12-25T19:00:00.000Z');
});

test('the Colorado day, not the UTC day', () => {
  // 11 PM in Colorado is already tomorrow in UTC.
  assert.equal(shopDateKey(new Date('2026-10-15T05:00:00Z')), '2026-10-14');
  assert.deepEqual(shopParts(new Date('2026-10-15T05:00:00Z')).hour, 23);
});

test('adding days keeps the time of day across the November clock change', () => {
  const start = shopTime(2026, 10, 30, 19, 30);
  const end = addShopDays(start, 7);
  const p = shopParts(end);
  assert.deepEqual([p.month, p.day, p.hour, p.minute], [11, 6, 19, 30]);
  assert.equal(end - start, 7 * 86400000 + 3600000);
});

test('end of day survives the March clock change', () => {
  const p = shopParts(addShopDays(shopTime(2027, 3, 13, 23, 59, 59), 1));
  assert.deepEqual([p.month, p.day, p.hour, p.minute, p.second], [3, 14, 23, 59, 59]);
});
