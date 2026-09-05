import { supabase } from '@shared/config/supabase.js';
import { USAPL_TENANT_ID } from '../data/usaplConstants.js';

const TABLE = 'usapl_page_visits';
const VISITOR_KEY = 'usapl_visitor_id';

export function getUsaplVisitorId() {
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
    if (!ref) return null;
    const host = window.location.hostname;
    if (ref.includes(host)) return null;
    return ref.slice(0, 200);
  } catch {
    return null;
  }
}

export async function recordUsaplPageVisit({ path, pageLabel }) {
  const { error } = await supabase.from(TABLE).insert({
    tenant_id: USAPL_TENANT_ID,
    visitor_id: getUsaplVisitorId(),
    path,
    page_label: pageLabel,
    referrer: outsideReferrer(),
  });
  if (error) throw error;
}

export async function listUsaplPageVisits({ sinceIso, limit = 4000 } = {}) {
  let query = supabase
    .from(TABLE)
    .select('id, visitor_id, path, page_label, referrer, created_at')
    .eq('tenant_id', USAPL_TENANT_ID)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (sinceIso) query = query.gte('created_at', sinceIso);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
