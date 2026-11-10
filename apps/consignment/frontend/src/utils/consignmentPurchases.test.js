import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { boughtVia, purchaseStep, sortPurchases } from './consignmentPurchases.js';

describe('purchaseStep', () => {
  it('auction win: seller still has it, then ready at Legends, then paid', () => {
    assert.equal(purchaseStep({ kind: 'auction', status: 'awaiting_payment', delivered_at: null }), 'bring');
    assert.equal(purchaseStep({ kind: 'auction', status: 'awaiting_payment', delivered_at: '2026-11-09T00:00:00Z' }), 'ready');
    assert.equal(purchaseStep({ kind: 'auction', status: 'paid', delivered_at: '2026-11-09T00:00:00Z' }), 'paid');
  });

  it('accepted case offer: held, then paid once completed', () => {
    assert.equal(purchaseStep({ kind: 'offer', status: 'accepted' }), 'held');
    assert.equal(purchaseStep({ kind: 'offer', status: 'completed' }), 'paid');
  });
});

describe('boughtVia', () => {
  it('names how it was bought', () => {
    assert.equal(boughtVia({ won_via: 'buy_now' }), 'Bought with Buy It Now');
    assert.equal(boughtVia({ won_via: 'bid' }), 'Won at auction');
    assert.equal(boughtVia({ won_via: 'offer' }), 'Offer accepted');
    assert.equal(boughtVia({}), 'Purchased');
  });
});

describe('sortPurchases', () => {
  it('puts open purchases first, newest first, then paid ones', () => {
    const rows = [
      { id: 'old-paid', kind: 'auction', status: 'paid', bought_at: '2026-11-01T00:00:00Z' },
      { id: 'old-open', kind: 'offer', status: 'accepted', bought_at: '2026-11-02T00:00:00Z' },
      { id: 'new-paid', kind: 'offer', status: 'completed', bought_at: '2026-11-08T00:00:00Z' },
      { id: 'new-open', kind: 'auction', status: 'awaiting_payment', bought_at: '2026-11-07T00:00:00Z' },
    ];
    assert.deepEqual(sortPurchases(rows).map((p) => p.id), ['new-open', 'old-open', 'new-paid', 'old-paid']);
  });
});
