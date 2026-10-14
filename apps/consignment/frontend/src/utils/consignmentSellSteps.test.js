import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sellStepError } from './consignmentSellSteps.js';

const base = {
  seller_name: 'Pat', seller_phone: '', seller_email: 'pat@example.com',
  name: 'Cue', brand: '', model: '', specs: '', description: '',
  sale_method: 'fixed', seller_payout: '100', buy_now_price: '', agreement: false,
};

describe('sellStepError', () => {
  it('accepts a full phone number with formatting', () => {
    assert.equal(sellStepError('contact', { ...base, seller_email: '', seller_phone: '(303) 555-1212' }), '');
  });

  it('rejects a short phone number', () => {
    assert.match(sellStepError('contact', { ...base, seller_phone: '555-1212' }), /area code/);
  });

  it('enforces the item name and brand limits', () => {
    assert.match(sellStepError('item', { ...base, name: 'x'.repeat(121) }), /120/);
    assert.match(sellStepError('item', { ...base, brand: 'x'.repeat(81) }), /80/);
    assert.equal(sellStepError('item', { ...base, name: 'x'.repeat(120) }), '');
  });

  it('enforces the description limit', () => {
    assert.match(sellStepError('details', { ...base, description: 'x'.repeat(2001) }), /2,000/);
    assert.equal(sellStepError('details', base), '');
  });
});
