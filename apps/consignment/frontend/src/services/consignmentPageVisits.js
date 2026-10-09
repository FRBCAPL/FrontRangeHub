import { supabase } from '@shared/config/supabase.js';

const TABLE = 'consignment_page_visits';
const TENANT_ID = 'frpl';
const VISITOR_KEY = 'consignment_visitor_id';

export function getConsignmentVisitorId() {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing && existing.length >= 8) return existing.slice(0, 64);
    const id = (crypto.randomUUID && crypto.randomUUID()) || `v${Date.now()}${Math.random()}`;
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return `anon-${Date.now()}`;
  }
}

function outsideReferrer() {
  try {
    const ref = document.referrer || '';
    if (!ref || ref.includes(window.location.hostname)) return null;
    return ref.slice(0, 200);
  } catch {
    return null;
  }
}

/** visitor_email is filled in by a database trigger from the sign-in token, so it is not sent here. */
export async function recordConsignmentPageVisit({ path, pageLabel }) {
  const { error } = await supabase.from(TABLE).insert({
    tenant_id: TENANT_ID,
    visitor_id: getConsignmentVisitorId(),
    path,
    page_label: pageLabel,
    referrer: outsideReferrer(),
  });
  if (error) throw error;
}

export async function listConsignmentPageVisits({ sinceIso, limit = 4000 } = {}) {
  let query = supabase
    .from(TABLE)
    .select('id, visitor_id, visitor_email, path, page_label, referrer, created_at')
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (sinceIso) query = query.gte('created_at', sinceIso);
  const { data, error } = await query;
  if (error) {
    if (/consignment_page_visits|relation|schema cache/i.test(error.message || '')) {
      throw new Error('Visitor stats are not set up yet. Run consignment-page-visits-2026-10.sql in Supabase, then refresh.');
    }
    throw error;
  }
  return data || [];
}
