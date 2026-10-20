import { supabase } from '@shared/config/supabase.js';
import { USAPL_TENANT_ID } from '../data/usaplConstants.js';
import { usaplFormatIsInHouse, parseUsaplFormat } from '../data/usaplFormat.js';
import { USAPL_FARGO_DIVISION_IDS, joinUsaplFargoIds, parseUsaplFargoIds } from '../data/usaplPublicReports.js';

const TABLE = 'usapl_divisions';

function emptyToNull(value) {
  if (value === '' || value === undefined) return null;
  return value;
}

function toInt(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function rowToDivision(row) {
  if (!row) return null;
  const storedIds = parseUsaplFargoIds(row.fargo_division_id);
  const mapped = USAPL_FARGO_DIVISION_IDS[row.id] || '';
  const staleStored = storedIds.length === 1 && (
    storedIds[0] === '5bc0048c-4e6b-48e6-98d0-b34f01103c87'
    || storedIds[0] === '0b8fdda5-f8a2-48b9-a90d-b3c001580542'
  );
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    night: row.night || '',
    format: row.format || '',
    playStarts: row.play_starts || '',
    lastWeek: row.last_week || '',
    duesPerPlayer: row.dues_per_player == null ? null : Number(row.dues_per_player),
    teamSize: row.team_size == null ? null : Number(row.team_size),
    rosterMax: row.roster_max == null ? null : Number(row.roster_max),
    combinedFargoCap: row.combined_fargo_cap == null ? null : Number(row.combined_fargo_cap),
    locationNote: row.location_note || '',
    playAnywhere: Boolean(row.play_anywhere),
    inHouse: Boolean(row.in_house) || usaplFormatIsInHouse(row.format),
    inSession: parseUsaplFormat(row.format).inSession,
    fargoDivisionId: (staleStored ? mapped : (row.fargo_division_id || mapped)) || '',
    scheduleImageUrl: row.schedule_image_url || '',
    flyerImageUrl: row.flyer_image_url || '',
    reportHeading: row.report_heading || '',
    reportBlurb: row.report_blurb || '',
    signupOpen: Boolean(row.signup_open),
    archived: Boolean(row.archived),
    winnerTeam: row.winner_team || '',
    winnerTeamB: row.winner_team_b || '',
    leagueNumbers: row.league_numbers || row.csi_numbers || '',
    notes: Array.isArray(row.notes) ? row.notes : [],
    sortOrder: row.sort_order ?? 0,
  };
}

export function divisionToRow(division) {
  return {
    id: division.id,
    tenant_id: USAPL_TENANT_ID,
    name: String(division.name || '').trim(),
    short_name: String(division.shortName || '').trim(),
    night: emptyToNull(String(division.night || '').trim()),
    format: emptyToNull(String(division.format || '').trim()),
    play_starts: emptyToNull(division.playStarts),
    last_week: emptyToNull(division.lastWeek),
    dues_per_player: toInt(division.duesPerPlayer),
    team_size: toInt(division.teamSize),
    roster_max: toInt(division.rosterMax),
    combined_fargo_cap: toInt(division.combinedFargoCap),
    location_note: emptyToNull(String(division.locationNote || '').trim()),
    play_anywhere: Boolean(division.playAnywhere),
    fargo_division_id: emptyToNull(joinUsaplFargoIds(division.fargoDivisionId || USAPL_FARGO_DIVISION_IDS[division.id])),
    schedule_image_url: emptyToNull(String(division.scheduleImageUrl || '').trim()),
    flyer_image_url: emptyToNull(String(division.flyerImageUrl || '').trim()),
    report_heading: emptyToNull(String(division.reportHeading || '').trim()),
    report_blurb: emptyToNull(String(division.reportBlurb || '').trim()),
    signup_open: Boolean(division.signupOpen) && !division.archived,
    archived: Boolean(division.archived),
    winner_team: emptyToNull(String(division.winnerTeam || '').trim()),
    winner_team_b: emptyToNull(String(division.winnerTeamB || '').trim()),
    league_numbers: emptyToNull(String(division.leagueNumbers || '').trim()),
    notes: Array.isArray(division.notes) ? division.notes.filter(Boolean) : [],
    sort_order: toInt(division.sortOrder) ?? 0,
    updated_at: new Date().toISOString(),
  };
}

export async function listUsaplDivisions() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('tenant_id', USAPL_TENANT_ID)
    .order('sort_order', { ascending: true })
    .order('short_name', { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToDivision);
}

const OPTIONAL_COLUMNS = [
  'fargo_division_id',
  'schedule_image_url',
  'flyer_image_url',
  'report_heading',
  'report_blurb',
  'archived',
  'winner_team',
  'winner_team_b',
  'league_numbers',
];

function columnFromError(error) {
  const msg = String(error?.message || '');
  const named = msg.match(/'([a-z_]+)' column/i) || msg.match(/column "([a-z_]+)"/i);
  if (named && OPTIONAL_COLUMNS.includes(named[1])) return named[1];
  return OPTIONAL_COLUMNS.find((col) => msg.includes(col)) || '';
}

function optionalColumnDroppedError(dropped) {
  if (dropped.includes('report_heading') || dropped.includes('report_blurb')) {
    return 'The heading and blurb need a database column. Run supabase-migrations/usapl-divisions-public-report-2026-09.sql in the Supabase SQL editor, then save again.';
  }
  if (dropped.includes('schedule_image_url')) {
    return 'The schedule picture needs a database column. Run supabase-migrations/usapl-schedule-images-2026-09.sql in the Supabase SQL editor, then save again.';
  }
  if (dropped.includes('flyer_image_url')) {
    return 'The division flyer needs a database column. Run supabase-migrations/usapl-division-flyer-2026-09.sql in the Supabase SQL editor, then save again.';
  }
  if (dropped.includes('archived') || dropped.includes('winner_team') || dropped.includes('winner_team_b') || dropped.includes('league_numbers')) {
    return 'Past divisions and winners need a database column. Run supabase-migrations/usapl-divisions-past-winners-2026-09.sql in the Supabase SQL editor, then save again.';
  }
  return '';
}

async function upsertRows(rows, { returning = false } = {}) {
  let payload = rows.map((row) => ({ ...row }));
  const dropped = [];
  let lastError = null;
  for (let i = 0; i <= OPTIONAL_COLUMNS.length; i += 1) {
    let query = supabase.from(TABLE).upsert(payload, { onConflict: 'tenant_id,id' });
    if (returning) query = query.select('*').single();
    const result = await query;
    if (!result.error) {
      const copyError = optionalColumnDroppedError(dropped);
      if (copyError) throw new Error(copyError);
      return result.data || null;
    }
    lastError = result.error;
    const col = columnFromError(result.error);
    if (!col) break;
    dropped.push(col);
    payload = payload.map((row) => {
      const next = { ...row };
      delete next[col];
      return next;
    });
  }
  throw lastError;
}

export async function saveUsaplDivision(division) {
  const row = divisionToRow(division);
  if (!row.id || !row.name || !row.short_name) {
    throw new Error('Division id, name, and short name are required.');
  }
  const data = await upsertRows([row], { returning: true });
  return rowToDivision(data);
}

export async function saveUsaplDivisions(divisions) {
  await upsertRows((divisions || []).map(divisionToRow));
}

export async function deleteUsaplDivision(id) {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('tenant_id', USAPL_TENANT_ID)
    .eq('id', id);
  if (error) throw error;
}
