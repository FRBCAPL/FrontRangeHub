import duezy from './duezyClient.js';
import { estateBackendBase } from '@shared/utils/estateBackend.js';

/** Billing status from Supabase. null = billing migration not run yet (treat as open). */
export async function getBillingStatus() {
  const { data, error } = await duezy.rpc('duezy_billing_status');
  if (error) {
    if (/duezy_billing_status|schema cache|does not exist/i.test(error.message || '')) return null;
    throw new Error(error.message);
  }
  return data;
}

async function backend(path, body) {
  const { data } = await duezy.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Please log in again.');
  const res = await fetch(`${estateBackendBase()}/api/duezy-billing${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.error || `Billing request failed (${res.status})`);
  return json;
}

export async function getBillingConfig() {
  const res = await fetch(`${estateBackendBase()}/api/duezy-billing/config`);
  const json = await res.json().catch(() => ({}));
  return res.ok ? json : { configured: false, yearly: false };
}

export const startCheckout = (interval) => backend('/checkout-session', { interval });
export const openPortal = () => backend('/portal-session', {});
export const finalizeCheckout = (sessionId) => backend('/finalize-checkout', { sessionId });

let syncTimer = null;

/** Keep the Stripe quantity in step with active divisions. Debounced so multi-step changes sync once. */
export function syncQuantity() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    backend('/sync-quantity', {}).catch(() => { /* retried on the next change */ });
  }, 1500);
}
