import { supabase } from '@shared/config/supabase.js';
import { USAPL_TENANT_ID } from '../data/usaplConstants.js';
import { USAPL_VEGAS_CUP } from '../data/usaplVegasCup.js';
import { normalizeUsaplTeamKey } from '../data/usaplVegasSeeds.js';

const TABLE = 'usapl_vegas_ineligible';

export const USAPL_VEGAS_INELIGIBLE_SQL =
  'Run supabase-migrations/usapl-vegas-ineligible-2026-09.sql in the Supabase SQL editor, then refresh.';

export function isUsaplVegasIneligibleTableError(error) {
  const msg = String(error?.message || error || '');
  return /usapl_vegas_ineligible|could not find the table|schema cache/i.test(msg);
}

export function rowToVegasIneligible(row) {
  if (!row) return null;
  return {
    id: row.id,
    year: Number(row.year) || USAPL_VEGAS_CUP.year,
    teamName: row.team_name || '',
    teamKey: row.team_key || normalizeUsaplTeamKey(row.team_name),
    reason: row.reason || 'No longer active',
  };
}

export async function listUsaplVegasIneligible(year = USAPL_VEGAS_CUP.year) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('tenant_id', USAPL_TENANT_ID)
    .eq('year', year)
    .order('team_name', { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToVegasIneligible);
}

export async function addUsaplVegasIneligible(teamName, {
  year = USAPL_VEGAS_CUP.year,
  reason = 'No longer active',
} = {}) {
  const name = String(teamName || '').trim();
  if (!name) throw new Error('Team name is required.');
  const { data, error } = await supabase
    .from(TABLE)
    .upsert({
      tenant_id: USAPL_TENANT_ID,
      year,
      team_name: name,
      team_key: normalizeUsaplTeamKey(name),
      reason: String(reason || 'No longer active').trim() || 'No longer active',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,year,team_key' })
    .select('*')
    .single();
  if (error) {
    if (isUsaplVegasIneligibleTableError(error)) throw new Error(USAPL_VEGAS_INELIGIBLE_SQL);
    throw error;
  }
  return rowToVegasIneligible(data);
}

export async function removeUsaplVegasIneligible(teamName, year = USAPL_VEGAS_CUP.year) {
  const key = normalizeUsaplTeamKey(teamName);
  if (!key) return;
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('tenant_id', USAPL_TENANT_ID)
    .eq('year', year)
    .eq('team_key', key);
  if (error) {
    if (isUsaplVegasIneligibleTableError(error)) throw new Error(USAPL_VEGAS_INELIGIBLE_SQL);
    throw error;
  }
}
