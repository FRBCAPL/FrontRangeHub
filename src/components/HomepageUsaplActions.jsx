import React from 'react';

const LINKS = [
  { to: '/usapl/signup', label: 'Sign up' },
  { to: '/usapl/divisions', label: 'Divisions' },
  { to: '/usapl/dues', label: 'Pay dues' },
  { to: '/usapl/vegas-cup', label: 'Vegas Cup' },
];

export default function HomepageUsaplActions({ onOpen }) {
  return (
    <>
      <div className="usapool-home-actions" onClick={(event) => event.stopPropagation()}>
        {LINKS.map((link) => (
          <button
            key={link.to}
            type="button"
            className="usapool-site-btn"
            onClick={() => onOpen(link.to)}
          >
            {link.label}
          </button>
        ))}
      </div>
      <p className="usapool-home-tap">Or tap anywhere else on this card to open the league site</p>
    </>
  );
}
