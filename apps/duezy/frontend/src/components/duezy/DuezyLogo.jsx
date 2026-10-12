import React from 'react';

/** Coin mark + wordmark. */
export default function DuezyLogo({ size = 30 }) {
  return (
    <span className="dz-logo">
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <defs>
          <linearGradient id="dz-coin" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a5b4fc" />
            <stop offset="0.55" stopColor="#6366f1" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="18" fill="url(#dz-coin)" />
        <circle cx="20" cy="20" r="13.5" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
        <path d="M14 21.5l4 4 8.5-9" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="dz-logo-word">Duezy</span>
    </span>
  );
}
