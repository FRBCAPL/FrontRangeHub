import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import BreakAndRunTenBallSep from './BreakAndRunTenBallSep.jsx';

function tickerSeconds(travelPx) {
  const travel = Math.max(320, Number(travelPx) || 0);
  return Math.max(14, Math.min(90, travel / 55));
}

export default function BreakAndRunPublicTicker({ winners = [] }) {
  const maskRef = useRef(null);
  const trackRef = useRef(null);
  const [style, setStyle] = useState({
    animation: 'bnr-public-ticker-crawl 20s linear infinite',
    '--bnr-ticker-start': '100%',
    '--bnr-ticker-end': '-100%',
  });

  const copy = useMemo(
    () => winners
      .map((w) => `${w.playerName} ${w.amountLabel}${w.ballLabel ? ` (${w.ballLabel})` : ''}`)
      .join(' · '),
    [winners],
  );

  useLayoutEffect(() => {
    const measure = () => {
      const mask = maskRef.current;
      const track = trackRef.current;
      if (!mask || !track) return;
      const startPx = Math.max(1, mask.clientWidth);
      const endPx = Math.max(1, track.scrollWidth);
      const duration = tickerSeconds(startPx + endPx);
      setStyle({
        animation: `bnr-public-ticker-crawl ${duration}s linear infinite`,
        '--bnr-ticker-start': `${startPx}px`,
        '--bnr-ticker-end': `-${endPx}px`,
      });
    };

    measure();
    const frame = requestAnimationFrame(measure);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro && maskRef.current) ro.observe(maskRef.current);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame);
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [winners, copy]);

  if (!winners.length) {
    return (
      <footer className="bnr-public-ticker bnr-public-ticker-empty" aria-label="Recent payouts">
        <span className="bnr-public-ticker-label">Payouts</span>
        <p className="bnr-public-ticker-idle">Waiting for the first payout</p>
      </footer>
    );
  }

  return (
    <footer className="bnr-public-ticker" aria-label={`Recent payouts: ${copy}`}>
      <span className="bnr-public-ticker-label">Payouts</span>
      <div className="bnr-public-ticker-mask" ref={maskRef}>
        <div className="bnr-public-ticker-track" ref={trackRef} style={style}>
          {winners.map((win, index) => (
            <span className="bnr-public-ticker-item" key={`${win.id}-${index}`}>
              {index > 0 ? (
                <span className="bnr-public-ticker-sep" aria-hidden="true">
                  <BreakAndRunTenBallSep />
                </span>
              ) : null}
              <strong>{win.playerName}</strong>
              <em>{win.amountLabel}</em>
              {win.ballLabel ? <span className="bnr-public-ticker-detail">{win.ballLabel}</span> : null}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
