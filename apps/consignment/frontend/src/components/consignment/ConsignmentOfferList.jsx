import React from 'react';
import ConsignmentOfferCard from './ConsignmentOfferCard.jsx';

const ACTIVE = new Set(['open', 'accepted']);

/** Active offers first (ones waiting on this viewer at the top), then past ones. */
export function sortOffers(offers, view) {
  const rank = (o) => {
    if (o.status === 'open' && (view === 'buyer' ? o.turn === 'buyer' : o.turn === 'seller')) return 0;
    return ACTIVE.has(o.status) ? 1 : 2;
  };
  return [...(offers || [])].sort((a, b) => rank(a) - rank(b) || String(b.updated_at).localeCompare(String(a.updated_at)));
}

export default function ConsignmentOfferList({ offers, view, onChanged }) {
  return (
    <ul className="cs-offer-list">
      {sortOffers(offers, view).map((o) => <ConsignmentOfferCard key={o.id} offer={o} view={view} onChanged={onChanged} />)}
    </ul>
  );
}
