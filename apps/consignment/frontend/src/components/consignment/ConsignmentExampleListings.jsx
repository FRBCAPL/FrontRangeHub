import React, { useEffect, useState } from 'react';
import { loadExamples } from '../../services/consignmentService.js';
import ConsignmentItemCard from './ConsignmentItemCard.jsx';

/** The shop's permanent example listings, shown below the real items. Hidden until examples exist. */
export default function ConsignmentExampleListings() {
  const [examples, setExamples] = useState([]);

  useEffect(() => {
    let alive = true;
    loadExamples()
      .then((rows) => { if (alive) setExamples(rows); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!examples.length) return null;
  return (
    <section className="cs-examples" aria-labelledby="cs-examples-title">
      <h2 id="cs-examples-title">Example listings</h2>
      <p className="cs-examples-lede">See what a listing looks like. Examples aren’t for sale.</p>
      <div className="cs-grid">
        {examples.map((item) => <ConsignmentItemCard key={item.id} item={item} />)}
      </div>
    </section>
  );
}
