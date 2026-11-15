import { BACKEND_URL } from '@shared/config/config.js';
import { supabase } from '@shared/config/supabase.js';
import { getLegendsSessionToken } from './legendsSession.js';

async function headers({ json = true } = {}) {
  const h = {};
  if (json) h['Content-Type'] = 'application/json';
  const legends = getLegendsSessionToken();
  if (legends) h['X-Legends-Session'] = legends;
  const { data } = await supabase.auth.getSession();
  const hub = data?.session?.access_token;
  if (hub) h.Authorization = `Bearer ${hub}`;
  return h;
}

function errMsg(json, fallback) {
  const raw = json?.error ?? fallback;
  return typeof raw === 'string' && raw.trim() ? raw : fallback;
}

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BACKEND_URL}/api/legends-site${path}`, {
    method,
    headers: await headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errMsg(json, 'Request failed.'));
  return json;
}

export const fetchMyCloverMatches = () => api('/member/clover-matches');
export const confirmCloverMatch = (id) => api(`/member/clover-matches/${id}/confirm`, { method: 'POST', body: {} });
export const rejectCloverMatch = (id) => api(`/member/clover-matches/${id}/reject`, { method: 'POST', body: {} });

/** Hub admin test helper — simulates a paid Clover sale. */
export const adminIngestCloverSale = (body) => api('/clover/ingest', { method: 'POST', body });
