import React from 'react';

export const PREVIEW_SAMPLES = {
  pool: {
    title: 'Tuesday 8-Ball · Week 6',
    collected: '$250',
    due: '$320',
    pct: 78,
    rows: [
      { name: 'Rack Attack', note: 'all caught up', status: 'paid', chip: '✓ Paid' },
      { name: 'Bullseye Bandits', note: 'owes $40 · 1 week late', status: 'unpaid', chip: 'Not yet' },
      { name: 'Lucky Strikes', note: 'paid $10 of $20 · Venmo from Ana', status: 'partial', chip: 'Partial' },
      { name: 'Cue Crew', note: 'make-up from Sep 9 · not late', status: 'makeup', chip: '↻ Make up' },
      { name: 'Pin Pals', note: 'bye week', status: 'bye', chip: 'Bye' },
    ],
  },
  darts: {
    title: 'Thursday Darts · Week 3',
    collected: '$135',
    due: '$180',
    pct: 75,
    rows: [
      { name: 'Triple Twenty', note: 'paid ahead through week 5', status: 'paid', chip: '✓ Paid' },
      { name: 'Oche Kings', note: 'paid $15 of $30 · Zelle', status: 'partial', chip: 'Partial' },
      { name: 'Flight Risk', note: 'owes $30 · due tonight', status: 'unpaid', chip: 'Not yet' },
      { name: 'Bull Busters', note: 'make-up from Sep 18', status: 'makeup', chip: '↻ Make up' },
      { name: 'Steel Tips', note: 'bye week', status: 'bye', chip: 'Bye' },
    ],
  },
};

/** Static "what you'll see" card on the landing page. */
export default function DuezyAuthPreview({ sample = PREVIEW_SAMPLES.pool, className = '' }) {
  return (
    <div className={`dz-preview ${className}`.trim()} aria-hidden="true">
      <div className="dz-preview-head">
        <span>{sample.title}</span>
        <span className="dz-preview-amount">{sample.collected} <small>of {sample.due}</small></span>
      </div>
      <div className="dz-preview-bar"><span style={{ width: `${sample.pct}%` }} /></div>
      {sample.rows.map((r) => (
        <div key={r.name} className={`dz-preview-row is-${r.status}`}>
          <span className="dz-dot" />
          <span className="dz-preview-name">{r.name}<small>{r.note}</small></span>
          <span className="dz-preview-chip">{r.chip}</span>
        </div>
      ))}
    </div>
  );
}
