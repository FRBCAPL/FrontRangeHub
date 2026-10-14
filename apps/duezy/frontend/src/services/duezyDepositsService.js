import duezy from './duezyClient.js';
import { check } from './duezyService.js';
import { fetchAllPages } from '../utils/duezyPaging.js';

export const DEPOSITS_SQL_NEEDED = 'Bank deposits need a database update (duezy-deposits-2026-10.sql).';
const missingTable = (error) => /duezy_deposits/.test(error?.message || '');

/** Newest first. null = the deposits table isn't set up yet (migration not run). */
export async function listDeposits(leagueId) {
  const { data, error } = await fetchAllPages(() => duezy
    .from('duezy_deposits')
    .select('*')
    .eq('league_id', leagueId)
    .order('deposited_on', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id'));
  if (error) return missingTable(error) ? null : check({ data, error });
  return data || [];
}

export async function addDeposit(leagueId, { method, amount, deposited_on, note = null }) {
  const row = { league_id: leagueId, method, amount, deposited_on, note: note || null };
  const result = await duezy.from('duezy_deposits').insert(row).select('*').single();
  if (missingTable(result.error)) throw new Error(DEPOSITS_SQL_NEEDED);
  return check(result);
}

export async function deleteDeposit(id) {
  check(await duezy.from('duezy_deposits').delete().eq('id', id));
}
