export function payoutChartPath({ teams, weeks, poolCents }) {
  const query = new URLSearchParams();
  query.set('teams', String(Math.max(1, Math.round(Number(teams) || 1))));
  query.set('weeks', String(Math.max(1, Math.round(Number(weeks) || 1))));
  query.set('pool', String(Math.max(0, Math.round(Number(poolCents) || 0))));
  return `/usapl/payout-chart?${query.toString()}`;
}

export function payoutChartHref(opts) {
  const path = payoutChartPath(opts);
  if (typeof window === 'undefined') return path;
  const { origin, pathname, hash } = window.location;
  if (hash.startsWith('#/')) {
    return `${origin}${pathname}#${path}`;
  }
  return `${origin}${path}`;
}

export function parsePayoutChartSearch(search) {
  const query = new URLSearchParams(String(search || '').replace(/^\?/, ''));
  const teams = Number.parseInt(query.get('teams'), 10);
  const weeks = Number.parseInt(query.get('weeks'), 10);
  const pool = Number.parseInt(query.get('pool'), 10);
  if (!Number.isInteger(teams) || teams < 1 || teams > 64) return null;
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 52) return null;
  if (!Number.isInteger(pool) || pool < 0) return null;
  return { teams, weeks, poolCents: pool };
}
