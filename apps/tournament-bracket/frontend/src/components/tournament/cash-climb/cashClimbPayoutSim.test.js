import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPayoutPlan, splitRrSurplus } from './cashClimbAllocations.js';
import { estimateFinishTotals, simulateLockedPayouts } from './cashClimbPayoutSim.js';

const ENTRY_FEES = [10, 15, 20, 25, 30];
const PLAYER_COUNTS = [4, 7, 8, 9, 10, 12, 13, 16, 20, 24];

describe('Cash Climb RR/KOH allocations', () => {
  it('splits a 13-player $20 pool into protected RR and KOH budgets', () => {
    const plan = buildPayoutPlan({ prizePool: 260, playerCount: 13 });
    assert.equal(plan.pool, 260);
    assert.equal(plan.kohBudget, 65);
    assert.equal(plan.rrBudget, 195);
    assert.equal(plan.kohSchedule.length, 5);
    assert.ok(plan.rr.schedule[0] >= 2);
    plan.kohSchedule.forEach((win, i) => {
      if (i > 0) assert.ok(win >= plan.kohSchedule[i - 1] + 1);
    });
    assert.equal(plan.koh.scheduledSpend + plan.championshipFloor, plan.kohBudget);
    assert.ok(plan.championshipFloor > 0);
    assert.ok(plan.kohSchedule[0] >= plan.lastRrPerWin + 1);
  });

  it('gives a 4-player pool a smaller RR bank so KOH can climb above RR', () => {
    const plan = buildPayoutPlan({ prizePool: 80, playerCount: 4 });
    assert.equal(plan.pool, 80);
    assert.equal(Math.round((plan.rrBudget + plan.kohBudget) * 100) / 100, 80);
    assert.ok(plan.rrBudget < plan.kohBudget);
    assert.ok(plan.rrBudget < 60);
    assert.ok(plan.kohSchedule[0] >= plan.lastRrPerWin + 1);
    assert.ok(plan.rr.schedule[0] >= 2);
  });

  it('splits unused RR 60/40 to 2nd and 3rd', () => {
    const split = splitRrSurplus(25);
    assert.equal(split.second, 15);
    assert.equal(split.third, 10);
  });
});

describe('Cash Climb payout simulation', () => {
  for (const entryFee of ENTRY_FEES) {
    for (const playerCount of PLAYER_COUNTS) {
      it(`distributes 100% for ${playerCount} players at $${entryFee}`, () => {
        const slow = simulateLockedPayouts({ entryFee, playerCount, fastestRr: false, kohMatches: 5 });
        const fast = simulateLockedPayouts({ entryFee, playerCount, fastestRr: true, kohMatches: 4 });
        const long = simulateLockedPayouts({
          entryFee,
          playerCount,
          extraRrRounds: 2,
          kohMatches: 5,
        });
        for (const row of [slow, fast, long]) {
          assert.equal(row.undistributed, 0);
          assert.equal(row.distributed, row.pool);
          assert.ok(row.rrPaid <= row.rrBudget + 0.001);
          assert.ok(row.kohPaid <= row.kohBudget + 0.001);
          assert.equal(moneyCheck(row.rrPaid + row.kohPaid + row.rrSurplus + row.kohSurplus), row.pool);
        }
      });
    }
  }

  it('keeps a 13×$20 dominant finish in a Cash Climb shape, not a 50%+ tournament table', () => {
    const result = simulateLockedPayouts({
      entryFee: 20,
      playerCount: 13,
      fastestRr: false,
      kohMatches: 4,
    });
    const totals = estimateFinishTotals(result);
    assert.equal(result.undistributed, 0);
    assert.ok(totals.first > totals.second);
    assert.ok(totals.second > totals.third);
    assert.ok(totals.firstSecondRatio < 2.2, `1st/2nd ratio ${totals.firstSecondRatio}`);
    assert.ok(totals.first < result.pool * 0.5, `1st took ${totals.first} of ${result.pool}`);
  });
});

function moneyCheck(n) {
  return Math.round(Number(n) * 100) / 100;
}
