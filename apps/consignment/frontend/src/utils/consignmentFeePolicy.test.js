import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  breakEvenPrice,
  DEFAULT_FEE_POLICY,
  feePolicyFrom,
  listingFee,
  originalListingFee,
  priceDropPct,
  repeatCount,
  repeatListingFee,
  saleSplit,
  shelfSaleSplit,
} from './consignmentFeePolicy.js';

describe('shelfSaleSplit', () => {
  it('commission items credit only the first consignment fee', () => {
    const item = {
      sale_method: 'fixed',
      commission_pct: 20,
      seller_payout: 300,
      fees: [
        { kind: 'renewal', amount: 7.5, paid_at: '2026-11-10' },
        { kind: 'consignment', amount: 15, paid_at: '2026-10-01' },
      ],
    };
    const s = shelfSaleSplit(item, 300);
    assert.equal(s.frplFromSale, 45);
    assert.equal(s.sellerFromSale, 255);
  });

  it('legacy markup items pay the fixed Seller Payout', () => {
    const s = shelfSaleSplit({ sale_method: 'fixed', commission_pct: null, seller_payout: 400 }, 480);
    assert.equal(s.sellerFromSale, 400);
    assert.equal(s.frplFromSale, 80);
  });
});

describe('listing fees', () => {
  it('auction: 5% of the reserve, $10–$25', () => {
    assert.equal(listingFee(100, 'auction'), 10);
    assert.equal(listingFee(300, 'auction'), 15);
    assert.equal(listingFee(400, 'auction'), 20);
    assert.equal(listingFee(500, 'auction'), 25);
    assert.equal(listingFee(2000, 'auction'), 25);
  });

  it('shelf: 5% of the price, $15–$30', () => {
    assert.equal(listingFee(60, 'fixed'), 15);
    assert.equal(listingFee(300, 'fixed'), 15);
    assert.equal(listingFee(450, 'fixed'), 22.5);
    assert.equal(listingFee(600, 'fixed'), 30);
    assert.equal(listingFee(1500, 'fixed'), 30);
  });

  it('is 0 until a price is entered', () => {
    assert.equal(listingFee('', 'fixed'), 0);
    assert.equal(listingFee(0, 'auction'), 0);
  });
});

describe('sale split with the listing fee credited', () => {
  it('auction $300, fee $15: FRPL takes $30 from the sale', () => {
    const s = saleSplit(300, 15, 15);
    assert.equal(s.commission, 45);
    assert.equal(s.frplFromSale, 30);
    assert.equal(s.sellerFromSale, 270);
    assert.equal(s.frplTotal, 45);
    assert.equal(s.sellerNet, 255);
  });

  it('shelf $300 at 20%, fee $15: seller paid $255 at sale', () => {
    const s = saleSplit(300, 20, 15);
    assert.equal(s.frplFromSale, 45);
    assert.equal(s.sellerFromSale, 255);
    assert.equal(s.frplTotal, 60);
  });

  it('when the fee is bigger than the commission, FRPL keeps the fee only', () => {
    const s = saleSplit(60, 20, 15);
    assert.equal(s.commission, 12);
    assert.equal(s.frplFromSale, 0);
    assert.equal(s.sellerFromSale, 60);
    assert.equal(s.frplTotal, 15);
  });

  it('with no fee paid it is a plain commission split', () => {
    const s = saleSplit(500, 15, 0);
    assert.equal(s.frplFromSale, 75);
    assert.equal(s.sellerFromSale, 425);
  });

  it('break-even prices', () => {
    assert.equal(breakEvenPrice(25, 15), 166.67);
    assert.equal(breakEvenPrice(15, 20), 75);
  });
});

describe('renewal / relist fees', () => {
  it('first time with a 10%+ drop is free', () => {
    const r = repeatListingFee({ originalFee: 20, previousPrice: 400, newPrice: 340, priorRepeats: 0 });
    assert.equal(r.amount, 0);
    assert.equal(r.free, true);
  });

  it('exactly 10% counts', () => {
    assert.equal(repeatListingFee({ originalFee: 20, previousPrice: 400, newPrice: 360 }).amount, 0);
  });

  it('first time without the drop is half', () => {
    assert.equal(repeatListingFee({ originalFee: 20, previousPrice: 400, newPrice: 380 }).amount, 10);
    assert.equal(repeatListingFee({ originalFee: 25, previousPrice: 500, newPrice: 500 }).amount, 12.5);
  });

  it('later times are half even with a drop', () => {
    const r = repeatListingFee({ originalFee: 20, previousPrice: 340, newPrice: 250, priorRepeats: 1 });
    assert.equal(r.amount, 10);
    assert.equal(r.free, false);
  });

  it('price drop percent', () => {
    assert.equal(priceDropPct(400, 340), 15);
    assert.equal(priceDropPct(400, 450), 0);
    assert.equal(priceDropPct(0, 100), 0);
  });
});

describe('fee history helpers', () => {
  const fees = [
    { kind: 'consignment', amount: 15, paid_at: '2026-10-01' },
    { kind: 'renewal', amount: 0, paid_at: '2026-11-01' },
    { kind: 'auction_listing', amount: 20, paid_at: '2026-12-01' },
    { kind: 'relist', amount: 10, paid_at: '2026-12-10' },
    { kind: 'auction_listing', amount: 25, paid_at: '2027-01-01' },
  ];

  it('credits only the first fee for the selling method', () => {
    assert.equal(originalListingFee(fees, 'fixed'), 15);
    assert.equal(originalListingFee(fees, 'auction'), 20);
    assert.equal(originalListingFee([], 'auction'), 0);
  });

  it('counts renewals and relists separately, including free ones', () => {
    assert.equal(repeatCount(fees, 'fixed'), 1);
    assert.equal(repeatCount(fees, 'auction'), 1);
  });
});

describe('settings', () => {
  it('reads columns and falls back to defaults', () => {
    const p = feePolicyFrom({ shelf_commission_pct: 18, auction_fee_max: '30', shelf_fee_min: null });
    assert.equal(p.shelfCommissionPct, 18);
    assert.equal(p.auctionFeeMax, 30);
    assert.equal(p.shelfFeeMin, DEFAULT_FEE_POLICY.shelfFeeMin);
  });
});
