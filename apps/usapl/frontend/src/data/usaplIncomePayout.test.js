import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultPlacePercents,
  simulateCashPayout,
  suggestedPaidPlaces,
} from './usaplIncomePayout.js';

describe('usaplIncomePayout', () => {
  it('suggests more paid places as the field grows', () => {
    assert.equal(suggestedPaidPlaces(4), 1);
    assert.equal(suggestedPaidPlaces(8), 3);
    assert.equal(suggestedPaidPlaces(12), 4);
  });

  it('pays a cash percent of the prize fund and splits places', () => {
    const result = simulateCashPayout({
      prizeCents: 100000,
      cashPercent: 80,
      placePercents: defaultPlacePercents(3),
    });
    assert.equal(result.source, 'prize');
    assert.equal(result.cash_pool_cents, 80000);
    assert.equal(result.held_cents, 20000);
    assert.equal(result.places[0].cents + result.places[1].cents + result.places[2].cents, 80000);
    assert.equal(result.places[0].percent, 50);
  });

  it('can pay from full dues or a capped custom amount', () => {
    const dues = simulateCashPayout({
      prizeCents: 40000,
      grossCents: 100000,
      source: 'dues',
      cashPercent: 100,
      placePercents: [100],
    });
    assert.equal(dues.cash_pool_cents, 100000);
    const custom = simulateCashPayout({
      prizeCents: 40000,
      grossCents: 100000,
      customCents: 25000,
      source: 'custom',
      cashPercent: 100,
      placePercents: [100],
    });
    assert.equal(custom.cash_pool_cents, 25000);
    assert.throws(() => simulateCashPayout({
      prizeCents: 40000,
      grossCents: 100000,
      customCents: 150000,
      source: 'custom',
      cashPercent: 100,
      placePercents: [100],
    }), /more than dues collected/);
  });

  it('leaves unassigned cash when place percents are under 100', () => {
    const result = simulateCashPayout({
      prizeCents: 10000,
      cashPercent: 100,
      placePercents: [40, 40],
    });
    assert.equal(result.leftover_percent, 20);
    assert.equal(result.leftover_cents, 2000);
  });

  it('rejects place percents over 100', () => {
    assert.throws(() => simulateCashPayout({
      prizeCents: 1000,
      cashPercent: 100,
      placePercents: [60, 50],
    }), /more than 100/);
  });
});
