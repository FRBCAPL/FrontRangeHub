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

export async function fetchPublishedEvents() {
  const res = await fetch(`${BACKEND_URL}/api/legends-site/events`);
  if (!res.ok) throw new Error('Could not load events.');
  return res.json();
}

export async function fetchPublishedEvent(slug) {
  const res = await fetch(`${BACKEND_URL}/api/legends-site/events/${encodeURIComponent(slug)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Could not load the event.');
  return res.json();
}

export async function fetchPublishedAnnouncements() {
  const res = await fetch(`${BACKEND_URL}/api/legends-site/announcements`);
  if (!res.ok) throw new Error('Could not load announcements.');
  return res.json();
}

export const fetchAdminEvents = () => adminJson('/admin/events');
export const createAdminEvent = (body) => adminJson('/admin/events', { method: 'POST', body });
export const updateAdminEvent = (id, body) => adminJson(`/admin/events/${id}`, { method: 'PUT', body });
export const deleteAdminEvent = (id) => adminJson(`/admin/events/${id}`, { method: 'DELETE' });

export const fetchAdminAnnouncements = () => adminJson('/admin/announcements');
export const createAdminAnnouncement = (body) => adminJson('/admin/announcements', { method: 'POST', body });
export const updateAdminAnnouncement = (id, body) => adminJson(`/admin/announcements/${id}`, { method: 'PUT', body });
export const deleteAdminAnnouncement = (id) => adminJson(`/admin/announcements/${id}`, { method: 'DELETE' });
