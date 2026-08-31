import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PAYOUT_MODEL_V2 } from './cashClimbPayoutConfig.js';
import {
  canChopKoh,
  chopKohRemaining,
  chopRemainingPreview,
  findThirdLastStanding,
  lockLeftoverBuckets,
  payThirdLastIfNeeded,
  splitChopShares,
  undoThirdLastAward,
} from './cashClimbKohSettle.js';

function money(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function kohState(overrides = {}) {
  return {
    payoutModel: PAYOUT_MODEL_V2,
    status: 'in-progress',
    totalPrizePool: 100,
    rrBudget: 70,
    kohBudget: 30,
    leftoverBuckets: { second: 18, third: 12 },
    rounds: [{ id: 'k1', round_name: 'King of the Hill', status: 'in-progress' }],
    matches: [
      { id: 'm1', round_id: 'k1', status: 'pending', payout_amount: 8, is_bye: false },
    ],
    stats: [
      { player_id: 'a', player_name: 'Ann', eliminated: false, in_koh: true, total_payout: 20, place_bonus: 0 },
      { player_id: 'b', player_name: 'Ben', eliminated: false, in_koh: true, total_payout: 16, place_bonus: 0 },
      {
        player_id: 'c',
        player_name: 'Cam',
        eliminated: true,
        in_koh: true,
        eliminated_order: 2,
        total_payout: 10,
        place_bonus: 0,
        finish_place: null,
      },
      {
        player_id: 'd',
        player_name: 'Dee',
        eliminated: true,
        in_koh: false,
        eliminated_order: 1,
        total_payout: 8,
        place_bonus: 0,
      },
    ],
    ...overrides,
  };
}

describe('Cash Climb KOH leftover settle', () => {
  it('splits odd leftover so the two chop shares add up', () => {
    const [first, second] = splitChopShares(10.01);
    assert.equal(first, 5.01);
    assert.equal(second, 5);
    assert.equal(money(first + second), 10.01);
  });

  it('finds the first KOH bust as 3rd last standing when two remain', () => {
    const third = findThirdLastStanding(kohState());
    assert.equal(third.player_name, 'Cam');
  });

  it('pays 3rd leftover immediately and does not pay it twice', () => {
    const state = kohState();
    const paid = payThirdLastIfNeeded(state);
    assert.equal(paid, 12);
    assert.equal(state.stats[2].finish_place, 3);
    assert.equal(state.stats[2].leftover_award, 12);
    assert.equal(state.stats[2].total_payout, 22);
    assert.equal(payThirdLastIfNeeded(state), 0);
    assert.equal(state.stats[2].total_payout, 22);
    assert.match(state.message, /3rd last standing/);
  });

  it('pays 3rd leftover to the last RR out when KOH starts with two', () => {
    const state = kohState({
      stats: [
        { player_id: 'a', player_name: 'Ann', eliminated: false, in_koh: true, total_payout: 20, place_bonus: 0 },
        { player_id: 'b', player_name: 'Ben', eliminated: false, in_koh: true, total_payout: 16, place_bonus: 0 },
        {
          player_id: 'd',
          player_name: 'Dee',
          eliminated: true,
          in_koh: false,
          eliminated_order: 1,
          total_payout: 8,
          place_bonus: 0,
        },
      ],
    });
    assert.equal(findThirdLastStanding(state).player_name, 'Dee');
    payThirdLastIfNeeded(state);
    assert.equal(state.stats[2].finish_place, 3);
    assert.equal(state.stats[2].leftover_award, 12);
  });

  it('claws back 3rd leftover when that KOH bust is reversed', () => {
    const state = kohState();
    payThirdLastIfNeeded(state);
    const cam = state.stats[2];
    undoThirdLastAward(state, cam);
    assert.equal(cam.finish_place, null);
    assert.equal(cam.leftover_award, 0);
    assert.equal(cam.total_payout, 10);
    assert.equal(state.thirdLastAwardPaid, null);
  });

  it('chops remaining leftover 50/50 without paying the pending KOH match', () => {
    const state = kohState();
    const matchBefore = state.stats[0].total_payout;
    const matchBeforeB = state.stats[1].total_payout;
    const remaining = chopRemainingPreview(state);
    assert.equal(remaining, 34);
    assert.equal(canChopKoh(state), true);
    chopKohRemaining(state);
    assert.equal(state.status, 'completed');
    assert.equal(state.chopped, true);
    assert.equal(state.winner, null);
    assert.equal(state.matches[0].status, 'cancelled');
    assert.equal(state.stats[2].finish_place, 3);
    const ann = state.stats.find((p) => p.player_name === 'Ann');
    const ben = state.stats.find((p) => p.player_name === 'Ben');
    assert.equal(ann.chopped, true);
    assert.equal(ben.chopped, true);
    assert.equal(ann.total_payout - ann.chop_share, matchBefore);
    assert.equal(ben.total_payout - ben.chop_share, matchBeforeB);
    assert.equal(money(ann.chop_share + ben.chop_share), remaining);
    const paid = state.stats.reduce((sum, p) => sum + p.total_payout, 0);
    assert.equal(paid, 100);
  });

  it('does not lock leftover buckets until King of the Hill starts', () => {
    const state = {
      payoutModel: PAYOUT_MODEL_V2,
      rrBudget: 70,
      kohBudget: 30,
      rounds: [{ id: 'r1', round_name: 'Round 1', status: 'in-progress' }],
      matches: [],
      stats: [],
    };
    assert.equal(lockLeftoverBuckets(state), null);
    assert.equal(state.leftoverBuckets, undefined);
  });

  it('locks leftover buckets from remaining RR when they are missing', () => {
    const state = kohState({ leftoverBuckets: null, matches: [] });
    const buckets = lockLeftoverBuckets(state);
    assert.ok(buckets);
    assert.equal(money(buckets.second + buckets.third), 70);
  });

  it('does not chop unless two players remain in KOH', () => {
    const state = kohState({
      stats: [
        { player_id: 'a', player_name: 'Ann', eliminated: false, in_koh: true, total_payout: 20 },
        { player_id: 'b', player_name: 'Ben', eliminated: false, in_koh: true, total_payout: 16 },
        { player_id: 'c', player_name: 'Cam', eliminated: false, in_koh: true, total_payout: 10 },
      ],
    });
    assert.equal(canChopKoh(state), false);
    assert.throws(() => chopKohRemaining(state), /Chop is only/);
  });
});
