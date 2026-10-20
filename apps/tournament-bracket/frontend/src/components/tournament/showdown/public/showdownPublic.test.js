import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../showdownEngine.js';
import { startedEvent, toPlayoffs, shootoutEvent, toBracket, runToCompletion, playOpen, randomRace } from '../showdownTestKit.js';
import { render } from '../operator/showdownRenderKit.js';
import { publicShowdown, publicCopyProblem } from '../cloud/showdownPublicState.js';
import { buildShowdownTvBoard } from './showdownTvBoard.js';
import { reportableMatches } from './showdownPhoneSubmit.js';
import { showdownPublicEventId, showdownPublicHash, showdownTvHref } from './showdownPublicRoutes.js';
import { liveShowdownRows, liveShowdownItem, listLiveShowdownItems } from './showdownLiveList.js';
import { loadMe, saveMe, pickablePlayers, meIn, isMyMatch, mineFirst } from './showdownWhoAmI.js';
import { trackRule, canAdd, isDone, statusText, step, loadTrack, saveTrack, clearTrack } from './showdownScoreTrack.js';

const OPERATOR_TEXT = ['Lock qualifying', 'Reopen', 'Undo', 'Withdraw', 'Confirm bracket', 'Draw bracket', 'Complete event', 'won the game', 'Undo who starts', 'Approve', 'Corrections', 'Audit log'];

function publicOnly(html) {
  OPERATOR_TEXT.forEach((t) => assert.ok(!html.includes(t), `no operator control: ${t}`));
  assert.ok(!/@/.test(html), 'no emails');
  assert.ok(!/\\u[0-9a-f]{4}/i.test(html), 'no escaped unicode');
  assert.ok(!/undefined|NaN|\[object Object\]/.test(html), 'no broken values');
  return html;
}

const phases = {};
before(() => {
  const q = startedEvent(16, { seed: 3 });
  phases.qualifying = E.startOnTable(q.s, E.suggestNextMatch(q.s.matches).id, 1, q.op());
  phases.qualifyingDone = playOpen(q.s, q.op, 'qualifying', randomRace(3));
  phases.shootout = shootoutEvent(8).s;
  phases.bracket = toBracket(16, { seed: 5 }).s;
  const p = toPlayoffs(14, { seed: 6 });
  phases.playoffs = E.startOnTable(p.s, 'qf1', 1, p.op());
  const c = startedEvent(16, { seed: 7 });
  phases.completed = runToCompletion(c.s, c.op);
});

describe('public copy', () => {
  it('drops the audit log and operator emails at every phase but keeps what the pages need', () => {
    for (const [name, state] of Object.entries(phases)) {
      const pub = publicShowdown(state);
      assert.equal(publicCopyProblem(pub), '', name);
      assert.deepEqual(pub.audit, []);
      assert.deepEqual(E.computeEarnings(pub), E.computeEarnings(state), `${name}: earnings identical`);
      assert.deepEqual(E.standingsFor(pub).rows, E.standingsFor(state).rows);
    }
  });

  it('the player list shows only Showdowns in progress', () => {
    const now = Date.parse('2026-10-20T03:00:00Z');
    const rows = [
      { id: 'live', status: 'qualifying', updated_at: '2026-10-20T02:30:00Z' },
      { id: 'playoffs', status: 'playoffs', updated_at: '2026-10-19T20:00:00Z' },
      { id: 'done', status: 'completed', updated_at: '2026-10-20T02:50:00Z' },
      { id: 'abandoned', status: 'qualifying', updated_at: '2026-10-12T02:00:00Z' },
      { id: 'setup', status: 'setup', updated_at: '2026-10-20T02:50:00Z' },
      { id: 'no-date', status: 'shootout' },
    ];
    assert.deepEqual(liveShowdownRows(rows, now).map((r) => r.id), ['live', 'playoffs', 'no-date']);
    assert.deepEqual(liveShowdownRows(null, now), []);
  });

  it('who are you: the picked player is remembered per event and only matches with them are theirs', () => {
    const store = new Map();
    const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
    assert.equal(loadMe('e1', storage), '');
    saveMe('e1', 'p2', storage);
    assert.equal(loadMe('e1', storage), 'p2');
    assert.equal(loadMe('e2', storage), '', 'each event has its own choice');
    saveMe('e1', '', storage);
    assert.equal(loadMe('e1', storage), '');
    assert.equal(loadMe('e1', { getItem() { throw new Error('blocked'); } }), '');
    const event = { players: [{ id: 'p1', name: 'Zed' }, { id: 'p2', name: 'Amy' }, { id: 'p3', name: 'Bo', withdrawnAt: 'x' }] };
    assert.deepEqual(pickablePlayers(event).map((p) => p.name), ['Amy', 'Zed'], 'sorted, withdrawn players left out');
    assert.deepEqual(pickablePlayers({ players: ['10', '2', '1'].map((n) => ({ id: n, name: n })) }).map((p) => p.name), ['1', '2', '10'], 'numbers in order');
    assert.equal(meIn(event, 'p2').name, 'Amy');
    assert.equal(meIn(event, 'p3'), null, 'a withdrawn player is no longer picked');
    assert.equal(meIn(event, 'gone'), null);
    const tables = [{ id: 'a', p1: 'p1', p2: 'p3' }, { id: 'b', p1: 'p4', p2: 'p5' }, { id: 'c', p1: 'p2', p2: 'p6' }, { id: 'd', p1: 'p7', p2: 'p8' }];
    assert.deepEqual(mineFirst(tables, 'p2').map((m) => m.id), ['c', 'a', 'b', 'd'], 'own match first, rest in order');
    assert.deepEqual(mineFirst(tables, '').map((m) => m.id), ['a', 'b', 'c', 'd']);
    assert.ok(isMyMatch({ p1: 'p1', p2: 'p2' }, 'p2') && !isMyMatch({ p1: 'p1', p2: 'p2' }, 'p3') && !isMyMatch({ p1: 'p1', p2: 'p2' }, ''));
  });

  it('score tracker: counts games inside the match rules and is saved per match', () => {
    const games = { mode: 'games', target: 6 };
    let s = { s1: 0, s2: 0 };
    for (const side of [1, 1, 2, 1, 2]) s = step(games, s, side, 1);
    assert.deepEqual(s, { s1: 3, s2: 2 });
    assert.equal(statusText(games, s.s1, s.s2), 'Game 6 of 6');
    s = step(games, s, 2, 1);
    assert.ok(isDone(games, s.s1, s.s2) && statusText(games, s.s1, s.s2) === 'Match complete', '3\u20133 tie completes a 6-game match');
    assert.deepEqual(step(games, s, 1, 1), s, 'no seventh game');
    assert.deepEqual(step(games, { s1: 0, s2: 0 }, 1, -1), { s1: 0, s2: 0 }, 'never below zero');
    const race = { mode: 'race', target: 5 };
    assert.ok(!isDone(race, 4, 4) && isDone(race, 5, 3) && !canAdd(race, 5, 3));
    assert.deepEqual(step(race, { s1: 5, s2: 3 }, 2, 1), { s1: 5, s2: 3 }, 'race over: no more games');
    assert.ok(!isDone(race, 5, 5));

    const v3 = { payoutVersion: 3, payoutPlan: { qualifyingGames: 6, playoffRaceTo: 7 } };
    assert.deepEqual(trackRule(v3, { phase: 'qualifying' }), { mode: 'games', target: 6 });
    assert.deepEqual(trackRule(v3, { phase: 'playoff' }), { mode: 'race', target: 7 });
    assert.deepEqual(trackRule({ settings: { qualifyingRaceTo: 3, playoffRaceTo: 5 } }, { phase: 'qualifying' }), { mode: 'race', target: 3 });

    const store = new Map();
    const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
    assert.equal(loadTrack('e1', 'm1', storage), null);
    saveTrack('e1', 'm1', { s1: 2, s2: 1 }, storage);
    assert.deepEqual(loadTrack('e1', 'm1', storage), { s1: 2, s2: 1 });
    assert.equal(loadTrack('e1', 'm2', storage), null, 'each match has its own score');
    clearTrack('e1', 'm1', storage);
    assert.equal(loadTrack('e1', 'm1', storage), null);
    store.set('frph-showdown-track:e1:m3', '{bad');
    assert.equal(loadTrack('e1', 'm3', storage), null, 'a damaged save starts from 0\u20130');
  });

  it('score tracker screen and own-match buttons', async () => {
    const pub = publicShowdown(phases.qualifying);
    const onTable = reportableMatches(pub)[0];
    const me = pub.players.find((p) => p.id === onTable.p1);
    const now = await render('../public/ShowdownPublicNow.jsx', { event: pub, pendingIds: [], mine: [], canReport: true, onReport() {}, onTrack() {}, me });
    assert.ok(now.includes('>Keep score<') && now.includes('>Report score<'));
    const html = await render('../public/ShowdownScoreTracker.jsx', { event: pub, match: { ...onTable, label: 'Qualifying 1', p1Name: 'Amy', p2Name: 'Bo' }, reporterName: 'Amy', onSend: async () => '', onCancel() {} });
    for (const t of ['Keep score', 'Race to 3', 'Add a game for Amy', 'Send to director', 'saved on this phone']) assert.ok(html.includes(t), t);
    assert.match(html, /disabled=""[^>]*>Send to director/, 'cannot send before the match is complete');
  });

  it('live Showdowns become homepage and Current tournaments entries that open the event page', async () => {
    assert.deepEqual(liveShowdownItem({ id: 'sd-1', name: 'Tuesday Showdown', venue: 'Main St', status: 'qualifying' }), {
      id: 'sd-sd-1', path: '/tournament-bracket/submit/showdown/sd-1', name: 'Tuesday Showdown', detail: 'Live Showdown \u00b7 Main St',
    });
    const recent = new Date().toISOString();
    const api = { publicList: async () => ({ data: [{ id: 'a', name: 'A', status: 'playoffs', updated_at: recent }, { id: 'b', name: 'B', status: 'completed', updated_at: recent }] }) };
    assert.deepEqual((await listLiveShowdownItems(api)).map((i) => i.path), ['/tournament-bracket/submit/showdown/a']);
    assert.deepEqual(await listLiveShowdownItems({ publicList: async () => { throw new Error('offline'); } }), []);
    assert.deepEqual(await listLiveShowdownItems({ publicList: async () => ({ data: null, error: 'x' }) }), []);
  });

  it('routes: the public page lives under the existing submit route and TV under the existing TV route', () => {
    assert.equal(showdownPublicHash('showdown-1'), '/tournament-bracket/submit/showdown/showdown-1');
    assert.equal(showdownPublicEventId('/tournament-bracket/submit/showdown/showdown-1'), 'showdown-1');
    assert.equal(showdownPublicEventId('/tournament-bracket/submit/showdown'), '');
    assert.equal(showdownPublicEventId('/tournament-bracket/submit/abc'), null, 'Cash Climb submit links are untouched');
    assert.match(showdownTvHref('showdown-1', 'portrait'), /#\/tournament-bracket\/tv\?showdown=showdown-1&layout=portrait$/);
  });
});

describe('public pages', () => {
  it('qualifying: tables with Report score, up next, results, standings with cutoff and circle', async () => {
    const pub = publicShowdown(phases.qualifying);
    const onTable = reportableMatches(pub)[0];
    const me = pub.players.find((p) => p.id === onTable.p1);
    const now = publicOnly(await render('../public/ShowdownPublicNow.jsx', { event: pub, pendingIds: [], mine: [], canReport: true, onReport() {}, me }));
    for (const t of ['On the tables', 'Table 1', 'Report score', 'Latest results', 'Reporting as']) assert.ok(now.includes(t), t);
    assert.ok(!now.includes('Up next'), 'up next has its own tab');
    const upNext = publicOnly(await render('../public/ShowdownPublicNow.jsx', { event: pub, me }, 'ShowdownPublicUpNext'));
    assert.ok(upNext.includes('Up next') && upNext.includes('sd-pub-match'));
    const pending = publicOnly(await render('../public/ShowdownPublicNow.jsx', { event: pub, pendingIds: [onTable.id], mine: [{ id: 's1', label: 'Qualifying 1', scoreText: 'A 3–1 B', status: 'rejected', reason: 'Wrong' }], canReport: true, onReport() {}, me }));
    assert.ok(pending.includes('waiting for the director') && !pending.includes('>Report score<'));
    assert.ok(pending.includes('Not accepted') && pending.includes('Wrong'));
    const viewOnly = await render('../public/ShowdownPublicNow.jsx', { event: pub, pendingIds: [], mine: [], canReport: false, onReport() {}, me });
    assert.ok(!viewOnly.includes('Report score') && !viewOnly.includes('Pick your name'));
    const noName = await render('../public/ShowdownPublicNow.jsx', { event: pub, pendingIds: [], mine: [], canReport: true, onReport() {} });
    assert.ok(noName.includes('Pick your name') && !noName.includes('>Report score<'), 'no name picked: no report buttons');
    const other = pub.players.find((p) => p.id !== onTable.p1 && p.id !== onTable.p2);
    const notMine = await render('../public/ShowdownPublicNow.jsx', { event: pub, pendingIds: [], mine: [], canReport: true, onReport() {}, me: other });
    assert.ok(notMine.includes('Reporting as') && !notMine.includes('>Report score<'), 'only your own match can be reported');
    const standings = publicOnly(await render('../public/ShowdownPublicStandings.jsx', { event: publicShowdown(phases.qualifyingDone) }));
    for (const t of ['Qualifying standings', 'sd-cutoff', 'Qualifying circle', 'Player 16']) assert.ok(standings.includes(t), t);
  });

  it('circle scores read from the listed player\u2019s side: a win is always the bigger number first', async () => {
    const html = await render('../public/ShowdownPublicStandings.jsx', { event: publicShowdown(phases.qualifyingDone) });
    const results = [...html.matchAll(/(won|lost) (\d)–(\d)/g)];
    assert.ok(results.length >= 16);
    results.forEach(([, wl, a, b]) => assert.equal(wl === 'won', Number(a) > Number(b), `${wl} ${a}–${b}`));
  });

  it('shootout: holder, challenger, breaker, losses; no rack buttons', async () => {
    const html = publicOnly(await render('../public/ShowdownPublicNow.jsx', { event: publicShowdown(phases.shootout), pendingIds: [], mine: [], canReport: true, onReport() {} }));
    assert.ok(html.includes('Qualification shootout') && html.includes('Deciding who starts the first game'));
    assert.ok(!/9-ball|texas|\brack|\blag\b|\bbreak/i.test(html.replace(/<[^>]+>/g, ' ')), 'no game or playing rules');
    assert.ok(!html.includes('Report score'));
  });

  it('bracket draw: the unconfirmed preview is not shown to the public', async () => {
    const drawn = E.drawPlayoff(phases.bracket, { now: '2026-10-18T18:00:00.000Z', random: () => 0.3 });
    const html = publicOnly(await render('../public/ShowdownPublicBracket.jsx', { event: publicShowdown(drawn) }));
    assert.ok(html.includes('once qualifying is finished and the director confirms'));
    assert.ok(!html.includes('sd-mini'));
  });

  it('playoffs: bracket with byes and payouts, money, results so far', async () => {
    const pub = publicShowdown(phases.playoffs);
    const bracket = publicOnly(await render('../public/ShowdownPublicBracket.jsx', { event: pub }));
    for (const t of ['6-player playoff bracket', 'Quarterfinal byes', 'Straight to Semifinal', 'per win', 'Quarterfinal', 'Table 1']) assert.ok(bracket.includes(t), t);
    assert.ok(!bracket.includes('when confirmed'), 'public bye cards show the earned amount');
    const { ShowdownPublicMoney } = await (await import('../operator/showdownRenderKit.js')).loadComponent('../public/ShowdownPublicMoney.jsx');
    const React = await import('react');
    const server = await import('react-dom/server');
    const money = publicOnly(server.renderToStaticMarkup(React.createElement(ShowdownPublicMoney, { event: pub })));
    for (const t of ['Prize pool', 'Payout schedule', 'Earnings', '$280', 'Top-up']) assert.ok(money.includes(t), t);
  });

  it('completed: champion, final standings and earnings', async () => {
    const mod = await import('../operator/showdownRenderKit.js');
    const { ShowdownPublicResults } = await mod.loadComponent('../public/ShowdownPublicMoney.jsx');
    const React = await import('react');
    const server = await import('react-dom/server');
    const html = publicOnly(server.renderToStaticMarkup(React.createElement(ShowdownPublicResults, { event: publicShowdown(phases.completed) })));
    for (const t of ['Champion', 'Final standings', 'Runner-up', 'is-champion']) assert.ok(html.includes(t), t);
  });
});

describe('TV board', () => {
  it('qualifying: tables, standings with cutoff, next matches', () => {
    const b = buildShowdownTvBoard(publicShowdown(phases.qualifying));
    assert.equal(b.mode, 'qualifying');
    assert.equal(b.tables.length, 1);
    assert.ok(b.upNext.length > 0);
    assert.equal(b.standings.rows.length, 16);
    assert.equal(b.pool, '$320');
  });

  it('shootout: players, holder or lag, losses and open spots', () => {
    const b = buildShowdownTvBoard(publicShowdown(phases.shootout));
    assert.equal(b.mode, 'shootout');
    assert.ok(b.shootout.order.length >= 2);
    assert.ok(b.shootout.spots >= 1);
  });

  it('playoffs: bracket rounds with payouts, active matches, championship status', () => {
    const b = buildShowdownTvBoard(publicShowdown(phases.playoffs));
    assert.equal(b.mode, 'playoffs');
    assert.deepEqual(b.rounds.map((r) => r.key), ['quarterfinal', 'semifinal', 'final']);
    assert.ok(b.rounds.every((r) => r.payout > 0));
    assert.equal(b.byes.length, 2);
    assert.equal(b.tables[0].id, 'qf1');
    assert.equal(b.championshipStatus.status, 'pending');
  });

  it('completed: champion, final standings, earnings and pool', () => {
    const b = buildShowdownTvBoard(publicShowdown(phases.completed));
    assert.equal(b.mode, 'completed');
    assert.ok(b.champion.name);
    assert.equal(b.final.length, 16);
    assert.equal(b.pool, '$320');
    assert.equal(b.paid, '$320');
  });

  it('setup events and missing events show nothing', () => {
    assert.equal(buildShowdownTvBoard(null), null);
    assert.equal(buildShowdownTvBoard(E.createShowdown({}, { now: '2026-10-18T00:00:00.000Z' })), null);
  });

  it('TV sections render without operator controls', async () => {
    const mod = await import('../operator/showdownRenderKit.js');
    const S = await mod.loadComponent('../public/ShowdownTvSections.jsx');
    const React = await import('react');
    const server = await import('react-dom/server');
    const b = buildShowdownTvBoard(publicShowdown(phases.playoffs));
    const html = publicOnly(server.renderToStaticMarkup(React.createElement(React.Fragment, null,
      React.createElement(S.TvBracket, { rounds: b.rounds, byes: b.byes, championshipStatus: b.championshipStatus }),
      React.createElement(S.TvTables, { tables: b.tables }))));
    assert.ok(html.includes('Playoffs') && html.includes('a win') && html.includes('Table 1'));
    assert.equal((html.match(/Bye to Semifinal/g) || []).length, 2);
  });
});
