import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as E from './showdownEngine.js';
import { startedEvent, playOpen, settleShootouts } from './showdownTestKit.js';
import { circleMatches } from './showdownQualifying.js';
import { resolveByes } from './showdownQualification.js';
import { standingsView } from './operator/showdownBoardView.js';
import { buildShowdownTvBoard } from './public/showdownTvBoard.js';
import { publicShowdown } from './cloud/showdownPublicState.js';
import { render } from './operator/showdownRenderKit.js';

/** A started event with a chosen circle; `scores` lists [score1, score2] for each circle match in order. */
function fixedCircleEvent(n, circleNumbers, scores) {
  const { s, op } = startedEvent(n, { seed: 3 });
  const circle = circleNumbers.map((x) => `P${x}`);
  const byPair = new Map(circleMatches(circle).map((x, i) => [`${x.p1}-${x.p2}`, scores[i]]));
  const state = { ...s, circle, matches: circleMatches(circle) };
  return { s: playOpen(state, op, 'qualifying', (m) => byPair.get(`${m.p1}-${m.p2}`)), op };
}

const order = (s) => E.standingsFor(s).rows.map((r) => r.playerId);

/** The 12-player event from 2026-10-17: Players 12, 1 and 5 all finished 1 win, 5 games won, 5 lost. */
const realEvent = () => fixedCircleEvent(12, [5, 1, 6, 10, 2, 11, 4, 9, 7, 8, 3, 12],
  [[3, 2], [3, 2], [3, 0], [3, 1], [2, 3], [3, 2], [2, 3], [0, 3], [1, 3], [1, 3], [3, 2], [3, 2]]);

describe('restart-on-reduction: the actual 12-player event', () => {
  it('ranks 12, 5, 1: opponents\u2019 match wins lifts 12, then head-to-head (5 beat 1 3\u20132) decides the pair', () => {
    const { s } = realEvent();
    assert.deepEqual(order(s).slice(3, 6), ['P12', 'P5', 'P1']);
    const rows = E.standingsFor(s).rows;
    assert.equal(rows[4].separatedBy, 'oppMatchWins');
    assert.equal(rows[5].separatedBy, 'headToHead');
  });

  it('Player 5 qualifies instead of Player 1; byes, top-ups and the playoff budget follow', () => {
    const { s, op } = realEvent();
    const locked = E.lockQualifying(s, op());
    assert.equal(locked.status, 'bracket', 'no shootout is needed');
    assert.deepEqual(locked.qualification.qualifierIds, ['P3', 'P11', 'P6', 'P12', 'P5']);
    assert.deepEqual(locked.qualification.byeIds, ['P3', 'P11', 'P6']);
    assert.equal(locked.playoffPlan.topUps.P5, 15);
    assert.equal(locked.playoffPlan.topUps.P1, undefined);
    const e = E.computeEarnings(locked).byPlayer;
    assert.equal(e.P1.total, 5, 'Player 1 keeps the qualifying win');
    assert.equal(e.P5.beforePlayoffs, 20, 'Player 5 is topped up to the entry fee');
    const done = E.completeShowdown(playOpen(E.confirmPlayoff(E.drawPlayoff(locked, op()), op()), op, 'playoff', () => [5, 2]), op());
    assert.equal(E.computeEarnings(done).paid, 240);
    assert.equal(E.reconciliationProblem(done), '');
  });

  it('operator, public and TV standings explain the cutoff with the deciding criterion and the score', async () => {
    const { s, op } = realEvent();
    const locked = E.lockQualifying(s, op());
    const v = standingsView(locked);
    const cut = v.closeCalls.find((c) => c.kind === 'cutoff');
    assert.equal(cut.criterion, 'headToHead');
    assert.match(cut.text, /Player 5 \(5th\) got the last playoff spot ahead of Player 1 \(6th\)/);
    assert.match(cut.text, /Tied on wins \(1\), games won \(5\) and games lost \(5\)/);
    assert.match(cut.text, /Decided by head-to-head: Player 5 beat Player 1 3\u20132\./);
    const bye = v.closeCalls.find((c) => c.kind === 'bye');
    assert.equal(bye.criterion, 'gamesLost');
    assert.match(bye.text, /Decided by fewest games lost: 3 to 5\./);

    const h = new Proxy({}, { get: () => () => true });
    const handlers = { act: () => true, board: h, lock: h.x, reopenQualifying: h.x, reopenShootout: h.x, confirmBracket: h.x, complete: h.x, withdraw: h.x, reinstate: h.x };
    const full = await render('ShowdownTabContent.jsx', { state: locked, tab: 'standings', corrections: false, h: handlers });
    for (const t of ['Separated from player above by', 'start again at tiebreaker 1', 'Playoff cutoff:', 'Player 5 beat Player 1 3–2', 'Last bye:']) assert.ok(full.includes(t), t);
    const run = await render('ShowdownTabContent.jsx', { state: s, tab: 'run', corrections: false, h: handlers });
    assert.ok(run.includes('sd-standings-compact') && run.includes('Player 5 (5th) holds the last playoff spot') && run.includes('Player 5 beat Player 1 3–2'), 'compact standings show the projected close call');
    const pub = await render('../public/ShowdownPublicStandings.jsx', { event: publicShowdown(locked) });
    for (const t of ['Playoff cutoff:', 'Player 5 beat Player 1 3–2', 'start again at tiebreaker 1', 'If one tiebreaker splits three or more players']) assert.ok(pub.includes(t), t);
    const tv = buildShowdownTvBoard(publicShowdown(locked));
    assert.ok(tv.standings.closeCalls.some((c) => c.text.includes('Player 5 beat Player 1 3–2')));
    const S = await (await import('./operator/showdownRenderKit.js')).loadComponent('../public/ShowdownTvSections.jsx');
    const React = await import('react');
    const server = await import('react-dom/server');
    const tvHtml = server.renderToStaticMarkup(React.createElement(S.TvStandings, { standings: tv.standings }));
    assert.ok(tvHtml.includes('sd-tv-close') && tvHtml.includes('Player 5 beat Player 1 3–2'));
  });

  it('a wins-only separation at the cutoff is not listed as a close call', () => {
    const { s, op } = fixedCircleEvent(8, [1, 2, 3, 4, 5, 6, 7, 8], [[3, 0], [0, 3], [3, 0], [0, 3], [3, 0], [0, 3], [3, 0], [0, 3]]);
    const v = standingsView(E.lockQualifying(s, op()));
    assert.ok(!v.closeCalls.some((c) => c.kind === 'cutoff' && c.criterion === 'matchWins'));
  });
});

// Circle 1–8 with P2, P8 and P1 tied on wins, games and opponents' match wins; P8 beat P2, P1 beat P8.
const multiwayEvent = () => fixedCircleEvent(8, [1, 8, 2, 7, 5, 4, 3, 6], [[3, 2], [3, 2], [3, 2], [3, 1], [0, 3], [3, 0], [3, 1], [3, 2]]);

describe('restart-on-reduction: multiway ties and withdrawals', () => {
  it('criterion 6 places a 3-way tie in separate places and head-to-head does not override them', () => {
    const { s } = multiwayEvent();
    assert.deepEqual(order(s).filter((id) => ['P1', 'P2', 'P8'].includes(id)), ['P2', 'P8', 'P1']);
  });

  it('a withdrawal before lock re-ranks the remaining players with the restart rule; finished results stand', () => {
    const { s, op } = multiwayEvent();
    const before = E.standingsFor(s);
    const w = E.withdrawPlayer(s, 'P1', op());
    assert.deepEqual(w.matches, s.matches, 'every match was already finished, so nothing is rewritten');
    const after = E.standingsFor(w);
    assert.deepEqual(after.rows.map((r) => r.playerId).filter((id) => ['P2', 'P8'].includes(id)), ['P8', 'P2']);
    assert.equal(after.rows.find((r) => r.playerId === 'P2').separatedBy, 'headToHead');
    assert.deepEqual(after.stats.P8, before.stats.P8, 'opponent statistics keep the withdrawn player');
    const locked = E.lockQualifying(w, op());
    assert.ok(!locked.qualification.qualifierIds.includes('P1'));
  });

  it('a withdrawal after lock does not re-rank anyone', () => {
    const { s, op } = multiwayEvent();
    const locked = E.lockQualifying(s, op());
    const w = E.withdrawPlayer(locked, 'P1', op());
    assert.deepEqual(order(w), order(locked));
  });
});

describe('restart-on-reduction: shootouts stay final', () => {
  it('cutoff survivors still tied at the bye boundary go to a bye shootout, not back to the tiebreakers', () => {
    const { s, op } = startedEvent(12, { seed: 1 });
    let state = E.lockQualifying(playOpen(s, op, 'qualifying', () => [3, 0]), op());
    assert.equal(E.shootoutKind(E.activeShootout(state)), 'cutoff');
    state = settleShootouts(state, op);
    const cut = state.shootouts.find((x) => E.shootoutKind(x) === 'cutoff');
    const bye = state.shootouts.find((x) => E.shootoutKind(x) === 'bye');
    assert.ok(bye, 'a separate bye shootout ran');
    assert.ok(bye.groupIds.every((id) => cut.groupIds.includes(id)));
    assert.deepEqual([...bye.groupIds].sort(), [...state.qualification.qualifierIds].sort());
    assert.equal(state.qualification.byeIds.length, 3);
  });

  it('two shootout survivors tied for the last bye need a bye shootout even if one beat the other', () => {
    const out = resolveByes({ groups: [['A'], ['B'], ['C', 'D', 'E']], qualifierIds: ['A', 'B', 'C', 'D'], byes: 3 });
    assert.equal(out.status, 'needs-shootout');
    assert.deepEqual(out.tiedIds, ['C', 'D']);
    assert.equal(out.openSpots, 1);
  });
});
