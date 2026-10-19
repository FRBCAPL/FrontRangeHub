import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as E from './showdownEngine.js';
import { RECOMMENDED_PAYOUT_VERSION, SHOWDOWN_ENGINE_LEVEL } from './showdownRules.js';
import { operator, startedEvent } from './showdownTestKit.js';
import { runAction } from './operator/showdownOperatorActions.js';
import { makeOperator, playFullEvent, moneyView } from './operator/showdownOperatorKit.js';
import { createFakeCloud } from './cloud/showdownFakeCloud.js';
import { freshStorage, apiFor, syncFor } from './cloud/showdownCloudTestKit.js';
import { screenPublicEvent } from './public/useShowdownPublicEvent.js';
import { initialPick, selectFormat, confirmPick, pickProblem } from './operator/showdownFormatPick.js';

beforeEach(() => freshStorage());

const create = (payoutVersion, extra = {}) => E.createShowdownWithFormat({ presetId: 'legends', payoutVersion, confirmed: true, ...extra }, operator(1)());

function withPlayers(s, n, o = makeOperator(n)) {
  let state = s;
  for (let i = 1; i <= n; i += 1) state = o.tap(state, 'addPlayer', { name: `Player ${i}` });
  return state;
}

describe('format selection', () => {
  it('V3 is preselected and recommended, but nothing is created without explicit confirmation', () => {
    assert.equal(RECOMMENDED_PAYOUT_VERSION, 3);
    const pick = initialPick();
    assert.deepEqual(pick, { selected: 3, confirmed: false });
    assert.match(pickProblem(pick), /confirm V3/);
    assert.equal(pickProblem(confirmPick(pick, true)), '');
    const switched = selectFormat(confirmPick(pick, true), 1);
    assert.equal(switched.confirmed, false, 'choosing another format clears the confirmation');
    assert.throws(() => E.createShowdownWithFormat({ payoutVersion: 3 }, operator(1)()), /Confirm that this tournament uses V3/);
    assert.throws(() => E.createShowdownWithFormat({ payoutVersion: 3, confirmed: 'yes' }, operator(1)()), /Confirm/);
    assert.throws(() => E.createShowdownWithFormat({ confirmed: true }, operator(1)()), /Choose a tournament format/);
  });

  it('V1, V2 and V3 can all be created; the confirmation and engine level are recorded', () => {
    for (const v of [1, 2, 3]) {
      const s = create(v);
      assert.equal(s.payoutVersion, v);
      assert.equal(s.minEngine, v === 3 ? SHOWDOWN_ENGINE_LEVEL : 1, 'V1 and V2 stay openable by level-1 builds');
      assert.deepEqual(s.audit[0].detail, { payoutVersion: v, formatConfirmed: true });
    }
    const o = makeOperator(9);
    assert.equal(o.tap(create(1), 'changeFormat', 3, { confirmed: true }).minEngine, 2);
    assert.equal(o.tap(create(3), 'changeFormat', 2, { confirmed: true }).minEngine, 1);
    assert.deepEqual([create(1).settings.qualifyingRaceTo, create(1).settings.playoffRaceTo], [3, 5]);
    assert.deepEqual([create(2).settings.qualifyingRaceTo, create(2).settings.playoffRaceTo], [3, 5]);
  });

  it('no format stores a game or playing rules; V3 adds only its game count and playoff race', () => {
    const shared = ['entryFee', 'maxEntrants', 'minEntrants', 'tableCount'];
    assert.deepEqual(Object.keys(create(1).settings).sort(), [...shared, 'playoffRaceTo', 'qualifyingRaceTo'].sort());
    assert.deepEqual(Object.keys(create(2).settings).sort(), [...shared, 'playoffRaceTo', 'qualifyingRaceTo'].sort());
    assert.deepEqual(Object.keys(create(3).settings).sort(), [...shared, 'playoffRaceTo', 'qualifyingGames'].sort());
    assert.deepEqual([create(3).settings.qualifyingGames, create(3).settings.playoffRaceTo], [7, 5]);
    const blurb = JSON.stringify(E.SHOWDOWN_FORMATS.map((f) => [f.name, f.summary]));
    assert.ok(!/9-ball|texas|break|foul|rack|any game/i.test(blurb), 'format selector names no game or game rule');
  });

  it('an unknown format cannot be created', () => {
    for (const v of [0, 4, '2', null, 'v3']) assert.throws(() => E.createShowdown({ payoutVersion: v }, operator(1)()), /Choose a tournament format/);
  });
});

describe('V3 cannot start yet', () => {
  it('a full, valid V3 setup still cannot start, through the engine or the operator action', () => {
    const o = makeOperator(2);
    const s = withPlayers(create(3), 8, o);
    assert.match(E.setupProblems(s)[0], /V3 events cannot be started yet/);
    assert.throws(() => E.startShowdown(s, o.op()), /V3 events cannot be started yet/);
    const out = o.tryTap(s, 'start');
    assert.match(out.error, /V3 events cannot be started yet/);
    assert.equal(out.state.status, 'setup');
  });

  it('V3 setup accepts shared settings and refuses race settings', () => {
    const o = makeOperator(3);
    const s = o.tap(create(3), 'updateSettings', { entryFee: 30, tableCount: 6 });
    assert.deepEqual([s.settings.entryFee, s.settings.tableCount], [30, 6]);
    assert.match(o.tryTap(s, 'updateSettings', { qualifyingRaceTo: 7 }).error, /V3 events do not use that setting/);
  });

  it('V3 has no payout engine here: money paths refuse instead of computing V1 money', () => {
    const s = create(3);
    assert.throws(() => E.computeEarnings(s), /V3 events cannot be started yet/);
    assert.throws(() => E.raceToFor(s, 'qualifying'), /V3/);
  });
});

describe('changing the format during setup', () => {
  it('requires confirmation and a different format', () => {
    const o = makeOperator(4);
    const s = create(1);
    assert.match(o.tryTap(s, 'changeFormat', 2).error, /Confirm the change to V2/);
    assert.match(o.tryTap(s, 'changeFormat', 1, { confirmed: true }).error, /already uses V1/);
    assert.match(o.tryTap(s, 'changeFormat', 9, { confirmed: true }).error, /Choose a tournament format/);
  });

  it('V1 with custom races to V2 resets the races; entrants, fee and tables are kept', () => {
    const o = makeOperator(5);
    let s = o.tap(create(1), 'updateSettings', { qualifyingRaceTo: 7, playoffRaceTo: 9, entryFee: 25, tableCount: 6 });
    s = withPlayers(s, 9, o);
    const preview = E.formatChangePreview(s, 2);
    assert.deepEqual(preview.resets.map((r) => [r.label, r.from, r.to]), [['Qualifying race', 'race to 7', 'race to 3'], ['Playoff race', 'race to 9', 'race to 5']]);
    const v2 = o.tap(s, 'changeFormat', 2, { confirmed: true });
    assert.equal(v2.payoutVersion, 2);
    assert.deepEqual([v2.settings.qualifyingRaceTo, v2.settings.playoffRaceTo, v2.settings.entryFee, v2.settings.tableCount], [3, 5, 25, 6]);
    assert.equal(v2.players.length, 9);
    assert.deepEqual(E.setupProblems(v2), []);
    const entry = v2.audit[v2.audit.length - 1];
    assert.equal(entry.action, 'change-format');
    assert.deepEqual(entry.detail, { from: 1, to: 2, reset: ['qualifyingRaceTo', 'playoffRaceTo'] });
  });

  it('V2 to V3 swaps the qualifying race for a game count; V3 back to V1 restores the V1 race defaults and nothing else', () => {
    const o = makeOperator(6);
    const v3 = o.tap(withPlayers(create(2, { entryFee: 40 }), 8, o), 'changeFormat', 3, { confirmed: true });
    assert.deepEqual(Object.keys(v3.settings).sort(), ['entryFee', 'maxEntrants', 'minEntrants', 'playoffRaceTo', 'qualifyingGames', 'tableCount']);
    assert.equal(v3.settings.entryFee, 40);
    const preview = E.formatChangePreview(v3, 1);
    assert.deepEqual(preview.resets.map((r) => r.label), ['Qualifying race', 'Qualifying games']);
    const v1 = o.tap(v3, 'changeFormat', 1, { confirmed: true });
    assert.deepEqual(Object.keys(v1.settings).sort(), ['entryFee', 'maxEntrants', 'minEntrants', 'playoffRaceTo', 'qualifyingRaceTo', 'tableCount']);
    assert.deepEqual([v1.settings.qualifyingRaceTo, v1.settings.playoffRaceTo, v1.settings.entryFee], [3, 5, 40]);
    assert.deepEqual(E.setupProblems(v1), []);
  });

  it('the format is locked once qualifying starts', () => {
    const o = makeOperator(7);
    const started = o.tap(withPlayers(create(2), 8, o), 'start');
    assert.match(o.tryTap(started, 'changeFormat', 1, { confirmed: true }).error, /locked once the event starts/);
  });
});

describe('V1 and V2 still run end to end through the operator actions', () => {
  for (const v of [1, 2]) {
    it(`V${v}: create with a confirmed format, play, complete and reconcile`, () => {
      const o = makeOperator(30 + v);
      let s = o.tap(create(v), 'updateSettings', { entryFee: 20, tableCount: 5 });
      s = o.tap(withPlayers(s, 12, o), 'start');
      const done = playFullEvent(o, s);
      assert.equal(done.status, 'completed');
      assert.equal(done.payoutVersion, v);
      assert.equal(E.reconciliationProblem(done), '');
      const view = moneyView(done);
      assert.equal(view.payoutVersion, v);
      assert.equal(view.paid, view.pool);
    });
  }
});

describe('unsupported versions are read-only', () => {
  const { s: live } = startedEvent(8, { seed: 9 });
  const cases = {
    'unknown number': { ...live, payoutVersion: 9 },
    'malformed string': { ...live, payoutVersion: '2' },
    'explicit null': { ...live, payoutVersion: null },
    'newer engine': { ...live, minEngine: SHOWDOWN_ENGINE_LEVEL + 1 },
    'started V3': { ...live, payoutVersion: 3 },
  };

  for (const [label, s] of Object.entries(cases)) {
    it(`${label}: no edits, no V1 money`, () => {
      assert.match(E.formatSupportProblem(s), /read-only/);
      const m = s.matches.find((x) => x.phase === 'qualifying');
      const out = runAction(s, 'startMatch', [m.id, 1], operator(1)());
      assert.match(out.error, /read-only/);
      assert.equal(out.state, s);
      assert.throws(() => E.startOnTable(s, m.id, 1, operator(1)()), /read-only/);
      assert.throws(() => E.computeEarnings(s), /read-only/);
      assert.match(E.setupProblems({ ...s, status: 'setup' })[0] || '', label === 'started V3' ? /V3 events cannot be started yet/ : /read-only/);
    });
  }

  it('an unsupported setup event cannot be converted to a supported format', () => {
    const s = { ...create(1), payoutVersion: 7 };
    assert.throws(() => E.changeFormat(s, 2, { confirmed: true }, operator(1)()), /read-only/);
    assert.throws(() => E.addPlayer(s, { name: 'X' }, operator(1)()), /read-only/);
  });

  it('the app never saves an unsupported event to the cloud; V1 and V2 still save', async () => {
    const fake = createFakeCloud();
    const api = apiFor(fake);
    const bad = { ...live, id: 'bad-event', payoutVersion: 9 };
    const res = await api.save(bad, 0);
    assert.equal(res.code, 'update-required');
    assert.equal(fake.events.has('bad-event'), false);
    const { sync, timers } = syncFor(api);
    const status = await sync.queue(bad);
    assert.equal(status.status, 'error');
    assert.match(status.message, /cannot save/);
    assert.equal(timers.length, 0, 'no retry loop');
    for (const v of [1, 2]) {
      const good = { ...startedEvent(8, { seed: 10 + v, payoutVersion: v }).s, id: `good-${v}` };
      assert.equal((await api.save(good, 0)).error, null);
    }
  });

  it('phones and the TV do not show unsupported versions or V3 events without a locked plan', () => {
    assert.match(screenPublicEvent({ ...live, payoutVersion: 9 }).error, /newer version/);
    assert.match(screenPublicEvent({ ...live, payoutVersion: 3 }).error, /payout plan is missing or incomplete/);
    assert.equal(screenPublicEvent(live).event, live);
  });

  it('events without a payoutVersion field are still V1', () => {
    const { payoutVersion, ...legacy } = live;
    assert.equal(payoutVersion, 1);
    assert.equal(E.payoutVersionOf(legacy), 1);
    assert.equal(E.formatSupportProblem(legacy), '');
  });
});

describe('formats are game-agnostic', () => {
  const RACE_KEYS = ['qualifyingRaceTo', 'qualifyingGames', 'playoffRaceTo'];
  const without = (settings, keys) => Object.fromEntries(Object.entries(settings).filter(([k]) => !keys.includes(k)));

  it('switching between any two formats changes only format-specific settings', () => {
    for (const from of [1, 2, 3]) {
      for (const to of [1, 2, 3].filter((v) => v !== from)) {
        const o = makeOperator(40 + from * 3 + to);
        const s = o.tap(withPlayers(create(from, { entryFee: 35 }), 8, o), 'updateSettings', { tableCount: 6 });
        const next = o.tap(s, 'changeFormat', to, { confirmed: true });
        assert.deepEqual(without(next.settings, RACE_KEYS), without(s.settings, RACE_KEYS), `V${from} to V${to}`);
        assert.ok(!('rulesetId' in next.settings) && !('game' in next.settings), `V${from} to V${to} adds no game`);
        assert.deepEqual(next.players, s.players);
        for (const r of E.formatChangePreview(s, to).resets) assert.ok(RACE_KEYS.includes(r.key), `V${from} to V${to} resets only races`);
      }
    }
  });

  it('a game setting cannot be added through the settings action', () => {
    const o = makeOperator(60);
    const s = o.tap(create(1), 'updateSettings', { rulesetId: 'texas-express-9ball', game: '9-Ball' });
    assert.ok(!('rulesetId' in s.settings) && !('game' in s.settings));
  });

  it('a saved event that still carries an old game ruleset plays unchanged, and switching formats does not reapply it', () => {
    const o = makeOperator(61);
    const legacy = withPlayers({ ...create(1), settings: { ...create(1).settings, rulesetId: 'texas-express-9ball', game: '9-Ball' } }, 8, o);
    assert.deepEqual(E.setupProblems(legacy), []);
    const v2 = o.tap(legacy, 'changeFormat', 2, { confirmed: true });
    assert.ok(!('rulesetId' in v2.settings) && !('game' in v2.settings), 'nothing game-specific is carried into the new format');
    const done = playFullEvent(o, o.tap(legacy, 'start'));
    assert.equal(done.status, 'completed');
    assert.equal(E.reconciliationProblem(done), '');
  });

  it('setup never asks for a game or ruleset', () => {
    for (const v of [1, 2]) assert.ok(!E.setupProblems(create(v)).some((p) => /game|ruleset/i.test(p)), `V${v}`);
  });
});

describe('setup validation by format', () => {
  it('V1 and V2 are ready with 8 players; V3 is blocked only by its missing engine', () => {
    for (const v of [1, 2]) assert.deepEqual(E.setupProblems(withPlayers(create(v), 8)), [], `V${v}`);
    assert.equal(E.setupProblems(withPlayers(create(3), 8)).length, 1);
  });
});
