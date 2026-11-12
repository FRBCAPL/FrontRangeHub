import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  blanksToFillPage, clampBlankCount, normalizeTagKind, normalizeTagShape, recentlyAdded, recentlySold, sheetPages, soldTagText, tagText,
} from './consignmentTagText.js';

const cue = {
  item_number: 'FRPL-0142',
  category: 'cues',
  name: 'Predator P3',
  brand: 'Predator',
  model: 'P3',
  condition: 'like_new',
  sale_method: 'consignment',
  selling_price: 400,
  allow_inspection: true,
};

test('case item shows the before-tax price big and the with-tax price small', () => {
  const t = tagText(cue, 0.1);
  assert.equal(t.id, 'Cue #0142');
  assert.equal(t.sub, 'Predator P3 · Like new');
  assert.equal(t.bigPrice, '$400');
  assert.equal(t.priceNote, '$440 with tax');
  assert.equal(t.inspect, 'Ask to inspect · ID held');
  assert.equal(t.scan, 'Scan for photos');
});

test('tax-included price and display-only items', () => {
  const t = tagText({ ...cue, price_tax_included: true, allow_inspection: false }, 0.1);
  assert.equal(t.bigPrice, '$440');
  assert.equal(t.priceNote, 'Tax included');
  assert.equal(t.inspect, 'Display only');
});

test('auction items point to online bidding and skip the inspection line', () => {
  const t = tagText({ ...cue, sale_method: 'auction' }, 0.1);
  assert.equal(t.bigPrice, 'Online auction');
  assert.equal(t.inspect, '');
  assert.equal(t.scan, 'Scan to bid');
  assert.equal(t.isAuction, true);
});

test('missing price leaves the price lines blank', () => {
  const t = tagText({ ...cue, selling_price: null, brand: '', model: '' }, 0.1);
  assert.equal(t.bigPrice, '');
  assert.equal(t.priceNote, '');
  assert.equal(t.sub, 'Like new');
});

test('sheets hold 10 cards or 12 hang tags per page', () => {
  const items = Array.from({ length: 23 }, (_, i) => i);
  assert.deepEqual(sheetPages(items, 'card').map((p) => p.length), [10, 10, 3]);
  assert.deepEqual(sheetPages(items, 'hang').map((p) => p.length), [12, 11]);
  assert.deepEqual(sheetPages([], 'card'), []);
  assert.equal(normalizeTagShape('poster'), 'card');
});

test('recently added means submitted within the last 7 days', () => {
  const now = Date.parse('2026-11-10T12:00:00Z');
  assert.equal(recentlyAdded({ created_at: '2026-11-05T12:00:00Z' }, 7, now), true);
  assert.equal(recentlyAdded({ created_at: '2026-10-20T12:00:00Z' }, 7, now), false);
  assert.equal(recentlyAdded({}, 7, now), false);
});

test('sold tag shows the item, the Colorado sold date and how it sold', () => {
  const t = soldTagText({ ...cue, sold_at: '2026-11-12T05:30:00Z' });
  assert.equal(t.id, 'Cue #0142');
  assert.equal(t.name, 'Predator P3');
  assert.equal(t.sub, 'Predator P3 · Like new');
  assert.equal(t.soldOn, 'Sold Nov 11, 2026');
  assert.equal(t.how, '');
  assert.equal(soldTagText({ ...cue, sale_method: 'auction', sold_at: null }).soldOn, 'Sold');
  assert.equal(soldTagText({ ...cue, sale_method: 'auction' }).how, 'Won online');
});

test('blank tag counts fill out the page', () => {
  assert.equal(blanksToFillPage(0, 'card'), 10);
  assert.equal(blanksToFillPage(3, 'card'), 7);
  assert.equal(blanksToFillPage(10, 'card'), 10);
  assert.equal(blanksToFillPage(5, 'hang'), 7);
  assert.equal(clampBlankCount('4'), 4);
  assert.equal(clampBlankCount(-2), 0);
  assert.equal(clampBlankCount(500), 60);
  assert.equal(clampBlankCount(''), 0);
});

test('tag kinds and recently sold', () => {
  assert.equal(normalizeTagKind('sold'), 'sold');
  assert.equal(normalizeTagKind('other'), 'shop');
  const now = Date.parse('2026-11-10T12:00:00Z');
  assert.equal(recentlySold({ sold_at: '2026-11-08T12:00:00Z' }, 7, now), true);
  assert.equal(recentlySold({ created_at: '2026-11-08T12:00:00Z' }, 7, now), false);
});
