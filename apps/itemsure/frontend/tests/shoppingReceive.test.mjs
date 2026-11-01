import test from 'node:test';
import assert from 'node:assert/strict';
import {
  boughtAmount,
  boughtDiffers,
  checkReceived,
  receiveEntries,
  receivePayload,
  receiveReason,
  splitBought,
  stockPlaces,
} from '../src/utils/itemsureShoppingReceive.js';

const spot = (amount, status = 'below_par', area = 'bar') => ({
  amount,
  rec: { status, location_id: 'L1', location_name: 'Legends', storage_area_id: area, area_name: area === 'bar' ? 'Bar' : 'Walk-In' },
});
const row = (over) => ({ key: 'g|i1', itemId: 'i1', name: 'Limes', unit: 'bag', status: 'low', total: '3', upTo: false, spots: [spot('1'), spot('2', 'low', 'walk')], ...over });
const extraRow = (over) => ({ key: 'extra|e1', tick: 'extra:e1', extra: true, extraId: 'e1', itemId: null, name: 'Candles', amount: '2 boxes', ...over });
const items = new Map([['i1', { id: 'i1', precision: 0, unitName: 'Bag' }], ['i2', { id: 'i2', precision: 2, unitName: 'Litre' }]]);

test('boughtAmount uses what the shopper typed, else the list amount', () => {
  assert.equal(boughtAmount(row({}), ''), '3');
  assert.equal(boughtAmount(row({}), ' 4 '), '4');
  assert.equal(boughtAmount(row({ total: null }), ''), '');
  assert.equal(boughtAmount(extraRow({}), ''), '2 boxes');
});

test('boughtDiffers compares numbers by value and text as typed', () => {
  assert.equal(boughtDiffers(row({}), ''), false);
  assert.equal(boughtDiffers(row({}), '3.0'), false);
  assert.equal(boughtDiffers(row({}), '4'), true);
  assert.equal(boughtDiffers(extraRow({}), '2 boxes'), false);
  assert.equal(boughtDiffers(extraRow({}), '1 box'), true);
});

test('splitBought fills running-low places first, then the rest', () => {
  assert.deepEqual(splitBought([spot('1'), spot('2', 'low')], '3'), ['1', '2']);
  assert.deepEqual(splitBought([spot('1'), spot('2', 'low')], '2'), ['0', '2']);
  assert.deepEqual(splitBought([spot('1'), spot('2', 'low')], '1'), ['0', '1']);
});

test('splitBought gives extra to the place that needed the most', () => {
  assert.deepEqual(splitBought([spot('1'), spot('2')], '4'), ['1', '3']);
  assert.deepEqual(splitBought([spot(null), spot(null)], '5'), ['5', '0']);
  assert.deepEqual(splitBought([spot('0.5'), spot('1.25')], '2'), ['0.5', '1.5']);
});

test('splitBought gives blanks when the amount is not a number', () => {
  assert.deepEqual(splitBought([spot('1'), spot('2')], ''), ['', '']);
  assert.deepEqual(splitBought([spot('1')], 'some'), ['']);
  assert.deepEqual(splitBought([], '3'), []);
});

test('checkReceived follows the item unit and treats blank as skip', () => {
  assert.deepEqual(checkReceived('', items.get('i1')), { skip: true });
  assert.deepEqual(checkReceived('2', items.get('i1')), { value: '2' });
  assert.ok(checkReceived('1.5', items.get('i1')).error);
  assert.deepEqual(checkReceived('1.5', items.get('i2')), { value: '1.5' });
});

test('receiveEntries starts from what the shopper got, split across places', () => {
  const ticked = new Map([['i1', { amount: '4' }], ['extra:e1', { amount: '' }]]);
  const entries = receiveEntries([row({}), extraRow({}), row({ itemId: 'i9', key: 'g|i9' })], ticked);
  assert.equal(entries.length, 2, 'unticked rows are left out');
  assert.deepEqual(entries[0].amounts, ['1', '3']);
  assert.equal(entries[0].differs, true);
  assert.deepEqual(entries[0].places.map((p) => p.label), ['Bar', 'Walk-In']);
  assert.deepEqual(entries[1].places, [], 'a one-off line has nowhere to go');
});

test('receiveEntries gives a hand-added item its stock places and a numeric amount', () => {
  const ticked = new Map([['extra:e1', { amount: '' }]]);
  const places = [{ locationId: 'L1', storageAreaId: 'bar', label: 'Bar' }];
  const [entry] = receiveEntries([extraRow({ itemId: 'i1', amount: '2' })], ticked, { placesFor: () => places });
  assert.deepEqual(entry.places, places);
  assert.deepEqual(entry.amounts, ['2']);
  const [wordy] = receiveEntries([extraRow({ itemId: 'i1', amount: '2 bags' })], ticked, { placesFor: () => places });
  assert.deepEqual(wordy.amounts, ['']);
});

test('receivePayload builds stock lines, skips zero, and clears every taken line', () => {
  const ticked = new Map([['i1', { amount: '' }], ['extra:e1', { amount: '' }]]);
  const entries = receiveEntries([row({}), extraRow({})], ticked);
  entries[0].amounts = ['0', '3'];
  const payload = receivePayload(entries, { itemsById: items, supplierNameOf: () => 'Sysco' });
  assert.deepEqual(payload.lines, [{ locationId: 'L1', storageAreaId: 'walk', itemId: 'i1', quantity: '3', reason: 'Delivery received from Sysco' }]);
  assert.deepEqual(payload.tickKeys, ['i1', 'extra:e1']);
  assert.deepEqual(payload.extraIds, ['e1']);
});

test('receivePayload leaves unchecked rows ticked and reports bad amounts', () => {
  const ticked = new Map([['i1', { amount: '' }]]);
  const entries = receiveEntries([row({})], ticked);
  assert.ok(receivePayload([{ ...entries[0], take: false }], { itemsById: items }).error);
  assert.match(receivePayload([{ ...entries[0], amounts: ['1.5', '1'] }], { itemsById: items }).error, /^Limes: /);
});

test('receivePayload uses the chosen place for a hand-added item', () => {
  const ticked = new Map([['extra:e1', { amount: '' }]]);
  const places = [{ locationId: 'L1', storageAreaId: 'a', label: 'A' }, { locationId: 'L1', storageAreaId: 'b', label: 'B' }];
  const [entry] = receiveEntries([extraRow({ itemId: 'i1', amount: '2' })], ticked, { placesFor: () => places });
  const payload = receivePayload([{ ...entry, placeIndex: 1 }], { itemsById: items });
  assert.equal(payload.lines.length, 1);
  assert.equal(payload.lines[0].storageAreaId, 'b');
  assert.equal(payload.lines[0].reason, 'Shopping received');
});

test('stockPlaces lists where an item is set up, labelled like the list', () => {
  const locations = [{ id: 'L1', name: 'Legends', storageAreas: [{ id: 'bar', name: 'Bar' }] }];
  const balances = [{ item_id: 'i1', location_id: 'L1', storage_area_id: 'bar' }, { item_id: 'i1', location_id: 'L1', storage_area_id: null }, { item_id: 'i2', location_id: 'L1', storage_area_id: 'bar' }];
  assert.deepEqual(stockPlaces(balances, locations, 'i1', false).map((p) => p.label), ['Bar', 'Legends']);
  assert.equal(stockPlaces(balances, locations, 'i1', true)[0].label, 'Legends \u00b7 Bar');
  assert.equal(receiveReason(''), 'Shopping received');
});
