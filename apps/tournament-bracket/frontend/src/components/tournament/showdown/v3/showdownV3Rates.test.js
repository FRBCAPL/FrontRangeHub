import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { selectV3Rates, v3SettingsProblems } from './showdownV3Rates.js';
import { ladderProblems, ladderTotal } from '../showdownPayout.js';
import { playoffTemplate, finalRound } from '../showdownPlayoffTemplates.js';

const FEES = [20, 25, 30, 50, 100, 200];
const SIZES = Array.from({ length: 17 }, (_, i) => i + 8);
const GAMES = Array.from({ length: 11 }, (_, i) => i + 5);

function sweep(raceTo) {
  const out = { feasible: 0, at150: 0, tiers: {}, results: [] };
  for (const n of SIZES) for (const fee of FEES) for (const g of GAMES) {
    const r = selectV3Rates({ entrants: n, entryFee: fee, qualifyingGames: g, playoffRaceTo: raceTo });
    out.results.push({ n, fee, g, r });
    if (!r.ok) continue;
    out.feasible += 1;
    if (r.tierPct === 150) out.at150 += 1;
    out.tiers[r.tierPct] = (out.tiers[r.tierPct] || 0) + 1;
  }
  return out;
}

const sweeps = {};
const sweepFor = (k) => (sweeps[k] ||= sweep(k));

describe('V3 payout selection — research baseline (race to 5)', () => {
  it('reproduces 1,104 feasible configurations and 1,038 at the 150% championship target', () => {
    const s = sweepFor(5);
    assert.equal(s.results.length, 1122);
    assert.equal(s.feasible, 1104);
    assert.equal(s.at150, 1038);
  });

  it('reproduces the graded tier distribution from the research', () => {
    assert.deepEqual(sweepFor(5).tiers, { 100: 1, 110: 1, 115: 3, 120: 8, 125: 5, 130: 5, 135: 8, 140: 12, 145: 23, 150: 1038 });
  });

  it('rejects exactly the 18 research infeasible configurations ($20 at 14–15 games)', () => {
    const bad = sweepFor(5).results.filter((x) => !x.r.ok);
    assert.equal(bad.length, 18);
    assert.ok(bad.every((x) => x.fee === 20 && x.g >= 14));
    assert.ok(bad.every((x) => x.r.problems[0].includes('cannot meet the V3 payout rules')));
  });

  it('16 players, $50, 7 games: $2 / $3, 35% qualifying, $47 / $57 / $80 with a $23 bye', () => {
    const r = selectV3Rates({ entrants: 16, entryFee: 50, qualifyingGames: 7, playoffRaceTo: 5 });
    assert.equal(r.choice.r1, 200); assert.equal(r.choice.r2, 300);
    assert.equal(r.choice.qualifying * 100, 35 * r.choice.pool);
    assert.deepEqual(r.choice.ladder.perRound, { quarterfinal: 47, semifinal: 57, final: 80 });
    assert.equal(r.choice.ladder.bye, 23);
    assert.equal(r.tierPct, 150);
  });

  it('is deterministic: the same inputs always give the same plan and trace', () => {
    const a = selectV3Rates({ entrants: 13, entryFee: 30, qualifyingGames: 9, playoffRaceTo: 6 });
    const b = selectV3Rates({ entrants: '13', entryFee: '30', qualifyingGames: '9', playoffRaceTo: '6' });
    assert.deepEqual(a, b);
  });
});

describe('V3 payout selection — every playoff race length 3–9 and qualifying length 5–15', () => {
  const expected = {
    3: [1105, 1092], 4: [1105, 1077], 5: [1104, 1038], 6: [1102, 960], 7: [1091, 854], 8: [1061, 742], 9: [998, 642],
  };
  for (let k = 3; k <= 9; k += 1) {
    it(`race to ${k}: ${expected[k][0]} feasible, ${expected[k][1]} at 150%, every plan within every rule`, () => {
      const s = sweepFor(k);
      assert.deepEqual([s.feasible, s.at150], expected[k]);
      s.results.filter((x) => x.r.ok).forEach(({ n, fee, g, r }) => {
        const c = r.choice;
        const t = playoffTemplate(c.ladder.templateId);
        const pool = n * fee * 100;
        const where = `${n}p $${fee} ${g} games race ${k}`;
        assert.equal(c.pool, pool, where);
        assert.equal(c.qualifying + c.playoffGames + c.ladderCents + c.leftoverCents, pool, where);
        assert.equal(c.playoffGames, t.rounds.reduce((sum, rd) => sum + rd.matches, 0) * (2 * k - 1) * c.r2, where);
        assert.ok(c.qualifying * 100 >= 30 * pool && c.qualifying * 100 <= 55 * pool, where);
        assert.ok([50, 100].includes(c.r2 - c.r1) && c.r1 >= 50 && c.r1 % 50 === 0, where);
        assert.ok(c.ladder.perRound[t.rounds[0].key] * 2 >= fee, where);
        assert.ok(c.ladder.perRound[finalRound(t).key] * 100 >= r.tierPct * fee, where);
        assert.ok(r.tierPct >= 100 && r.tierPct <= 150 && r.tierPct % 5 === 0, where);
        assert.deepEqual(ladderProblems(c.ladder), [], where);
        assert.equal(ladderTotal(c.ladder) * 100, c.ladderCents, where);
        assert.ok(c.leftoverCents === 0 || c.leftoverCents === 50, where);
      });
    });
  }

  it('longer races never make more configurations affordable', () => {
    for (let k = 4; k <= 9; k += 1) {
      const prev = sweepFor(k - 1).results; const cur = sweepFor(k).results;
      cur.forEach((x, i) => { if (x.r.ok) assert.ok(prev[i].r.ok, `${x.n}p $${x.fee} ${x.g} games: race ${k} ok but race ${k - 1} not`); });
    }
  });

  it('no higher tier was available than the one chosen, and no valid candidate keeps more in qualifying', () => {
    sweepFor(7).results.filter((x) => x.r.ok).forEach(({ r }) => {
      r.trace.tiers.slice(0, -1).forEach((t) => assert.equal(t.candidates, 0));
      const valid = r.trace.candidates.filter((c) => c.status === 'valid' && c.championship * 100 >= r.tierPct * r.settings.entryFee * 100);
      assert.ok(valid.every((c) => c.qualifying <= r.choice.qualifying));
    });
  });
});

describe('V3 settings validation', () => {
  it('rejects unsupported entrants, fees, qualifying lengths and race lengths', () => {
    assert.equal(v3SettingsProblems({ entrants: 16, entryFee: 50, qualifyingGames: 7, playoffRaceTo: 5 }).length, 0);
    assert.equal(v3SettingsProblems({ entrants: 7, entryFee: 50, qualifyingGames: 7, playoffRaceTo: 5 }).length, 1);
    assert.equal(v3SettingsProblems({ entrants: 16, entryFee: 19, qualifyingGames: 7, playoffRaceTo: 5 }).length, 1);
    assert.equal(v3SettingsProblems({ entrants: 16, entryFee: 50, qualifyingGames: 4, playoffRaceTo: 5 }).length, 1);
    assert.equal(v3SettingsProblems({ entrants: 16, entryFee: 50, qualifyingGames: 16, playoffRaceTo: 5 }).length, 1);
    assert.equal(v3SettingsProblems({ entrants: 16, entryFee: 50, qualifyingGames: 7, playoffRaceTo: 2 }).length, 1);
    assert.equal(v3SettingsProblems({ entrants: 16, entryFee: 50, qualifyingGames: 7, playoffRaceTo: 10 }).length, 1);
    assert.equal(v3SettingsProblems({ entrants: 16, entryFee: 50, qualifyingGames: 7.5, playoffRaceTo: 5 }).length, 1);
    assert.equal(selectV3Rates({ entrants: 16, entryFee: 50, qualifyingGames: 20, playoffRaceTo: 5 }).ok, false);
  });
});
