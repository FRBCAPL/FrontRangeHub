import React, { useEffect, useState } from 'react';
import { loadWatchCount } from '../../services/consignmentWatchService.js';

/** Seller's My items: "👀 3 people watching" on a listed item; nothing when no one is. */
export default function ConsignmentMyItemWatchers({ itemId }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    loadWatchCount(itemId).then((n) => { if (alive) setCount(n || 0); });
    return () => { alive = false; };
  }, [itemId]);

  if (!count) return null;
  return (
    <p className="cs-meta cs-mine-watchers">
      <span aria-hidden="true">👀</span> {count} {count === 1 ? 'person' : 'people'} watching
    </p>
  );
}
