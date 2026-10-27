import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCashClimbV3Bracket, cashClimbV3Shape, placementProblems } from '../cashClimbV3Bracket.js';
import { cryptoRandomInt, placementWith, placementWithout, preliminaryFeedSlots, randomPlacement, shuffled, swapEntrants } from './cashClimbV3Draw.js';
import { drawAfterAdd, drawAfterRemove, drawAfterSwap, drawDetails, drawFromRecord, freshDraw } from './cashClimbV3DrawState.js';

import { seededRandomInt } from './cashClimbV3AppTestKit.js';

const ids = (n) => Array.from({ length: n }, (_, i) => `p${i + 1}`);
const players = (n) => ids(n).map((id) => ({ id, name: `Player ${id}` }));
const placedIds = (p) => [...p.preliminary.flat(), ...p.main.filter((s) => 'entrant' in s).map((s) => s.entrant)];
const position = (p, id) => {
  const k = p.preliminary.findIndex((pair) => pair.includes(id));
  return k >= 0 ? `p${k}:${p.preliminary[k].indexOf(id)}` : `m${p.main.findIndex((s) => s.entrant === id)}`;
};
/** Where a player plays, independent of preliminary numbering: opponent and fed slot, or main slot. */
const seat = (p, id) => {
  const k = p.preliminary.findIndex((pair) => pair.includes(id));
  if (k < 0) return `m${p.main.findIndex((s) => s.entrant === id)}`;
  return `vs ${p.preliminary[k].find((x) => x !== id)} -> m${p.main.findIndex((s) => s.preliminary === k)}`;
};
const changedSeats = (before, after, who) => who.filter((id) => seat(before, id) !== seat(after, id));

describe('Cash Climb (V3) random draw', () => {
  it('makes a valid draw for every field size from 8 to 128: right preliminary matches and byes, everyone exactly once', () => {
    const rand = seededRandomInt(2026);
    for (let n = 8; n <= 128; n += 1) {
      const entrants = ids(n);
      const shape = cashClimbV3Shape(n);
      const p = randomPlacement(entrants, rand);
      assert.deepEqual(placementProblems(entrants, p), [], `N${n}`);
      assert.equal(p.preliminary.length, shape.preliminaryMatches, `N${n} preliminary matches`);
      assert.equal(p.main.filter((s) => 'entrant' in s).length, shape.bracketSize - shape.preliminaryMatches, `N${n} byes into the opening round`);
      assert.equal(shape.preliminaryByes, 2 * shape.bracketSize - n);
      assert.deepEqual([...placedIds(p)].sort(), [...entrants].sort(), `N${n} every player once`);
      const feeds = p.main.map((s, i) => ('preliminary' in s ? [s.preliminary, i] : null)).filter(Boolean);
      assert.deepEqual(feeds.map(([k]) => k), feeds.map((_, k) => k), `N${n} preliminary k feeds the k-th feed slot`);
      assert.deepEqual(feeds.map(([, i]) => i), preliminaryFeedSlots(n), `N${n} feed slots`);
      assert.equal(buildCashClimbV3Bracket(entrants, p).opening.length, shape.mainOpeningMatches, `N${n} builds`);
    }
  });

  it('spreads preliminary winners over the opening matches', () => {
    assert.deepEqual(preliminaryFeedSlots(8), []);
    assert.deepEqual(preliminaryFeedSlots(9), [1]);
    assert.deepEqual(preliminaryFeedSlots(10), [1, 5]);
    assert.deepEqual(preliminaryFeedSlots(12), [1, 3, 5, 7]);
    assert.deepEqual(preliminaryFeedSlots(15), [0, 1, 2, 3, 4, 5, 7]);
    for (let n = 8; n <= 128; n += 1) {
      const { preliminaryMatches: P, mainOpeningMatches: M } = cashClimbV3Shape(n);
      const perMatch = new Map();
      preliminaryFeedSlots(n).forEach((slot) => perMatch.set(slot >> 1, (perMatch.get(slot >> 1) || 0) + 1));
      const doubles = [...perMatch.values()].filter((c) => c === 2).length;
      assert.equal(doubles, Math.max(0, P - M), `N${n}: two preliminary winners meet only when unavoidable`);
    }
  });

  it('is repeatable with a controlled random source and varies between sources', () => {
    const a = randomPlacement(ids(24), seededRandomInt(7));
    assert.deepEqual(randomPlacement(ids(24), seededRandomInt(7)), a);
    assert.notDeepEqual(randomPlacement(ids(24), seededRandomInt(8)), a);
  });

  it('uses an unbiased secure shuffle', () => {
    assert.throws(() => cryptoRandomInt(0), RangeError);
    for (let i = 0; i < 200; i += 1) {
      const v = cryptoRandomInt(7);
      assert.ok(Number.isInteger(v) && v >= 0 && v < 7);
    }
    const counts = new Map();
    for (let i = 0; i < 6000; i += 1) {
      const key = shuffled(['a', 'b', 'c']).join('');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    assert.equal(counts.size, 6);
    counts.forEach((c, k) => assert.ok(c > 820 && c < 1180, `${k}: ${c}`));
  });
});

describe('Cash Climb (V3) manual adjustments', () => {
  it('swaps two players without changing the bracket structure', () => {
    const p = randomPlacement(ids(12), seededRandomInt(3));
    const inPrelim = p.preliminary[0][0];
    const direct = p.main.find((s) => 'entrant' in s).entrant;
    const s = swapEntrants(p, inPrelim, direct);
    assert.deepEqual(placementProblems(ids(12), s), []);
    assert.equal(position(s, direct), position(p, inPrelim));
    assert.equal(position(s, inPrelim), position(p, direct));
    assert.deepEqual(s.main.map((x) => ('preliminary' in x ? x.preliminary : 'e')), p.main.map((x) => ('preliminary' in x ? x.preliminary : 'e')));
    ids(12).filter((id) => id !== inPrelim && id !== direct).forEach((id) => assert.equal(position(s, id), position(p, id)));
    assert.equal(swapEntrants(p, inPrelim, 'nobody'), p, 'an unknown player changes nothing');
    assert.equal(swapEntrants(p, direct, direct), p);
  });

  it('keeps everyone it can when a player is removed or added', () => {
    const rand = seededRandomInt(11);
    for (let n = 9; n <= 64; n += 1) {
      const p = randomPlacement(ids(n), rand);
      const B = cashClimbV3Shape(n).bracketSize;
      const victim = ids(n)[rand(n)];
      const rest = ids(n).filter((id) => id !== victim);
      const fewer = placementWithout(p, victim, rest, rand);
      if (n === B) { assert.equal(fewer, null, `N${n}: removing a player halves the bracket`); continue; }
      assert.ok(fewer, `N${n} remove`);
      assert.deepEqual(placementProblems(rest, fewer), [], `N${n} remove valid`);
      const prelimOf = p.preliminary.findIndex((pair) => pair.includes(victim));
      if (prelimOf >= 0) {
        const opponent = p.preliminary[prelimOf].find((id) => id !== victim);
        const fed = p.main.findIndex((s) => s.preliminary === prelimOf);
        assert.equal(fewer.main[fed].entrant, opponent, `N${n}: the preliminary opponent takes that main position`);
      }
      assert.equal(changedSeats(p, fewer, rest).length, prelimOf >= 0 ? 1 : 2, `N${n}: only the players filling the gap move`);
      if (n + 1 < 2 * B) {
        const more = placementWith(p, 'new', [...ids(n), 'new'], rand);
        assert.deepEqual(placementProblems([...ids(n), 'new'], more), [], `N${n} add valid`);
        assert.equal(changedSeats(p, more, ids(n)).length, 1, `N${n}: only the new player's opponent moves`);
      }
    }
    assert.equal(placementWithout(randomPlacement(ids(16), rand), 'p1', ids(16).slice(1), rand), null, 'the bracket size changes below 16');
    assert.equal(placementWith(randomPlacement(ids(15), rand), 'new', [...ids(15), 'new'], rand), null, 'the bracket size changes at 16');
  });
});

describe('Cash Climb (V3) setup draw state', () => {
  it('stays stable until players change, a swap, or a redraw; adjustments are kept or the loss is explained', () => {
    const rand = seededRandomInt(5);
    let list = players(10);
    let draw = freshDraw(list, rand);
    assert.equal(draw.adjusted, false);
    assert.deepEqual(drawDetails(draw), { adjusted: false });
    list = [...list, { id: 'n1', name: 'New One' }];
    const redrawn = drawAfterAdd(draw, list, 'n1', rand);
    assert.equal(redrawn.adjusted, false, 'an untouched draw is simply redrawn');
    assert.deepEqual(placementProblems(list.map((p) => p.id), redrawn.placement), []);
    const [a, b] = [redrawn.placement.preliminary[0][0], redrawn.placement.main.find((s) => 'entrant' in s).entrant];
    draw = drawAfterSwap(redrawn, a, b);
    assert.equal(draw.adjusted, true);
    assert.equal(drawAfterSwap(draw, a, 'nobody'), draw);
    list = [...list, { id: 'n2', name: 'New Two' }];
    const kept = drawAfterAdd(draw, list, 'n2', rand);
    assert.equal(kept.adjusted, true);
    assert.match(kept.notice, /adjustments were kept/);
    assert.ok(changedSeats(draw.placement, kept.placement, list.slice(0, -1).map((p) => p.id)).length <= 1, 'everyone but the new opponent stays put');
    const sixteen = players(16);
    const adjusted16 = drawAfterSwap(freshDraw(sixteen, rand), 'p1', 'p2');
    const resized = drawAfterRemove(adjusted16, sixteen.slice(1), 'p1', rand);
    assert.equal(resized.adjusted, false);
    assert.match(resized.notice, /bracket size changed/);
    assert.equal(drawAfterRemove(freshDraw(players(2), rand), players(1), 'p2', rand), null);
  });

  it('opens a saved record\'s draw; records without draw details were placed by hand', () => {
    const placement = randomPlacement(ids(8), seededRandomInt(1));
    assert.deepEqual(drawFromRecord({ placement, draw: { method: 'random', adjusted: false } }), { placement, adjusted: false, manual: false, notice: '' });
    const manual = drawFromRecord({ placement });
    assert.equal(manual.manual, true);
    assert.equal(drawDetails(manual), undefined);
    assert.equal(drawAfterSwap(manual, 'p1', 'p2').manual, true);
  });
});
