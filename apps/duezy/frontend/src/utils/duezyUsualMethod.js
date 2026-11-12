/**
 * Quick pay on a team row: how this team usually pays, learned from its recent weeks.
 * Most used method in the last few recorded payments (ties → the most recent), and who usually sends it.
 * No history (or a method the league dropped) → the league's default method.
 */
import { round2 } from './duezyMath.js';
import { defaultMethod, leagueMethods } from './duezyLeaguePrefs.js';
import { asksWhoPaid } from './duezyPayers.js';
import { isSplit } from './duezySplits.js';

export const LOOKBACK = 6;

/** The method (and payer) that brought in most of a week's money; null when no method was recorded. */
function mainPart(p) {
  if (isSplit(p)) {
    const top = [...p.splits].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))[0];
    return top?.method ? { method: top.method, paid_by: top.paid_by || null } : null;
  }
  return p.method ? { method: p.method, paid_by: p.paid_by || null } : null;
}

/** Most recent first: [{ method, paid_by }] for up to LOOKBACK paid / partial weeks before `week`. */
export function recentParts(teamId, week, paymentIndex) {
  const out = [];
  for (let w = week - 1; w >= 1 && out.length < LOOKBACK; w -= 1) {
    const p = paymentIndex.get(`${teamId}:${w}`);
    if (p?.status !== 'paid' && p?.status !== 'partial') continue;
    const part = mainPart(p);
    if (part) out.push(part);
  }
  return out;
}

/** The value seen most often; a tie goes to whichever was seen first (= most recent). */
function mostCommon(values) {
  const counts = new Map();
  values.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  let best = null;
  values.forEach((v) => { if (best === null || counts.get(v) > counts.get(best)) best = v; });
  return best;
}

/**
 * { method, paid_by, learned } for the quick-pay button. paid_by is only filled in when the same person
 * sent most of this team's payments by that method — otherwise the button asks who paid.
 */
export function usualPay(league, teamId, week, paymentIndex) {
  const methods = leagueMethods(league);
  const parts = recentParts(teamId, week, paymentIndex).filter((p) => methods.includes(p.method));
  if (!parts.length) return { method: defaultMethod(league), paid_by: null, learned: false };
  const method = mostCommon(parts.map((p) => p.method));
  if (!asksWhoPaid(method)) return { method, paid_by: null, learned: true };
  const byMethod = parts.filter((p) => p.method === method);
  const payer = mostCommon(byMethod.map((p) => p.paid_by || ''));
  const usual = payer && byMethod.filter((p) => (p.paid_by || '') === payer).length * 2 > byMethod.length;
  return { method, paid_by: usual ? payer : null, learned: true };
}

/** What still needs collecting this week for quick pay; 0 = nothing to do (paid in full or a bye). */
export function quickPayAmount(payment, dues) {
  const status = payment?.status || 'unpaid';
  if (status === 'paid' || status === 'bye') return 0;
  if (status === 'partial') return Math.max(0, round2(dues - (Number(payment.amount) || 0)));
  return dues;
}
