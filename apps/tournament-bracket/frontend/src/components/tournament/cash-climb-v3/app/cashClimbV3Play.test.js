import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCashClimbV3Record, updateCashClimbV3Setup, cashClimbV3PayoutPreview, settingsFromSetup, cashClimbV3SetupLocked } from './cashClimbV3Record.js';
import { cashClimbV3RecordProblems, restoreCashClimbV3Record } from './cashClimbV3RecordCheck.js';
import { cashClimbV3Store } from './cashClimbV3Store.js';
import { randomPlacement, swapEntrants } from './cashClimbV3Draw.js';
import {
  cashClimbV3ReadOnly, cashClimbV3StartProblems, postCashClimbV3Result, previewCashClimbV3Result, previewCashClimbV3Settlement,
  settleCashClimbV3Record, startCashClimbV3Tournament,
} from './cashClimbV3Play.js';
import { seededRandomInt, memoryStorage } from './cashClimbV3AppTestKit.js';
import { matchOccupants, readyMatchIds, recordMatchResult } from '../cashClimbV3Progress.js';
import { ledgerProblems, ledgerSummary } from '../cashClimbV3Ledger.js';
import { roundHalfUpRatio } from '../cashClimbV3Money.js';

const NOW = '2026-10-30T19:00:00.000Z';
const LATER = '2026-10-30T23:00:00.000Z';

function setupFor(n, { fee = 20, added = 0, raceTo = 7, seed = 1 } = {}) {
  const players = Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
  return {
    name: 'Friday Cash Climb', tournamentDate: '2026-10-30', players,
    entryFeeCents: fee * 100, addedMoneyCents: added * 100, raceTo, rules: { game: '9-Ball', notes: '' },
    placement: randomPlacement(players.map((p) => p.id), seededRandomInt(seed)), draw: { adjusted: false },
  };
}
const newRecord = (n, opts) => {
  const r = createCashClimbV3Record(setupFor(n, opts), { id: `t${n}`, now: NOW });
  assert.equal(r.status, 'valid', r.problems?.join(' '));
  return r.record;
};
const started = (n, opts) => {
  const r = startCashClimbV3Tournament(newRecord(n, opts), { now: NOW });
  assert.equal(r.status, 'ok', r.problems?.join(' '));
  return r.record;
};
const seated = (record, id) => matchOccupants(record.event, id).map((o) => o.id);
const earned = (record) => ledgerSummary(record.event.ledger).earnedByPlayer;

/** Posts through the app layer and checks it matches the engine exactly, reconciles and restores. */
function post(record, matchId, submitted) {
  const preview = previewCashClimbV3Result(record, matchId, submitted);
  const r = postCashClimbV3Result(record, matchId, submitted, { now: LATER });
  assert.equal(r.status, 'ok', r.problems?.join(' '));
  assert.deepEqual(r.event, undefined, 'the raw engine event is not leaked separately');
  assert.deepEqual(preview.entries, r.entries, 'the preview shows exactly what is posted');
  assert.deepEqual(r.record.event, recordMatchResult(record.event, matchId, submitted).event, 'posted state is the engine\'s');
  assert.deepEqual(ledgerProblems(r.record.event.ledger), []);
  assert.deepEqual(cashClimbV3RecordProblems(r.record), []);
  const before = earned(record);
  Object.entries(before).forEach(([id, cents]) => assert.ok(earned(r.record)[id] >= cents, 'earned payouts are never reduced'));
  return r;
}
const win = (record, id, winnerSlot = 0, loserRacks = 3) => post(record, id, { outcome: 'completed', winner: seated(record, id)[winnerSlot], loserRacks }).record;
function playAll(record, decide) {
  let r = record;
  for (let ready = readyMatchIds(r.event); ready.length; ready = readyMatchIds(r.event)) {
    ready.forEach((id) => { r = decide ? post(r, id, decide(r, id, seated(r, id))).record : win(r, id); });
  }
  return r;
}

describe('Cash Climb (V3) draw before the start', () => {
  it('saves the random draw without starting; the draw can be adjusted and the payout is kept', () => {
    const record = newRecord(12);
    assert.equal(record.status, 'setup');
    assert.deepEqual(record.draw, { method: 'random', adjusted: false });
    assert.equal(cashClimbV3SetupLocked(record), false, 'saving does not make the draw official');
    const store = cashClimbV3Store(memoryStorage());
    assert.deepEqual(store.save(record), { error: null });
    assert.deepEqual(store.load(record.id).record.placement, record.placement, 'the draw persists exactly');
    const [a, b] = [record.placement.preliminary[0][0], record.placement.main.find((s) => 'entrant' in s).entrant];
    const swapped = swapEntrants(record.placement, a, b);
    const edited = updateCashClimbV3Setup(record, { ...setupFor(12), placement: swapped, draw: { adjusted: true } }, { now: LATER });
    assert.equal(edited.status, 'valid', edited.problems?.join(' '));
    assert.deepEqual(edited.record.placement, swapped);
    assert.deepEqual(edited.record.draw, { method: 'random', adjusted: true });
    assert.deepEqual(edited.record.payout, record.payout, 'unchanged money settings keep the payout exactly');
    assert.equal(edited.record.createdAt, NOW);
    assert.equal(edited.record.updatedAt, LATER);
    assert.deepEqual(store.save(edited.record), { error: null });
    assert.deepEqual(store.load(record.id).record, JSON.parse(JSON.stringify(edited.record)));
  });

  it('never re-optimizes an unchanged payout; changed money settings get the production optimizer\'s payout', () => {
    const record = newRecord(16, { fee: 100 });
    record.payout.optimizerId = 'cash-climb-v3-reference-2026-10';
    const renamed = updateCashClimbV3Setup(record, { ...setupFor(16, { fee: 100 }), name: 'Renamed' });
    assert.equal(renamed.record.payout.optimizerId, 'cash-climb-v3-reference-2026-10');
    const pricier = setupFor(16, { fee: 120 });
    const repriced = updateCashClimbV3Setup(record, pricier);
    const fresh = cashClimbV3PayoutPreview(settingsFromSetup(pricier));
    assert.deepEqual(repriced.record.payout.ladder, fresh.ladder);
    assert.equal(repriced.record.payout.optimizerId, fresh.optimizerId);
    assert.equal(repriced.record.payout.prizePoolCents, 1920 * 100);
  });
});

describe('Cash Climb (V3) start', () => {
  it('validates, locks the draw, players, money and payout, and records the start time', () => {
    const record = newRecord(24);
    assert.deepEqual(cashClimbV3StartProblems(record), []);
    const r = startCashClimbV3Tournament(record, { now: NOW });
    assert.equal(r.status, 'ok');
    assert.equal(r.record.status, 'in-progress');
    assert.equal(r.record.startedAt, NOW);
    assert.deepEqual(r.record.payout, record.payout);
    assert.deepEqual(r.record.placement, record.placement);
    assert.equal(r.record.payout.optimizerId, record.payout.optimizerId);
    assert.equal(cashClimbV3SetupLocked(r.record), true);
    assert.equal(updateCashClimbV3Setup(r.record, setupFor(24)).status, 'invalid');
    assert.equal(startCashClimbV3Tournament(r.record).status, 'invalid');
    assert.deepEqual(restoreCashClimbV3Record(r.record).status, 'ok');
  });

  it('refuses to start a record with an invalid placement, ladder or ledger', () => {
    const badPlacement = newRecord(12);
    badPlacement.placement.preliminary[0][0] = badPlacement.placement.preliminary[0][1];
    assert.ok(cashClimbV3StartProblems(badPlacement).length);
    assert.equal(startCashClimbV3Tournament(badPlacement).status, 'invalid');
    const badLadder = newRecord(12);
    badLadder.payout.ladder[0] += 1;
    assert.equal(startCashClimbV3Tournament(badLadder).status, 'invalid');
    const badLedger = newRecord(12);
    badLedger.event.ledger.allocations[badLedger.event.order[0]].cents += 100;
    assert.equal(startCashClimbV3Tournament(badLedger).status, 'invalid');
    assert.equal(postCashClimbV3Result(newRecord(8), 'O1', { outcome: 'double-forfeit' }).status, 'invalid', 'no results before the start');
  });
});

describe('Cash Climb (V3) live play', () => {
  it('plays a complete 24-player tournament with preliminary advancement and a normal 80/20 settlement', () => {
    const storage = memoryStorage();
    const store = cashClimbV3Store(storage);
    let record = started(24, { fee: 50 });
    const p1 = record.event.matches.P1;
    const fed = p1.feedsTo;
    assert.equal(matchOccupants(record.event, fed.matchId)[fed.slot].kind, 'pending');
    record = win(record, 'P1', 1, 5);
    assert.deepEqual(matchOccupants(record.event, fed.matchId)[fed.slot], { kind: 'player', id: record.event.matches.P1.winner }, 'the preliminary winner fills its opening position');
    record = playAll(record);
    assert.deepEqual(store.save(record), { error: null });
    record = store.load(record.id).record;
    const preview = previewCashClimbV3Settlement(record);
    assert.equal(preview.status, 'ok');
    assert.equal(preview.mode, 'normal');
    const before = ledgerSummary(record.event.ledger).unawardedCents;
    const done = settleCashClimbV3Record(record, { now: LATER });
    assert.equal(done.status, 'ok');
    assert.deepEqual(done.entries, preview.entries, 'the reviewed breakdown is what settles');
    const champion = done.entries.find((e) => e.type === 'finalist-bonus-champion')?.cents ?? 0;
    assert.equal(champion, roundHalfUpRatio(4 * (before / 100), 5) * 100);
    assert.equal(done.entries.reduce((a, e) => a + e.cents, 0), before);
    const s = ledgerSummary(done.record.event.ledger);
    assert.equal(s.unsettledCents, 0);
    assert.equal(s.earnedCents, s.prizePoolCents);
    assert.equal(done.record.status, 'completed');
    assert.equal(done.record.completedAt, LATER);
    assert.deepEqual(store.save(done.record), { error: null });
    const back = store.load(record.id);
    assert.equal(back.status, 'ok');
    assert.deepEqual(back.record, JSON.parse(JSON.stringify(done.record)), 'settlement survives reload exactly');
  });

  it('prevents duplicate results and rejects changes to posted results', () => {
    let record = started(8);
    const [a, b] = seated(record, 'O1');
    record = post(record, 'O1', { outcome: 'completed', winner: a, loserRacks: 2 }).record;
    const again = postCashClimbV3Result(record, 'O1', { outcome: 'completed', winner: a, loserRacks: 2 });
    assert.equal(again.status, 'duplicate');
    assert.equal(again.record, undefined, 'nothing to save');
    const changed = postCashClimbV3Result(record, 'O1', { outcome: 'completed', winner: b, loserRacks: 2 });
    assert.equal(changed.status, 'invalid');
    assert.match(changed.problems[0], /already has a result/);
    assert.match(postCashClimbV3Result(record, 'L1-1', { outcome: 'double-forfeit' }).problems[0], /not ready/);
    assert.match(previewCashClimbV3Result(record, 'O2', { outcome: 'completed', winner: seated(record, 'O2')[0], loserRacks: 7 }).problems[0], /0 to 6/);
  });

  it('handles forfeits, withdrawals, automatic walkovers and an exceptional (walkover) championship', () => {
    let record = started(8, { fee: 20 });
    const reserve = record.event.matches.O1.allocationCents;
    const [o1a, o1b] = seated(record, 'O1');
    let r = post(record, 'O1', { outcome: 'forfeit', forfeiting: o1b });
    assert.deepEqual(r.entries.map((e) => [e.playerId, e.type, e.cents]), [[o1a, 'forfeit-award', roundHalfUpRatio(reserve / 100, 2) * 100]]);
    record = r.record;
    const [o2a, o2b] = seated(record, 'O2');
    r = post(record, 'O2', { outcome: 'withdrawal', withdrawing: o2a, racks: { [o2a]: 3, [o2b]: 2 } });
    assert.deepEqual(r.entries.map((e) => e.type), ['rack-earnings', 'rack-earnings']);
    assert.equal(r.record.event.matches.O2.winner, o2b);
    record = post(r.record, 'O3', { outcome: 'double-forfeit' }).record;
    r = post(record, 'O4', { outcome: 'completed', winner: seated(record, 'O4')[0], loserRacks: 6 });
    assert.deepEqual(r.autoResolved.map((a) => [a.id, a.status]), [['L1-2', 'walkover']], 'the semifinal with a vacant position resolves itself');
    assert.ok(r.entries.some((e) => e.matchId === 'L1-2' && e.type === 'walkover-award'));
    record = r.record;
    r = post(record, 'L1-1', { outcome: 'double-withdrawal', racks: { [o1a]: 1, [o2b]: 2 } });
    assert.deepEqual(r.autoResolved.map((a) => [a.id, a.status]), [['L2-1', 'walkover']]);
    record = r.record;
    const unawarded = ledgerSummary(record.event.ledger).unawardedCents;
    const done = settleCashClimbV3Record(record, { now: LATER });
    assert.equal(done.mode, 'exceptional');
    assert.equal(done.settlement.championBasis, 'walkover');
    assert.equal(done.settlement.operatorRetainedCents, unawarded);
    assert.deepEqual(done.entries, [], 'no finalist bonuses');
    assert.equal(ledgerSummary(done.record.event.ledger).unsettledCents, 0);
  });

  it('voids a match with both positions vacant', () => {
    let record = started(8);
    record = post(record, 'O1', { outcome: 'double-forfeit' }).record;
    const r = post(record, 'O2', { outcome: 'double-forfeit' });
    assert.deepEqual(r.autoResolved.map((a) => [a.id, a.status]), [['L1-1', 'void']]);
    assert.deepEqual(r.entries, [], 'nobody is paid for a void');
    record = playAll(r.record);
    assert.equal(record.event.matches['L2-1'].status, 'walkover');
    assert.equal(settleCashClimbV3Record(record).mode, 'exceptional');
  });

  for (const [label, outcome, basis, champion] of [
    ['a championship pre-match forfeit', (ids) => ({ outcome: 'forfeit', forfeiting: ids[1] }), 'forfeit', true],
    ['an interrupted championship (one withdrawal)', (ids) => ({ outcome: 'withdrawal', withdrawing: ids[1], racks: { [ids[0]]: 4, [ids[1]]: 5 } }), 'withdrawal', true],
    ['a zero-survivor championship (double withdrawal)', (ids) => ({ outcome: 'double-withdrawal', racks: { [ids[0]]: 2, [ids[1]]: 2 } }), null, false],
  ]) {
    it(`settles ${label} exceptionally`, () => {
      let record = playAll(started(16, { fee: 30 }), (rec, id, ids) => (rec.event.matches[id].championship ? outcome(ids) : { outcome: 'completed', winner: ids[0], loserRacks: 4 }));
      const ids = seated(record, record.event.championshipId);
      const unawarded = ledgerSummary(record.event.ledger).unawardedCents;
      const done = settleCashClimbV3Record(record, { now: LATER });
      assert.equal(done.mode, 'exceptional');
      assert.equal(done.settlement.championBasis, basis);
      assert.equal(done.settlement.championId, champion ? ids[0] : null);
      assert.equal(done.settlement.operatorRetainedCents, unawarded);
      assert.equal(ledgerSummary(done.record.event.ledger).unsettledCents, 0);
      record = done.record;
      assert.equal(restoreCashClimbV3Record(record).status, 'ok');
    });
  }
});

describe('Cash Climb (V3) settled tournaments and saved results', () => {
  it('makes a settled tournament read-only and refuses a second settlement', () => {
    const done = settleCashClimbV3Record(playAll(started(8)), { now: LATER }).record;
    assert.equal(cashClimbV3ReadOnly(done), true);
    assert.equal(postCashClimbV3Result(done, 'O1', { outcome: 'double-forfeit' }).status, 'invalid');
    assert.equal(settleCashClimbV3Record(done).status, 'duplicate');
    assert.equal(previewCashClimbV3Settlement(done).status, 'duplicate');
    assert.equal(updateCashClimbV3Setup(done, setupFor(8)).status, 'invalid');
    assert.equal(startCashClimbV3Tournament(done).status, 'invalid');
    assert.equal(settleCashClimbV3Record(started(8)).status, 'not-ready');
  });

  it('restores mid-tournament results exactly and rejects tampered results, payouts or settlement state', () => {
    let record = started(12, { fee: 40 });
    record = win(record, 'P1');
    record = post(record, 'P2', { outcome: 'withdrawal', withdrawing: seated(record, 'P2')[0], racks: { [seated(record, 'P2')[0]]: 2, [seated(record, 'P2')[1]]: 1 } }).record;
    const store = cashClimbV3Store(memoryStorage());
    assert.deepEqual(store.save(record), { error: null });
    assert.deepEqual(store.load(record.id).record, JSON.parse(JSON.stringify(record)));
    const tamper = (mutate) => {
      const copy = structuredClone(record);
      mutate(copy);
      return restoreCashClimbV3Record(copy);
    };
    assert.equal(tamper((r) => { r.event.matches.P1.result.loserRacks = 0; }).status, 'invalid', 'a changed score no longer matches its payouts');
    assert.equal(tamper((r) => { r.event.ledger.entries[0].playerId = r.event.ledger.entries[1].playerId === r.event.ledger.entries[0].playerId ? 'p12' : r.event.ledger.entries[1].playerId; }).status, 'invalid');
    assert.equal(tamper((r) => { const e = r.event.ledger.entries[0]; e.key = `${e.key}-x`; }).status, 'invalid');
    assert.equal(tamper((r) => { r.status = 'completed'; }).status, 'invalid', 'complete without settlement');
    const settled = settleCashClimbV3Record(playAll(record)).record;
    assert.equal(restoreCashClimbV3Record({ ...settled, status: 'in-progress' }).status, 'invalid', 'settled but not complete');
    assert.equal(restoreCashClimbV3Record({ ...settled, draw: { method: 'magic' } }).status, 'invalid');
    assert.equal(store.save({ ...record, event: { ...record.event, settlement: { mode: 'normal' } } }).error.length > 0, true, 'invalid records are never saved');
  });
});
