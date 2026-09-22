import { useEffect, useState } from 'react';
import {
  loadBreakAndRunEventById,
  loadLiveBreakAndRunEvent,
  subscribeBreakAndRunEvent,
} from './breakAndRunCloud.js';
import { sanitizeBreakAndRun } from './breakAndRunEngine.js';
import { tournamentFromDisplayRow } from './breakAndRunDisplay.js';
import { breakAndRunStorageKey, loadBreakAndRun } from './breakAndRunStore.js';
import { tournamentTime } from '../cash-climb/cashClimbSaved.js';

function preferCopy(local, cloud) {
  if (!local) return cloud || null;
  if (!cloud) return local;
  return tournamentTime(cloud) > tournamentTime(local) ? cloud : local;
}

/**
 * Live Break & Run for TV / phone.
 * Loads once, then updates only on operator cloud upsert or same-browser storage write.
 */
export default function useBreakAndRunLive(eventId = '') {
  const [tournament, setTournament] = useState(() => {
    const local = loadBreakAndRun();
    if (eventId && local && String(local.id) !== String(eventId)) return null;
    return local;
  });
  const [loading, setLoading] = useState(true);
  const [watchId, setWatchId] = useState(() => String(eventId || loadBreakAndRun()?.id || ''));

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      const local = loadBreakAndRun();
      const wanted = String(eventId || '').trim();
      let cloud = null;
      if (wanted) {
        cloud = (await loadBreakAndRunEventById(wanted)).tournament;
      } else {
        cloud = (await loadLiveBreakAndRunEvent()).tournament;
      }
      if (cancelled) return;
      const localMatch = wanted
        ? (local && String(local.id) === wanted ? local : null)
        : local;
      const next = preferCopy(localMatch, cloud);
      setTournament(next ? sanitizeBreakAndRun(next) : null);
      setWatchId(String(wanted || next?.id || ''));
      setLoading(false);
    };
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    if (!watchId) return undefined;
    const unsub = subscribeBreakAndRunEvent(watchId, (row) => {
      const next = tournamentFromDisplayRow(row);
      if (next) setTournament(next);
    });
    return unsub;
  }, [watchId]);

  useEffect(() => {
    const key = breakAndRunStorageKey();
    const onStorage = (event) => {
      if (event.key && event.key !== key) return;
      const local = loadBreakAndRun();
      if (!local) return;
      if (watchId && String(local.id) !== String(watchId)) return;
      setTournament(sanitizeBreakAndRun(local));
      if (!watchId && local.id) setWatchId(String(local.id));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [watchId]);

  return { tournament, loading, eventId: watchId };
}
