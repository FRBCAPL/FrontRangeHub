/**
 * After a shipped item goes out: the buyer confirms it arrived as described, or reports a problem
 * (buyer_consignment_shipment in consignment-shipping-acceptance-2026-11.sql). Mirrors the SQL rules.
 */
import { DEFAULT_COMPLAINT_DAYS } from './consignmentShipping.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const problemOpen = (s) => Boolean(s?.problem_reported_at) && !s?.problem_resolved_at;

/** When the report-a-problem window ends, or null while it hasn't started (not delivered yet). */
export function problemWindowEndsAt(s, complaintDays = DEFAULT_COMPLAINT_DAYS) {
  if (!s?.arrived_at) return null;
  const at = new Date(s.arrived_at).getTime();
  return Number.isFinite(at) ? new Date(at + Number(complaintDays || DEFAULT_COMPLAINT_DAYS) * DAY_MS) : null;
}

/** { accept, problem }: which buttons the buyer gets on a shipped order. */
export function buyerShipActions(s, complaintDays = DEFAULT_COMPLAINT_DAYS, now = Date.now()) {
  const none = { accept: false, problem: false };
  if (!s || !['shipped', 'arrived'].includes(s.status) || s.buyer_accepted_at || problemOpen(s)) return none;
  const ends = problemWindowEndsAt(s, complaintDays);
  const inWindow = s.status === 'shipped' || (ends != null && ends.getTime() >= now);
  return { accept: true, problem: inWindow };
}

/** The line under a shipped order on the buyer's page, or '' when there's nothing to add. */
export function buyerShipNote(s) {
  if (!s) return '';
  if (s.buyer_accepted_at) return 'You confirmed it arrived as described. Thanks!';
  if (problemOpen(s)) return `You reported a problem${s.problem_note ? `: “${s.problem_note}”` : ''}. FRPL will contact you.`;
  if (s.problem_resolution === 'refunded') return 'FRPL resolved your report with a refund.';
  if (s.problem_resolution === 'pay_seller') return 'FRPL resolved your report.';
  return '';
}

/** Admin badge for a shipped order: accepted / problem / resolved, or null. */
export function adminShipFlag(s) {
  if (problemOpen(s)) return { tone: 'problem', text: 'Problem reported' };
  if (s?.problem_resolution === 'refunded') return { tone: 'done', text: 'Problem resolved · refunded' };
  if (s?.problem_resolution === 'pay_seller') return { tone: 'ok', text: 'Problem resolved · pay seller' };
  if (s?.buyer_accepted_at) return { tone: 'ok', text: 'Buyer confirmed it’s as described' };
  return null;
}
