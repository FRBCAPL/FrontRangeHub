import React from 'react';

const BADGES = [
  { id: 'case', icon: '🏪', label: 'In the case', className: 'cs-shop-badge-case' },
  { id: 'auctions', icon: '🔨', label: 'Online auctions', className: 'cs-shop-badge-auction' },
];

export default function ConsignmentShopBadges({ status, counts, onPick }) {
  return (
    <div className="cs-shop-badges" role="group" aria-label="Show items">
      {BADGES.map((b) => {
        const active = status === b.id;
        return (
          <button
            key={b.id}
            type="button"
            className={`cs-shop-badge ${b.className}${active ? ' is-active' : ''}`}
            aria-pressed={active}
            onClick={() => onPick(active ? 'available' : b.id)}
          >
            <span aria-hidden="true">{b.icon}</span> {b.label}
            {counts[b.id] != null ? <span className="cs-shop-badge-count">{counts[b.id]}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
