/** One week's collected money split by how it came in: cash in hand vs each digital method. */
import { paidFor, round2 } from './duezyMath.js';

export const NOT_RECORDED = 'Not recorded';

const isCash = (method) => String(method || '').trim().toLowerCase() === 'cash';

/**
 * { cash: { total, count }, digital: [{ method, total, count }] largest first,
 *   unrecorded: { total, count }, total } for paid / partial entries in `week`.
 */
export function weekMethodTotals(teams, week, dues, paymentIndex) {
  const cash = { total: 0, count: 0 };
  const unrecorded = { total: 0, count: 0 };
  const byMethod = new Map();
  teams.forEach((t) => {
    const p = paymentIndex.get(`${t.id}:${week}`);
    const amount = paidFor(p, dues);
    if (!(amount > 0)) return;
    let bucket;
    if (isCash(p.method)) bucket = cash;
    else if (!p.method) bucket = unrecorded;
    else {
      bucket = byMethod.get(p.method) || { method: p.method, total: 0, count: 0 };
      byMethod.set(p.method, bucket);
    }
    bucket.total = round2(bucket.total + amount);
    bucket.count += 1;
  });
  const digital = [...byMethod.values()].sort((a, b) => b.total - a.total || a.method.localeCompare(b.method));
  const total = round2(cash.total + unrecorded.total + digital.reduce((s, d) => s + d.total, 0));
  return { cash, digital, unrecorded, total };
}
