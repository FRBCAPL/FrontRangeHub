import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { adminShipFlag, buyerShipActions, buyerShipNote, problemOpen, problemWindowEndsAt } from './consignmentShipAcceptance.js';

const NOW = Date.parse('2026-11-10T12:00:00Z');
const daysAgo = (n) => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();

describe('buyerShipActions', () => {
  it('nothing before it ships or once cancelled', () => {
    for (const status of ['requested', 'invoiced', 'paid', 'cancelled']) {
      assert.deepEqual(buyerShipActions({ status }, 3, NOW), { accept: false, problem: false });
    }
  });

  it('shipped: both buttons (delivery may not be marked yet)', () => {
    assert.deepEqual(buyerShipActions({ status: 'shipped' }, 3, NOW), { accept: true, problem: true });
  });

  it('delivered: problem only inside the window', () => {
    assert.deepEqual(buyerShipActions({ status: 'arrived', arrived_at: daysAgo(1) }, 3, NOW), { accept: true, problem: true });
    assert.deepEqual(buyerShipActions({ status: 'arrived', arrived_at: daysAgo(4) }, 3, NOW), { accept: true, problem: false });
  });

  it('nothing after accepting or while a problem is open', () => {
    assert.deepEqual(buyerShipActions({ status: 'arrived', arrived_at: daysAgo(1), buyer_accepted_at: daysAgo(1) }, 3, NOW),
      { accept: false, problem: false });
    assert.deepEqual(buyerShipActions({ status: 'arrived', arrived_at: daysAgo(1), problem_reported_at: daysAgo(1) }, 3, NOW),
      { accept: false, problem: false });
  });
});

describe('problem state', () => {
  it('open until resolved', () => {
    assert.equal(problemOpen({ problem_reported_at: daysAgo(1) }), true);
    assert.equal(problemOpen({ problem_reported_at: daysAgo(1), problem_resolved_at: daysAgo(0) }), false);
    assert.equal(problemOpen({}), false);
  });

  it('window ends complaint days after delivery', () => {
    assert.equal(problemWindowEndsAt({ arrived_at: '2026-11-01T00:00:00Z' }, 3).toISOString(), '2026-11-04T00:00:00.000Z');
    assert.equal(problemWindowEndsAt({ status: 'shipped' }, 3), null);
  });
});

describe('labels', () => {
  it('buyer note', () => {
    assert.match(buyerShipNote({ buyer_accepted_at: daysAgo(0) }), /confirmed/);
    assert.match(buyerShipNote({ problem_reported_at: daysAgo(0), problem_note: 'Cracked' }), /“Cracked”/);
    assert.match(buyerShipNote({ problem_reported_at: daysAgo(1), problem_resolved_at: daysAgo(0), problem_resolution: 'refunded' }), /refund/);
    assert.equal(buyerShipNote({ status: 'shipped' }), '');
  });

  it('admin flag', () => {
    assert.equal(adminShipFlag({ problem_reported_at: daysAgo(0) }).tone, 'problem');
    assert.equal(adminShipFlag({ buyer_accepted_at: daysAgo(0) }).tone, 'ok');
    assert.equal(adminShipFlag({ problem_reported_at: daysAgo(1), problem_resolved_at: daysAgo(0), problem_resolution: 'refunded' }).tone, 'done');
    assert.equal(adminShipFlag({ status: 'shipped' }), null);
  });
});
