import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as E from './showdownEngine.js';
import { startedEvent, playOpen, randomRace } from './showdownTestKit.js';
import { drawBracket } from './showdownPlayoff.js';
import { seededRandom } from './showdownRandom.js';
import { legacyFormatProblem } from './showdownState.js';
import { standingsView } from './operator/showdownBoardView.js';
import { buildShowdownTvBoard } from './public/showdownTvBoard.js';
import { publicShowdown } from './cloud/showdownPublicState.js';
import { screenPublicEvent } from './public/useShowdownPublicEvent.js';
import { render, loadComponent } from './operator/showdownRenderKit.js';

const FEE = 20;
const N = 14;

/** First seeded 14-player, $20 event that locks without a shootout and has a close call at the cutoff or last bye. */
function closeCallEvent() {
  for (let seed = 1; seed <= 400; seed += 1) {
    const { s, op } = startedEvent(N, { fee: FEE, seed });
    const played = playOpen(s, op, 'qualifying', randomRace(3));
    const locked = E.lockQualifying(played, op());
    if (locked.status === 'bracket' && standingsView(locked).closeCalls.length) return { seed, played, locked, op };
  }
  throw new Error('no seed produced a shootout-free event with a close call');
}

const ids = (rows) => rows.map((r) => r.playerId);

describe('fresh 14-player, $20 Showdown under the restart-on-reduction rule', () => {
  const ev = closeCallEvent();

  it('runs under the current format with six qualifiers and two ranking-earned byes', () => {
    const { locked } = ev;
    assert.equal(locked.formatVersion, 3);
    assert.equal(legacyFormatProblem(locked), '');
    const ranked = ids(E.standingsFor(locked).rows);
    assert.deepEqual(locked.qualification.qualifierIds, ranked.slice(0, 6));
    assert.deepEqual(locked.qualification.byeIds, ranked.slice(0, 2));
    assert.equal(locked.qualification.byeTie ?? null, null, 'byes come from the standings, not a shootout');
    assert.equal((locked.shootouts || []).length, 0);
  });

  it('draws byes for exactly the two bye holders and places everyone else at random', () => {
    const { locked, op } = ev;
    const drawn = E.drawPlayoff(locked, op());
    assert.deepEqual(drawn.playoff.byes.map((b) => b.playerId).sort(), [...locked.qualification.byeIds].sort());
    const layouts = new Set();
    for (let seed = 1; seed <= 12; seed += 1) {
      const b = drawBracket({ templateId: drawn.playoff.templateId, qualifierIds: locked.qualification.qualifierIds, byeIds: locked.qualification.byeIds, random: seededRandom(seed) });
      layouts.add(JSON.stringify(b));
    }
    assert.ok(layouts.size > 1, 'different draws give different brackets');
  });

  it('tops every qualifier up to the entry fee and pays out the whole $280 pool', () => {
    const { locked, op } = ev;
    const won = E.qualifyingWinnings(locked).byPlayer;
    const expected = E.qualificationTopUps(FEE, locked.qualification.qualifierIds, won);
    assert.deepEqual(locked.playoffPlan.topUps, expected);
    const before = E.computeEarnings(locked).byPlayer;
    locked.qualification.qualifierIds.forEach((id) => assert.ok(before[id].beforePlayoffs >= FEE, `${id} has at least the entry fee`));
    const done = E.completeShowdown(playOpen(E.confirmPlayoff(E.drawPlayoff(locked, op()), op()), op, 'playoff', randomRace(5)), op());
    assert.equal(done.status, 'completed');
    assert.equal(E.computeEarnings(done).paid, FEE * N);
    assert.equal(E.reconciliationProblem(done), '');
  });

  it('an opponents\u2019 match wins decision names both players\u2019 opponents and what they won', () => {
    for (let seed = 1; seed <= 400; seed += 1) {
      const { s, op } = startedEvent(N, { fee: FEE, seed });
      const v = standingsView(playOpen(s, op, 'qualifying', randomRace(3)));
      const call = v.closeCalls.find((c) => c.criterion === 'oppMatchWins');
      if (!call) continue;
      const row = (id) => v.rows.find((r) => r.playerId === id);
      const describe = (r) => {
        const names = r.opponents.map((id) => row(id).name);
        return `${r.name}\u2019s opponents (${names.join(' and ')}) won ${r.oppMatchWins} ${r.oppMatchWins === 1 ? 'match' : 'matches'} between them`;
      };
      const [a, b] = [row(call.aboveId), row(call.belowId)];
      assert.ok(a.oppMatchWins > b.oppMatchWins);
      assert.ok(call.text.startsWith(`${a.name} (6th) holds the last playoff spot ahead of ${b.name} (7th).`), call.text);
      assert.ok(call.text.endsWith(`Decided by opponents\u2019 match wins: ${describe(a)}; ${describe(b)}.`), call.text);
      return;
    }
    throw new Error('no seed produced an opponents\u2019 match wins close call');
  });

  it('operator, public and TV show the same ranking and the same close calls, before and after the lock', async () => {
    for (const state of [ev.played, ev.locked]) {
      const op = standingsView(state);
      const pub = screenPublicEvent(publicShowdown(state)).event;
      const pubView = standingsView(pub);
      const tv = buildShowdownTvBoard(pub).standings;
      assert.deepEqual(ids(pubView.rows), ids(op.rows));
      assert.deepEqual(tv.rows.map((r) => r.id), ids(op.rows));
      assert.deepEqual(pubView.closeCalls.map((c) => c.text), op.closeCalls.map((c) => c.text));
      assert.deepEqual(tv.closeCalls.map((c) => c.text), op.closeCalls.map((c) => c.text));
    }
    const { locked } = ev;
    const texts = standingsView(locked).closeCalls.map((c) => c.text);
    const pubHtml = await render('../public/ShowdownPublicStandings.jsx', { event: publicShowdown(locked) });
    const S = await loadComponent('../public/ShowdownTvSections.jsx');
    const React = await import('react');
    const server = await import('react-dom/server');
    const tvHtml = server.renderToStaticMarkup(React.createElement(S.TvStandings, { standings: buildShowdownTvBoard(publicShowdown(locked)).standings }));
    const plain = (html) => html.replace(/<[^>]+>/g, '').replace(/&#x27;|&#39;/g, '\u2019').replace(/&amp;/g, '&');
    texts.forEach((t) => {
      assert.ok(plain(pubHtml).includes(t), `public shows: ${t}`);
      assert.ok(plain(tvHtml).includes(t), `TV shows: ${t}`);
    });
  });
});
