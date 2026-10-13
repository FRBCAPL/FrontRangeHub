import React from 'react';

const ROWS = [
  { name: 'Rack Attack', note: 'all caught up', status: 'paid', chip: '✓ Paid' },
  { name: 'Bullseye Bandits', note: 'owes $40 · 1 week late', status: 'unpaid', chip: 'Not yet' },
  { name: 'Lucky Strikes', note: 'paid $10 of $20 · Venmo from Ana', status: 'partial', chip: 'Partial' },
  { name: 'Cue Crew', note: 'make-up from Sep 9 · not late', status: 'makeup', chip: '↻ Make up' },
  { name: 'Pin Pals', note: 'bye week', status: 'bye', chip: 'Bye' },
];

/** Static "what you'll see" card on the sign-in page. */
export default function DuezyAuthPreview() {
  return (
    <div className="dz-preview" aria-hidden="true">
      <div className="dz-preview-head">
        <span>Week 6</span>
        <span className="dz-preview-amount">$250 <small>of $320</small></span>
      </div>
      <div className="dz-preview-bar"><span style={{ width: '78%' }} /></div>
      {ROWS.map((r) => (
        <div key={r.name} className={`dz-preview-row is-${r.status}`}>
          <span className="dz-dot" />
          <span className="dz-preview-name">{r.name}<small>{r.note}</small></span>
          <span className="dz-preview-chip">{r.chip}</span>
        </div>
      ))}
    </div>
  );
}
