import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assignTable, busyPlayerIds, freeTables, moveTable, notReadyReason, setHold, suggestNextMatch, unassignTable } from './showdownScheduler.js';
import { buildCircle, circleMatches } from './showdownQualifying.js';
import { playedResult } from './showdownResults.js';
import { seededRandom } from './showdownRandom.js';

const ids = (n) => Array.from({ length: n }, (_, i) => `P${i + 1}`);

function noOverlap(matches) {
  const seen = new Set();
  matches.filter((m) => m.status === 'on-table').forEach((m) => {
    [m.p1, m.p2].forEach((p) => {
      assert.ok(!seen.has(p), `${p} is on two tables`);
      seen.add(p);
    });
  });
}

describe('showdown scheduler', () => {
  for (let n = 8; n <= 24; n += 1) {
    for (const tables of [1, 4, 7, 12]) {
      it(`${n} entrants on ${tables} tables: fills free tables, never double-books, finishes every match`, () => {
        const random = seededRandom(n * 100 + tables);
        let matches = circleMatches(buildCircle(ids(n), random));
        let clock = 0;
        for (let guard = 0; guard < n * 4; guard += 1) {
          // Fill every free table that has a ready match.
          for (const t of freeTables(matches, tables)) {
            const next = suggestNextMatch(matches);
            if (!next) break;
            clock += 1;
            matches = assignTable(matches, next.id, t, tables, `t${String(clock).padStart(5, '0')}`);
            noOverlap(matches);
          }
          const playing = matches.filter((m) => m.status === 'on-table');
          if (!playing.length) break;
          const done = playing[Math.floor(random() * playing.length)];
          clock += 1;
          matches = matches.map((m) => (m.id === done.id ? playedResult(m, 3, 1, 3, `t${String(clock).padStart(5, '0')}`) : m));
          // A free table never sits idle while a ready match exists.
          const ready = suggestNextMatch(matches);
          if (ready && freeTables(matches, tables).length === 0) assert.fail('no free table but loop continued');
        }
        assert.ok(matches.every((m) => m.status === 'completed'));
      });
    }
  }

  it('blocks a player from a second table and a busy table number', () => {
    let matches = circleMatches(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    matches = assignTable(matches, 'q1', 1, 4, 'now');
    assert.match(notReadyReason(matches.find((m) => m.id === 'q2'), matches), /another table/);
    assert.throws(() => assignTable(matches, 'q2', 2, 4, 'now'), /another table/);
    assert.throws(() => assignTable(matches, 'q3', 1, 4, 'now'), /in use/);
    assert.throws(() => assignTable(matches, 'q3', 5, 4, 'now'), /table from 1 to 4/);
    assert.deepEqual([...busyPlayerIds(matches)].sort(), ['A', 'B']);
  });

  it('holds, moves and unassigns', () => {
    let matches = circleMatches(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    matches = setHold(matches, 'q3', true);
    assert.match(notReadyReason(matches.find((m) => m.id === 'q3'), matches), /on hold/);
    assert.notEqual(suggestNextMatch(matches).id, 'q3');
    matches = setHold(matches, 'q3', false);
    matches = assignTable(matches, 'q3', 2, 4, 'now');
    matches = moveTable(matches, 'q3', 4, 4);
    assert.equal(matches.find((m) => m.id === 'q3').table, 4);
    matches = unassignTable(matches, 'q3');
    assert.equal(matches.find((m) => m.id === 'q3').status, 'waiting');
  });

  it('prefers players who have played least', () => {
    let matches = circleMatches(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    matches = matches.map((m) => (m.id === 'q1' ? playedResult(m, 3, 0, 3, 't1') : m));
    // q2 (B–C) and q8 (H–A) involve a player who already played; q3..q7 do not.
    const next = suggestNextMatch(matches);
    assert.ok(!['q2', 'q8'].includes(next.id));
  });
});
