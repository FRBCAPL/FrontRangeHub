import duezy from './duezyClient.js';
import { syncQuantity } from './duezyBillingService.js';
import { friendlyError } from '../utils/duezyBillingText.js';

/* '*' so leagues/teams still load before the divisions migration adds multi_division / division_id. */
const LEAGUE_FIELDS = '*';
const TEAM_FIELDS = '*';

export function check({ data, error }) {
  if (error) throw new Error(friendlyError(error.message));
  return data;
}

export async function listLeagues() {
  return check(
    await duezy.from('duezy_leagues').select(LEAGUE_FIELDS).eq('archived', false).order('created_at', { ascending: false })
  ) || [];
}

export async function getLeague(id) {
  return check(await duezy.from('duezy_leagues').select(LEAGUE_FIELDS).eq('id', id).maybeSingle());
}

const teamRow = (leagueId, t, sortOrder) => ({
  league_id: leagueId,
  name: t.name.trim(),
  captain: t.captain?.trim() || null,
  contact: t.contact?.trim() || null,
  sort_order: sortOrder,
});

/**
 * Single division: teams = [{ name, captain, contact }].
 * Multi division: divisions = [{ name, play_day, dues..., teams: [{ name, captain, contact }] }]; teams is ignored.
 */
export async function createLeague(league, teams, divisions = null) {
  const multi = Array.isArray(divisions) && divisions.length > 0;
  const created = check(
    await duezy.from('duezy_leagues').insert(multi ? { ...league, multi_division: true } : league).select(LEAGUE_FIELDS).single()
  );
  let rows = teams.map((t, i) => teamRow(created.id, t, i));
  if (multi) {
    const divisionRows = divisions.map(({ teams: _teams, ...d }, i) => ({ ...d, league_id: created.id, sort_order: i }));
    const savedDivisions = check(await duezy.from('duezy_divisions').insert(divisionRows).select('id, sort_order'));
    const idByOrder = new Map(savedDivisions.map((d) => [d.sort_order, d.id]));
    rows = divisions.flatMap((d, di) =>
      d.teams.map((t, ti) => ({ ...teamRow(created.id, t, ti), division_id: idByOrder.get(di) }))
    );
  }
  if (rows.length) check(await duezy.from('duezy_teams').insert(rows));
  syncQuantity();
  return created;
}

export async function updateLeague(id, changes) {
  return check(await duezy.from('duezy_leagues').update(changes).eq('id', id).select(LEAGUE_FIELDS).single());
}

export async function archiveLeague(id) {
  check(await duezy.from('duezy_leagues').update({ archived: true }).eq('id', id));
  syncQuantity();
}

export async function listTeams(leagueId) {
  return check(
    await duezy
      .from('duezy_teams')
      .select(TEAM_FIELDS)
      .eq('league_id', leagueId)
      .eq('archived', false)
      .order('sort_order')
      .order('created_at')
  ) || [];
}

export async function addTeam(leagueId, team, sortOrder, divisionId = null) {
  const row = teamRow(leagueId, team, sortOrder);
  if (divisionId) row.division_id = divisionId;
  return check(await duezy.from('duezy_teams').insert(row).select(TEAM_FIELDS).single());
}

export async function updateTeam(id, changes) {
  check(await duezy.from('duezy_teams').update(changes).eq('id', id));
}

export async function listPayments(leagueId) {
  return check(
    await duezy.from('duezy_payments').select('id, team_id, week, status, amount, method, note, updated_at').eq('league_id', leagueId)
  ) || [];
}

/** Mark weeks 1..throughWeek paid for these teams (catching up a league that started mid-season). */
export async function markPaidThrough(leagueId, teamIds, throughWeek, dues) {
  const now = new Date().toISOString();
  const rows = teamIds.flatMap((teamId) =>
    Array.from({ length: throughWeek }, (_, i) => ({
      league_id: leagueId, team_id: teamId, week: i + 1, status: 'paid', amount: dues, method: null, note: 'Marked paid at setup', updated_at: now,
    }))
  );
  if (!rows.length) return [];
  return check(
    await duezy
      .from('duezy_payments')
      .upsert(rows, { onConflict: 'team_id,week' })
      .select('id, team_id, week, status, amount, method, note, updated_at')
  ) || [];
}

/** One row per team per week — saving again replaces it. */
export async function savePayment(leagueId, teamId, week, { status, amount = 0, method = null, note = null }) {
  return check(
    await duezy
      .from('duezy_payments')
      .upsert(
        { league_id: leagueId, team_id: teamId, week, status, amount, method, note, updated_at: new Date().toISOString() },
        { onConflict: 'team_id,week' }
      )
      .select('id, team_id, week, status, amount, method, note, updated_at')
      .single()
  );
}
