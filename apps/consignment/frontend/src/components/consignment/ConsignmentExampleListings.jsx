import React, { useEffect, useState } from 'react';
import { loadExamples } from '../../services/consignmentService.js';
import ConsignmentItemCard from './ConsignmentItemCard.jsx';

const HIDE_KEY = 'frpl-consignment-hide-examples';

function readHidden() {
  try { return localStorage.getItem(HIDE_KEY) === '1'; } catch { return false; }
}

/** The shop's permanent example listings, shown below the real items. Hidden until examples exist. */
export default function ConsignmentExampleListings() {
  const [examples, setExamples] = useState([]);
  const [hidden, setHidden] = useState(readHidden);

  useEffect(() => {
    let alive = true;
    loadExamples()
      .then((rows) => { if (alive) setExamples(rows); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const toggle = () => {
    const next = !hidden;
    setHidden(next);
    try { localStorage.setItem(HIDE_KEY, next ? '1' : '0'); } catch { /* private mode */ }
  };

  if (!examples.length) return null;
  return (
    <section className="cs-examples" aria-labelledby="cs-examples-title">
      <h2 id="cs-examples-title">Example listings</h2>
      {hidden ? null : <p className="cs-examples-lede">See what a listing looks like. Examples aren’t for sale.</p>}
      <button type="button" className="cs-examples-toggle" onClick={toggle} aria-expanded={!hidden}>
        {hidden ? `Show examples (${examples.length})` : 'Hide examples'}
      </button>
      {hidden ? null : (
        <div className="cs-grid">
          {examples.map((item) => <ConsignmentItemCard key={item.id} item={item} />)}
        </div>
      )}
    </section>
  );
}
