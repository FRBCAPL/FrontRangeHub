import React from 'react';

export default function LiveDots({ label }) {
  return (
    <span title={label} className="lg-live">
      <span aria-hidden="true" className="lg-live__dot">
        <span className="lg-live__ping" />
        <span className="lg-live__core" />
      </span>
      <span aria-hidden="true" className="lg-live__text">Now playing</span>
      <span className="lg-sr-only">{label}</span>
    </span>
  );
}
