/**
 * Estate Vault SaaS billing client (Stripe Checkout via atlasbackend).
 */
import { supabase } from '../config/supabase.js';
import { estateBackendBase } from '../utils/estateBackend.js';
import { isBillingLocked } from '../utils/estateBilling.js';

function fail(error) {
  return { success: false, error: typeof error === 'string' ? error : error?.message || 'Request failed.' };
}

function ok(data) {
  return { success: true, data };
}

async function bearer() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) return null;
  return data.session.access_token;
}

async function authFetch(path, { method = 'GET', body } = {}) {
  const token = await bearer();
  if (!token) return fail('Sign in required.');
  const res = await fetch(`${estateBackendBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    return fail(data.error || `Request failed (${res.status})`);
  }
  return ok(data);
}

export async function getBillingConfig() {
  try {
    const res = await fetch(`${estateBackendBase()}/api/estate-billing/config`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) return fail(data.error || 'Could not load billing config.');
    return ok(data);
  } catch (err) {
    return fail(err);
  }
}

export async function getEstateBillingStatus(caseNumber) {
  return authFetch(
    `/api/estate-billing/status?caseNumber=${encodeURIComponent(String(caseNumber || '').trim())}`
  );
}

/** Family / helper / auction — no auth; never exposes Stripe ids. */
export async function getPublicBillingStatus(caseNumber) {
  try {
    const res = await fetch(
      `${estateBackendBase()}/api/estate-billing/public-status?caseNumber=${encodeURIComponent(String(caseNumber || '').trim())}`
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      // Fail open if API missing so we do not brick portals before deploy.
      if (res.status === 404) {
        return ok({ allowed: true, phase: 'unknown', migrationMissing: true });
      }
      return fail(data.error || 'Could not load billing status.');
    }
    return ok(data);
  } catch (err) {
    return ok({ allowed: true, phase: 'unknown', migrationMissing: true, offline: true });
  }
}

export async function startEstateCheckout(caseNumber) {
  return authFetch('/api/estate-billing/checkout-session', {
    method: 'POST',
    body: { caseNumber }
  });
}

export async function openEstateBillingPortal(caseNumber) {
  return authFetch('/api/estate-billing/portal-session', {
    method: 'POST',
    body: { caseNumber }
  });
}

export async function finalizeEstateCheckout({ caseNumber, sessionId }) {
  return authFetch('/api/estate-billing/finalize-checkout', {
    method: 'POST',
    body: { caseNumber, sessionId }
  });
}

export async function assertEstateUnlocked(caseNumber) {
  const result = await getPublicBillingStatus(caseNumber);
  if (!result.success) return result;
  if (isBillingLocked(result.data)) {
    return {
      success: false,
      error: 'estate_billing_locked',
      data: result.data
    };
  }
  return ok(result.data);
}

export default {
  getBillingConfig,
  getEstateBillingStatus,
  getPublicBillingStatus,
  startEstateCheckout,
  openEstateBillingPortal,
  finalizeEstateCheckout,
  assertEstateUnlocked
};
