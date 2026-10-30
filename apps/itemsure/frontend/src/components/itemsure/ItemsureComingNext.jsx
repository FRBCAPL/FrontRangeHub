import React from 'react';
import { PageHead } from './ItemsureUi.jsx';

const NOT_BUILT = [
  { title: 'Suppliers on items', body: 'Say who you buy each item from, their product code, the pack you order, and what it costs.' },
  { title: 'Purchase orders', body: 'Turn the shopping list into orders, grouped by supplier.' },
  { title: 'Receiving', body: 'Check deliveries against orders and add them to stock.' },
  { title: 'Inventory value', body: 'Track cost and value over time.' },
];

/** Features planned but not built yet. */
export default function ItemsureComingNext() {
  return (
    <div className="isu-page">
      <PageHead title="Coming next" description="Features we plan to add to ItemSure." />
      <div className="isu-placeholders">
        {NOT_BUILT.map((f) => (
          <article key={f.title} className="isu-card isu-placeholder">
            <span className="isu-badge">Not built yet</span>
            <h3>{f.title}</h3>
            <p className="isu-muted">{f.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
