/**
 * How the team list is split for a week: who still needs collecting first, byes after,
 * paid teams in their own (collapsible) group. Filters and search narrow the list.
 */

export const TEAM_FILTERS = ['all', 'open', 'paid', 'bye'];

/** Teams this big get a search box. */
export const SEARCH_MIN_TEAMS = 10;

/** 'open' = not paid yet (includes partial). */
export function teamBucket(team, week, paymentIndex) {
  const status = paymentIndex.get(`${team.id}:${week}`)?.status || 'unpaid';
  if (status === 'paid') return 'paid';
  if (status === 'bye') return 'bye';
  return 'open';
}

export function matchesSearch(team, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  return [team.name, team.captain].some((v) => String(v || '').toLowerCase().includes(q));
}

export function teamCounts(teams, week, paymentIndex) {
  const counts = { all: teams.length, open: 0, paid: 0, bye: 0 };
  teams.forEach((t) => { counts[teamBucket(t, week, paymentIndex)] += 1; });
  return counts;
}

/**
 * { main, paid } in the teams' own order. `hold` = team ids that stay in `main` even though they're
 * paid (just tapped, or their details are open) so rows don't jump out from under the user.
 * Under "all", byes go after the teams still to collect and paid teams go to the `paid` group;
 * any other filter puts just that bucket in `main`.
 */
export function groupTeams({ teams, week, paymentIndex, filter = 'all', query = '', hold = new Set() }) {
  const visible = teams.filter((t) => matchesSearch(t, query));
  const bucket = (t) => teamBucket(t, week, paymentIndex);

  if (filter !== 'all') {
    return { main: visible.filter((t) => bucket(t) === filter || (filter === 'open' && hold.has(t.id))), paid: [] };
  }

  const rank = (t) => (bucket(t) === 'bye' ? 1 : 0);
  const main = visible
    .filter((t) => bucket(t) !== 'paid' || hold.has(t.id))
    .map((t, i) => ({ t, i }))
    .sort((a, b) => rank(a.t) - rank(b.t) || a.i - b.i)
    .map(({ t }) => t);
  const paid = visible.filter((t) => bucket(t) === 'paid' && !hold.has(t.id));
  return { main, paid };
}
