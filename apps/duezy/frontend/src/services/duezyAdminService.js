import duezy from './duezyClient.js';
import { estateBackendBase } from '@shared/utils/estateBackend.js';

/** Owner admin API. The server checks duezy_super_admins on every call. */
async function adminRequest(path, body) {
  const { data } = await duezy.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Please log in again.');
  const res = await fetch(`${estateBackendBase()}/api/duezy-admin${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.error || `Admin request failed (${res.status})`);
  return json;
}

export async function checkIsAdmin() {
  try {
    return Boolean((await adminRequest('/me')).isAdmin);
  } catch {
    return false;
  }
}

export const listAccounts = async () => (await adminRequest('/accounts')).accounts;
export const getAccount = (ownerId) => adminRequest(`/accounts/${ownerId}`);
export const setComp = (ownerId, on, reason) => adminRequest(`/accounts/${ownerId}/comp`, { on, reason });
export const extendTrial = (ownerId, days, reason) => adminRequest(`/accounts/${ownerId}/extend-trial`, { days, reason });
export const getSupportLeague = (leagueId) => adminRequest(`/leagues/${leagueId}`);
