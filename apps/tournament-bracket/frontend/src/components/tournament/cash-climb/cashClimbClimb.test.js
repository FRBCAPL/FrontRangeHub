import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { climbRoundPayouts, futureClimbReserve, roundWinCost, minimumClimbCost } from './cashClimbClimb.js';
import { previewPrizeSchedule } from './cashClimbSchedule.js';
import { computePlacePrizes } from './cashClimbPlacePrizes.js';
import { eventRoundPlan, climbNeedForField } from './cashClimbDuration.js';

describe('Cash Climb $1 ladder', () => {
  it('parks a one-match $1 climb for later rounds', () => {
    assert.equal(futureClimbReserve(5, 3), 3 * 5 + 6);
    assert.equal(roundWinCost(8, 6, 1), 48 + 4);
  });

  it('pays as much as leftover allows while keeping a $1 climb', () => {
    const first = climbRoundPayouts({
      remaining: 208,
      remainingRounds: 8,
      numMatches: 6,
      numByes: 1,
      lastPerWin: 0,
      shape: [
        { matchCount: 6, byeCount: 1 },
        { matchCount: 6, byeCount: 1 },
        { matchCount: 5, byeCount: 1 },
        { matchCount: 4, byeCount: 0 },
        { matchCount: 3, byeCount: 1 },
        { matchCount: 1, byeCount: 0 },
        { matchCount: 1, byeCount: 0 },
        { matchCount: 1, byeCount: 0 },
      ],
    });
    assert.ok(first.perMatch >= 2);
    const second = climbRoundPayouts({
      remaining: 208 - first.roundPrize,
      remainingRounds: 7,
      numMatches: 6,
      numByes: 1,
      lastPerWin: first.perMatch,
      shape: [
        { matchCount: 6, byeCount: 1 },
        { matchCount: 5, byeCount: 1 },
        { matchCount: 4, byeCount: 0 },
        { matchCount: 3, byeCount: 1 },
        { matchCount: 1, byeCount: 0 },
        { matchCount: 1, byeCount: 0 },
        { matchCount: 1, byeCount: 0 },
      ],
    });
    assert.ok(second.perMatch >= first.perMatch + 1);
  });

  it('opens at least $2 per win and still climbs', () => {
    const first = climbRoundPayouts({
      remaining: 80,
      remainingRounds: 5,
      numMatches: 2,
      numByes: 0,
      lastPerWin: 0,
      shape: [
        { matchCount: 2, byeCount: 0 },
        { matchCount: 2, byeCount: 0 },
        { matchCount: 1, byeCount: 0 },
        { matchCount: 1, byeCount: 0 },
        { matchCount: 1, byeCount: 0 },
      ],
    });
    assert.ok(first.perMatch >= 2);
    const second = climbRoundPayouts({
      remaining: 80 - first.roundPrize,
      remainingRounds: 4,
      numMatches: 2,
      numByes: 0,
      lastPerWin: first.perMatch,
      shape: [
        { matchCount: 2, byeCount: 0 },
        { matchCount: 1, byeCount: 0 },
        { matchCount: 1, byeCount: 0 },
        { matchCount: 1, byeCount: 0 },
      ],
    });
    assert.ok(second.perMatch >= first.perMatch + 1);
  });

  it('holds the last per-win if leftover cannot climb', () => {
    const held = climbRoundPayouts({
      remaining: 28,
      remainingRounds: 2,
      numMatches: 2,
      numByes: 0,
      lastPerWin: 14,
      shape: [
        { matchCount: 2, byeCount: 0 },
        { matchCount: 1, byeCount: 0 },
      ],
    });
    assert.equal(held.perMatch, 14);
  });

  it('parks leftover after the $2 climb as last standing', () => {
    const need = climbNeedForField(13);
    const places = computePlacePrizes({ prizePool: 260, placeCount: 1, climbNeed: need });
    const plan = eventRoundPlan(13).map((round) => ({
      matchCount: round.matchCount,
      byeCount: round.byeCount || 0,
    }));
    assert.equal(need, minimumClimbCost(plan, 0));
    assert.ok(need >= 2);
    assert.equal(places.matchPool, Math.min(260, need));
    assert.equal(places.first, Math.max(0, 260 - places.matchPool));
    assert.equal(places.reserved, places.first);
  });

  it('previews a 13-player ladder that opens at $2 and climbs into King of the Hill', () => {
    const players = Array.from({ length: 13 }, (_, i) => ({ name: `P${i + 1}` }));
    const places = computePlacePrizes({ prizePool: 260, placeCount: 1, playerCount: 13 });
    const preview = previewPrizeSchedule(players, 'single', 260, places.reserved);
    assert.ok(preview.rrRounds >= 1);
    assert.ok(preview.kohRounds >= 1);
    assert.equal(preview.available, places.matchPool);
    const paid = preview.rounds.filter((round) => round.perWin > 0);
    assert.ok(paid[0].perWin >= 2);
    let last = 1;
    paid.forEach((round) => {
      assert.ok(round.perWin >= last + 1, `${round.label} per-win ${round.perWin} did not climb from ${last}`);
      last = round.perWin;
    });
  });
});
