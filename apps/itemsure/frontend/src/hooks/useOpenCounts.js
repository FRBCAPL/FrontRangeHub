import { useCallback, useEffect, useState } from 'react';
import { listSessions, OPEN_STATUSES } from '../services/itemsureCountService.js';
import { listCountedSpots } from '../services/itemsureQuickCountService.js';
import { startServerClock } from '../utils/itemsureServerClock.js';
import { countsCoveringSpot } from '../utils/itemsureQuickCount.js';

/**
 * Counts that are still open (newest first) and which items and spots each has a number for.
 * Empty when counting isn't allowed or counts can't load. While any count is open it keeps
 * the server clock running, so numbers counted from this page get a proper "counted at" time.
 */
export default function useOpenCounts(organizationId, enabled) {
  const [sessions, setSessions] = useState([]);
  const [counted, setCounted] = useState({});

  const reload = useCallback(async () => {
    if (!enabled) {
      setSessions([]);
      setCounted({});
      return;
    }
    try {
      const open = (await listSessions(organizationId)).filter((s) => OPEN_STATUSES.includes(s.status));
      const empty = { items: new Set(), spots: new Set() };
      const sets = await Promise.all(open.map((s) => listCountedSpots(s.id).catch(() => empty)));
      setSessions(open);
      setCounted(Object.fromEntries(open.map((s, i) => [s.id, sets[i]])));
    } catch (e) {
      console.warn('[itemsure] open counts unavailable', e);
      setSessions([]);
      setCounted({});
    }
  }, [organizationId, enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  const anyOpen = sessions.length > 0;
  useEffect(() => (anyOpen ? startServerClock() : undefined), [anyOpen]);

  /** Open counts this item has no number in yet. */
  const waitingFor = useCallback((itemId) => sessions.filter((s) => !counted[s.id]?.items.has(itemId)), [sessions, counted]);

  /** Open counts that include this spot: [{ session, counted }]. */
  const coveringSpot = useCallback(
    (itemId, locationId, storageAreaId) => countsCoveringSpot(sessions, counted, itemId, locationId, storageAreaId),
    [sessions, counted],
  );

  const markCounted = useCallback((sessionId, itemId, areaIds = []) => {
    setCounted((prev) => {
      const old = prev[sessionId] || { items: new Set(), spots: new Set() };
      return {
        ...prev,
        [sessionId]: {
          items: new Set([...old.items, itemId]),
          spots: new Set([...old.spots, ...areaIds.map((a) => `${itemId}:${a || ''}`)]),
        },
      };
    });
  }, []);

  return { sessions, waitingFor, coveringSpot, markCounted, reload };
}
