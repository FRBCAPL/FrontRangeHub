import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CASH_CLIMB_GUIDE_HASH } from './cash-climb/cashClimbGuideRoute.js';
import { SHOWDOWN_GUIDE_HASH } from './showdown/public/showdownGuideRoute.js';

/** Lets readers of either public guide switch to the other format. Hidden on the TV board. */
export default function GuideFormatSwitch({ current }) {
  const navigate = useNavigate();
  const tab = (id, label, hash) => (
    <button
      type="button"
      role="tab"
      aria-selected={current === id}
      className={`cc-guide-switch-btn${current === id ? ' is-active' : ''}`}
      onClick={() => { if (current !== id) navigate(hash); }}
    >
      {label}
    </button>
  );
  return (
    <div className="cc-guide-switch" role="tablist" aria-label="Tournament format">
      {tab('cash-climb', 'Cash Climb', CASH_CLIMB_GUIDE_HASH)}
      {tab('showdown', 'Cash Climb Showdown', SHOWDOWN_GUIDE_HASH)}
    </div>
  );
}
