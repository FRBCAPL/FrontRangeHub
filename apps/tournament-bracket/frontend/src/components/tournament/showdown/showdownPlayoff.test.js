import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { drawBracket, bracketProblems, syncPlayoffPlayers, downstreamOf } from './showdownPlayoff.js';
import { playoffTemplate } from './showdownPlayoffTemplates.js';
import { playedResult } from './showdownResults.js';
import { seededRandom } from './showdownRandom.js';

const NOW = '2026-10-16T20:00:00.000Z';
const q = (n) => Array.from({ length: n }, (_, i) => `q${i + 1}`);
const win = (m, side) => playedResult(m, side === 1 ? 5 : 2, side === 1 ? 2 : 5, 5, NOW);
const LAYOUTS = [['p4', 4, 0, 3], ['p5', 5, 3, 4], ['p6', 6, 2, 5], ['p7', 7, 1, 6], ['p8', 8, 0, 7]];

function playOut(matches, random) {
  let ms = syncPlayoffPlayers(matches);
  for (let guard = 0; guard < 20; guard += 1) {
    const next = ms.find((m) => m.status !== 'completed' && m.p1 && m.p2);
    if (!next) break;
    ms = syncPlayoffPlayers(ms.map((m) => (m.id === next.id ? win(m, random() < 0.5 ? 1 : 2) : m)));
  }
  return ms;
}

describe('showdown playoff brackets', () => {
  LAYOUTS.forEach(([templateId, size, byes, count]) => {
    it(`${size}-player bracket (${byes} bye${byes === 1 ? '' : 's'}) places every qualifier once and plays to a champion`, () => {
      for (let seed = 1; seed <= 60; seed += 1) {
        const random = seededRandom(seed);
        const byeIds = q(size).slice(0, byes);
        const bracket = drawBracket({ templateId, qualifierIds: q(size), byeIds, random });
        assert.equal(bracket.matches.length, count, 'no extra matches');
        assert.deepEqual(bracketProblems(bracket, q(size), byeIds), []);
        const done = playOut(bracket.matches, random);
        const final = done.find((m) => m.roundKey === 'final');
        assert.equal(final.status, 'completed');
        assert.ok(q(size).includes(final.winnerId));
        const losers = done.map((m) => m.loserId);
        assert.equal(new Set(losers).size, size - 1, 'every non-champion loses exactly once');
        byeIds.forEach((id) => assert.ok(!done.some((m) => m.roundKey === 'quarterfinal' && (m.p1 === id || m.p2 === id)), 'bye holders skip the quarterfinal'));
      }
    });
  });

  [['p5', [1, 3, 4]], ['p6', [1, 4]], ['p7', [1]]].forEach(([templateId, sections]) => {
    it(`${templateId}: bye holders sit in sections ${sections.join(', ')} and go straight to a semifinal`, () => {
      const t = playoffTemplate(templateId);
      for (let seed = 1; seed <= 100; seed += 1) {
        const byeIds = q(t.size).slice(-t.byes);
        const b = drawBracket({ templateId, qualifierIds: q(t.size), byeIds, random: seededRandom(seed) });
        assert.deepEqual(b.byes.map((x) => x.section), sections);
        assert.deepEqual(b.byes.map((x) => x.playerId).sort(), [...byeIds].sort());
        b.byes.forEach((x) => {
          const sf = b.matches.find((m) => m.id === (x.section <= 2 ? 'sf1' : 'sf2'));
          const source = x.section % 2 === 1 ? sf.source1 : sf.source2;
          assert.deepEqual(source, { type: 'player', id: x.playerId });
        });
        const qfPlayers = b.matches.filter((m) => m.roundKey === 'quarterfinal').flatMap((m) => [m.p1, m.p2]);
        assert.equal(qfPlayers.length, t.size - t.byes);
        b.byes.forEach((x) => assert.ok(!qfPlayers.includes(x.playerId)));
      }
    });
  });

  it('p6: the two bye holders are in opposite halves', () => {
    const b = drawBracket({ templateId: 'p6', qualifierIds: q(6), byeIds: ['q1', 'q2'], random: seededRandom(9) });
    const sf1 = b.matches.find((m) => m.id === 'sf1');
    const sf2 = b.matches.find((m) => m.id === 'sf2');
    assert.equal(sf1.source1.type, 'player');
    assert.equal(sf1.source2.type, 'winner');
    assert.equal(sf2.source1.type, 'winner');
    assert.equal(sf2.source2.type, 'player');
  });

  it('byes go only to the earned holders; the rest of the draw is random', () => {
    const counts = {};
    const pairs = new Set();
    for (let seed = 1; seed <= 300; seed += 1) {
      const b = drawBracket({ templateId: 'p6', qualifierIds: q(6), byeIds: ['q5', 'q2'], random: seededRandom(seed) });
      b.byes.forEach((x) => { counts[x.playerId] = (counts[x.playerId] || 0) + 1; });
      pairs.add(`${b.matches[0].p1}-${b.matches[0].p2}`);
    }
    assert.deepEqual(Object.keys(counts).sort(), ['q2', 'q5']);
    assert.ok(pairs.size > 4, 'quarterfinal pairings vary');
  });

  it('rejects the wrong number of qualifiers, duplicates, or the wrong bye holders', () => {
    assert.throws(() => drawBracket({ templateId: 'p8', qualifierIds: q(7) }));
    assert.throws(() => drawBracket({ templateId: 'p4', qualifierIds: ['a', 'a', 'b', 'c'] }));
    assert.throws(() => drawBracket({ templateId: 'p5', qualifierIds: q(5), byeIds: q(2) }), /exactly 3 bye/);
    assert.throws(() => drawBracket({ templateId: 'p7', qualifierIds: q(7), byeIds: ['x'] }), /not a qualifier/);
    assert.throws(() => drawBracket({ templateId: 'p8', qualifierIds: q(8), byeIds: ['q1'] }), /exactly 0 bye/);
  });

  it('bracketProblems flags a bye given to the wrong player', () => {
    const b = drawBracket({ templateId: 'p7', qualifierIds: q(7), byeIds: ['q1'], random: seededRandom(2) });
    assert.match(bracketProblems(b, q(7), ['q2']).join(' '), /did not earn a bye/);
  });

  it('a changed result resets later matches that used the old winner', () => {
    const b = drawBracket({ templateId: 'p4', qualifierIds: q(4), random: seededRandom(3) });
    let ms = syncPlayoffPlayers(b.matches.map((m) => (m.id === 'sf1' ? win(m, 1) : m)));
    const firstWinner = ms.find((m) => m.id === 'sf1').winnerId;
    assert.equal(ms.find((m) => m.id === 'f1').p1, firstWinner);
    ms = syncPlayoffPlayers(ms.map((m) => (m.id === 'sf1' ? win(m, 2) : m)));
    assert.notEqual(ms.find((m) => m.id === 'f1').p1, firstWinner);
    assert.deepEqual(downstreamOf(ms, 'sf1'), ['f1']);
  });

  it('downstream of a quarterfinal runs to the final', () => {
    const b = drawBracket({ templateId: 'p7', qualifierIds: q(7), byeIds: ['q1'], random: seededRandom(5) });
    assert.deepEqual(downstreamOf(b.matches, 'qf1'), ['sf1', 'f1']);
    assert.deepEqual(downstreamOf(b.matches, 'qf3'), ['sf2', 'f1']);
  });
});
