import React from 'react';
import './CashClimbWl.css';

export default function WinLoss({ wins = 0, losses = 0, prefix }) {
  return (
    <span className="cc-wl">
      {prefix ? <span className="cc-wl-prefix">{prefix} </span> : null}
      <span className="cc-wl-w">{wins || 0}</span>
      <span className="cc-wl-sep">–</span>
      <span className="cc-wl-l">{losses || 0}</span>
    </span>
  );
}
