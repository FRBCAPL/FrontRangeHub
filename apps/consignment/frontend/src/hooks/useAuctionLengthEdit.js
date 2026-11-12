import { useState } from 'react';
import { auctionEndFrom, auctionLengthDays, normalizeAuctionDays } from '../utils/consignmentAuctionDates.js';

const MIN_LEAD_MS = 60 * 60 * 1000;

/** 7/14-day switch for a live auction with no bids. Returns null when the length can't change. */
export default function useAuctionLengthEdit(item, auction, editable, endHour) {
  const live = editable && auction?.status === 'live' && !(auction.bid_count > 0);
  const startDays = item.auction_days ? normalizeAuctionDays(item.auction_days) : auctionLengthDays(auction);
  const [days, setDays] = useState(startDays);
  if (!live) return null;
  const newEnd = auctionEndFrom(auction.starts_at, days, endHour);
  return {
    days,
    setDays,
    startDays,
    endHour,
    newEnd,
    changed: days !== startDays,
    tooLate: newEnd.getTime() <= Date.now() + MIN_LEAD_MS,
  };
}
