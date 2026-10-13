import React from 'react';

/** Shimmering placeholders shown while a page loads. variant: 'league' | 'list' | 'form'. */
export default function DuezySkeleton({ variant = 'league', label = 'Loading…' }) {
  const blocks = {
    league: ['dz-sk-hero', 'dz-sk-summary', 'dz-sk-tabs', 'dz-sk-row', 'dz-sk-row', 'dz-sk-row', 'dz-sk-row'],
    list: ['dz-sk-title', 'dz-sk-card', 'dz-sk-card'],
    form: ['dz-sk-title', 'dz-sk-field', 'dz-sk-field', 'dz-sk-field', 'dz-sk-card'],
  }[variant] || [];

  return (
    <div className="dz-stack dz-skeleton" role="status" aria-live="polite" aria-busy="true">
      <span className="dz-sr-only">{label}</span>
      {blocks.map((cls, i) => <div key={i} className={`dz-sk ${cls}`} aria-hidden="true" />)}
    </div>
  );
}
