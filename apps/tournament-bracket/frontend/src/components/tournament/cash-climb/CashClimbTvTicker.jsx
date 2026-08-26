import React, { useLayoutEffect, useRef, useState } from 'react';
import { tickerDurationSec, tickerGroupsCopy, tickerResultGroups } from './cashClimbTv.js';

function TickerMatch({ item }) {
  if (item.kind === 'bye') {
    return (
      <>
        <span className="cc-tv-ticker-win">{item.winner}</span>
        <span> — bye</span>
      </>
    );
  }
  return (
    <>
      <span className="cc-tv-ticker-win">{item.winner}</span>
      <span className="cc-tv-ticker-vs">vs</span>
      <span className="cc-tv-ticker-lose">{item.loser}</span>
      {item.score ? <span> {item.score}</span> : null}
    </>
  );
}

export default function CashClimbTvTicker({ matches, rounds }) {
  const groups = tickerResultGroups(matches, rounds);
  const copy = tickerGroupsCopy(groups);
  const maskRef = useRef(null);
  const trackRef = useRef(null);
  const [duration, setDuration] = useState(16);

  useLayoutEffect(() => {
    const measure = () => {
      const mask = maskRef.current;
      const track = trackRef.current;
      if (!mask || !track) return;
      setDuration(tickerDurationSec(copy, track.scrollWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (maskRef.current) ro.observe(maskRef.current);
    if (trackRef.current) ro.observe(trackRef.current);
    return () => ro.disconnect();
  }, [copy]);

  if (!groups.length) return null;

  return (
    <footer className="cc-tv-ticker" aria-label={`Recent results: ${copy}`}>
      <span className="cc-tv-ticker-label">Results</span>
      <div className="cc-tv-ticker-mask" ref={maskRef}>
        <p
          className="cc-tv-ticker-track"
          ref={trackRef}
          style={{ animationDuration: `${duration}s` }}
        >
          {groups.map((group, groupIndex) => (
            <span className="cc-tv-ticker-group" key={group.roundId}>
              {group.round ? <span className="cc-tv-ticker-round">{group.round}</span> : null}
              {group.items.map((item, index) => (
                <span className="cc-tv-ticker-item" key={`${item.text}-${index}`}>
                  {index > 0 ? <span className="cc-tv-ticker-sep">•</span> : null}
                  <TickerMatch item={item} />
                </span>
              ))}
              {groupIndex < groups.length - 1 ? (
                <span className="cc-tv-ticker-round-sep" aria-hidden="true">|</span>
              ) : null}
            </span>
          ))}
        </p>
      </div>
    </footer>
  );
}
