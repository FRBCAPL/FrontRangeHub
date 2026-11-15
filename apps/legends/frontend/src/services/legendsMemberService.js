import { BACKEND_URL } from '@shared/config/config.js';
import { supabase } from '@shared/config/supabase.js';
import { clearLegendsSessionToken, getLegendsSessionToken, setLegendsSessionToken } from './legendsSession.js';

async function hubToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || '';
}

async function memberHeaders({ json = true } = {}) {
  const headers = {};
  if (json) headers['Content-Type'] = 'application/json';
  const legends = getLegendsSessionToken();
  if (legends) headers['X-Legends-Session'] = legends;
  const hub = await hubToken();
  if (hub) headers.Authorization = `Bearer ${hub}`;
  return headers;
}

function errorMessage(json, fallback) {
  const raw = json?.error ?? json?.message ?? fallback;
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (raw && typeof raw === 'object' && typeof raw.message === 'string') return raw.message;
  return fallback;
}

async function memberJson(path, { method = 'GET', body, allowEmptyAuth = false } = {}) {
  const headers = await memberHeaders();
  if (!allowEmptyAuth && !headers['X-Legends-Session'] && !headers.Authorization) {
    throw new Error('Sign in with email/phone or your hub account.');
  }
  const res = await fetch(`${BACKEND_URL}/api/legends-site${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      errorMessage(
        json,
        res.status === 404 ? 'Membership API is not available. Restart atlasbackend.' : 'Request failed.',
      ),
    );
  }
  return json;
}

export const fetchMyLegendsMembership = () => memberJson('/member/me');
export const updateMyLegendsMembership = (body) => memberJson('/member/me', { method: 'PATCH', body });
export const linkHubToLegendsMembership = () => memberJson('/member/link-hub', { method: 'POST', body: {} });

export async function requestLegendsAuthCode(body) {
  const res = await fetch(`${BACKEND_URL}/api/legends-site/auth/request`, {
    method: 'POST',
    headers: await memberHeaders(),
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errorMessage(json, 'Could not send code.'));
  return json;
}

export async function verifyLegendsAuthCode(body) {
  const res = await fetch(`${BACKEND_URL}/api/legends-site/auth/verify`, {
    method: 'POST',
    headers: await memberHeaders(),
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errorMessage(json, 'Could not verify code.'));
  if (json.token) setLegendsSessionToken(json.token);
  return json;
}

export async function logoutLegendsSession() {
  try {
    await fetch(`${BACKEND_URL}/api/legends-site/auth/logout`, {
      method: 'POST',
      headers: await memberHeaders({ json: false }),
    });
  } catch {
    /* ignore */
  }
  clearLegendsSessionToken();
}

export async function fetchLegendsAuthStatus() {
  const res = await fetch(`${BACKEND_URL}/api/legends-site/auth/status`, { cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { auth: { email: false, sms: false, devEcho: false, secretConfigured: false } };
  return json;
}
