/**
 * Pure money-math tests for Estate Vault finance snapshot helpers.
 * Run: node --test shared/utils/estateFinance.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFinanceSnapshot,
  formatMoney,
  mapSqlFinanceSnapshot,
  roundMoney,
  saleProceedsDepositedItemIds,
  sumOutstandingBids,
  sumPaidAuctionSales,
  sumUndepositedPaidSales,
  sumUnsoldInventoryValue
} from './estateFinance.js';

describe('roundMoney / formatMoney', () => {
  it('rounds to cents', () => {
    assert.equal(roundMoney(1.234), 1.23);
    assert.equal(roundMoney(1.235), 1.24);
    assert.equal(roundMoney('12.345'), 12.35);
    assert.equal(roundMoney(null), 0);
  });

  it('formats currency', () => {
    assert.equal(formatMoney(12.5), '$12.50');
    assert.equal(formatMoney(-3), '-$3.00');
    assert.equal(formatMoney('x'), '$0.00');
  });
});

describe('auction and inventory sums', () => {
  const items = [
    { id: 'a', highest_bid: 100, auction_paid_at: null, estimated_value: 50 },
    { id: 'b', highest_bid: 200, auction_paid_at: '2026-01-01', estimated_value: 90 },
    {
      id: 'c',
      highest_bid: 0,
      auction_paid_at: null,
      estimated_value: 75,
      legal_status: 'secured'
    },
    {
      id: 'd',
      highest_bid: 0,
      auction_paid_at: null,
      estimated_value: 40,
      legal_status: 'distributed'
    }
  ];

  it('sums outstanding bids (unpaid only)', () => {
    assert.equal(sumOutstandingBids(items), 100);
  });

  it('sums paid auction sales', () => {
    assert.equal(sumPaidAuctionSales(items), 200);
  });

  it('sums unsold inventory (no bid, not distributed/archived)', () => {
    assert.equal(sumUnsoldInventoryValue(items), 75);
  });

  it('sums undeposited paid sales when no deposit txn', () => {
    assert.equal(sumUndepositedPaidSales(items, new Set()), 200);
    assert.equal(sumUndepositedPaidSales(items, new Set(['b'])), 0);
  });

  it('collects sale_proceeds item ids from transactions', () => {
    const ids = saleProceedsDepositedItemIds([
      { category: 'sale_proceeds', item_id: 'b' },
      { category: 'expense', item_id: 'x' }
    ]);
    assert.ok(ids.has('b'));
    assert.equal(ids.size, 1);
  });
});

describe('computeFinanceSnapshot', () => {
  it('builds funds, gross, and estate balance without double-counting expenses', () => {
    const snap = computeFinanceSnapshot({
      accountAssetsTotal: 1000,
      otherCashOnHand: 100,
      undepositedPaidSales: 50,
      outstandingBids: 200,
      unsoldInventoryValue: 300,
      accountDebtsTotal: 150,
      prLoansTotal: 50,
      expensesTotal: 999,
      paidAuctionSales: 400,
      fundsAreTransactionComputed: true
    });

    assert.equal(snap.fundsAvailable, 1100);
    assert.equal(snap.nonCashAssets, 550);
    assert.equal(snap.grossEstateValue, 1650);
    assert.equal(snap.totalLiabilities, 200);
    assert.equal(snap.netDistributable, 1450);
    assert.equal(snap.expensesCounted, 0);
    assert.equal(snap.paidAuctionSalesCounted, 0);
    assert.equal(snap.accountingMethod, 'funds_transactions');
  });
});

describe('mapSqlFinanceSnapshot', () => {
  it('maps SQL snake_case totals to PR camelCase', () => {
    const mapped = mapSqlFinanceSnapshot({
      success: true,
      account_assets_total: 500,
      other_cash: 25,
      undeposited_paid_sales: 75,
      funds_available: 600,
      outstanding_bids: 100,
      unsold_inventory: 200,
      non_cash_assets: 300,
      gross_assets: 900,
      account_debts_total: 40,
      pr_loans_total: 10,
      total_liabilities: 50,
      estate_balance: 850,
      expenses_total: 12,
      paid_auction_sales: 80,
      accounting_method: 'funds_transactions'
    });

    assert.ok(mapped);
    assert.equal(mapped.fundsAvailable, 600);
    assert.equal(mapped.netDistributable, 850);
    assert.equal(mapped.undepositedPaidSales, 75);
    assert.equal(mapped.expensesTotal, 12);
    assert.equal(mapped.accountingMethod, 'funds_transactions');
  });

  it('returns null when SQL reports failure', () => {
    assert.equal(mapSqlFinanceSnapshot({ success: false }), null);
  });
});
