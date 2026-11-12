import React from 'react';
import { AUCTION_DAY_CHOICES, formatEndHour } from '../../utils/consignmentAuctionDates.js';
import './consignment-auction-days.css';

/** 7- or 14-day auction toggle. `hint` replaces the default line under it. */
export default function ConsignmentAuctionDaysPicker({ value, onChange, endHour, hint, label = 'Auction length' }) {
  return (
    <div className="cs-field cs-days">
      <span id="cs-days-label">{label}</span>
      <div className="cs-days-options" role="radiogroup" aria-labelledby="cs-days-label">
        {AUCTION_DAY_CHOICES.map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={value === d}
            className={`cs-days-option${value === d ? ' active' : ''}`}
            onClick={() => onChange(d)}
          >
            {d} days
          </button>
        ))}
      </div>
      <p className="cs-hint">
        {hint ?? `Every auction ends at ${formatEndHour(endHour)} Colorado time, so evening bidders can catch the finish.`}
      </p>
    </div>
  );
}
