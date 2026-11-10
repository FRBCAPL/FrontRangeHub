import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SHIP_STATES, canBuyerCancelShipment, needsSaleRecorded, payoutReadyAt, shipAddressError, shipCityLine, shipStateAllowed,
  shipTotal, shipmentStatusLabel, shipmentTotal, trackingUrl, validPaymentLink,
} from './consignmentShipping.js';

const good = { name: 'Pat Buyer', line1: '1 Main St', city: 'Austin', state: 'TX', zip: '78701' };

test('lower 48 + DC, never Colorado, Alaska or Hawaii', () => {
  assert.equal(SHIP_STATES.length, 48);
  assert.equal(shipStateAllowed('tx'), true);
  assert.equal(shipStateAllowed('DC'), true);
  for (const code of ['CO', 'AK', 'HI', 'PR', '', 'XX']) assert.equal(shipStateAllowed(code), false, code);
});

test('address check matches the database rules', () => {
  assert.equal(shipAddressError(good), '');
  assert.equal(shipAddressError({ ...good, zip: '78701-1234' }), '');
  assert.match(shipAddressError({ ...good, state: 'co' }), /outside Colorado/);
  assert.match(shipAddressError({ ...good, state: 'AK' }), /lower 48/);
  assert.match(shipAddressError({ ...good, zip: '7870' }), /ZIP/);
  assert.match(shipAddressError({ ...good, city: '  ' }), /city/);
  assert.match(shipAddressError({ ...good, name: 'x'.repeat(101) }), /too long/);
});

test('totals: item before tax plus shipping, to the cent', () => {
  assert.equal(shipTotal(277.14, 35), 312.14);
  assert.equal(shipmentTotal({ item_price: '100.10', shipping_price: '19.99' }), 120.09);
});

test('statuses and buyer cancel', () => {
  assert.equal(shipmentStatusLabel('invoiced'), 'Payment link sent');
  assert.equal(shipmentStatusLabel('arrived'), 'Delivered');
  assert.equal(canBuyerCancelShipment({ status: 'requested' }), true);
  assert.equal(canBuyerCancelShipment({ status: 'invoiced' }), true);
  assert.equal(canBuyerCancelShipment({ status: 'invoiced', square_link_id: 'L1' }), false);
  assert.equal(canBuyerCancelShipment({ status: 'paid' }), false);
});

test('a paid shipment needs the sale recorded until the item is sold', () => {
  assert.equal(needsSaleRecorded({ status: 'paid', item_status: 'available' }), true);
  assert.equal(needsSaleRecorded({ status: 'paid', item_status: 'sold' }), false);
  assert.equal(needsSaleRecorded({ status: 'invoiced', item_status: 'available' }), false);
  assert.equal(needsSaleRecorded({ status: 'paid' }), false);
});

test('seller payout waits for delivery plus the complaint window', () => {
  assert.equal(payoutReadyAt({ arrived_at: null }), null);
  assert.equal(payoutReadyAt({ arrived_at: '2026-11-01T12:00:00Z' }, 3).toISOString(), '2026-11-04T12:00:00.000Z');
});

test('payment links, tracking links, city line', () => {
  assert.equal(validPaymentLink('https://square.link/u/abc'), true);
  assert.equal(validPaymentLink('http://square.link/u/abc'), false);
  assert.equal(validPaymentLink('https://has space'), false);
  assert.equal(trackingUrl('USPS', '9400 1'), 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400%201');
  assert.match(trackingUrl('ups', '1Z9'), /ups\.com/);
  assert.equal(trackingUrl('Other', '123'), null);
  assert.equal(shipCityLine({ ship_city: 'Austin', ship_state: 'TX', ship_zip: '78701' }), 'Austin, TX 78701');
});
