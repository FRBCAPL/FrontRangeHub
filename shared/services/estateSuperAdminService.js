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

/**
 * Allowlisted operators are sent straight to the console on sign-in. This flag
 * lets them opt into the PR view for the rest of the browser session without
 * bouncing back to the console on every visit.
 */
const STAY_ON_PR_KEY = 'estate_super_stay_on_pr';

export function stayOnPrHome() {
  try {
    sessionStorage.setItem(STAY_ON_PR_KEY, '1');
  } catch (err) {
    /* storage unavailable — redirect stays on */
  }
}

export function clearStayOnPrHome() {
  try {
    sessionStorage.removeItem(STAY_ON_PR_KEY);
  } catch (err) {
    /* storage unavailable — nothing to clear */
  }
}

export function isStayOnPrHome() {
  try {
    return sessionStorage.getItem(STAY_ON_PR_KEY) === '1';
  } catch (err) {
    return false;
  }
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

export async function logSuperSessionEnd() {
  return rpc('estate_operator_log', {
    p_action: 'super_session_end',
    p_target_type: 'console',
    p_target_id: null,
    p_case_number: null,
    p_reason: 'Signed out of Super Admin console',
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

export async function setUserTestFlag({ userId, email, isTest, reason }) {
  return api('/user/set-test', { userId, email, isTest, reason });
}

export async function purgeTestUser({ userId, email, reason, confirmPhrase }) {
  return api('/user/purge-test', { userId, email, reason, confirmPhrase });
}

export async function clearEvTombstone({ userId, reason }) {
  return api('/user/clear-tombstone', { userId, reason });
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
  stayOnPrHome,
  clearStayOnPrHome,
  isStayOnPrHome,
  logSuperSignIn,
  logSuperSessionEnd,
  listEstates,
  listOwners,
  softDeleteEstate,
  restoreEstate,
  setTestFlag,
  purgeTestEstate,
  setUserDisabled,
  setUserTestFlag,
  purgeTestUser,
  clearEvTombstone,
  listAudit,
  exportAudit,
  forceAdminRotation,
  clearSessions,
  assistUpdateSettings,
  logEstateView,
  checkUserDisabled
};
