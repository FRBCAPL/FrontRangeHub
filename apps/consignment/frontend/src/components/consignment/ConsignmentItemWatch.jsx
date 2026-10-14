import React, { useEffect, useRef, useState } from 'react';
import useWatchList from '../../hooks/useWatchList.js';
import { loadWatchCount } from '../../services/consignmentWatchService.js';
import ConsignmentWatchButton from './ConsignmentWatchButton.jsx';
import './consignment-watch.css';

/** Watch button and "N watching" for one item page. */
export default function ConsignmentItemWatch({ itemId }) {
  const { userId, watched, toggle, error } = useWatchList();
  const watching = watched.has(itemId);
  const [count, setCount] = useState(null);
  const first = useRef(true);

  useEffect(() => {
    let alive = true;
    const delay = first.current ? 0 : 600;
    first.current = false;
    const id = setTimeout(() => {
      loadWatchCount(itemId).then((n) => { if (alive) setCount(n); });
    }, delay);
    return () => { alive = false; clearTimeout(id); };
  }, [itemId, watching]);

  return (
    <div className="cs-item-watch">
      <ConsignmentWatchButton watching={watching} signedIn={Boolean(userId)} onToggle={() => toggle(itemId)} />
      {count ? <span className="cs-watch-count">{count} {count === 1 ? 'person' : 'people'} watching</span> : null}
      {error ? <p className="cs-error">{error}</p> : null}
    </div>
  );
}
