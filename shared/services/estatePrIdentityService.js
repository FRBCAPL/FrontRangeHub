/**
 * Estate Vault — PR legal name + supervised identity transfer.
 */
import { supabase } from '../config/supabase.js';
import { estateBackendBase } from '../utils/estateBackend.js';

function fail(error) {
  return { success: false, error: typeof error === 'string' ? error : error?.message || 'Request failed.' };
}

function ok(data) {
  return { success: true, data };
}

async function rpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) return fail(error.message || `RPC ${name} failed.`);
  if (data && data.success === false) return fail(data.error || `RPC ${name} failed.`);
  return ok(data);
}

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) return null;
  return data.session.access_token;
}

export async function getPrProfile() {
  const result = await rpc('estate_pr_get_profile');
  if (!result.success) return result;
  return ok(result.data?.profile || null);
}

export async function setPrLegalName(legalName) {
  const result = await rpc('estate_pr_set_legal_name', { p_legal_name: legalName });
  if (!result.success) return result;
  return ok(result.data?.profile || null);
}

export async function submitIdentityRequest(payload) {
  return rpc('estate_pr_submit_identity_request', {
    p_current_legal_name: payload.currentLegalName,
    p_current_email: payload.currentEmail,
    p_requested_legal_name: payload.requestedLegalName,
    p_requested_email: payload.requestedEmail,
    p_reason: payload.reason
  });
}

export async function listMyIdentityRequests() {
  const result = await rpc('estate_pr_list_my_identity_requests');
  if (!result.success) return result;
  return ok(result.data?.requests || []);
}

export async function cancelIdentityRequest(requestId) {
  return rpc('estate_pr_cancel_identity_request', { p_request_id: requestId });
}

export async function listIdentityRequestsForSuperAdmin(status = '') {
  const result = await rpc('estate_super_list_identity_requests', {
    p_status: status || null
  });
  if (!result.success) return result;
  return ok(result.data?.requests || []);
}

export async function reviewIdentityRequest(requestId, action, reason) {
  const token = await getAccessToken();
  if (!token) return fail('Sign in required.');
  try {
    const res = await fetch(`${estateBackendBase()}/api/estate-super/identity/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ requestId, action, reason })
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

export function openIdentityRequestStatus(request) {
  if (!request) return null;
  const labels = {
    pending_super_review: 'Waiting for operator review',
    pending_pr_confirm: 'Approved — check your current email to confirm',
    completed: 'Completed',
    denied: 'Denied',
    expired: 'Confirmation expired',
    cancelled: 'Cancelled'
  };
  return labels[request.status] || request.status;
}

export default {
  getPrProfile,
  setPrLegalName,
  submitIdentityRequest,
  listMyIdentityRequests,
  cancelIdentityRequest,
  listIdentityRequestsForSuperAdmin,
  reviewIdentityRequest,
  openIdentityRequestStatus
};
