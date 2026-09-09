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

async function sessionEmail() {
  try {
    const { data } = await supabase.auth.getSession();
    const email = String(data?.session?.user?.email || '').trim().toLowerCase();
    return email.length >= 3 && email.length <= 120 && email.includes('@') ? email : null;
  } catch {
    return null;
  }
}

export async function recordUsaplPageVisit({ path, pageLabel }) {
  const payload = {
    tenant_id: USAPL_TENANT_ID,
    visitor_id: getUsaplVisitorId(),
    path,
    page_label: pageLabel,
    referrer: outsideReferrer(),
  };
  const visitorEmail = await sessionEmail();
  const first = visitorEmail ? { ...payload, visitor_email: visitorEmail } : payload;
  const { error } = await supabase.from(TABLE).insert(first);
  if (!error) return;
  if (visitorEmail) {
    const retry = await supabase.from(TABLE).insert(payload);
    if (!retry.error) return;
    throw retry.error;
  }
  throw error;
}

export async function listUsaplPageVisits({ sinceIso, limit = 4000 } = {}) {
  const run = async (columns) => {
    let query = supabase
      .from(TABLE)
      .select(columns)
      .eq('tenant_id', USAPL_TENANT_ID)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (sinceIso) query = query.gte('created_at', sinceIso);
    return query;
  };

  let { data, error } = await run(
    'id, visitor_id, visitor_email, path, page_label, referrer, created_at'
  );
  if (error) {
    const fallback = await run('id, visitor_id, path, page_label, referrer, created_at');
    data = fallback.data;
    error = fallback.error;
  }
  if (error) throw error;
  return data || [];
}
