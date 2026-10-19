import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { render, fakeLocalStorage } from './showdownRenderKit.js';
import { makeOperator, setUpEvent, workBoard, workShootouts, playFullEvent } from './showdownOperatorKit.js';
import { SHOWDOWN_STORAGE_KEY } from './showdownStore.js';
import { createShowdown, recordResult, recordForfeit } from '../showdownEngine.js';
import { toPlayoffs } from '../showdownTestKit.js';

const h = new Proxy({}, { get: () => () => true });
const handlers = { act: () => true, board: h, lock: h.x, reopenQualifying: h.x, reopenShootout: h.x, confirmBracket: h.x, complete: h.x, withdraw: h.x, reinstate: h.x };
const tab = (state, name, corrections = false) => render('ShowdownTabContent.jsx', { state, tab: name, corrections, h: handlers });

function clean(html) {
  assert.ok(!/\\u[0-9a-f]{4}/i.test(html), 'no escaped unicode shown as text');
  assert.ok(!/undefined|NaN|\[object Object\]/.test(html), 'no broken values');
  return html;
}

const states = {};
before(() => {
  const o = makeOperator(3);
  let s = createShowdown({ presetId: 'legends' }, o.op());
  for (let i = 1; i <= 8; i += 1) s = o.tap(s, 'addPlayer', { name: `Player ${i}` });
  states.setup = s;
  states.qualifying = o.tap(o.tap(s, 'start'), 'startSuggested', 1);
  const o12 = makeOperator(24);
  let byeEvent = workBoard(o12, setUpEvent(o12, 12, { tables: 5 }), 'qualifying');
  byeEvent = workShootouts(o12, o12.tap(byeEvent, 'lockQualifying'));
  states.bracket12 = o12.tap(byeEvent, 'drawBracket');
  states.playoffs12 = o12.tap(states.bracket12, 'confirmBracket');
  const oc = makeOperator(16);
  states.completed = playFullEvent(oc, setUpEvent(oc, 16));
  for (let seed = 1; seed <= 200 && !states.shootout; seed += 1) {
    const os = makeOperator(seed);
    const t = os.tap(workBoard(os, setUpEvent(os, 8), 'qualifying', () => [3, 0]), 'lockQualifying');
    if (t.status === 'shootout') states.shootout = t;
  }
});

describe('Showdown screens render for every phase', () => {
  it('setup: preset, fees, races, tables, entrants, payout schedule and start', async () => {
    const html = clean(await render('ShowdownSetup.jsx', { state: states.setup, act: () => true, onStart() {}, onDiscard() {}, onLeave() {} }));
    for (const text of ['Legends Brews &amp; Cues', 'Entry fee', 'Race to 3', 'race to 5', '5 tables', 'Player 8', 'Payout schedule for 8 entrants', '$160', 'Start qualifying', 'Ready to start']) {
      assert.ok(html.includes(text), text);
    }
  });

  it('setup blocks start with plain-English reasons', async () => {
    const o = makeOperator(1);
    const s = createShowdown({ presetId: 'legends' }, o.op());
    const html = clean(await render('ShowdownSetup.jsx', { state: s, act: () => true }));
    assert.match(html, /needs at least 8 entrants/);
    assert.match(html, /disabled=""[^>]*>Start qualifying/);
  });

  it('qualifying: tables, queue, standings, circle opponents, earnings', async () => {
    const s = states.qualifying;
    const run = clean(await tab(s, 'run'));
    for (const text of ['Table 1', 'tap to record', 'Start next match', 'Ready to start', 'Qualifying standings', 'Lock qualifying']) assert.ok(run.includes(text), text);
    const circle = clean(await tab(s, 'circle'));
    s.players.forEach((p) => assert.ok(circle.includes(p.name)));
    assert.equal((circle.match(/class="sd-opp/g) || []).length, 16, 'every player shows two opponents');
    const money = clean(await tab(s, 'money'));
    assert.ok(money.includes('Qualifying match win') && money.includes('$5'));
  });

  it('standings show all six tiebreakers, the cutoff and lock / reopen controls', async () => {
    const html = clean(await tab(states.bracket12, 'standings', true));
    for (const text of ['Match wins', 'Games won', 'Fewest games lost', 'Head-to-head', 'Opponents’ match wins', 'Opponents’ game differential', 'sd-cutoff', 'Locked', 'Reopen qualifying', 'Playoffs · bye']) {
      assert.ok(html.includes(text), text);
    }
    const hidden = await tab(states.bracket12, 'standings', false);
    assert.ok(!hidden.includes('Reopen qualifying'), 'reopen needs corrections mode');
  });

  it('run view shows compact standings; the standings tab keeps every tiebreaker column', async () => {
    const run = clean(await tab(states.qualifying, 'run'));
    assert.ok(run.includes('sd-standings-compact'));
    assert.ok(run.includes('Full tiebreakers are on the Standings tab'));
    for (const text of ['Opp W', 'Opp +/-', 'Separated from player above by']) assert.ok(!run.includes(text), `run view hides ${text}`);
    const full = clean(await tab(states.qualifying, 'standings'));
    assert.ok(!full.includes('sd-standings-compact'));
    for (const text of ['Opp W', 'Opp +/-', 'Separated from player above by']) assert.ok(full.includes(text), `standings tab shows ${text}`);
  });

  it('shootout: order, who starts, losses and remaining spots, with procedure only', async () => {
    const html = clean(await tab(states.shootout, 'run'));
    for (const text of ['Qualification shootout', 'Who starts the first game', ' starts</button>', 'Each shootout match is a single game', 'more elimination', 'Shootout order']) assert.ok(html.includes(text), text);
    assert.ok(!/9-ball|texas|\brack|\blag\b|\bbreak/i.test(html.replace(/<[^>]+>/g, ' ')), 'no game or playing rules');
  });

  it('5-player bracket preview shows bye holders, bye sections and bye pay before confirmation', async () => {
    const html = clean(await tab(states.bracket12, 'run'));
    for (const text of ['5-player playoff bracket (8 positions, 3 byes)', 'Quarterfinal byes (3)', 'Bye holders', 'Section 1', 'Section 3', 'Section 4', 'Straight to Semifinal', 'when confirmed', 'Quarterfinal', 'Confirm bracket and start playoffs', 'Redraw bracket']) {
      assert.ok(html.includes(text), text);
    }
  });

  for (const [n, byes] of [[14, 2], [16, 1]]) {
    it(`${n} entrants: ${8 - byes}-player bracket preview lays out every section`, async () => {
      const o = makeOperator(n);
      let s = workBoard(o, setUpEvent(o, n, { tables: 5 }), 'qualifying');
      s = o.tap(workShootouts(o, o.tap(s, 'lockQualifying')), 'drawBracket');
      const html = clean(await tab(s, 'run'));
      assert.ok(html.includes(`${8 - byes}-player playoff bracket (8 positions, ${byes} bye${byes === 1 ? '' : 's'})`));
      assert.equal((html.match(/sd-mini-bye/g) || []).length, byes);
      assert.equal((html.match(/sd-mini-label">Quarterfinal \d/g) || []).length, 4 - byes);
    });
  }

  it('playoffs: board, live bracket with earned byes, and results so far', async () => {
    const html = clean(await tab(states.playoffs12, 'run'));
    for (const text of ['Playoff matches', 'Start next match', 'earned $', 'Results so far', 'Complete event']) assert.ok(html.includes(text), text);
  });

  it('completed: reconciled money, final placements and audit log', async () => {
    const s = states.completed;
    const money = clean(await tab(s, 'money'));
    assert.ok(money.includes('Reconciled: $320 paid of $320'));
    const results = clean(await tab(s, 'results'));
    assert.ok(results.includes('Champion') && results.includes('Runner-up') && results.includes('Final results'));
    const log = clean(await tab(s, 'log'));
    for (const text of ['Qualifying started', 'Result recorded', 'Bracket confirmed', 'Event completed', 'operator@test']) assert.ok(log.includes(text), text);
  });

  it('players tab offers withdraw during the event and undo while qualifying', async () => {
    const o = makeOperator(4);
    const started = setUpEvent(o, 8);
    const s = o.tap(started, 'withdraw', started.players[0].id);
    const html = clean(await tab(s, 'players'));
    assert.ok(html.includes('>Withdraw<') && html.includes('Undo withdrawal') && html.includes('Withdrew'));
    assert.ok(!html.includes('>Remove<'), 'entrants cannot be removed after the start');
  });

  it('playoff double forfeit, administrative bye and championship transfer are labeled on bracket, money and audit log', async () => {
    const o = makeOperator(24);
    const qf1 = states.playoffs12.matches.find((m) => m.id === 'qf1');
    const s = o.tap(states.playoffs12, 'forfeit', 'qf1', [qf1.p1, qf1.p2]);
    const run = clean(await tab(s, 'run'));
    for (const text of ['Double forfeit', 'Administrative bye', 'Empty position', 'moved to the championship']) assert.ok(run.includes(text), text);
    const money = clean(await tab(s, 'money'));
    assert.ok(money.includes('Playoff payouts nobody won'));
    const log = clean(await tab(s, 'log'));
    assert.ok(log.includes('Automatic playoff result') && log.includes('administrative bye'));
  });

  it('a championship double forfeit shows Championship unresolved and keeps Complete disabled', async () => {
    const { s: p, op } = toPlayoffs(8, { seed: 8 });
    let s = recordResult(recordResult(p, 'sf1', { score1: 5, score2: 1 }, op()), 'sf2', { score1: 5, score2: 1 }, op());
    const f = s.matches.find((m) => m.id === 'f1');
    s = recordForfeit(s, 'f1', [f.p1, f.p2], op());
    const run = clean(await tab(s, 'run'));
    assert.ok(run.includes('Championship unresolved'));
    assert.match(run, /disabled=""[^>]*>Complete event/);
    assert.ok(!run.includes('is-champion'));
  });

  it('a Champion by Walkover is labeled on the bracket, results and audit log, and Complete is enabled', async () => {
    const { s: p, op } = toPlayoffs(8, { seed: 18 });
    let s = recordResult(p, 'sf2', { score1: 5, score2: 1 }, op());
    const sf1 = s.matches.find((m) => m.id === 'sf1');
    s = recordForfeit(s, 'sf1', [sf1.p1, sf1.p2], op());
    const run = clean(await tab(s, 'run'));
    assert.ok(run.includes('Champion by Walkover'));
    assert.ok(!run.includes('Championship unresolved'));
    assert.doesNotMatch(run, /disabled=""[^>]*>Complete event/);
    const log = clean(await tab(s, 'log'));
    assert.ok(log.includes('Champion by Walkover (opponent position empty)'));
    const results = clean(await tab(s, 'results'));
    assert.ok(results.includes('Champion by Walkover') && !results.includes('Runner-up'));
  });

  it('ShowdownApp opens the saved event from this tablet with header, next step and tabs', async () => {
    fakeLocalStorage({ [SHOWDOWN_STORAGE_KEY]: JSON.stringify(states.qualifying) });
    const html = clean(await render('ShowdownApp.jsx', { onLeave() {} }));
    for (const text of ['Cash Climb Showdown · Qualifying', 'Run event', 'Circle', 'Standings', 'Money', 'Audit log', 'Corrections', 'qualifying matches left']) {
      assert.ok(html.includes(text), text);
    }
    fakeLocalStorage();
    const empty = clean(await render('ShowdownApp.jsx', { onLeave() {} }));
    assert.ok(empty.includes('New Showdown'));
  });

  it('ShowdownApp refuses to run an event started under earlier rules', async () => {
    const { formatVersion, ...legacy } = states.qualifying;
    assert.equal(formatVersion, 3);
    fakeLocalStorage({ [SHOWDOWN_STORAGE_KEY]: JSON.stringify(legacy) });
    const html = clean(await render('ShowdownApp.jsx', { onLeave() {} }));
    assert.ok(html.includes('obsolete test event') && html.includes('Close and archive'));
    assert.ok(!html.includes('Run event'));
    fakeLocalStorage();
  });
});
