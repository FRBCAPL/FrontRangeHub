import { supabase } from '@shared/config/supabase.js';
import { loadSettings } from './consignmentService.js';

const MISSING = 'Run supabase-migrations/consignment-seller-access-2026-10.sql in the Supabase SQL editor, then refresh.';
const isMissing = (error) => /could not find the function|schema cache|does not exist/i.test(error?.message || '');

function fail(error, fallback) {
  if (isMissing(error)) throw new Error(MISSING);
  throw new Error(error?.message || fallback);
}

/** Timing values safe for public pages (no fees). Falls back to the settings table until the migration runs. */
export async function loadPublicSettings() {
  const { data, error } = await supabase.rpc('consignment_public_settings');
  if (error) {
    if (isMissing(error)) return loadSettings();
    throw new Error(error.message || 'Could not load settings.');
  }
  return data;
}

/**
 * { loggedIn, seller, requestedAt }. Before the migration runs everyone logged in counts as a seller,
 * so selling keeps working until the database is updated.
 */
export async function loadMySellerStatus() {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) return { loggedIn: false, seller: false, requestedAt: null };
  const { data, error } = await supabase.rpc('my_consignment_seller_status');
  if (error) {
    if (isMissing(error)) return { loggedIn: true, seller: true, requestedAt: null };
    throw new Error(error.message || 'Could not check your seller access.');
  }
  return { loggedIn: true, seller: Boolean(data?.seller), requestedAt: data?.requested_at || null };
}

export async function requestSellerAccess() {
  const { error } = await supabase.rpc('request_consignment_seller_access');
  if (error) fail(error, 'Could not send the request.');
}

export async function setConsignmentSeller(userId, allow) {
  const { error } = await supabase.rpc('admin_set_consignment_seller', { p_user_id: userId, p_allow: Boolean(allow) });
  if (error) fail(error, 'Could not update seller access.');
}

/** No search: requests + current sellers. With a search: matching accounts (name or email). */
export async function loadSellerAccounts(search = '') {
  const { data, error } = await supabase.rpc('admin_consignment_seller_accounts', { p_search: search || null });
  if (error) fail(error, 'Could not load sellers.');
  return data || [];
}
