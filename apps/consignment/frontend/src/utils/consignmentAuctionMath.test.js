import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  auctionSplit,
  bidError,
  bidIncrement,
  buyNowAvailable,
  minNextBid,
  openingBid,
  roundUpToIncrement,
  softCloseEnd,
} from './consignmentAuctionMath.js';

describe('consignment auction increments', () => {
  it('uses $5 below $500 and $10 at $500+', () => {
    assert.equal(bidIncrement(495), 5);
    assert.equal(bidIncrement(499.99), 5);
    assert.equal(bidIncrement(500), 10);
    assert.equal(bidIncrement(2000), 10);
  });

  it('rounds up to the increment for the amount', () => {
    assert.equal(roundUpToIncrement(235.29), 240);
    assert.equal(roundUpToIncrement(497), 500);
    assert.equal(roundUpToIncrement(588.24), 590);
    assert.equal(roundUpToIncrement(590), 590);
    assert.equal(roundUpToIncrement(100.00000000000001), 100);
  });
});

describe('opening bid is the seller reserve (no markup)', () => {
  it('opens at the reserve', () => {
    assert.equal(openingBid(500), 500);
    assert.equal(openingBid(1420), 1420);
    assert.equal(openingBid(237.5), 237.5);
  });

  it('rejects bad input', () => {
    assert.equal(openingBid(0), 0);
    assert.equal(openingBid(''), 0);
    assert.equal(openingBid(-5), 0);
  });
});

describe('auction split', () => {
  it('$500 reserve, $800 Buy It Now example', () => {
    assert.deepEqual(auctionSplit(500, 15), { price: 500, commission: 75, seller: 425 });
    assert.deepEqual(auctionSplit(650, 15), { price: 650, commission: 97.5, seller: 552.5 });
  });

  it('gives the seller 85% and FRPL 15%', () => {
    assert.deepEqual(auctionSplit(590, 15), { price: 590, commission: 88.5, seller: 501.5 });
    assert.deepEqual(auctionSplit(800, 15), { price: 800, commission: 120, seller: 680 });
    assert.deepEqual(auctionSplit(825, 15), { price: 825, commission: 123.75, seller: 701.25 });
  });
});

describe('next bid and Buy It Now', () => {
  it('first bid must meet the opening bid', () => {
    assert.equal(minNextBid({ openingBid: 590, currentBid: null, bidCount: 0 }), 590);
  });

  it('later bids must beat the current bid by the increment', () => {
    assert.equal(minNextBid({ openingBid: 240, currentBid: 240, bidCount: 1 }), 245);
    assert.equal(minNextBid({ openingBid: 590, currentBid: 590, bidCount: 1 }), 600);
    assert.equal(minNextBid({ openingBid: 240, currentBid: 495, bidCount: 3 }), 500);
  });

  it('Buy It Now stays until the current bid reaches it', () => {
    assert.equal(buyNowAvailable({ buyNowPrice: 825, currentBid: null, bidCount: 0 }), true);
    assert.equal(buyNowAvailable({ buyNowPrice: 825, currentBid: 820, bidCount: 4 }), true);
    assert.equal(buyNowAvailable({ buyNowPrice: 825, currentBid: 825, bidCount: 5 }), false);
    assert.equal(buyNowAvailable({ buyNowPrice: null, currentBid: null, bidCount: 0 }), false);
  });

  it('bidError explains the minimum', () => {
    const auction = { openingBid: 590, currentBid: 590, bidCount: 1 };
    assert.equal(bidError(595, auction), 'Minimum bid is $600.');
    assert.equal(bidError(600, auction), null);
    assert.equal(bidError(1000, auction), null);
  });
});

describe('soft close', () => {
  const end = new Date('2026-10-11T21:00:00-06:00');
  it('extends a bid in the final 2 minutes to 2 minutes after the bid', () => {
    const bidAt = new Date('2026-10-11T20:59:30-06:00');
    assert.equal(softCloseEnd(end, bidAt, 2).toISOString(), new Date('2026-10-11T21:01:30-06:00').toISOString());
  });

  it('does not change the end for earlier bids', () => {
    const bidAt = new Date('2026-10-11T20:50:00-06:00');
    assert.equal(softCloseEnd(end, bidAt, 2).toISOString(), end.toISOString());
  });
});
