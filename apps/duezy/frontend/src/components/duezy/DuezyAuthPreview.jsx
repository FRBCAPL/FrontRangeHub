import React from 'react';

const ROWS = [
  { name: 'Rack Attack', note: 'all caught up', status: 'paid' },
  { name: 'Bullseye Bandits', note: 'owes $40', status: 'unpaid' },
  { name: 'Pin Pals', note: 'bye week', status: 'bye' },
];

/** Static "what you'll see" card on the sign-in page. */
export default function DuezyAuthPreview() {
  return (
    <div className="dz-preview" aria-hidden="true">
      <div className="dz-preview-head">
        <span>Week 6</span>
        <span className="dz-preview-amount">$280 <small>of $320</small></span>
      </div>
      <div className="dz-preview-bar"><span style={{ width: '87%' }} /></div>
      {ROWS.map((r) => (
        <div key={r.name} className={`dz-preview-row is-${r.status}`}>
          <span className="dz-dot" />
          <span className="dz-preview-name">{r.name}<small>{r.note}</small></span>
          <span className="dz-preview-chip">{r.status === 'paid' ? '✓ Paid' : r.status === 'bye' ? 'Bye' : 'Not yet'}</span>
        </div>
      ))}
    </div>
  );
}
