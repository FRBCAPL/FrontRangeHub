import test from 'node:test';
import assert from 'node:assert/strict';
import { bidderOutcome } from './consignmentBidderOutcome.js';

test('bidderOutcome', () => {
  assert.equal(bidderOutcome({ status: 'live', current_bidder: 'u1' }, 'u1'), 'Leading');
  assert.equal(bidderOutcome({ status: 'live', current_bidder: 'u2' }, 'u1'), 'Outbid');
  assert.equal(bidderOutcome({ status: 'awaiting_payment', winner_id: 'u1' }, 'u1'), 'Won · awaiting payment');
  assert.equal(bidderOutcome({ status: 'paid', winner_id: 'u2' }, 'u1'), 'Lost');
  assert.equal(bidderOutcome({ status: 'defaulted', winner_id: 'u1' }, 'u1'), 'Won · didn’t pay');
  assert.equal(bidderOutcome({ status: 'cancelled' }, 'u1'), 'Auction cancelled');
  assert.equal(bidderOutcome(null, 'u1'), '');
});
