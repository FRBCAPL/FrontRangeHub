import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCashClimbV3Record, cashClimbV3SetupProblems, cashClimbV3SetupChangeProblems, cashClimbV3SetupLocked, startCashClimbV3Record, centsFromDollarInput, cashClimbV3HubSummary } from './cashClimbV3Record.js';
import { restoreCashClimbV3Record } from './cashClimbV3RecordCheck.js';
import { cashClimbV3Store, CASH_CLIMB_V3_EVENTS_KEY, CASH_CLIMB_V3_OPEN_KEY } from './cashClimbV3Store.js';
import { listCashClimbV3HubEvents } from './cashClimbV3Hub.js';
import { blankPlacement, emptyPlacementPositions, placementFor, withMainSlot, withPreliminary } from './cashClimbV3Placement.js';
import { selectCashClimbV3Ladder, CASH_CLIMB_V3_OPTIMIZER_ID } from '../cashClimbV3Optimizer.js';
import { ladderOptimizerInput } from '../cashClimbV3Ladder.js';
import { cashClimbV3Budget } from '../cashClimbV3Budget.js';
import { cashClimbV3Config } from '../cashClimbV3Config.js';
import { createCashClimbV3Event } from '../cashClimbV3Event.js';
import { recordMatchResult } from '../cashClimbV3Progress.js';
import { settleCashClimbV3 } from '../cashClimbV3Settlement.js';
import { ledgerSummary } from '../cashClimbV3Ledger.js';
import { simplePlacement, playOut } from '../cashClimbV3TestKit.js';

const NOW = '2026-10-26T20:00:00.000Z';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    keys: () => [...data.keys()],
  };
}

function setupFor(n, { fee = 20, added = 0, raceTo = 7 } = {}) {
  const players = Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
  return {
    name: 'Friday Cash Climb',
    tournamentDate: '2026-10-30',
    players,
    entryFeeCents: fee * 100,
    addedMoneyCents: added * 100,
    raceTo,
    rules: { game: '9-Ball', notes: 'Winner breaks' },
    placement: simplePlacement(players.map((p) => p.id)),
  };
}

const created = (n, opts, id = `ccv3-${n}`) => {
  const r = createCashClimbV3Record(setupFor(n, opts), { id, now: NOW });
  assert.equal(r.status, 'valid', r.problems?.join(' '));
  return r.record;
};

const optimizerFor = (n, fee, added = 0) => {
  const config = cashClimbV3Config({ entrants: n, entryFeeCents: fee * 100, raceTo: 7, addedMoneyCents: added * 100 });
  return selectCashClimbV3Ladder(ladderOptimizerInput(cashClimbV3Budget(config), config.entryFeeCents));
};

describe('Cash Climb (V3) tournament creation', () => {
  it('creates an unstarted record whose payout comes from the production optimizer and is locked', () => {
    const record = created(16, { fee: 100 });
    const opt = optimizerFor(16, 100);
    assert.equal(record.type, 'cash-climb-v3');
    assert.equal(record.status, 'setup');
    assert.equal(record.payout.optimizerId, CASH_CLIMB_V3_OPTIMIZER_ID);
    assert.deepEqual(record.payout.ladder, opt.ladder);
    assert.deepEqual(record.payout.reference, opt.reference.ladder);
    assert.deepEqual(record.event.ladder, opt.ladder);
    assert.equal(record.payout.lockedAt, NOW);
    assert.equal(record.payout.prizePoolCents, 1600 * 100);
    assert.equal(ledgerSummary(record.event.ledger).earnedCents, 0);
    assert.deepEqual(record.event.config.rules, { game: '9-Ball', notes: 'Winner breaks' });
  });

  it('matches the optimizer across field sizes, fees and added money (no hardcoded ladders)', () => {
    for (const [n, fee, added] of [[8, 20, 0], [13, 10, 0], [24, 20, 0], [31, 37, 150], [32, 20, 0], [48, 50, 1000]]) {
      const record = created(n, { fee, added });
      assert.deepEqual(record.payout.ladder, optimizerFor(n, fee, added).ladder, `N${n} E${fee} A${added}`);
      assert.equal(restoreCashClimbV3Record(record).status, 'ok', `N${n}`);
    }
  });

  it('reports clear validation errors', () => {
    const problems = (patch) => cashClimbV3SetupProblems({ ...setupFor(16), ...patch });
    assert.ok(problems({ entryFeeCents: 900 }).includes('The entry fee must be at least $10.'));
    assert.ok(problems({ entryFeeCents: centsFromDollarInput('20.50') }).includes('The entry fee must be a whole number of dollars.'));
    assert.ok(problems({ addedMoneyCents: -100 }).includes('Added money cannot be negative.'));
    assert.ok(problems({ raceTo: 0 }).some((p) => p.includes('race length')));
    assert.ok(problems({ name: '  ' }).includes('Enter a tournament name.'));
    assert.ok(problems({ tournamentDate: '' }).includes('Pick the tournament date.'));
    const seven = setupFor(7);
    assert.ok(cashClimbV3SetupProblems(seven).some((p) => p.includes('at least 8')));
    const dup = setupFor(8);
    dup.players[1] = { id: 'p2', name: 'player 1' };
    assert.ok(cashClimbV3SetupProblems(dup).some((p) => p.includes('more than once')));
    assert.equal(createCashClimbV3Record(setupFor(16), { id: '' }).status, 'invalid');
    assert.equal(centsFromDollarInput(''), NaN);
    assert.equal(centsFromDollarInput('25'), 2500);
  });

  it('validates explicit placement', () => {
    const s = setupFor(12);
    assert.deepEqual(cashClimbV3SetupProblems({ ...s, placement: blankPlacement(12) }), ['Fill every bracket position (16 still empty).']);
    const twice = structuredClone(s.placement);
    twice.main[4] = { entrant: twice.main[5].entrant };
    assert.ok(cashClimbV3SetupProblems({ ...s, placement: twice }).some((p) => p.includes('placed more than once')));
    assert.ok(cashClimbV3SetupProblems({ ...s, placement: { preliminary: [], main: [] } }).some((p) => p.includes('preliminary matches')));
    let manual = blankPlacement(12);
    assert.equal(emptyPlacementPositions(manual), 4 * 2 + 8);
    [['p1', 'p2'], ['p3', 'p4'], ['p5', 'p6'], ['p7', 'p8']].forEach((pair, k) => pair.forEach((id, side) => { manual = withPreliminary(manual, k, side, id); }));
    ['p:0', 'p:1', 'p:2', 'p:3', 'e:p9', 'e:p10', 'e:p11', 'e:p12'].forEach((v, i) => { manual = withMainSlot(manual, i, v); });
    assert.deepEqual(cashClimbV3SetupProblems({ ...s, placement: manual }), []);
    assert.equal(placementFor(manual, 12), manual);
    assert.equal(emptyPlacementPositions(placementFor(manual, 13)), 5 * 2 + 8, 'a different field size starts a blank placement');
  });
});

describe('Cash Climb (V3) persistence', () => {
  it('saves and reloads the exact record', () => {
    const storage = memoryStorage();
    const store = cashClimbV3Store(storage);
    const record = created(24);
    assert.deepEqual(store.save(record), { error: null });
    store.setOpen(record.id);
    const reopened = cashClimbV3Store(storage);
    const loaded = reopened.load(reopened.openId());
    assert.equal(loaded.status, 'ok');
    assert.deepEqual(loaded.record, JSON.parse(JSON.stringify(record)));
    assert.equal(loaded.optimizerCurrent, true);
    assert.deepEqual(reopened.list().records.map((r) => r.id), [record.id]);
    assert.deepEqual(storage.keys().sort(), [CASH_CLIMB_V3_EVENTS_KEY, CASH_CLIMB_V3_OPEN_KEY].sort(), 'only Cash Climb (V3) keys are written');
    reopened.remove(record.id);
    assert.equal(reopened.load(record.id).status, 'missing');
    assert.equal(reopened.openId(), null);
  });

  it('round-trips results, the ledger and settlement without changing earnings', () => {
    const storage = memoryStorage();
    const store = cashClimbV3Store(storage);
    let record = startCashClimbV3Record(created(16, { fee: 100 }), { now: NOW });
    const first = record.event.order[0];
    const [a, b] = record.event.matches[first].slots.map((s) => s.entrant);
    record = { ...record, event: recordMatchResult(record.event, first, { outcome: 'completed', winner: a, loserRacks: 4 }).event };
    assert.deepEqual(store.save(record), { error: null });
    const mid = store.load(record.id).record;
    assert.deepEqual(mid.event.ledger, record.event.ledger);
    assert.deepEqual(ledgerSummary(mid.event.ledger).earnedByPlayer, ledgerSummary(record.event.ledger).earnedByPlayer);
    assert.ok(ledgerSummary(mid.event.ledger).earnedByPlayer[b] > 0, 'the opening loser keeps a score share');
    const done = { ...mid, status: 'completed', event: settleCashClimbV3(playOut(mid.event)) };
    assert.deepEqual(store.save(done), { error: null });
    const back = store.load(done.id).record;
    assert.deepEqual(back.event.settlement, done.event.settlement);
    assert.deepEqual(ledgerSummary(back.event.ledger), ledgerSummary(done.event.ledger));
    assert.equal(ledgerSummary(back.event.ledger).unsettledCents, 0);
  });

  it('never re-optimizes a saved ladder: an earlier optimizer id or a non-optimal valid ladder is kept', () => {
    const old = created(16, { fee: 100 });
    old.payout.optimizerId = 'cash-climb-v3-reference-2026-10';
    const r = restoreCashClimbV3Record(old);
    assert.equal(r.status, 'ok');
    assert.equal(r.optimizerCurrent, false);
    assert.deepEqual(r.record.payout.ladder, optimizerFor(16, 100).ladder);

    const locked = created(16, { fee: 100 });
    const ladder = [70, 130, 260];
    locked.payout.ladder = ladder;
    locked.event = JSON.parse(JSON.stringify(createCashClimbV3Event({
      id: locked.id, settings: locked.event.config, entrantIds: locked.players.map((p) => p.id), placement: locked.placement, ladder,
    })));
    const store = cashClimbV3Store(memoryStorage());
    assert.deepEqual(store.save(locked), { error: null });
    assert.deepEqual(store.load(locked.id).record.payout.ladder, ladder);
    assert.deepEqual(store.load(locked.id).record.event.ladder, ladder);
  });

  it('lists unreadable entries instead of dropping them, and never overwrites unreadable storage', () => {
    const good = created(8);
    const bad = { ...created(9, {}, 'bad'), schemaVersion: 2 };
    const storage = memoryStorage({ [CASH_CLIMB_V3_EVENTS_KEY]: JSON.stringify({ [good.id]: good, bad }) });
    const store = cashClimbV3Store(storage);
    const { records, invalid } = store.list();
    assert.deepEqual(records.map((r) => r.id), [good.id]);
    assert.deepEqual(invalid, [{ id: 'bad', problems: ['This tournament was saved by a newer version of the app. Update the app to open it.'] }]);
    const hub = listCashClimbV3HubEvents(store);
    assert.deepEqual(hub.map((h) => [h.id, h.kind, Boolean(h.invalid)]), [[good.id, 'cash-climb-v3', false], ['bad', 'cash-climb-v3', true]]);

    const corrupt = memoryStorage({ [CASH_CLIMB_V3_EVENTS_KEY]: '{not json' });
    const cs = cashClimbV3Store(corrupt);
    assert.equal(cs.list().invalid.length, 1);
    assert.ok(cs.save(good).error.includes('unreadable'));
    assert.equal(corrupt.getItem(CASH_CLIMB_V3_EVENTS_KEY), '{not json');
  });
});

describe('Cash Climb (V3) invalid or incompatible saved data', () => {
  const problemsOf = (mutate) => {
    const r = created(16, { fee: 100 });
    mutate(r);
    const out = restoreCashClimbV3Record(r);
    assert.equal(out.status, 'invalid');
    return out.problems;
  };

  it('rejects Cash Climb: King of the Hill and Cash Climb: Showdown records without converting them', () => {
    const koth = { id: 'cc-1', type: 'cash-climb', name: 'Old Friday', status: 'in-progress', players: [] };
    const showdown = { id: 'sd-1', type: 'cash-climb-showdown', name: 'Showdown', status: 'qualifying' };
    assert.deepEqual(restoreCashClimbV3Record(koth).problems, ['This is a Cash Climb: King of the Hill event. It cannot be opened as Cash Climb.']);
    assert.deepEqual(restoreCashClimbV3Record(showdown).problems, ['This is a Cash Climb: Showdown event. It cannot be opened as Cash Climb.']);
    const storage = memoryStorage({ 'frontrange-open-cash-climb': JSON.stringify(koth) });
    const store = cashClimbV3Store(storage);
    assert.ok(store.save(koth).error);
    assert.deepEqual(store.list(), { records: [], invalid: [] });
    assert.equal(storage.getItem('frontrange-open-cash-climb'), JSON.stringify(koth), 'the King of the Hill copy is untouched');
    assert.equal(koth.type, 'cash-climb');
  });

  it('rejects tampered money, structure and state', () => {
    assert.ok(problemsOf((r) => { r.payout.ladder = [...r.payout.ladder]; r.payout.ladder[0] += 1; }).some((p) => p.includes('does not match the event')));
    assert.ok(problemsOf((r) => { r.payout.ladder[0] += 1; r.event.ladder[0] += 1; }).some((p) => p.startsWith('Locked ladder:')));
    assert.ok(problemsOf((r) => { r.event.matches[r.event.order[0]].allocationCents += 100; }).some((p) => p.includes('allocations')));
    assert.ok(problemsOf((r) => { r.payout.prizePoolCents += 100; }).some((p) => p.includes('prize pool')));
    assert.ok(problemsOf((r) => { r.payout.reserves.mainDollars += 1; }).some((p) => p.includes('reserves')));
    assert.ok(problemsOf((r) => { r.payout.optimizerId = ''; }).some((p) => p.includes('optimizer id')));
    assert.ok(problemsOf((r) => { r.event.entrants.reverse(); }).some((p) => p.includes('entrants')));
    assert.ok(problemsOf((r) => { r.placement.main.reverse(); }).some((p) => p.includes('bracket order') || p.includes('matches')));
    assert.ok(problemsOf((r) => { r.event.id = 'other'; }).some((p) => p.includes('event id')));
    assert.ok(problemsOf((r) => { r.status = 'paused'; }).some((p) => p.includes('Unknown tournament status')));
    assert.ok(problemsOf((r) => { r.event.version = 2; }).some((p) => p.includes('engine version')));
    assert.ok(problemsOf((r) => { r.schemaVersion = 0; }).some((p) => p.includes('unsupported record version')));
    assert.ok(problemsOf((r) => { r.event.config = { ...r.event.config, entryFeeCents: 500 }; }).some((p) => p.includes('$10')));
    assert.ok(problemsOf((r) => { delete r.event; }).some((p) => p.includes('incomplete')));
    assert.deepEqual(restoreCashClimbV3Record(null).problems, ['The saved tournament is not readable.']);
  });

  it('rejects results in a setup record and matches the ledger does not know about', () => {
    const playedInSetup = created(16, { fee: 100 });
    const id = playedInSetup.event.order[0];
    const [a] = playedInSetup.event.matches[id].slots.map((s) => s.entrant);
    playedInSetup.event = recordMatchResult(playedInSetup.event, id, { outcome: 'completed', winner: a, loserRacks: 2 }).event;
    assert.ok(restoreCashClimbV3Record(playedInSetup).problems.includes('A tournament in setup cannot have results or earnings.'));
    assert.ok(problemsOf((r) => { r.status = 'in-progress'; r.event.matches[r.event.order[0]].status = 'completed'; }).some((p) => p.includes('disagree')));
  });
});

describe('Cash Climb (V3) lifecycle', () => {
  it('locks settings once started; unstarted records report no lock', () => {
    const record = created(16, { fee: 100 });
    assert.equal(cashClimbV3SetupLocked(record), false);
    assert.deepEqual(cashClimbV3SetupChangeProblems(record), []);
    const started = startCashClimbV3Record(record, { now: NOW });
    assert.equal(started.status, 'in-progress');
    assert.deepEqual(started.payout, record.payout, 'starting keeps the locked payout');
    assert.equal(cashClimbV3SetupLocked(started), true);
    assert.equal(cashClimbV3SetupChangeProblems(started).length, 1);
    assert.throws(() => startCashClimbV3Record(started), /Only a tournament in setup/);
    assert.equal(restoreCashClimbV3Record(started).status, 'ok');
  });

  it('builds a hub summary with the Cash Climb identity', () => {
    const s = cashClimbV3HubSummary(created(16, { fee: 100 }));
    assert.equal(s.kind, 'cash-climb-v3');
    assert.equal(s.type, 'cash-climb-v3');
    assert.equal(s.status, 'setup');
    assert.equal(s.prizePoolCents, 160000);
  });
});
