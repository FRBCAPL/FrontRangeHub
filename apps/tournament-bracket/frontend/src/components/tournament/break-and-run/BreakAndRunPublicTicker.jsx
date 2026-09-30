import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import BreakAndRunTenBallSep from './BreakAndRunTenBallSep.jsx';

function tickerSeconds(travelPx) {
  const travel = Math.max(320, Number(travelPx) || 0);
  return Math.max(14, Math.min(90, travel / 55));
}

function winnerItems(winners) {
  return winners.map((w) => ({
    id: w.id,
    name: w.playerName,
    amount: w.amountLabel,
    detail: w.ballLabel || '',
  }));
}

/**
 * Scrolling one-line crawl. Pass `winners` for the payouts ticker, or `items`
 * ({ id, name, amount, detail, isMiss }) with a `label` for other feeds.
 * An item with `heading` renders as an inline group tag instead of an entry.
 */
export default function BreakAndRunPublicTicker({
  winners = [],
  items: itemsProp,
  label = 'Payouts',
  emptyText = 'Waiting for the first payout',
  className = '',
}) {
  const maskRef = useRef(null);
  const runRef = useRef(null);
  const [repeats, setRepeats] = useState(2);
  const [style, setStyle] = useState({
    animation: 'bnr-public-ticker-crawl 20s linear infinite',
    '--bnr-ticker-start': '100%',
    '--bnr-ticker-end': '-100%',
  });

  const items = useMemo(() => itemsProp || winnerItems(winners), [itemsProp, winners]);

  const copy = useMemo(
    () => items
      .map((it) => (it.heading
        ? `${it.heading}:`
        : `${it.name} ${it.amount}${it.detail ? ` (${it.detail})` : ''}`))
      .join(' · '),
    [items],
  );

  useLayoutEffect(() => {
    const measure = () => {
      const mask = maskRef.current;
      const run = runRef.current;
      if (!mask || !run) return;
      const runPx = Math.max(1, run.offsetWidth);
      // Enough back-to-back copies that the strip never shows empty space.
      setRepeats(Math.max(2, Math.ceil(mask.clientWidth / runPx) + 1));
      setStyle({
        animation: `bnr-public-ticker-crawl ${tickerSeconds(runPx)}s linear infinite`,
        '--bnr-ticker-start': '0px',
        '--bnr-ticker-end': `-${runPx}px`,
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
  }, [copy]);

  const rootClass = `bnr-public-ticker${className ? ` ${className}` : ''}`;

  if (!items.length) {
    return (
      <footer className={`${rootClass} bnr-public-ticker-empty`} aria-label={label}>
        <span className="bnr-public-ticker-label">{label}</span>
        <p className="bnr-public-ticker-idle">{emptyText}</p>
      </footer>
    );
  }

  return (
    <footer className={rootClass} aria-label={`${label}: ${copy}`}>
      <span className="bnr-public-ticker-label">{label}</span>
      <div className="bnr-public-ticker-mask" ref={maskRef}>
        <div className="bnr-public-ticker-track" style={style}>
          {Array.from({ length: repeats }, (_, copyIndex) => (
            <span
              className="bnr-public-ticker-run"
              key={copyIndex}
              ref={copyIndex === 0 ? runRef : undefined}
              aria-hidden={copyIndex > 0 ? 'true' : undefined}
            >
              {items.map((it, index) => (it.heading ? (
                <span className="bnr-public-ticker-group" key={`h-${it.heading}-${index}`}>
                  {it.heading}
                </span>
              ) : (
                <span className="bnr-public-ticker-item" key={`${it.id}-${index}`}>
                  {index > 0 && !items[index - 1].heading ? (
                    <span className="bnr-public-ticker-sep" aria-hidden="true">
                      <BreakAndRunTenBallSep />
                    </span>
                  ) : null}
                  <strong>{it.name}</strong>
                  <em className={it.isMiss ? 'is-miss' : undefined}>{it.amount}</em>
                  {it.detail ? <span className="bnr-public-ticker-detail">{it.detail}</span> : null}
                </span>
              )))}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
