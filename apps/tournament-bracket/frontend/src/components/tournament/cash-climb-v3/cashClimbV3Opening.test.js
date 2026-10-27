import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { openingScoreSplit, openingScoreSplitTable, openingReserves } from './cashClimbV3Opening.js';

const cfg = (entryDollars, raceTo) => ({ entryFeeCents: entryDollars * 100, raceTo });

/** Independent oracle: the spec formula with E in dollars as a reduced fraction, rounded half up by remainder. */
function gcd(a, b) { return b ? gcd(b, a % b) : a; }
function frac(n, d) { const g = gcd(n, d); return [n / g, d / g]; }
function add([a, b], [c, d]) { return frac(a * d + c * b, b * d); }
function mul([a, b], [c, d]) { return frac(a * c, b * d); }
function halfUp([n, d]) { const q = Math.floor(n / d); return 2 * (n - q * d) >= d ? q + 1 : q; }
function oracle(E, R, L, preliminary) {
  const u = frac(E, 2 * R);
  const s = L === 0 ? frac(E, 4) : [0, 1];
  let w = add(mul(frac(2 * R + (R - L), 2), u), s);
  let d = mul([L, 1], u);
  if (preliminary) { w = mul(w, [1, 2]); d = mul(d, [1, 2]); }
  return { winner: halfUp(w), loser: halfUp(d) };
}

describe('Cash Climb V3 opening Score-Split', () => {
  it('pays the spec table for a $100 entry, race to 7', () => {
    const expected = [[100, 0], [71, 7], [68, 14], [64, 21], [61, 29], [57, 36], [54, 43]];
    expected.forEach(([winner, loser], L) => {
      assert.deepEqual(openingScoreSplit(cfg(100, 7), L), { losingRacks: L, winner, loser }, `7-${L}`);
    });
  });

  it('pays half components on a preliminary 7-3: winner $32, loser $11', () => {
    const p = openingScoreSplit(cfg(100, 7), 3, { preliminary: true });
    assert.equal(p.winner, 32);
    assert.equal(p.loser, 11);
  });

  it('a sweep pays the winner exactly the entry fee (main) and half of it rounded up (preliminary)', () => {
    for (const E of [10, 11, 15, 25, 99, 100, 125, 250]) {
      for (const R of [1, 2, 3, 5, 7, 9, 11]) {
        assert.deepEqual([openingScoreSplit(cfg(E, R), 0).winner, openingScoreSplit(cfg(E, R), 0).loser], [E, 0]);
        assert.equal(openingScoreSplit(cfg(E, R), 0, { preliminary: true }).winner, Math.ceil(E / 2));
      }
    }
  });

  it('matches the independent fraction oracle for every score across fees $10-$260 and races 1-15', () => {
    for (let E = 10; E <= 260; E += 1) {
      for (let R = 1; R <= 15; R += 1) {
        for (let L = 0; L < R; L += 1) {
          for (const preliminary of [false, true]) {
            const got = openingScoreSplit(cfg(E, R), L, { preliminary });
            assert.deepEqual({ winner: got.winner, loser: got.loser }, oracle(E, R, L, preliminary), `E${E} R${R} L${L} p${preliminary}`);
          }
        }
      }
    }
  });

  it('winners never earn less than losers; winner pay never rises and loser pay never falls as the loser wins more racks', () => {
    for (const E of [10, 13, 17, 50, 125]) {
      for (const R of [2, 4, 7, 10]) {
        for (const preliminary of [false, true]) {
          const t = openingScoreSplitTable(cfg(E, R), { preliminary });
          t.forEach((row) => assert.ok(row.winner >= row.loser, `E${E} R${R} L${row.losingRacks}`));
          for (let i = 1; i < t.length; i += 1) {
            assert.ok(t[i].winner <= t[i - 1].winner);
            assert.ok(t[i].loser >= t[i - 1].loser);
          }
        }
      }
    }
  });

  it('rejects impossible scores', () => {
    assert.throws(() => openingScoreSplit(cfg(100, 7), 7));
    assert.throws(() => openingScoreSplit(cfg(100, 7), -1));
    assert.throws(() => openingScoreSplit(cfg(100, 7), 2.5));
  });
});

describe('Cash Climb V3 opening reserves', () => {
  it('$125 entry, race to 7: main reserve $125, preliminary reserve $63 (not E/2)', () => {
    const r = openingReserves(cfg(125, 7));
    assert.equal(r.main.dollars, 125);
    assert.equal(r.preliminary.dollars, 63);
  });

  it('each reserve is the largest combined payout over all valid scores', () => {
    for (const E of [10, 11, 15, 19, 33, 100, 125, 251]) {
      for (const R of [1, 2, 3, 4, 5, 7, 9, 13]) {
        const r = openingReserves(cfg(E, R));
        for (const [key, preliminary] of [['main', false], ['preliminary', true]]) {
          const combined = [];
          for (let L = 0; L < R; L += 1) { const o = oracle(E, R, L, preliminary); combined.push(o.winner + o.loser); }
          const max = Math.max(...combined);
          assert.equal(r[key].dollars, max, `${key} E${E} R${R}`);
          assert.deepEqual(r[key].losingRacks, combined.map((c, L) => (c === max ? L : -1)).filter((L) => L >= 0));
        }
      }
    }
  });

  it('small fees with long races can reserve more than the entry fee (rounding both players up)', () => {
    const r = openingReserves(cfg(10, 7));
    assert.ok(r.main.dollars >= 10);
    const t = openingScoreSplitTable(cfg(10, 7));
    assert.equal(r.main.dollars, Math.max(...t.map((x) => x.combined)));
  });
});
