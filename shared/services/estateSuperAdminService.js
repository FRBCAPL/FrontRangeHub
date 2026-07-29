/**
 * Estate Vault Super Admin — client API.
 * All mutations go through allowlisted RPCs / atlasbackend; never trust the UI alone.
 */
import { supabase } from '../config/supabase.js';
import { estateBackendBase } from '../utils/estateBackend.js';

function fail(error) {
  return { success: false, error: typeof error === 'string' ? error : error?.message || 'Request failed.' };
}

function ok(data) {
  return { success: true, data };
}

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) return null;
  return data.session.access_token;
}

function requestMeta() {
  if (typeof navigator === 'undefined') return {};
  return {
    user_agent: navigator.userAgent || '',
    language: navigator.language || '',
    at: new Date().toISOString()
  };
}

async function rpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) return fail(error.message || `RPC ${name} failed.`);
  if (data && data.success === false) return fail(data.error || `RPC ${name} failed.`);
  return ok(data);
}

async function api(path, body) {
  const token = await getAccessToken();
  if (!token) return fail('Sign in required.');
  try {
    const res = await fetch(`${estateBackendBase()}/api/estate-super${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ ...body, requestMeta: requestMeta() })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      return fail(data?.error || `Request failed (${res.status}).`);
    }
    return ok(data);
  } catch (err) {
    return fail(err.message || 'Network error.');
  }
}

export async function superMe() {
  return rpc('estate_super_me');
}

export async function logSuperSignIn() {
  return rpc('estate_operator_log', {
    p_action: 'super_sign_in',
    p_target_type: 'console',
    p_target_id: null,
    p_case_number: null,
    p_reason: 'Opened Super Admin console',
    p_before: null,
    p_after: null,
    p_request_meta: requestMeta(),
    p_archive_id: null
  });
}

export async function listEstates({ includeDeleted = true, search = '' } = {}) {
  const result = await rpc('estate_super_list_estates', {
    p_include_deleted: includeDeleted,
    p_search: search || null
  });
  if (!result.success) return result;
  return ok(result.data?.estates || []);
}

export async function listOwners({ search = '' } = {}) {
  const result = await rpc('estate_super_list_owners', { p_search: search || null });
  if (!result.success) return result;
  return ok(result.data?.owners || []);
}

export async function softDeleteEstate(caseNumber, reason) {
  return api('/estate/soft-delete', { caseNumber, reason });
}

export async function restoreEstate(caseNumber, reason) {
  return api('/estate/restore', { caseNumber, reason });
}

export async function setTestFlag(caseNumber, isTest, reason) {
  return api('/estate/set-test', { caseNumber, isTest, reason });
}

export async function purgeTestEstate(caseNumber, reason, confirmPhrase) {
  return api('/estate/purge-test', { caseNumber, reason, confirmPhrase });
}

export async function setUserDisabled({ userId, email, disabled, reason, isTest = false }) {
  return api('/user/set-disabled', { userId, email, disabled, reason, isTest });
}

export async function listAudit({ limit = 100, action = '' } = {}) {
  const result = await rpc('estate_super_list_audit', {
    p_limit: limit,
    p_action: action || null
  });
  if (!result.success) return result;
  return ok(result.data?.entries || []);
}

export async function exportAudit() {
  return api('/audit/export', {});
}

export async function forceAdminRotation(caseNumber, reason) {
  return api('/estate/force-rotation', { caseNumber, reason });
}

export async function clearSessions(caseNumber, reason) {
  return api('/estate/clear-sessions', { caseNumber, reason });
}

export async function assistUpdateSettings(caseNumber, reason, { estateName, isPublished } = {}) {
  return api('/estate/assist-settings', {
    caseNumber,
    reason,
    estateName,
    isPublished
  });
}

export async function logEstateView(caseNumber, mode = 'view', reason = '') {
  return rpc('estate_super_log_view', {
    p_case_number: caseNumber,
    p_mode: mode,
    p_reason: reason || null,
    p_request_meta: requestMeta()
  });
}

export async function checkUserDisabled() {
  return rpc('estate_super_is_user_disabled', { p_user_id: null });
}

export default {
  superMe,
  logSuperSignIn,
  listEstates,
  listOwners,
  softDeleteEstate,
  restoreEstate,
  setTestFlag,
  purgeTestEstate,
  setUserDisabled,
  listAudit,
  exportAudit,
  forceAdminRotation,
  clearSessions,
  assistUpdateSettings,
  logEstateView,
  checkUserDisabled
};
