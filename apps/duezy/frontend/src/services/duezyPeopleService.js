import duezy from './duezyClient.js';
import { check } from './duezyService.js';

/** True when the members SQL (duezy-members-2026-10.sql) hasn't been run yet. */
const missingFunction = (error) => /could not find the function|does not exist|schema cache/i.test(error?.message || '');

/** { my_role, owner, members, invites } — or null before the members SQL is run. */
export async function getPeople(leagueId) {
  const { data, error } = await duezy.rpc('duezy_league_people', { p_league_id: leagueId });
  if (error && missingFunction(error)) return null;
  return check({ data, error });
}

/** Returns 'invited' (waits for them to sign in) or 'updated' (already on the league). */
export async function invitePerson(leagueId, email, role) {
  const result = check(await duezy.rpc('duezy_invite_member', { p_league_id: leagueId, p_email: email, p_role: role }));
  return result?.status || 'invited';
}

export async function setPersonRole(leagueId, userId, role) {
  check(await duezy.rpc('duezy_set_member_role', { p_league_id: leagueId, p_user_id: userId, p_role: role }));
}

export async function removePerson(leagueId, userId) {
  check(await duezy.rpc('duezy_remove_member', { p_league_id: leagueId, p_user_id: userId }));
}

export async function cancelInvite(leagueId, email) {
  check(await duezy.rpc('duezy_cancel_invite', { p_league_id: leagueId, p_email: email }));
}

/** Join any leagues this (confirmed) email was invited to. Never throws. */
export async function acceptInvites() {
  try {
    const { data, error } = await duezy.rpc('duezy_accept_invites');
    return error ? 0 : Number(data) || 0;
  } catch {
    return 0;
  }
}

/** league_id → 'treasurer' | 'viewer' for leagues shared with me. */
export async function myMemberships(userId) {
  if (!userId) return {};
  const { data, error } = await duezy.from('duezy_league_members').select('league_id, role').eq('user_id', userId);
  if (error) return {};
  return Object.fromEntries((data || []).map((m) => [m.league_id, m.role]));
}
