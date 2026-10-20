import React from 'react';
import { USAPL_DUES_PRODUCTS } from '../../data/usaplConstants.js';

export default function UsaplDuesGuide() {
  return (
    <section className="usapl-dues-guide">
      <h2>Team dues</h2>
      <p className="usapl-meta usapl-dues-timing">$10 per player per match.</p>
      <p className="usapl-dues-amounts">
        {USAPL_DUES_PRODUCTS.team.map((product) => (
          <span key={product.id}>{product.label.replace('Team · ', '')} ${product.amount}</span>
        ))}
      </p>
      <p className="usapl-meta usapl-dues-timing">Due within 48 hours of play.</p>
      <p className="usapl-meta usapl-dues-timing">
        Late payments are subject to penalty as outlined in the local by-laws.
      </p>
    </section>
  );
}
