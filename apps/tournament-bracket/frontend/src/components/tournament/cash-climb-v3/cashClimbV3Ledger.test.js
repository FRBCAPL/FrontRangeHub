import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createLedger, ledgerProblems, ledgerSummary, resolveMatchInLedger, settleInLedger, unawardedCents } from './cashClimbV3Ledger.js';
import { fixtureEvent } from './cashClimbV3TestKit.js';

const small = () => createLedger({
  prizePoolCents: 30000,
  allocations: { A: { cents: 10000, kind: 'opening-reserve' }, B: { cents: 20000, kind: 'championship' } },
});
const pay = (matchId, type, playerId, dollars) => ({ key: `${matchId}:${type}:${playerId}`, matchId, type, playerId, cents: dollars * 100 });

describe('Cash Climb V3 ledger', () => {
  it('requires allocations to equal the prize pool', () => {
    assert.throws(() => createLedger({ prizePoolCents: 100, allocations: { A: { cents: 200, kind: 'opening-reserve' } } }), /do not equal/);
  });

  it('allocates a fixture event exactly: opening reserves plus later-round awards = prize pool', () => {
    const s = ledgerSummary(fixtureEvent('n12odd').ledger);
    assert.equal(s.prizePoolCents, 150000);
    assert.equal(s.openingReserveCents, (4 * 63 + 4 * 125) * 100);
    assert.equal(s.laterScheduledCents, (2 * 193 + 362) * 100);
    assert.equal(s.unsettledCents, s.prizePoolCents);
    assert.equal(s.pendingAllocationCents, s.prizePoolCents);
  });

  it('tracks earned, unawarded and unsettled money as matches resolve', () => {
    const l = resolveMatchInLedger(small(), 'A', [pay('A', 'score-split-winner', 'x', 64), pay('A', 'score-split-loser', 'y', 21)]);
    const s = ledgerSummary(l);
    assert.equal(s.earnedCents, 8500);
    assert.equal(s.unawardedCents, 1500);
    assert.equal(s.pendingAllocationCents, 20000);
    assert.equal(s.unsettledCents, 21500);
    assert.deepEqual(ledgerProblems(l), []);
  });

  it('rejects duplicate entitlements, overpayment, non-whole-dollar or non-positive amounts and re-resolution', () => {
    const l = small();
    assert.throws(() => resolveMatchInLedger(l, 'A', [pay('A', 't', 'x', 10), pay('A', 't', 'x', 10)]), /Duplicate/);
    assert.throws(() => resolveMatchInLedger(l, 'A', [pay('A', 't', 'x', 101)]), /more than its/);
    assert.throws(() => resolveMatchInLedger(l, 'A', [{ ...pay('A', 't', 'x', 1), cents: 150 }]), /whole-dollar/);
    assert.throws(() => resolveMatchInLedger(l, 'A', [pay('A', 't', 'x', 0)]), /positive/);
    assert.throws(() => resolveMatchInLedger(l, 'A', [pay('B', 't', 'x', 1)]), /belong to match A/);
    assert.throws(() => resolveMatchInLedger(l, 'Z', []), /Unknown match/);
    const done = resolveMatchInLedger(l, 'A', []);
    assert.throws(() => resolveMatchInLedger(done, 'A', []), /already settled/);
  });

  it('settlement can only distribute or retain unawarded money, never more, never negative', () => {
    const l = resolveMatchInLedger(small(), 'A', [pay('A', 't', 'x', 60)]);
    assert.equal(unawardedCents(l), 4000);
    assert.throws(() => settleInLedger(l, [], 4100), /more than the unawarded/);
    assert.throws(() => settleInLedger(l, [], -100), /negative/);
    assert.throws(() => settleInLedger(l, [pay('A', 'bonus', 'x', 1)]), /cannot belong/);
    const s = settleInLedger(l, [{ ...pay('settlement', 'bonus', 'x', 30), matchId: null }], 1000);
    assert.equal(unawardedCents(s), 0);
    assert.equal(ledgerSummary(s).operatorRetainedCents, 1000);
    assert.deepEqual(ledgerProblems(s), []);
  });

  it('detects a tampered ledger', () => {
    const l = resolveMatchInLedger(small(), 'A', [pay('A', 't', 'x', 60)]);
    assert.ok(ledgerProblems({ ...l, entries: [...l.entries, l.entries[0]] }).some((p) => p.includes('Duplicate')));
    assert.ok(ledgerProblems({ ...l, entries: [...l.entries, pay('B', 't', 'y', 5)] }).some((p) => p.includes('before it was resolved')));
    assert.ok(ledgerProblems({ ...l, entries: [pay('A', 't', 'x', 150)] }).some((p) => p.includes('more than its allocation')));
  });
});
