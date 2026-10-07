import { useEffect, useState } from 'react';
import {
  CONSIGNMENT_DAYS,
  DEFAULT_AUCTION_LISTING_FEE,
  DEFAULT_CONSIGNMENT_FEE,
  PICKUP_GRACE_DAYS,
} from '../data/consignmentConstants.js';
import { EXAMPLE_BUY_NOW, EXAMPLE_HIGH_BID, EXAMPLE_RESERVE, fillHowItWorks } from '../data/consignmentHowItWorks.js';
import { loadSettings } from '../services/consignmentService.js';
import { auctionSplit, DEFAULT_COMMISSION_PCT, DEFAULT_SOFT_CLOSE_MINUTES } from '../utils/consignmentAuctionMath.js';
import { formatDollars } from '../utils/consignmentMoney.js';

function exampleValues(commission) {
  const atReserve = auctionSplit(EXAMPLE_RESERVE, commission);
  const atHigh = auctionSplit(EXAMPLE_HIGH_BID, commission);
  const atBuyNow = auctionSplit(EXAMPLE_BUY_NOW, commission);
  return {
    exReserve: formatDollars(EXAMPLE_RESERVE),
    exReserveFee: formatDollars(atReserve.commission),
    exReserveSeller: formatDollars(atReserve.seller),
    exHigh: formatDollars(atHigh.price),
    exHighFee: formatDollars(atHigh.commission),
    exHighSeller: formatDollars(atHigh.seller),
    exBuyNow: formatDollars(EXAMPLE_BUY_NOW),
    exBuyNowFee: formatDollars(atBuyNow.commission),
    exBuyNowSeller: formatDollars(atBuyNow.seller),
  };
}

function valuesFrom(row) {
  const commission = Number(row?.auction_commission_pct ?? DEFAULT_COMMISSION_PCT);
  return {
    fee: formatDollars(row?.default_consignment_fee ?? DEFAULT_CONSIGNMENT_FEE),
    days: row?.consignment_days ?? CONSIGNMENT_DAYS,
    graceDays: row?.pickup_grace_days ?? PICKUP_GRACE_DAYS,
    auctionFee: formatDollars(row?.auction_listing_fee ?? DEFAULT_AUCTION_LISTING_FEE),
    commission,
    payDays: row?.auction_payment_days ?? 7,
    softClose: row?.auction_soft_close_minutes ?? DEFAULT_SOFT_CLOSE_MINUTES,
    ...exampleValues(commission),
  };
}

/** Returns fill(text): replaces {placeholders} in How it works text with current settings. */
export default function useHowItWorksValues() {
  const [values, setValues] = useState(() => valuesFrom(null));
  useEffect(() => {
    let alive = true;
    loadSettings().then((row) => { if (alive) setValues(valuesFrom(row)); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return (text) => fillHowItWorks(text, values);
}
