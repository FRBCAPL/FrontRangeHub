import duezy from './duezyClient.js';
import { check, updateLeague } from './duezyService.js';
import { DUEZY_PATH } from '../data/duezyOptions.js';
import { JOIN_MISSING, joinErrorText, makeJoinCode } from '../utils/duezyJoin.js';

/** Captain sign-up links: one code per season, submissions wait in duezy_team_requests until approved. */

export const joinUrl = (code) => `${window.location.origin}${window.location.pathname}#${DUEZY_PATH}/join/${code}`;

/** Owner only (league-wide setting). `fresh` makes a new code so the old link stops working. */
export async function setJoinLink(league, { open, fresh = false }) {
  const code = fresh || !league.join_code ? makeJoinCode() : league.join_code;
  try {
    return await updateLeague(league.id, { join_open: open, join_code: code });
  } catch (e) {
    throw new Error(joinErrorText(e.message));
  }
}

export async function getJoinInfo(code) {
  const { data, error } = await duezy.rpc('duezy_join_info', { p_code: code });
  if (error) throw new Error(joinErrorText(error.message));
  return data || null;
}

export async function submitJoin(code, form) {
  const { error } = await duezy.rpc('duezy_join_submit', {
    p_code: code,
    p_division_id: form.division_id || null,
    p_name: form.name,
    p_captain: form.captain,
    p_contact: form.contact,
    p_players: form.players || [],
    p_note: form.note || null,
    p_website: form.website || null,
  });
  if (error) throw new Error(joinErrorText(error.message));
}

/** Waiting teams for one season; empty until the SQL is run. */
export async function listJoinRequests(leagueId) {
  const { data, error } = await duezy
    .from('duezy_team_requests')
    .select('*')
    .eq('league_id', leagueId)
    .order('created_at');
  if (error) {
    if (JOIN_MISSING.test(error.message)) return [];
    throw new Error(error.message);
  }
  return data || [];
}

export async function deleteJoinRequest(id) {
  check(await duezy.from('duezy_team_requests').delete().eq('id', id));
}
