import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAnswerOffer, counterError, offerError, offerHistoryLines, offerMinimum, offerStatusLabel,
} from './consignmentOfferMath.js';

test('minimum is half the asking price, rounded up to the dollar', () => {
  assert.equal(offerMinimum(100), 50);
  assert.equal(offerMinimum(149.99), 75);
  assert.equal(offerMinimum(101), 51);
  assert.equal(offerMinimum(1), 1);
  assert.equal(offerMinimum(0), 0);
});

test('first offer must be between the minimum and the asking price', () => {
  const terms = { minimum: 50, asking: 100 };
  assert.match(offerError('', terms), /Enter/);
  assert.match(offerError('49.99', terms), /lowest offer/);
  assert.equal(offerError('50', terms), '');
  assert.equal(offerError('$99.99', terms), '');
  assert.match(offerError('100', terms), /full price/);
  assert.match(offerError('100', { ...terms, saleMethod: 'auction' }), /opening bid/);
});

test('seller counters go up (to asking), buyer counters go down', () => {
  const base = { current: 70, minimum: 50, asking: 100 };
  assert.equal(counterError('85', { ...base, by: 'seller' }), '');
  assert.match(counterError('70', { ...base, by: 'seller' }), /above/);
  assert.match(counterError('101', { ...base, by: 'admin' }), /asking price/);
  assert.equal(counterError('60', { ...base, by: 'buyer' }), '');
  assert.match(counterError('70', { ...base, by: 'buyer' }), /below/);
  assert.match(counterError('40', { ...base, by: 'buyer' }), /at least/);
});

test('whose turn it is', () => {
  const sellerTurn = { status: 'open', turn: 'seller' };
  assert.equal(offerStatusLabel(sellerTurn, 'seller'), 'Your turn');
  assert.equal(offerStatusLabel(sellerTurn, 'buyer'), 'Waiting on the seller');
  assert.equal(offerStatusLabel(sellerTurn, 'admin'), 'Waiting on the seller');
  assert.equal(canAnswerOffer(sellerTurn, 'admin'), true);
  assert.equal(canAnswerOffer(sellerTurn, 'buyer'), false);
  assert.equal(canAnswerOffer({ status: 'open', turn: 'buyer' }, 'buyer'), true);
  assert.equal(offerStatusLabel({ status: 'fell_through' }, 'buyer'), 'Hold ended');
  assert.equal(canAnswerOffer({ status: 'accepted', turn: 'seller' }, 'seller'), false);
});

test('history lines', () => {
  const lines = offerHistoryLines([
    { by: 'buyer', action: 'offer', amount: 80, at: '1' },
    { by: 'seller', action: 'counter', amount: 95, at: '2', note: 'firm' },
    { by: 'system', action: 'expire', at: '3' },
  ]);
  assert.deepEqual(lines.map((l) => l.text), ['Buyer offered $80', 'Seller countered $95', 'Expired']);
  assert.equal(lines[1].note, 'firm');
});
