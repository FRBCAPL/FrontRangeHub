/**
 * Live play for a saved Cash Climb (V3) record: start, match results and settlement. Every money and
 * progression decision is the engine's (recordMatchResult, settleCashClimbV3); this module only checks
 * the record's state, reports what the engine would post, and stamps the record.
 *
 * Each function returns { status: 'ok', ... } or { status: 'invalid' | 'duplicate' | 'not-ready', problems }.
 */
import { recordMatchResult } from '../cashClimbV3Progress.js';
import { settleCashClimbV3, settlementStatus } from '../cashClimbV3Settlement.js';
import { ledgerSummary } from '../cashClimbV3Ledger.js';
import { startCashClimbV3Record } from './cashClimbV3Record.js';
import { cashClimbV3RecordProblems } from './cashClimbV3RecordCheck.js';

const invalid = (problems) => ({ status: 'invalid', problems });
const newEntries = (before, after) => {
  const known = new Set(before.ledger.entries.map((e) => e.key));
  return after.ledger.entries.filter((e) => !known.has(e.key));
};

export const cashClimbV3ReadOnly = (record) => record?.status === 'completed';

/** Everything that blocks the start: configuration, entrants, placement, locked ladder, allocations, ledger. */
export function cashClimbV3StartProblems(record) {
  if (record?.status !== 'setup') return ['Only a tournament in setup can be started.'];
  return cashClimbV3RecordProblems(record);
}

/** Locks the draw, players, money settings and payout, and records the start time. */
export function startCashClimbV3Tournament(record, { now = new Date().toISOString() } = {}) {
  const problems = cashClimbV3StartProblems(record);
  if (problems.length) return invalid(problems);
  const started = startCashClimbV3Record(record, { now });
  const after = cashClimbV3RecordProblems(started);
  return after.length ? invalid(after) : { status: 'ok', record: started };
}

function attempt(record, matchId, submitted) {
  if (record?.status !== 'in-progress') {
    return invalid([cashClimbV3ReadOnly(record) ? 'This tournament is settled; results can no longer change.' : 'Start the tournament before entering results.']);
  }
  let out;
  try {
    out = recordMatchResult(record.event, matchId, submitted);
  } catch (err) {
    return invalid([err.message]);
  }
  if (!out.changed) return { status: 'duplicate', problems: ['This result is already posted.'] };
  const auto = out.autoResolved.map((id) => ({ id, status: out.event.matches[id].status, winner: out.event.matches[id].winner }));
  return { status: 'ok', event: out.event, result: out.event.matches[matchId].result, entries: newEntries(record.event, out.event), autoResolved: auto };
}

/** What posting the result would do: the engine's normalized result, the new payouts and automatic walkovers/voids. */
export function previewCashClimbV3Result(record, matchId, submitted) {
  const r = attempt(record, matchId, submitted);
  if (r.status !== 'ok') return r;
  const { event, ...preview } = r;
  return preview;
}

/** Posts a confirmed result. A repeated identical result is reported as a duplicate and changes nothing. */
export function postCashClimbV3Result(record, matchId, submitted, { now = new Date().toISOString() } = {}) {
  const r = attempt(record, matchId, submitted);
  if (r.status !== 'ok') return r;
  const { event, ...posted } = r;
  return { ...posted, record: { ...record, updatedAt: now, event } };
}

function settled(record) {
  if (cashClimbV3ReadOnly(record)) return { status: 'duplicate', problems: ['This tournament is already settled.'] };
  if (record?.status !== 'in-progress') return invalid(['Start the tournament before settling it.']);
  const s = settlementStatus(record.event);
  if (!s.ready) return { status: 'not-ready', problems: [s.reason] };
  try {
    const event = settleCashClimbV3(record.event);
    return { status: 'ok', event, mode: event.settlement.mode, settlement: event.settlement, entries: newEntries(record.event, event), summary: ledgerSummary(event.ledger) };
  } catch (err) {
    return invalid([err.message]);
  }
}

/** The final payout breakdown settlement would produce, without changing anything. */
export function previewCashClimbV3Settlement(record) {
  const r = settled(record);
  if (r.status !== 'ok') return r;
  const { event, ...preview } = r;
  return preview;
}

/** Settles once; the record becomes complete and read-only. */
export function settleCashClimbV3Record(record, { now = new Date().toISOString() } = {}) {
  const r = settled(record);
  if (r.status !== 'ok') return r;
  const { event, ...done } = r;
  return { ...done, record: { ...record, status: 'completed', completedAt: now, updatedAt: now, event } };
}
