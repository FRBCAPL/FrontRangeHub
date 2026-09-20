export function suggestedPaidPlaces(teams) {
  const n = Number(teams) || 0;
  if (n < 1) return 0;
  if (n <= 4) return 1;
  if (n <= 6) return 2;
  if (n <= 8) return 3;
  if (n <= 12) return 4;
  if (n <= 16) return 5;
  return Math.min(8, Math.max(5, Math.floor(n / 3)));
}

const DEFAULT_SPLITS = {
  1: [100],
  2: [65, 35],
  3: [50, 30, 20],
  4: [40, 30, 20, 10],
  5: [35, 25, 20, 12, 8],
  6: [30, 22, 18, 12, 10, 8],
  7: [28, 20, 16, 12, 10, 8, 6],
  8: [25, 18, 15, 12, 10, 8, 7, 5],
};

export function defaultPlacePercents(places) {
  const count = Number(places) || 0;
  if (count < 1) return [];
  if (DEFAULT_SPLITS[count]) return DEFAULT_SPLITS[count].slice();
  const even = Math.floor(100 / count);
  const percents = Array.from({ length: count }, () => even);
  percents[0] += 100 - even * count;
  return percents;
}

export function placePayoutLabel(index) {
  const n = index + 1;
  const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
  return `${n}${suffix}`;
}

export function parsePayoutPercent(value) {
  const n = Number(String(value ?? '').trim());
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

export const USAPL_PAYOUT_SOURCES = [
  { id: 'prize', label: 'Prize fund' },
  { id: 'dues', label: 'All dues collected' },
  { id: 'custom', label: 'Set amount from dues' },
];

export function resolvePayoutBase({ source, prizeCents, grossCents, customCents }) {
  const prize = Math.max(0, Math.round(Number(prizeCents) || 0));
  const gross = Math.max(0, Math.round(Number(grossCents) || 0));
  const custom = Math.max(0, Math.round(Number(customCents) || 0));
  const id = source === 'dues' || source === 'custom' ? source : 'prize';
  if (id === 'prize') {
    return { source: id, base_cents: prize, cap_cents: prize, label: 'Prize fund' };
  }
  if (id === 'dues') {
    return { source: id, base_cents: gross, cap_cents: gross, label: 'Dues collected' };
  }
  if (custom > gross) {
    throw new Error('That dollar amount cannot be more than dues collected from this division.');
  }
  return { source: id, base_cents: custom, cap_cents: gross, label: 'Set amount from dues' };
}

export function simulateCashPayout({
  prizeCents,
  grossCents,
  customCents,
  source,
  cashPercent,
  placePercents,
}) {
  const base = resolvePayoutBase({
    source,
    prizeCents,
    grossCents: grossCents ?? prizeCents,
    customCents,
  });
  const cashPct = parsePayoutPercent(cashPercent);
  if (cashPct == null) {
    throw new Error('Cash payout percent must be between 0 and 100.');
  }
  const percents = (placePercents || []).map(parsePayoutPercent);
  if (!percents.length || percents.some((n) => n == null)) {
    throw new Error('Enter a percent for each paid place, between 0 and 100.');
  }
  const percentTotal = percents.reduce((sum, n) => sum + n, 0);
  if (percentTotal > 100.0001) {
    throw new Error('Place percents cannot add up to more than 100.');
  }
  const cashPool = Math.round((base.base_cents * cashPct) / 100);
  const held = base.base_cents - cashPool;
  const percentTotalRounded = Math.round(percentTotal * 100) / 100;
  const target = Math.round((cashPool * percentTotalRounded) / 100);
  const raw = percents.map((n) => Math.floor((cashPool * n) / 100));
  const assigned = raw.reduce((sum, n) => sum + n, 0);
  if (raw.length) raw[0] += target - assigned;
  const paid = raw.reduce((sum, n) => sum + n, 0);
  return {
    ...base,
    prize_cents: Math.max(0, Math.round(Number(prizeCents) || 0)),
    cash_percent: cashPct,
    cash_pool_cents: cashPool,
    held_cents: held,
    percent_total: percentTotalRounded,
    leftover_percent: Math.max(0, Math.round((100 - percentTotalRounded) * 100) / 100),
    leftover_cents: Math.max(0, cashPool - paid),
    places: percents.map((percent, index) => ({
      place: index + 1,
      label: placePayoutLabel(index),
      percent,
      cents: raw[index],
    })),
  };
}
