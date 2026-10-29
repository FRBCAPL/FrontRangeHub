import test from 'node:test';
import assert from 'node:assert/strict';
import { daysLeft, describeDays, describeRate, suggestLevels, usageRates } from '../src/utils/itemsureUsage.js';

const now = Date.parse('2026-10-29T12:00:00Z');
const daysAgo = (n) => new Date(now - n * 86400000).toISOString();
const move = (type, q, ago, extra = {}) => ({
  location_id: 'n', storage_area_id: 'bar', movement_type: type, quantity_text: String(q), posted_at: daysAgo(ago), effective_at: daysAgo(ago), reason: '', ...extra,
});

test('a new item is not judged on a few days of history', () => {
  const usage = usageRates([move('manual_removal', -5, 1)], { historyStart: daysAgo(3), now });
  assert.equal(usage.enough, false);
  assert.equal(usage.total, null);
  assert.equal(usage.forSlot('n', 'bar'), null);
});

test('use per day: taking out and short counts count; deliveries and the start do not', () => {
  const usage = usageRates([
    move('opening_balance', 20, 27),
    move('manual_addition', 12, 20),
    move('manual_removal', -14, 10),
    move('count_adjustment', -7, 5),
    move('count_adjustment', 2, 4),
  ], { historyStart: daysAgo(40), now });
  assert.equal(usage.enough, true);
  assert.equal(usage.days, 28);
  assert.equal(usage.total, 21 / 28);
  assert.equal(usage.forSlot('n', 'bar'), 21 / 28);
  assert.equal(usage.forSlot('n', null), 0);
});

test('moves are use for the place they leave, not for the whole item', () => {
  const usage = usageRates([
    move('transfer_out', -7, 3, { storage_area_id: null }),
    move('transfer_in', 7, 3),
  ], { historyStart: daysAgo(14), now });
  assert.equal(usage.days, 14);
  assert.equal(usage.forSlot('n', null), 0.5);
  assert.equal(usage.total, 0);
});

test('an Undo cancels the change it reverses', () => {
  const usage = usageRates([
    move('manual_removal', -4, 2),
    move('manual_addition', 4, 2, { reason: 'Undo' }),
    move('manual_addition', 3, 1),
    move('manual_removal', -3, 1, { reason: 'Undo' }),
  ], { historyStart: daysAgo(30), now });
  assert.equal(usage.total, 0);
});

test('older than four weeks is ignored', () => {
  const usage = usageRates([move('manual_removal', -50, 35), move('manual_removal', -28, 2)], { historyStart: daysAgo(60), now });
  assert.equal(usage.total, 1);
});

test('days left and plain wording', () => {
  assert.equal(daysLeft('9', 1.5), 6);
  assert.equal(daysLeft('9', 0), null);
  assert.equal(daysLeft(null, 1), null);
  assert.equal(describeDays(0.4), 'less than a day');
  assert.equal(describeDays(1), 'about 1 day');
  assert.equal(describeDays(6.2), 'about 6 days');
  assert.equal(describeDays(21), 'about 3 weeks');
  assert.equal(describeDays(90), 'more than 2 months');
  assert.equal(describeRate(6 / 7, 'btl'), 'about 6 btl a week');
  assert.equal(describeRate(0.5, 'btl'), 'about 3.5 btl a week');
  assert.equal(describeRate(0.05, 'kg'), 'about 1.5 kg a month');
  assert.equal(describeRate(0, 'btl'), null);
});

test('suggested levels round up to the unit and keep warn below fill', () => {
  assert.deepEqual(suggestLevels(6 / 7, 0), { minimum: '3', par: '9' });
  assert.deepEqual(suggestLevels(0.05, 0), { minimum: '1', par: '2' });
  assert.deepEqual(suggestLevels(0.25, 2), { minimum: '0.75', par: '2.5' });
  assert.equal(suggestLevels(0, 0), null);
  assert.equal(suggestLevels(null, 0), null);
});
