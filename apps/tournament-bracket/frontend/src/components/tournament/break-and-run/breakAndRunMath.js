export function money(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100) / 100;
}

export function toCents(n) {
  return Math.round(money(n) * 100);
}

export function fromCents(cents) {
  return money((Number(cents) || 0) / 100);
}

export function formatMoney(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
}

export function parsePercent(value, fallback = 80) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

export function parseBallCount(value, fallback = 9) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(30, n);
}

export function equalPercents(ballCount) {
  const n = parseBallCount(ballCount);
  const base = money(100 / n);
  const percents = Array.from({ length: n }, () => base);
  percents[n - 1] = money(100 - base * (n - 1));
  return percents;
}

export function sanitizePercents(ballCount, percents) {
  const n = parseBallCount(ballCount);
  if (!Array.isArray(percents) || percents.length !== n) return equalPercents(n);
  const next = percents.map((p) => {
    const v = Number(p);
    return Number.isFinite(v) && v >= 0 ? money(v) : 0;
  });
  const sum = money(next.reduce((a, b) => a + b, 0));
  if (sum <= 0) return equalPercents(n);
  return next;
}

export function percentSum(percents) {
  return money((percents || []).reduce((a, b) => a + (Number(b) || 0), 0));
}

export function payoutPoolCents(potCents, payoutPercent) {
  const pot = Math.max(0, Math.round(Number(potCents) || 0));
  const pct = parsePercent(payoutPercent, 80);
  return Math.round((pot * pct) / 100);
}

/** Split cents by weights. Equal weights send leftover pennies to later balls. */
export function splitByWeights(totalCents, weights, leftoverToLast = false) {
  const n = Array.isArray(weights) ? weights.length : 0;
  if (!n) return [];
  const total = Math.max(0, Math.round(Number(totalCents) || 0));
  const safe = weights.map((w) => Math.max(0, Number(w) || 0));
  const sum = safe.reduce((a, b) => a + b, 0);
  if (total <= 0 || sum <= 0) return Array(n).fill(0);

  const raw = safe.map((w) => (w / sum) * total);
  const floors = raw.map((x) => Math.floor(x + 1e-9));
  let left = total - floors.reduce((a, b) => a + b, 0);
  const cents = [...floors];
  if (leftoverToLast) {
    for (let k = 0; k < left; k += 1) cents[n - 1 - (k % n)] += 1;
    return cents;
  }
  const order = raw
    .map((x, i) => ({ i, frac: x - Math.floor(x + 1e-9) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; k < left; k += 1) cents[order[k % n].i] += 1;
  return cents;
}

export function ballPayoutCents(potCents, payoutPercent, { shareMode, ballCount, ballPercents } = {}) {
  const n = parseBallCount(ballCount);
  const pool = payoutPoolCents(potCents, payoutPercent);
  if (shareMode === 'custom') {
    return splitByWeights(pool, sanitizePercents(n, ballPercents), false);
  }
  return splitByWeights(pool, Array.from({ length: n }, () => 1), true);
}

export function payoutForBallsCents(ballCents, ballsMade) {
  const list = Array.isArray(ballCents) ? ballCents : [];
  const n = Math.max(0, Math.min(list.length, Math.round(Number(ballsMade) || 0)));
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += list[i];
  return sum;
}

export function potView({
  currentPot,
  payoutPercent,
  shareMode,
  ballCount,
  ballPercents,
} = {}) {
  const potCents = toCents(currentPot);
  const poolCents = payoutPoolCents(potCents, payoutPercent);
  const balls = ballPayoutCents(potCents, payoutPercent, { shareMode, ballCount, ballPercents });
  return {
    currentPot: fromCents(potCents),
    payoutPool: fromCents(poolCents),
    remainder: fromCents(potCents - poolCents),
    ballPayouts: balls.map(fromCents),
    fullRunPays: fromCents(poolCents),
  };
}
