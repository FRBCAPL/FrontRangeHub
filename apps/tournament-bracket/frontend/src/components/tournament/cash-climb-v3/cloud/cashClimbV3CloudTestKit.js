/**
 * Test-only builders of real Cash Climb (V3) records for the cloud tests (client and database). Every
 * record is made by the approved app layer and engine, never by hand, so the payloads are exactly what
 * the app would save. Never used by the app.
 */
import { createCashClimbV3Record } from '../app/cashClimbV3Record.js';
import { postCashClimbV3Result, settleCashClimbV3Record, startCashClimbV3Tournament } from '../app/cashClimbV3Play.js';
import { randomPlacement } from '../app/cashClimbV3Draw.js';
import { seededRandomInt } from '../app/cashClimbV3AppTestKit.js';
import { matchOccupants, readyMatchIds } from '../cashClimbV3Progress.js';

export const T0 = '2026-11-06T19:00:00.000Z';
export const T1 = '2026-11-06T20:00:00.000Z';
export const T2 = '2026-11-06T21:00:00.000Z';

const must = (r, what) => {
  if (r.status !== 'ok' && r.status !== 'valid') throw new Error(`${what}: ${(r.problems || []).join(' ')}`);
  return r.record;
};

export function setupInput(n, { seed = 1, fee = 20, name = 'Friday Cash Climb' } = {}) {
  const players = Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
  return {
    name, tournamentDate: '2026-11-06', players,
    entryFeeCents: fee * 100, addedMoneyCents: 0, raceTo: 7, rules: { game: '9-Ball', notes: '' },
    placement: randomPlacement(players.map((p) => p.id), seededRandomInt(seed)), draw: { adjusted: false },
  };
}

export const setupRecord = (id = 'ccv3-cloud-1', n = 8, opts = {}) => must(createCashClimbV3Record(setupInput(n, opts), { id, now: T0 }), 'create');
export const startedRecord = (id, n, opts) => must(startCashClimbV3Tournament(setupRecord(id, n, opts), { now: T1 }), 'start');

export const seated = (record, matchId) => matchOccupants(record.event, matchId).map((o) => o.id);

/** Posts one confirmed result through the app layer. `winnerSlot` 0 or 1. */
export function post(record, matchId, { winnerSlot = 0, loserRacks = 3, now = T2 } = {}) {
  const winner = seated(record, matchId)[winnerSlot];
  return must(postCashClimbV3Result(record, matchId, { outcome: 'completed', winner, loserRacks }, { now }), `post ${matchId}`);
}

export const firstReady = (record) => readyMatchIds(record.event)[0];

/** Plays `count` ready matches (or all when count is Infinity), slot-0 winners. */
export function playMatches(record, count = Infinity) {
  let r = record;
  for (let i = 0; i < count; i += 1) {
    const id = firstReady(r);
    if (!id) break;
    r = post(r, id);
  }
  return r;
}

export const settledRecord = (id, n, opts) => must(settleCashClimbV3Record(playMatches(startedRecord(id, n, opts)), { now: T2 }), 'settle');

/** A started 8-player tournament whose championship is decided by a forfeit (exceptional settlement). */
export function exceptionalRecord(id = 'ccv3-exceptional', n = 8) {
  let r = startedRecord(id, n);
  for (let next = firstReady(r); next; next = firstReady(r)) {
    if (r.event.matches[next].championship) {
      const ids = seated(r, next);
      r = must(postCashClimbV3Result(r, next, { outcome: 'forfeit', forfeiting: ids[1] }, { now: T2 }), 'forfeit final');
    } else r = post(r, next);
  }
  return must(settleCashClimbV3Record(r, { now: T2 }), 'settle exceptional');
}
