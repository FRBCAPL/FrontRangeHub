import duezy from './duezyClient.js';
import { check } from './duezyService.js';
import { syncQuantity } from './duezyBillingService.js';
import { DIVISION_SETTING_KEYS } from '../utils/duezyDivisions.js';

const FIELDS = '*';

/** Missing table = divisions migration not run yet; treat as "no divisions" so single leagues keep working. */
function orEmpty(result) {
  if (result.error && /duezy_divisions/.test(result.error.message || '')) return [];
  return check(result) || [];
}

export async function listDivisions(leagueId) {
  return orEmpty(
    await duezy.from('duezy_divisions').select(FIELDS).eq('league_id', leagueId).eq('archived', false).order('sort_order').order('created_at')
  );
}

export async function listDivisionsForLeagues(leagueIds) {
  if (!leagueIds.length) return [];
  return orEmpty(
    await duezy.from('duezy_divisions').select(FIELDS).in('league_id', leagueIds).eq('archived', false).order('sort_order')
  );
}

export async function addDivision(leagueId, division, sortOrder) {
  const created = check(
    await duezy.from('duezy_divisions').insert({ ...division, league_id: leagueId, sort_order: sortOrder }).select(FIELDS).single()
  );
  syncQuantity();
  return created;
}

export async function updateDivision(id, changes) {
  const saved = check(await duezy.from('duezy_divisions').update(changes).eq('id', id).select(FIELDS).single());
  if ('archived' in changes) syncQuantity();
  return saved;
}

/**
 * Turn a single-division league into a multi-division one: the existing teams become the first
 * division (named by the user, with the league's current settings), then the new division is added.
 */
export async function convertToMulti(league, currentName, newDivision) {
  const settings = Object.fromEntries(DIVISION_SETTING_KEYS.map((k) => [k, league[k]]));
  if (league.start_date) Object.assign(settings, { start_date: league.start_date, skip_dates: league.skip_dates || [] });
  const first = await addDivision(league.id, { ...settings, name: currentName }, 0);
  check(await duezy.from('duezy_teams').update({ division_id: first.id }).eq('league_id', league.id).is('division_id', null));
  const second = await addDivision(league.id, newDivision, 1);
  check(await duezy.from('duezy_leagues').update({ multi_division: true }).eq('id', league.id));
  syncQuantity();
  return [first, second];
}
