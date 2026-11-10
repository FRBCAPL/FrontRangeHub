import { useEffect, useState } from 'react';
import { CONSIGNMENT_DAYS, PICKUP_GRACE_DAYS } from '../data/consignmentConstants.js';
import { FEE_TEXT, fillHowItWorks, SHIPPING_TEXT } from '../data/consignmentHowItWorks.js';
import { onAuthChange } from '../services/consignmentAuctionService.js';
import { loadSettings } from '../services/consignmentService.js';
import { loadPublicSettings } from '../services/consignmentSellerAccessService.js';
import { loadShippingInfo, SHIPPING_OFF } from '../services/consignmentShippingService.js';
import { DEFAULT_SOFT_CLOSE_MINUTES } from '../utils/consignmentAuctionMath.js';
import { feeTextValues } from '../utils/consignmentFeeText.js';
import { taxPercent } from '../utils/consignmentTax.js';

/** feeRow: the full settings row, which only approved sellers and admins can read (null for everyone else). */
function valuesFrom(row, feeRow, shipping = SHIPPING_OFF) {
  const feeValues = feeRow ? feeTextValues(feeRow) : null;
  const feeText = Object.fromEntries(Object.entries(FEE_TEXT).map(([key, t]) => [
    key,
    feeValues ? fillHowItWorks(t.seller, feeValues) : t.public,
  ]));
  const shipText = Object.fromEntries(Object.entries(SHIPPING_TEXT[shipping.enabled ? 'on' : 'off']).map(([key, text]) => [
    key,
    fillHowItWorks(text, { shipDays: shipping.complaintDays }),
  ]));
  return {
    days: row?.consignment_days ?? CONSIGNMENT_DAYS,
    graceDays: row?.pickup_grace_days ?? PICKUP_GRACE_DAYS,
    payDays: row?.auction_payment_days ?? 7,
    deliverDays: row?.auction_delivery_days ?? 3,
    softClose: row?.auction_soft_close_minutes ?? DEFAULT_SOFT_CLOSE_MINUTES,
    offerDays: row?.offer_days ?? feeRow?.offer_days ?? 3,
    offerHoldDays: row?.offer_hold_days ?? feeRow?.offer_hold_days ?? 3,
    taxPct: taxPercent(row?.tax_rate ?? feeRow?.tax_rate),
    ...feeText,
    ...shipText,
  };
}

/** Returns fill(text): replaces {placeholders} in How it works text with current settings. */
export default function useHowItWorksValues() {
  const [values, setValues] = useState(() => valuesFrom(null, null));
  useEffect(() => {
    let alive = true;
    const load = () => Promise.all([
      loadPublicSettings().catch(() => null),
      loadSettings().catch(() => null),
      loadShippingInfo(),
    ]).then(([row, feeRow, shipping]) => { if (alive) setValues(valuesFrom(row, feeRow, shipping)); });
    load();
    const off = onAuthChange(load);
    return () => {
      alive = false;
      if (typeof off === 'function') off();
    };
  }, []);
  return (text) => fillHowItWorks(text, values);
}
