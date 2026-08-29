import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computePlacePrizes,
  finishPlaceLabel,
  lastStandingFinishers,
  leftoverAwardLabel,
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

  it('gives 2nd the largest leftover share on top 4', () => {
    const places = computePlacePrizes({ prizePool: 320, placeCount: 4, climbNeed: 256 });
    assert.equal(places.first, 12.8);
    assert.equal(places.second, 32);
    assert.equal(places.third, 11.52);
    assert.equal(places.fourth, 7.68);
    assert.equal(places.reserved, 64);
    assert.equal(places.matchPool, 256);
    assert.ok(places.second > places.first);
    assert.equal(listedPlacePrizes(places).length, 4);
  });

  it('gives 2nd the larger leftover share when paying 1st and 2nd', () => {
    const places = computePlacePrizes({ prizePool: 320, placeCount: 2, climbNeed: 256 });
    assert.equal(places.first, 22.4);
    assert.equal(places.second, 41.6);
    assert.equal(places.reserved, 64);
    assert.equal(places.matchPool, 256);
    assert.ok(places.second > places.first);
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

  it('labels finish places as last standing, not cash rank', () => {
    assert.equal(finishPlaceLabel(1), 'Last standing');
    assert.equal(finishPlaceLabel(2), '2nd last standing');
    assert.equal(finishPlaceLabel(3), '3rd last standing');
    assert.equal(leftoverAwardLabel(1), 'Last standing leftover');
    assert.equal(leftoverAwardLabel(2), '2nd last leftover');
    assert.equal(leftoverAwardLabel(3), '3rd last leftover');
  });

  it('clamps place count to 1–4', () => {
    assert.equal(parsePlaceCount(undefined), 1);
    assert.equal(parsePlaceCount(9), 4);
    assert.equal(parsePlaceCount(3), 3);
  });
});
