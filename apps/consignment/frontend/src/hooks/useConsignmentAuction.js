import { useCallback, useEffect, useRef, useState } from 'react';
import {
  currentUserId,
  loadAuctionForItem,
  loadBidHistory,
  loadMyTopBid,
  onAuthChange,
} from '../services/consignmentAuctionService.js';

const POLL_MS = 10000;
const FAST_POLL_MS = 3000;
const FAST_WINDOW_MS = 3 * 60 * 1000;

/** Live auction state for one item: polls the public board, ticks a clock, tracks the signed-in bidder. */
export default function useConsignmentAuction(itemId) {
  const [auction, setAuction] = useState(null);
  const [history, setHistory] = useState([]);
  const [userId, setUserId] = useState(null);
  const [myTopBid, setMyTopBid] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const userRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const row = await loadAuctionForItem(itemId);
      setAuction(row);
      if (row) {
        const [bids, mine] = await Promise.all([
          loadBidHistory(row.id),
          loadMyTopBid(row.id, userRef.current),
        ]);
        setHistory(bids);
        setMyTopBid(mine);
      }
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

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
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [live]);

  useEffect(() => {
    if (!live) return undefined;
    const poll = setInterval(refresh, fast ? FAST_POLL_MS : POLL_MS);
    return () => clearInterval(poll);
  }, [live, fast, refresh]);

  // Once the clock passes the end, ask the server to close it.
  useEffect(() => {
    if (clockEnded) refresh();
  }, [clockEnded, refresh]);

  const isHighBidder = Boolean(
    myTopBid && auction?.bid_count && Number(myTopBid.amount) === Number(auction.current_bid),
  );

  return { auction, history, userId, myTopBid, isHighBidder, remaining, loading, error, refresh };
}
