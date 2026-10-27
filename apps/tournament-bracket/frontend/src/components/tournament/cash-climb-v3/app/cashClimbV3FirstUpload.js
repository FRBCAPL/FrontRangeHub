/**
 * What the operator reviews before the first upload of a Cash Climb (V3) tournament that was saved on this
 * tablet before cloud saving was in use. Read-only: nothing here changes the record.
 */
import { ledgerSummary } from '../cashClimbV3Ledger.js';

export const UPLOAD_DESTINATION = Object.freeze({
  live: 'Production cloud (the live Front Range Pool database)',
  isolated: 'Isolated test cloud (this browser only)',
});

export const STATUS_TEXT = Object.freeze({ setup: 'Setup (not started)', 'in-progress': 'In progress', completed: 'Settled (complete)' });

export function firstUploadSummary(record) {
  const { event, payout } = record;
  const posted = event.order.filter((id) => event.matches[id]?.status !== 'open').length;
  const earned = Object.values(ledgerSummary(event.ledger).earnedByPlayer).reduce((sum, c) => sum + c, 0);
  return {
    id: record.id,
    name: record.name,
    date: record.tournamentDate || '',
    entrants: record.players.map((p) => p.name),
    status: record.status,
    statusText: STATUS_TEXT[record.status] || record.status,
    resultsPosted: posted,
    matchCount: event.order.length,
    settled: Boolean(event.settlement),
    earnedCents: earned,
    prizePoolCents: payout.prizePoolCents,
    optimizerId: payout.optimizerId,
    payoutLocked: record.status !== 'setup',
  };
}
