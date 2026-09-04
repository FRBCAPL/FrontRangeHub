import { supabase } from '@shared/config/supabase.js';
import { USAPL_TENANT_ID } from '../data/usaplConstants.js';

const SIGNUPS = 'usapl_signups';
const ROSTERS = 'usapl_rosters';

function withTenant(row) {
  return { tenant_id: USAPL_TENANT_ID, ...row };
}

export async function submitUsaplSignup(payload) {
  const { error } = await supabase
    .from(SIGNUPS)
    .insert(withTenant(payload));
  if (error) throw error;
  return { ok: true };
}

function dbRosterMode(mode) {
  if (mode === 'new') return 'full';
  if (mode === 'add') return 'add';
  if (mode === 'update') return 'update';
  return 'full';
}

async function insertUsaplRoster(payload) {
  const { error } = await supabase
    .from(ROSTERS)
    .insert(withTenant(payload));
  return error;
}

export async function submitUsaplRoster(payload) {
  const row = { ...payload, mode: dbRosterMode(payload.mode) };
  let error = await insertUsaplRoster(row);
  if (error && row.mode === 'update') {
    error = await insertUsaplRoster({ ...row, mode: 'full' });
  }
  if (error) throw error;
  return { ok: true };
}

export async function listUsaplSignups() {
  const { data, error } = await supabase
    .from(SIGNUPS)
    .select('*')
    .eq('tenant_id', USAPL_TENANT_ID)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listUsaplRosters() {
  const { data, error } = await supabase
    .from(ROSTERS)
    .select('*')
    .eq('tenant_id', USAPL_TENANT_ID)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateUsaplSignupStatus(id, status) {
  const { error } = await supabase.from(SIGNUPS).update({ status }).eq('id', id);
  if (error) throw error;
}

export async function updateUsaplRosterStatus(id, status) {
  const { error } = await supabase.from(ROSTERS).update({ status }).eq('id', id);
  if (error) throw error;
}

export function emptyPlayer() {
  return {
    firstName: '',
    middleInitial: '',
    lastName: '',
    dob: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: 'CO',
    zip: '',
    preferredContact: '',
  };
}

export function playerHasData(player) {
  if (!player) return false;
  return Boolean(
    String(player.firstName || '').trim() ||
    String(player.lastName || '').trim() ||
    String(player.email || '').trim() ||
    String(player.phone || '').trim()
  );
}
