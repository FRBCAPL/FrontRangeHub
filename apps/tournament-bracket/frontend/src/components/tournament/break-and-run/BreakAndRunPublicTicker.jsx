import React, { useLayoutEffect, useRef, useState } from 'react';

function tickerSeconds(itemCount, trackWidth) {
  const width = Math.max(320, Number(trackWidth) || 0);
  const base = 12 + itemCount * 2.5;
  return Math.max(14, Math.min(48, base + width / 180));
}

export default function BreakAndRunPublicTicker({ winners = [] }) {
  const maskRef = useRef(null);
  const trackRef = useRef(null);
  const [duration, setDuration] = useState(18);

  useLayoutEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      setDuration(tickerSeconds(winners.length, track.scrollWidth));
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro && trackRef.current) ro.observe(trackRef.current);
    if (ro && maskRef.current) ro.observe(maskRef.current);
    return () => ro?.disconnect();
  }, [winners]);

  if (!winners.length) {
    return (
      <footer className="bnr-public-ticker bnr-public-ticker-empty" aria-label="Recent payouts">
        <span className="bnr-public-ticker-label">Payouts</span>
        <p className="bnr-public-ticker-idle">Waiting for the first payout</p>
      </footer>
    );
  }

  const copy = winners
    .map((w) => `${w.playerName} ${w.amountLabel}${w.detail ? ` (${w.detail})` : ''}`)
    .join(' · ');

  return (
    <footer className="bnr-public-ticker" aria-label={`Recent payouts: ${copy}`}>
      <span className="bnr-public-ticker-label">Payouts</span>
      <div className="bnr-public-ticker-mask" ref={maskRef}>
        <p
          className="bnr-public-ticker-track"
          ref={trackRef}
          style={{ animationDuration: `${duration}s` }}
        >
          {winners.map((win, index) => (
            <span className="bnr-public-ticker-item" key={`${win.id}-${index}`}>
              {index > 0 ? <span className="bnr-public-ticker-sep" aria-hidden="true">•</span> : null}
              <strong>{win.playerName}</strong>
              <em>{win.amountLabel}</em>
              {win.detail ? <span className="bnr-public-ticker-detail">{win.detail}</span> : null}
            </span>
          ))}
          {winners.map((win, index) => (
            <span className="bnr-public-ticker-item" key={`loop-${win.id}-${index}`} aria-hidden="true">
              <span className="bnr-public-ticker-sep">•</span>
              <strong>{win.playerName}</strong>
              <em>{win.amountLabel}</em>
              {win.detail ? <span className="bnr-public-ticker-detail">{win.detail}</span> : null}
            </span>
          ))}
        </p>
      </div>
    </footer>
  );
}
