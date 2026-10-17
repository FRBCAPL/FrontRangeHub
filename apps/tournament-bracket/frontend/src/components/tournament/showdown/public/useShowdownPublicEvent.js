import { useEffect, useState } from 'react';
import { publicShowdown } from '../cloud/showdownPublicState.js';
import { loadShowdown } from '../operator/showdownStore.js';
import { legacyFormatProblem, LEGACY_PUBLIC_MESSAGE } from '../showdownState.js';

const TAKES_SCORES = ['qualifying', 'playoffs'];

export function publicLoadMessage(code) {
  if (code === 'unavailable') return 'Live results are not available yet.';
  if (code === 'network') return 'Could not reach the server. Results will appear when the connection returns.';
  return 'Could not load this event.';
}

/** Obsolete test events are never shown to phones or the TV. */
export function screenPublicEvent(event) {
  if (event && legacyFormatProblem(event)) return { event: null, error: LEGACY_PUBLIC_MESSAGE };
  return { event, error: '' };
}

/**
 * The public copy of one event, refreshed on an interval. On the operator's own device the tablet
 * copy is used directly (always the newest); everywhere else the cloud copy is used.
 */
export default function useShowdownPublicEvent(api, eventId, pollMs = 3000) {
  const [view, setView] = useState({ event: null, loading: true, error: '', source: '', pendingIds: [] });

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const local = loadShowdown();
      const localCopy = local && local.id === eventId && local.status !== 'setup' ? publicShowdown(local) : null;
      const res = localCopy ? { data: null, error: null } : await api.publicGet(eventId);
      if (cancelled) return;
      const screened = screenPublicEvent(localCopy || res.data?.event || null);
      if (screened.error) {
        setView({ event: null, loading: false, error: screened.error, source: '', pendingIds: [] });
        return;
      }
      const { event } = screened;
      let pendingIds = [];
      if (event && TAKES_SCORES.includes(event.status)) {
        const p = await api.publicPending(eventId);
        if (cancelled) return;
        pendingIds = p.error ? [] : (p.data || []).map((r) => r.match_id);
      }
      setView({
        event,
        loading: false,
        error: !event && res.error ? publicLoadMessage(res.code) : '',
        source: localCopy ? 'tablet' : event ? 'cloud' : '',
        pendingIds,
      });
    };
    refresh();
    const timer = setInterval(refresh, pollMs);
    return () => { cancelled = true; clearInterval(timer); };
  }, [api, eventId, pollMs]);

  return view;
}
