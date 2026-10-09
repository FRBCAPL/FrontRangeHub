import { useEffect, useState } from 'react';
import { CONSIGNMENT_DAYS, PICKUP_GRACE_DAYS } from '../data/consignmentConstants.js';
import { fillHowItWorks } from '../data/consignmentHowItWorks.js';
import { loadPublicSettings } from '../services/consignmentSellerAccessService.js';
import { DEFAULT_SOFT_CLOSE_MINUTES } from '../utils/consignmentAuctionMath.js';

function valuesFrom(row) {
  return {
    days: row?.consignment_days ?? CONSIGNMENT_DAYS,
    graceDays: row?.pickup_grace_days ?? PICKUP_GRACE_DAYS,
    payDays: row?.auction_payment_days ?? 7,
    deliverDays: row?.auction_delivery_days ?? 3,
    softClose: row?.auction_soft_close_minutes ?? DEFAULT_SOFT_CLOSE_MINUTES,
  };
}

/** Returns fill(text): replaces {placeholders} in How it works text with current settings. */
export default function useHowItWorksValues() {
  const [values, setValues] = useState(() => valuesFrom(null));
  useEffect(() => {
    let alive = true;
    loadPublicSettings().then((row) => { if (alive) setValues(valuesFrom(row)); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return (text) => fillHowItWorks(text, values);
}
