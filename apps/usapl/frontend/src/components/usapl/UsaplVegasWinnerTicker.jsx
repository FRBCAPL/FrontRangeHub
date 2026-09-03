import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usaplWinnerTickerItems } from '../../data/usaplVegasSeeds.js';
import { useUsaplVegasSeedStats } from '../../hooks/useUsaplVegasSeedStats.js';

function loopTrack(items) {
  if (!items.length) return items;
  let base = [...items];
  while (base.length < 6) base = base.concat(items);
  return [
    ...base.map((item, index) => ({ ...item, key: `${item.key}-a-${index}` })),
    ...base.map((item, index) => ({ ...item, key: `${item.key}-b-${index}` })),
  ];
}

export default function UsaplVegasWinnerTicker() {
  const { board, ineligible } = useUsaplVegasSeedStats();
  const items = useMemo(
    () => usaplWinnerTickerItems([...board, ...ineligible]),
    [board, ineligible]
  );
  const lines = items.length
    ? items
    : [{ key: 'placeholder', text: 'Division winners will appear here as sessions finish' }];
  const track = loopTrack(lines);
  const seconds = Math.max(24, lines.length * 8);

  return (
    <div className="usapl-vegas-ticker" role="marquee" aria-label="Division winners">
      <Link className="usapl-vegas-ticker-label" to="/usapl/past-divisions">
        Division winners
      </Link>
      <div className="usapl-vegas-ticker-window">
        <div
          className="usapl-vegas-ticker-track"
          style={{ animationDuration: `${seconds}s` }}
        >
          {track.map((item) => (
            <span className="usapl-vegas-ticker-item" key={item.key}>
              {item.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
