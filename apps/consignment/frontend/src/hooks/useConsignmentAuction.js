import { useCallback, useEffect, useRef, useState } from 'react';
import {
  currentUserId,
  loadAuctionForItem,
  loadBidHistory,
  loadMyBids,
  onAuthChange,
} from '../services/consignmentAuctionService.js';
import { serverNow, syncServerClock } from '../services/consignmentServerClock.js';

const POLL_MS = 10000;
const FAST_POLL_MS = 3000;
const FAST_WINDOW_MS = 3 * 60 * 1000;

/**
 * Live auction state for one item: polls the public board, ticks a server-synced clock, tracks the
 * signed-in bidder. A failed poll keeps the last good data and sets `stale` instead of blanking the panel.
 */
export default function useConsignmentAuction(itemId) {
  const [auction, setAuction] = useState(null);
  const [history, setHistory] = useState([]);
  const [userId, setUserId] = useState(null);
  const [myBids, setMyBids] = useState([]);
  const [now, setNow] = useState(serverNow);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stale, setStale] = useState(false);
  const userRef = useRef(null);
  const requestRef = useRef(0);
  const hasDataRef = useRef(false);

  useEffect(() => {
    syncServerClock().then(() => setNow(serverNow()));
  }, []);

  useEffect(() => {
    requestRef.current += 1;
    hasDataRef.current = false;
    setAuction(null);
    setHistory([]);
    setMyBids([]);
    setError('');
    setStale(false);
    setLoading(true);
  }, [itemId]);

  const load = useCallback(async (close) => {
    const request = ++requestRef.current;
    try {
      const row = await loadAuctionForItem(itemId, { close });
      const [bids, mine] = row
        ? await Promise.all([loadBidHistory(row.id), loadMyBids(row.id, userRef.current)])
        : [[], []];
      if (request !== requestRef.current) return;
      hasDataRef.current = true;
      setAuction(row);
      setHistory(bids);
      setMyBids(mine);
      setError('');
      setStale(false);
    } catch (err) {
      if (request !== requestRef.current) return;
      if (hasDataRef.current) setStale(true);
      else setError(err.message);
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [itemId]);

  const refresh = useCallback(() => load(true), [load]);

  useEffect(() => {
    let alive = true;
    currentUserId().then((id) => {
      if (!alive) return;
      userRef.current = id;
      setUserId(id);
      refresh();
    });
    const off = onAuthChange((id) => {
      userRef.current = id;
      setUserId(id);
      refresh();
    });
    return () => { alive = false; off(); };
  }, [refresh]);

  const live = auction?.status === 'live';
  const remaining = auction ? new Date(auction.ends_at).getTime() - now : 0;
  const fast = live && remaining < FAST_WINDOW_MS;
  const clockEnded = live && remaining <= 0;

  useEffect(() => {
    if (!live) return undefined;
    const tick = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(tick);
  }, [live]);

  useEffect(() => {
    if (!live) return undefined;
    const poll = setInterval(() => {
      if (!document.hidden) load(false);
    }, fast ? FAST_POLL_MS : POLL_MS);
    const onVisible = () => { if (!document.hidden) load(false); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [live, fast, load]);

  // Once the clock passes the end, ask the server to close it.
  useEffect(() => {
    if (clockEnded) refresh();
  }, [clockEnded, refresh]);

  const myTopBid = myBids[0] || null;
  const isHighBidder = Boolean(
    myTopBid && auction?.bid_count && Number(myTopBid.amount) === Number(auction.current_bid),
  );
  const outbid = Boolean(live && myTopBid && !isHighBidder);
  const myAmounts = new Set(myBids.map((b) => Number(b.amount)));
  const historyWithMine = myAmounts.size
    ? history.map((b) => ({ ...b, is_mine: myAmounts.has(Number(b.amount)) }))
    : history;

  return {
    auction,
    history: historyWithMine,
    userId,
    myTopBid,
    isHighBidder,
    outbid,
    remaining,
    loading,
    error,
    stale,
    refresh,
  };
}
