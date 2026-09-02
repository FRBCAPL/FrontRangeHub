import { supabase } from '@shared/config/supabase.js';
import { USAPL_TENANT_ID } from '../data/usaplConstants.js';

const TABLE = 'usapl_locations';

export function rowToLocation(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order ?? 0,
  };
}

export function locationToRow(location) {
  const row = {
    tenant_id: USAPL_TENANT_ID,
    name: String(location.name || '').trim(),
    sort_order: Number.isFinite(Number(location.sortOrder)) ? Number(location.sortOrder) : 0,
    updated_at: new Date().toISOString(),
  };
  if (location.id && !String(location.id).startsWith('seed-')) {
    row.id = location.id;
  }
  return row;
}

export async function listUsaplLocations() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('tenant_id', USAPL_TENANT_ID)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToLocation);
}

export async function saveUsaplLocation(location) {
  const row = locationToRow(location);
  if (!row.name) throw new Error('Location name is required.');
  const query = row.id
    ? supabase.from(TABLE).update(row).eq('id', row.id)
    : supabase.from(TABLE).insert(row);
  const { data, error } = await query.select('*').single();
  if (error) throw error;
  return rowToLocation(data);
}

export async function saveUsaplLocations(locations) {
  const rows = (locations || []).map(locationToRow);
  if (!rows.length) return;
  const hasIds = rows.every((row) => row.id);
  const { error } = await supabase
    .from(TABLE)
    .upsert(rows, { onConflict: hasIds ? 'id' : 'tenant_id,name' });
  if (error) throw error;
}

export async function deleteUsaplLocation(id) {
  if (!id || String(id).startsWith('seed-')) {
    throw new Error('Save the starter list to the database before removing a location.');
  }
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('tenant_id', USAPL_TENANT_ID)
    .eq('id', id);
  if (error) throw error;
}
