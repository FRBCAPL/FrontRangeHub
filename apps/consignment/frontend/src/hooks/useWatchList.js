import { useCallback, useEffect, useState } from 'react';
import { currentUserId, onAuthChange, openHubLogin } from '../services/consignmentAuctionService.js';
import { loadWatchedIds, unwatchItem, watchItem } from '../services/consignmentWatchService.js';

const SYNC_EVENT = 'frpl:consignment-watch-changed';

/**
 * The signed-in user's watch list. Every component using this hook stays in sync (a heart tapped on a card
 * updates the item page and the Watching filter). Signed out: toggle opens the hub login.
 */
export default function useWatchList() {
  const [userId, setUserId] = useState(null);
  const [watched, setWatched] = useState(() => new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = (id) => {
      setUserId(id);
      loadWatchedIds(id).then((ids) => { if (alive) setWatched(ids); });
    };
    currentUserId().then((id) => { if (alive) load(id); });
    const stop = onAuthChange((id) => { if (alive) load(id); });
    const onSync = (e) => { if (alive) setWatched(new Set(e.detail)); };
    window.addEventListener(SYNC_EVENT, onSync);
    return () => {
      alive = false;
      stop();
      window.removeEventListener(SYNC_EVENT, onSync);
    };
  }, []);

  const toggle = useCallback(async (itemId) => {
    if (!userId) { openHubLogin(); return; }
    setError('');
    const wasWatching = watched.has(itemId);
    const next = new Set(watched);
    if (wasWatching) next.delete(itemId); else next.add(itemId);
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: [...next] }));
    try {
      if (wasWatching) await unwatchItem(userId, itemId);
      else await watchItem(userId, itemId);
    } catch (err) {
      setWatched((current) => {
        const undo = new Set(current);
        if (wasWatching) undo.add(itemId); else undo.delete(itemId);
        window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: [...undo] }));
        return undo;
      });
      setError(err.message);
    }
  }, [userId, watched]);

  return { userId, watched, toggle, error };
}
