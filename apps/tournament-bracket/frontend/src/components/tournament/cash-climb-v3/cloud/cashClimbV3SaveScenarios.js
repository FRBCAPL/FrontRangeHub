/**
 * Test-only save scenarios run unchanged against the fake cloud (client tests) and the real SQL functions
 * (supabase-migrations/tests), so the JavaScript rules and the database cannot drift apart.
 *
 * Each scenario: `chain(id)` records saved in order (each must succeed), then `incoming(last, id)` is saved
 * with `expected(revision)` (default: the current revision) and must give `code` ('' = accepted).
 */
import { exceptionalRecord, firstReady, post, setupRecord, settledRecord, startedRecord, T2 } from './cashClimbV3CloudTestKit.js';

const clone = (v) => JSON.parse(JSON.stringify(v));
const edit = (record, change) => { const r = clone(record); change(r); return r; };
const playedOnce = (id) => { const s = startedRecord(id, 8); return [s, post(s, firstReady(s))]; };

export const saveScenarios = [
  { name: 'creates a setup tournament', chain: () => [], incoming: (_, id) => setupRecord(id), code: '' },
  { name: 'edits setup before the start', chain: (id) => [setupRecord(id)], incoming: (last) => edit(last, (r) => { r.name = 'Renamed Cash Climb'; }), code: '' },
  { name: 'starts the tournament', chain: (id) => [setupRecord(id)], incoming: (_, id) => startedRecord(id, 8), code: '' },
  { name: 'posts a result', chain: (id) => [setupRecord(id), startedRecord(id, 8)], incoming: (last) => post(last, firstReady(last)), code: '' },
  { name: 'settles a finished tournament', chain: (id) => [setupRecord(id), startedRecord(id, 8)], incoming: (_, id) => settledRecord(id, 8), code: '' },
  { name: 'settles exceptionally', chain: (id) => [setupRecord(id), startedRecord(id, 8)], incoming: (_, id) => exceptionalRecord(id, 8), code: '' },
  {
    name: 'accepts a retried save that already succeeded (lost acknowledgment)',
    chain: (id) => [setupRecord(id)], incoming: (last) => clone(last), expected: (rev) => rev - 1, code: '', replayed: true,
  },
  {
    name: 'refuses a stale save from another device',
    chain: (id) => [setupRecord(id), edit(setupRecord(id), (r) => { r.name = 'Device A'; })],
    incoming: (_, id) => edit(setupRecord(id), (r) => { r.name = 'Device B'; }), expected: (rev) => rev - 1, code: 'stale-revision',
  },
  {
    name: 'refuses a different result for a posted match',
    chain: (id) => playedOnce(id),
    incoming: (_, id) => { const s = startedRecord(id, 8); return post(s, firstReady(s), { winnerSlot: 1 }); }, code: 'result-locked',
  },
  { name: 'refuses removing a ledger entry', chain: (id) => playedOnce(id), incoming: (last) => edit(last, (r) => { r.event.ledger.entries.pop(); }), code: 'ledger-locked' },
  { name: 'refuses changing a ledger amount', chain: (id) => playedOnce(id), incoming: (last) => edit(last, (r) => { r.event.ledger.entries[0].cents += 100; }), code: 'ledger-locked' },
  { name: 'refuses changing the locked payout ladder', chain: (id) => playedOnce(id), incoming: (last) => edit(last, (r) => { r.payout.ladder[0] += 1; }), code: 'locked' },
  { name: 'refuses changing the optimizer id', chain: (id) => playedOnce(id), incoming: (last) => edit(last, (r) => { r.payout.optimizerId = 'other-optimizer'; }), code: 'locked' },
  { name: 'refuses renaming a player after the start', chain: (id) => playedOnce(id), incoming: (last) => edit(last, (r) => { r.players[0].name = 'Someone Else'; }), code: 'locked' },
  { name: 'refuses changing a match allocation', chain: (id) => playedOnce(id), incoming: (last) => edit(last, (r) => { const m = r.event.order[0]; r.event.matches[m].allocationCents += 100; }), code: 'locked' },
  { name: 'refuses going back to setup', chain: (id) => [setupRecord(id), startedRecord(id, 8)], incoming: (_, id) => setupRecord(id), code: 'status-order' },
  { name: 'refuses jumping from setup to completed', chain: (id) => [setupRecord(id)], incoming: (_, id) => settledRecord(id, 8), code: 'status-order' },
  {
    name: 'refuses any change to a settled tournament',
    chain: (id) => [setupRecord(id), startedRecord(id, 8), settledRecord(id, 8)],
    incoming: (last) => edit(last, (r) => { r.updatedAt = '2026-11-07T00:00:00.000Z'; }), code: 'event-settled',
  },
  { name: 'refuses a newer record schema', chain: (id) => [setupRecord(id)], incoming: (last) => edit(last, (r) => { r.schemaVersion = 2; }), code: 'unsupported-format' },
  { name: 'refuses a newer engine version', chain: () => [], incoming: (_, id) => edit(setupRecord(id), (r) => { r.event.version = 2; }), code: 'unsupported-format' },
  { name: 'refuses another format', chain: () => [], incoming: (_, id) => edit(setupRecord(id), (r) => { r.type = 'cash-climb-showdown'; }), code: 'invalid-event' },
  { name: 'refuses a record whose event belongs to another tournament', chain: () => [], incoming: (_, id) => edit(setupRecord(id), (r) => { r.event.id = `${id}-other`; }), code: 'invalid-event' },
  {
    name: 'refuses duplicate ledger entries',
    chain: (id) => [setupRecord(id), startedRecord(id, 8)],
    incoming: (last) => edit(post(last, firstReady(last)), (r) => { r.event.ledger.entries.push(clone(r.event.ledger.entries[0])); }), code: 'invalid-event',
  },
  { name: 'refuses a completed tournament without a settlement', chain: () => [], incoming: (_, id) => edit(setupRecord(id), (r) => { r.status = 'completed'; }), code: 'invalid-event' },
  {
    name: 'refuses a setup tournament carrying earnings',
    chain: () => [],
    incoming: (_, id) => edit(setupRecord(id), (r) => { r.event.ledger.entries.push({ key: 'x:y:p1', matchId: 'x', type: 'y', playerId: 'p1', cents: 100 }); }), code: 'invalid-event',
  },
  { name: 'refuses a payload over the size limit', chain: () => [], incoming: (_, id) => ({ ...setupRecord(id), padding: 'x'.repeat(1000001) }), code: 'too-large' },
  { name: 'refuses updating an event the cloud does not have', chain: () => [], incoming: (_, id) => setupRecord(id), expected: () => 3, code: 'missing' },
  { name: 'accepts an identical save at the current revision without a new revision', chain: (id) => [setupRecord(id)], incoming: (last) => clone(last), code: '', sameRevision: true },
];

/**
 * Runs one scenario. `save(payload, expectedRevision)` → { code, revision, replayed }.
 * Returns { result, revision } where revision is the one before the final save.
 */
export async function runSaveScenario(scenario, id, save) {
  let revision = 0;
  let last = null;
  for (const record of scenario.chain(id)) {
    const r = await save(record, revision);
    if (r.code) throw new Error(`${scenario.name}: setup save refused (${r.code})`);
    revision = r.revision;
    last = record;
  }
  const incoming = scenario.incoming(last, id);
  const expected = scenario.expected ? scenario.expected(revision) : revision;
  return { result: await save(incoming, expected), revision };
}

export { T2 };
