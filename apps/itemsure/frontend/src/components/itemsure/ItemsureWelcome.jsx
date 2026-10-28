import React from 'react';
import { ITEMSURE_TAGLINE } from '../../data/itemsureConstants.js';

const PRINCIPLES = [
  {
    title: 'One catalog',
    body: 'Items, units, and categories belong to the organization. A bar, a retailer, and a warehouse use the same records.',
  },
  {
    title: 'Many locations',
    body: 'Each site keeps its own storage areas. A person can be limited to the sites where they work.',
  },
  {
    title: 'Separate businesses',
    body: 'One person can belong to more than one organization. Membership is the only way into that organization\u2019s data.',
  },
];

export default function ItemsureWelcome({ onSignIn, onSignUp }) {
  return (
    <div className="isu-welcome">
      <section className="isu-hero">
        <p className="isu-eyebrow">ItemSure</p>
        <h1>{ITEMSURE_TAGLINE}</h1>
        <p className="isu-lede">
          The inventory record for a business: what the items are, where they are kept, and who is allowed to see them.
        </p>
        <div className="isu-hero-actions">
          <button type="button" className="isu-btn isu-btn--primary" onClick={onSignUp}>Create account</button>
          <button type="button" className="isu-btn isu-btn--ghost" onClick={onSignIn}>Sign in</button>
        </div>
      </section>
      <section className="isu-principles">
        {PRINCIPLES.map((p) => (
          <article key={p.title} className="isu-card">
            <h2>{p.title}</h2>
            <p className="isu-muted">{p.body}</p>
          </article>
        ))}
      </section>
      <section className="isu-foundation-note">
        <h2>What works today</h2>
        <p className="isu-muted">
          You can create an organization, add locations and storage areas, keep an item catalog, run physical counts, approve them into on-hand stock, and record adjustments and transfers.
          Purchasing, receiving, and inventory value are not built yet, and they are labeled that way inside the app.
        </p>
      </section>
    </div>
  );
}
