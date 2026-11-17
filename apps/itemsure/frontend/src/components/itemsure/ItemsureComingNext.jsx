import React from 'react';
import { PageHead } from './ItemsureUi.jsx';

const NOT_BUILT = [
  { title: 'Supplier pack sizes', body: 'You can already enter each supplier\'s as-ordered price and product code. Next: the pack size you order from them.' },
  { title: 'Purchase orders', body: 'Turn the shopping list into orders, grouped by supplier.' },
  { title: 'Receive against orders', body: 'You can already receive from the shopping list into stock. Next: check deliveries against purchase orders, then add them.' },
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
