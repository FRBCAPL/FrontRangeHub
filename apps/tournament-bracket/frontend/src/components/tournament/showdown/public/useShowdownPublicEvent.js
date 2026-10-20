import { useEffect, useState } from 'react';
import { publicShowdown } from '../cloud/showdownPublicState.js';
import { loadShowdown } from '../operator/showdownStore.js';
import { legacyFormatProblem, LEGACY_PUBLIC_MESSAGE } from '../showdownState.js';
import { formatSupportProblem, isPayoutV1, isPayoutV2, isPayoutV3 } from '../showdownPayoutVersion.js';
import { v3PublicProblem, V3_PLAN_MISSING_MESSAGE } from './v3/showdownV3PublicView.js';

export const UNSUPPORTED_PUBLIC_MESSAGE = 'This event needs a newer version of the app. Reload the page to update.';

const TAKES_SCORES = ['qualifying', 'playoffs'];

export function publicLoadMessage(code) {
  if (code === 'unavailable') return 'Live results are not available yet.';
  if (code === 'network') return 'Could not reach the server. Results will appear when the connection returns.';
  return 'Could not load this event.';
}

const STALE_MS = 24 * 60 * 60 * 1000;

/** Players only see Showdowns still in progress; completed and abandoned (no update in a day) events are hidden. */
export function liveShowdownRows(rows, now = Date.now()) {
  return (rows || []).filter((r) => {
    if (!r || r.status === 'completed' || r.status === 'setup') return false;
    const t = Date.parse(r.updated_at);
    return Number.isNaN(t) || now - t < STALE_MS;
  });
}

/**
 * Obsolete test events are never shown to phones or the TV, and neither is any format these public
 * screens cannot show. V3 events are shown only with a complete locked payout plan; they never fall
 * back to the V1/V2 screens.
 */
export function screenPublicEvent(event) {
  if (event && isPayoutV3(event) && event.payoutPlan?.payoutVersion !== 3) return { event: null, error: V3_PLAN_MISSING_MESSAGE };
  if (event && formatSupportProblem(event)) return { event: null, error: UNSUPPORTED_PUBLIC_MESSAGE };
  if (event && !(isPayoutV1(event) || isPayoutV2(event) || isPayoutV3(event))) return { event: null, error: UNSUPPORTED_PUBLIC_MESSAGE };
  if (event && legacyFormatProblem(event)) return { event: null, error: LEGACY_PUBLIC_MESSAGE };
  const v3Problem = event && isPayoutV3(event) ? v3PublicProblem(event) : '';
  if (v3Problem) return { event: null, error: v3Problem };
  return { event, error: '' };
}

/**
 * The public copy of one event, refreshed on an interval. On the operator's own device the tablet
 * copy is used directly (always the newest); everywhere else the cloud copy is used. `preferTablet:
 * false` always reads the cloud copy (the isolated test cloud's simulated phone, see ShowdownPublicPage).
 */
export default function useShowdownPublicEvent(api, eventId, pollMs = 3000, { preferTablet = true } = {}) {
  const [view, setView] = useState({ event: null, loading: true, error: '', source: '', pendingIds: [] });

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const local = preferTablet ? loadShowdown() : null;
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
  }, [api, eventId, pollMs, preferTablet]);

  return view;
}
