/**
 * Bank deposits vs money collected, per payment method:
 *   on hand = collected (methodTotals) − deposited (duezy_deposits rows).
 */
import { round2 } from './duezyMath.js';

/**
 * [{ method, collected, count, deposited, deposits, onHand }] — the league's accepted methods first (in their
 * order, even at $0), then any other method that has money or deposits (dropped methods, "not recorded").
 */
export function depositBalances(methods, totals, deposits) {
  const rows = new Map();
  const row = (method) => {
    if (!rows.has(method)) rows.set(method, { method, collected: 0, count: 0, deposited: 0, deposits: 0 });
    return rows.get(method);
  };
  methods.forEach(row);
  totals.forEach((t) => Object.assign(row(t.method), { collected: t.total, count: t.count }));
  deposits.forEach((d) => {
    const r = row(d.method);
    r.deposited = round2(r.deposited + (Number(d.amount) || 0));
    r.deposits += 1;
  });
  return [...rows.values()].map((r) => ({ ...r, onHand: round2(r.collected - r.deposited) }));
}

export function depositTotals(balances) {
  const sum = (k) => round2(balances.reduce((s, b) => s + b[k], 0));
  return { collected: sum('collected'), deposited: sum('deposited'), onHand: sum('onHand') };
}

/** Amount typed in the deposit form → number rounded to cents, or null if it isn't a positive amount. */
export function parseDepositAmount(raw) {
  const n = Number(String(raw ?? '').replace(/[$,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? round2(n) : null;
}
