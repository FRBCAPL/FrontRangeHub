import React, { useEffect, useState } from 'react';
import {
  CONSIGNMENT_DAYS,
  DEFAULT_AUCTION_LISTING_FEE,
  DEFAULT_CONSIGNMENT_FEE,
  PICKUP_GRACE_DAYS,
} from '../../data/consignmentConstants.js';
import {
  EXAMPLE_BUY_NOW,
  EXAMPLE_HIGH_BID,
  EXAMPLE_RESERVE,
  fillHowItWorks,
  HOW_IT_WORKS_FOOTER,
  HOW_IT_WORKS_TABS,
} from '../../data/consignmentHowItWorks.js';
import { loadSettings } from '../../services/consignmentService.js';
import {
  auctionSplit,
  DEFAULT_COMMISSION_PCT,
  DEFAULT_SOFT_CLOSE_MINUTES,
} from '../../utils/consignmentAuctionMath.js';
import { formatDollars } from '../../utils/consignmentMoney.js';

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

export default function ConsignmentHowItWorksModal({ initialTab = 'buying', onClose }) {
  const [tab, setTab] = useState(initialTab);
  const [values, setValues] = useState(() => valuesFrom(null));
  const current = HOW_IT_WORKS_TABS.find((t) => t.id === tab) || HOW_IT_WORKS_TABS[0];
  const fill = (text) => fillHowItWorks(text, values);

  useEffect(() => {
    loadSettings().then((row) => setValues(valuesFrom(row))).catch(() => {});
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="cs-modal" role="dialog" aria-modal="true" aria-labelledby="cs-how-title" onClick={onClose}>
      <div className="cs-modal-card cs-how" onClick={(e) => e.stopPropagation()}>
        <div className="cs-how-head">
          <h2 id="cs-how-title">How FRPL Consignment works</h2>
          <button type="button" className="cs-how-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="cs-tabs" role="tablist">
          {HOW_IT_WORKS_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={t.id === tab}
              className={t.id === tab ? 'active' : ''}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="cs-how-intro">{fill(current.intro)}</p>
        <ol className="cs-how-steps">
          {current.steps.map((step) => <li key={step}>{fill(step)}</li>)}
        </ol>
        {current.example ? (
          <div className="cs-how-example">
            <strong>{fill(current.exampleTitle)}</strong>
            <ul>
              {current.example.map((line) => <li key={line}>{fill(line)}</li>)}
            </ul>
          </div>
        ) : null}
        <p className="cs-hint">{fill(HOW_IT_WORKS_FOOTER)}</p>
        <div className="cs-actions">
          <button type="button" className="cs-btn" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}
