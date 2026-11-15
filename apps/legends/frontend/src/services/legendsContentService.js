import { BACKEND_URL } from '@shared/config/config.js';
import { supabase } from '@shared/config/supabase.js';

async function adminHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Please log in again.');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

function errorMessage(json, fallback) {
  const raw = json?.error ?? json?.message ?? fallback;
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (raw && typeof raw === 'object' && typeof raw.message === 'string') return raw.message;
  return fallback;
}

async function adminJson(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BACKEND_URL}/api/legends-site${path}`, {
    method,
    headers: await adminHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errorMessage(json, 'Request failed.'));
  return json;
}

/** Public content: KJ, visit facts, today note. */
export async function fetchLegendsContent() {
  const res = await fetch(`${BACKEND_URL}/api/legends-site/content`);
  if (!res.ok) throw new Error('Could not load Legends content.');
  return res.json();
}

export const fetchLegendsAdminContent = () => adminJson('/admin/content');
export const saveKaraokeHost = (host) => adminJson('/admin/karaoke-host', { method: 'PUT', body: host });
export const saveVisitFacts = (facts) => adminJson('/admin/visit-facts', { method: 'PUT', body: facts });
export const saveTodayNote = (note) => adminJson('/admin/today-note', { method: 'PUT', body: note });
export const clearTodayNote = () => adminJson('/admin/today-note', { method: 'DELETE' });
