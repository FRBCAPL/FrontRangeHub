import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rankStandings, computeQualifyingStats } from './showdownStandings.js';
import { circleMatches } from './showdownQualifying.js';
import { playedResult, forfeitResult } from './showdownResults.js';

const NOW = '2026-10-16T20:00:00.000Z';
const m = (p1, p2, s1, s2, id = `${p1}-${p2}`) => playedResult({ id, phase: 'qualifying', roundKey: 'qualifying', p1, p2 }, s1, s2, 3, NOW);
const order = (r) => r.rows.map((row) => row.playerId);
const sep = (r, id) => r.rows.find((row) => row.playerId === id).separatedBy;

describe('showdown standings tiebreakers', () => {
  it('1–2: match wins, then games won', () => {
    const players = ['A', 'B', 'C', 'D'];
    const matches = [m('A', 'B', 3, 0), m('A', 'C', 3, 1), m('B', 'D', 3, 2), m('C', 'D', 3, 1)];
    const stats = computeQualifyingStats(players, matches);
    assert.equal(stats.A.matchWins, 2);
    const r = rankStandings(players, matches);
    assert.deepEqual(order(r), ['A', 'C', 'B', 'D']);
    assert.equal(sep(r, 'C'), 'matchWins');
    assert.equal(sep(r, 'B'), 'gamesWon');
    assert.equal(sep(r, 'D'), 'matchWins');
  });

  it('3: fewest games lost', () => {
    const players = ['X', 'Y', 'P', 'Q', 'R', 'S'];
    const matches = [m('X', 'P', 3, 2), m('Q', 'X', 3, 2), m('Y', 'R', 3, 0), m('S', 'Y', 3, 2)];
    const r = rankStandings(players, matches);
    const ids = order(r);
    assert.ok(ids.indexOf('Y') < ids.indexOf('X'));
    assert.equal(sep(r, 'X'), 'gamesLost');
  });

  it('4: head-to-head when exactly two are tied and they played', () => {
    const circle = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const scores = { AB: [3, 2], BC: [3, 2], CD: [3, 0], DE: [3, 1], EF: [3, 0], FG: [3, 2], GH: [3, 1], HA: [3, 2] };
    const matches = circleMatches(circle).map((x) => playedResult(x, ...scores[`${x.p1}${x.p2}`], 3, NOW));
    const r = rankStandings(circle, matches);
    const ids = order(r);
    assert.ok(ids.indexOf('A') + 1 === ids.indexOf('B'), 'A directly above B');
    assert.equal(sep(r, 'B'), 'headToHead');
  });

  it('5: opponents\u2019 match wins when the tied pair never played; unresolved ties share a rank', () => {
    const players = ['X', 'Y', 'P', 'Q', 'R', 'S'];
    const matches = [m('X', 'P', 3, 1), m('Q', 'X', 3, 1), m('Y', 'R', 3, 1), m('S', 'Y', 3, 1), m('Q', 'S', 3, 0)];
    const r = rankStandings(players, matches);
    const ids = order(r);
    assert.ok(ids.indexOf('X') < ids.indexOf('Y'));
    assert.equal(sep(r, 'Y'), 'oppMatchWins');
    const p = r.rows.find((row) => row.playerId === 'P');
    const q = r.rows.find((row) => row.playerId === 'R');
    assert.equal(p.rank, q.rank);
    assert.equal(p.tied, true);
  });

  it('restart: a 3-way tie skips head-to-head, and the pair left after criterion 5 restarts and uses head-to-head', () => {
    const players = ['T1', 'T2', 'T3', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const matches = [
      m('T1', 'T2', 3, 2), m('A', 'T1', 3, 2), m('T2', 'B', 3, 2),
      m('T3', 'C', 3, 2), m('D', 'T3', 3, 2),
      m('B', 'E', 3, 0), m('C', 'F', 3, 0), m('D', 'G', 3, 0),
    ];
    const r = rankStandings(players, matches);
    const ids = order(r).filter((id) => id.startsWith('T'));
    assert.deepEqual(ids, ['T3', 'T1', 'T2'], 'T1 beat T2, so T1 is above T2 once they are the only two tied');
    assert.equal(sep(r, 'T1'), 'oppMatchWins');
    assert.equal(sep(r, 'T2'), 'headToHead');
  });

  // Circle P1–P8: P2, P8 and P1 tie on wins, games and opponents' match wins; P8 beat P2 and P1 beat P8.
  const multiway = () => {
    const players = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
    const matches = [m('P1', 'P8', 3, 2), m('P8', 'P2', 3, 2), m('P2', 'P7', 3, 2), m('P7', 'P5', 3, 1), m('P5', 'P4', 0, 3), m('P4', 'P3', 3, 0), m('P3', 'P6', 3, 1), m('P6', 'P1', 3, 2)];
    return { players, matches };
  };

  it('multiway limitation: when criterion 6 splits three players into separate places, head-to-head does not override them', () => {
    const { players, matches } = multiway();
    const r = rankStandings(players, matches);
    assert.deepEqual(order(r).filter((id) => ['P1', 'P2', 'P8'].includes(id)), ['P2', 'P8', 'P1']);
    assert.equal(sep(r, 'P8'), 'oppGameDiff');
    assert.equal(sep(r, 'P1'), 'oppGameDiff');
  });

  it('excluded (withdrawn before lock) players leave the tie, keep their results and still count as opponents', () => {
    const { players, matches } = multiway();
    const before = rankStandings(players, matches);
    const r = rankStandings(players, matches, { excludedIds: ['P1'] });
    assert.deepEqual(order(r).filter((id) => ['P2', 'P8'].includes(id)), ['P8', 'P2'], 'now a pair: P8 beat P2');
    assert.equal(sep(r, 'P2'), 'headToHead');
    assert.equal(order(r).at(-1), 'P1', 'excluded players are listed last');
    assert.deepEqual(r.stats.P8, before.stats.P8, 'opponent statistics are unchanged');
  });

  it('a double-forfeited match is not a head-to-head win', () => {
    const base = circleMatches(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    const s = [[0, 0], [3, 2], [2, 3], [3, 2], [2, 3], [3, 2], [2, 3], [3, 2]];
    const matches = base.map((x, i) => (i === 0 ? forfeitResult(x, ['A', 'B'], 3, NOW) : playedResult(x, ...s[i], 3, NOW)));
    const r = rankStandings(base.map((x) => x.p1), matches);
    assert.ok(!r.rows.some((x) => x.separatedBy === 'headToHead'));
  });

  it('the order does not depend on registration order, and repeated runs agree', () => {
    const { players, matches } = multiway();
    const key = (r) => r.groups.map((g) => [...g].sort().join(',')).join('|');
    const a = rankStandings(players, matches);
    assert.equal(key(rankStandings([...players].reverse(), matches)), key(a));
    assert.equal(key(rankStandings(players, matches)), key(a));
  });

  it('6: opponents\u2019 game differential', () => {
    const players = ['X', 'Y', 'P', 'Q', 'R', 'S', 'U', 'V'];
    const matches = [m('X', 'P', 3, 0), m('Q', 'X', 3, 0), m('Y', 'R', 3, 0), m('S', 'Y', 3, 0), m('U', 'P', 3, 2), m('V', 'R', 3, 0)];
    const r = rankStandings(players, matches);
    const ids = order(r);
    assert.ok(ids.indexOf('X') < ids.indexOf('Y'));
    assert.equal(sep(r, 'Y'), 'oppGameDiff');
  });

  it('forfeits count 3–0; double forfeits add nothing but keep opponents for criteria 5–6', () => {
    const base = circleMatches(['A', 'B', 'C', 'D']);
    const matches = [
      forfeitResult(base[0], ['B'], 3, NOW),
      forfeitResult(base[1], ['B', 'C'], 3, NOW),
      playedResult(base[2], 3, 1, 3, NOW),
      playedResult(base[3], 3, 2, 3, NOW),
    ];
    const stats = computeQualifyingStats(['A', 'B', 'C', 'D'], matches);
    assert.deepEqual([stats.A.matchWins, stats.A.gamesWon, stats.A.gamesLost], [1, 5, 3]);
    assert.deepEqual([stats.B.matchWins, stats.B.gamesWon, stats.B.gamesLost], [0, 0, 3]);
    assert.deepEqual([stats.C.matchWins, stats.C.gamesWon, stats.C.gamesLost], [1, 3, 1]);
    assert.deepEqual(stats.B.opponents.sort(), ['A', 'C']);
    assert.equal(stats.B.oppMatchWins, stats.A.matchWins + stats.C.matchWins);
  });
});
