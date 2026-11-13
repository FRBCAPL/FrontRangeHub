import { venueDateKey } from './legendsClock.js';

export const LIVE_STALE_AFTER_MS = 10 * 60 * 1000;

const STATUS_ORDER = { in_progress: 0, scheduled: 1, completed: 2 };
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const text = (value) => (typeof value === 'string' ? value.trim() : '');

/** One CueSync `tonight` row, or null if it is not usable. A bad row is dropped, not fatal. */
function parseMatch(row) {
  if (!row || typeof row !== 'object') return null;
  const league = text(row.league);
  const home = text(row.home);
  if (!league || !home || typeof row.status !== 'string' || !DATE_PATTERN.test(row.date ?? '')) return null;
  const tables = Array.isArray(row.tables) ? row.tables.filter((n) => Number.isInteger(n) && n > 0) : [];
  return {
    league,
    division: text(row.division),
    home,
    away: text(row.away),
    date: row.date,
    startTime: text(row.startTime),
    startLabel: text(row.startLabel),
    tables,
    status: row.status,
  };
}

function normalizeStatus(status) {
  return status === 'in_progress' || status === 'completed' ? status : 'scheduled';
}

function whenLabel(status, startLabel) {
  if (status === 'in_progress') return 'In progress';
  if (status === 'completed') return 'Finished';
  return startLabel || 'TBA';
}

function toLiveMatch(match, index) {
  const status = normalizeStatus(match.status);
  const isTournament = match.league.toLowerCase() === 'tournament';
  const detail = isTournament ? match.division : [match.league, match.division].filter(Boolean).join(' · ');
  return {
    key: `${match.date}-${match.startTime || 'tba'}-${match.home}-${match.away}-${index}`,
    kind: isTournament ? 'tournament' : 'league',
    title: match.away ? `${match.home} vs ${match.away}` : match.home,
    home: match.home,
    away: match.away || null,
    detail: detail || null,
    when: whenLabel(status, match.startLabel),
    status,
    tables: match.tables,
  };
}

/**
 * No open-table count: CueSync cannot see walk-in play that was never rung up,
 * so "X of Y tables open" could send someone over for a table that is taken.
 */
export function buildLiveView(summary, now) {
  if (!summary || summary.version !== 1) return null;
  const generated = Date.parse(summary.generatedAt);
  if (Number.isNaN(generated) || now.getTime() - generated > LIVE_STALE_AFTER_MS) return null;
  const today = venueDateKey(now);
  const rows = Array.isArray(summary.tonight) ? summary.tonight : [];
  const matches = rows
    .map(parseMatch)
    .filter((match) => match && match.date === today)
    .map(toLiveMatch)
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  return { updatedAt: summary.generatedAt, leaguePlayNow: summary.leaguePlayNow === true, matches };
}

/** Badges follow what is actually listed; the CueSync league flag only counts when nothing is listed. */
export function liveBadges(live) {
  if (!live) return { leagues: false, tournament: false };
  const leagues = live.matches.some((match) => match.kind === 'league');
  const tournament = live.matches.some((match) => match.kind === 'tournament');
  return { leagues: leagues || (live.leaguePlayNow && live.matches.length === 0), tournament };
}

/** Finished matches are not shown; the caller shows a wrap-up line once nothing is left. */
export function matchesStillOn(matches) {
  return matches.filter((match) => match.status !== 'completed');
}

/**
 * Drops recurring items the live match list already covers, so "Pool leagues" is not listed twice.
 * Finished matches count too, so the line does not reappear after league play ends.
 */
export function itemsNotCoveredByLive(items, live) {
  if (!live || live.matches.length === 0) return items;
  const hasLeague = live.matches.some((match) => match.kind === 'league');
  const hasTournament = live.matches.some((match) => match.kind === 'tournament');
  return items.filter((item) => {
    if (item.category === 'leagues') return !hasLeague;
    if (item.category === 'tournament') return !hasTournament;
    return true;
  });
}

export function tablesLabel(tables) {
  if (tables.length === 0) return null;
  return `${tables.length === 1 ? 'Table' : 'Tables'} ${tables.join(', ')}`;
}

export function updatedAgoLabel(updatedAt, now) {
  const minutes = Math.floor((now.getTime() - Date.parse(updatedAt)) / 60000);
  if (minutes < 1) return 'Updated just now';
  if (minutes === 1) return 'Updated 1 min ago';
  return `Updated ${minutes} min ago`;
}
