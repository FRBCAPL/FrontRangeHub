import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computePlacePrizes,
  lastStandingFinishers,
  listedPlacePrizes,
  parsePlaceCount,
} from './cashClimbPlacePrizes.js';

describe('cash climb place prizes', () => {
  it('parks leftover after the climb as 1st when paying 1st only', () => {
    const places = computePlacePrizes({ prizePool: 320, placeCount: 1, climbNeed: 256 });
    assert.equal(places.first, 64);
    assert.equal(places.second, 0);
    assert.equal(places.third, 0);
    assert.equal(places.fourth, 0);
    assert.equal(places.reserved, 64);
    assert.equal(places.matchPool, 256);
    assert.equal(listedPlacePrizes(places).length, 1);
  });

  it('splits leftover 40 / 25 / 20 / 15 for top 4', () => {
    const places = computePlacePrizes({ prizePool: 320, placeCount: 4, climbNeed: 256 });
    assert.equal(places.first, 25.6);
    assert.equal(places.second, 16);
    assert.equal(places.third, 12.8);
    assert.equal(places.fourth, 9.6);
    assert.equal(places.reserved, 64);
    assert.equal(places.matchPool, 256);
    assert.equal(listedPlacePrizes(places).length, 4);
  });

  it('splits leftover 65 / 35 for 1st and 2nd', () => {
    const places = computePlacePrizes({ prizePool: 320, placeCount: 2, climbNeed: 256 });
    assert.equal(places.first, 41.6);
    assert.equal(places.second, 22.4);
    assert.equal(places.reserved, 64);
    assert.equal(places.matchPool, 256);
  });

  it('reserves nothing for last standing if the climb needs the whole pool', () => {
    const places = computePlacePrizes({ prizePool: 100, placeCount: 1, climbNeed: 140 });
    assert.equal(places.matchPool, 100);
    assert.equal(places.first, 0);
    assert.equal(places.reserved, 0);
  });

  it('orders last standing as winner then most recently eliminated', () => {
    const winner = { player_id: 'a', player_name: 'Ann' };
    const finishers = lastStandingFinishers([
      { player_id: 'c', player_name: 'Cam', eliminated: true, eliminated_order: 1 },
      { player_id: 'a', player_name: 'Ann', eliminated: false },
      { player_id: 'b', player_name: 'Ben', eliminated: true, eliminated_order: 2 },
      { player_id: 'd', player_name: 'Dee', eliminated: true, eliminated_order: 3 },
    ], winner);
    assert.deepEqual(finishers.map((p) => p.player_name), ['Ann', 'Dee', 'Ben', 'Cam']);
  });

  it('clamps place count to 1–4', () => {
    assert.equal(parsePlaceCount(undefined), 1);
    assert.equal(parsePlaceCount(9), 4);
    assert.equal(parsePlaceCount(3), 3);
  });
});
