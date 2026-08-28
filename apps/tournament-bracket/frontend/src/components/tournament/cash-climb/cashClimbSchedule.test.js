import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMatchPayouts,
  calculatePrizeDistribution,
  generateRoundRobin,
  previewPrizeSchedule,
} from './cashClimbSchedule.js';
import {
  eventRoundPlan,
  maxEventRoundsUntilWinner,
  maxRoundRobinRoundsUntilKoh,
} from './cashClimbDuration.js';
import { computePlacePrizes } from './cashClimbPlacePrizes.js';

describe('cash climb prize schedule', () => {
  it('spreads the match pool across estimated RR and KOH rounds', () => {
    const prizes = calculatePrizeDistribution(192, 10);
    const sum = prizes.reduce((total, n) => total + n, 0);
    assert.equal(prizes.length, 10);
    assert.ok(Math.abs(sum - 192) < 0.02);
    assert.ok(prizes.every((n) => n >= 0));
  });

  it('pays whole-dollar match wins and a whole-dollar bye', () => {
    const payouts = calculateMatchPayouts(20.8, 6, 1);
    assert.equal(payouts.perMatch, 3);
    assert.equal(payouts.perBye, 1);
    assert.equal(payouts.perMatch % 1, 0);
    assert.equal(payouts.perBye % 1, 0);
  });

  it('previews 12-player payouts across max RR plus KOH rounds', () => {
    const players = Array.from({ length: 12 }, (_, i) => ({ name: `P${i + 1}` }));
    const pool = 240;
    const places = computePlacePrizes({ prizePool: pool, placeCount: 1, playerCount: 12 });
    const preview = previewPrizeSchedule(players, 'single', pool, places.reserved);
    const fullRr = generateRoundRobin(players, 'single').length;
    const rrMax = maxRoundRobinRoundsUntilKoh(12);
    const eventMax = maxEventRoundsUntilWinner(12);
    const plan = eventRoundPlan(12);
    assert.equal(places.matchPool + places.reserved, pool);
    assert.ok(places.matchPool > 0);
    assert.equal(places.reserved, pool - places.matchPool);
    assert.equal(fullRr, 11);
    assert.ok(rrMax < fullRr);
    assert.ok(eventMax > rrMax);
    assert.equal(preview.rrRounds, plan.filter((r) => r.phase === 'rr').length);
    assert.ok(preview.kohRounds >= 1);
    assert.equal(preview.expectedRounds, eventMax);
    const roundSum = preview.rounds.reduce((sum, row) => sum + row.roundPrize, 0);
    assert.ok(Math.abs(roundSum - places.matchPool) < 0.02);
    assert.ok(preview.rounds.every((row) => row.perWin === Math.floor(row.perWin)));
  });
});
