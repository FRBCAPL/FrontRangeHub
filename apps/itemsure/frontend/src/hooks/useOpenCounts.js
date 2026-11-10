import { useCallback, useEffect, useState } from 'react';
import { listSessionItemIds, listSessions, OPEN_STATUSES } from '../services/itemsureCountService.js';
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
  const [onlyItems, setOnlyItems] = useState({}); // supplier counts: session id -> Set of item ids in it

  const reload = useCallback(async () => {
    if (!enabled) {
      setSessions([]);
      setCounted({});
      setOnlyItems({});
      return;
    }
    try {
      const open = (await listSessions(organizationId)).filter((s) => OPEN_STATUSES.includes(s.status));
      const empty = { items: new Set(), spots: new Set() };
      const [sets, members] = await Promise.all([
        Promise.all(open.map((s) => listCountedSpots(s.id).catch(() => empty))),
        Promise.all(open.map((s) => (s.supplier_id ? listSessionItemIds(s.id).catch(() => null) : null))),
      ]);
      setSessions(open);
      setCounted(Object.fromEntries(open.map((s, i) => [s.id, sets[i]])));
      setOnlyItems(Object.fromEntries(open.map((s, i) => [s.id, members[i]]).filter(([, ids]) => ids)));
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

  const forItem = useCallback((itemId) => sessions.filter((s) => !onlyItems[s.id] || onlyItems[s.id].has(itemId)), [sessions, onlyItems]);

  /** Open counts this item has no number in yet (a supplier count only waits for its own items). */
  const waitingFor = useCallback((itemId) => forItem(itemId).filter((s) => !counted[s.id]?.items.has(itemId)), [forItem, counted]);

  /** Open counts that include this spot: [{ session, counted }]. */
  const coveringSpot = useCallback(
    (itemId, locationId, storageAreaId) => countsCoveringSpot(forItem(itemId), counted, itemId, locationId, storageAreaId),
    [forItem, counted],
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
