import React from 'react';

const FEATURES = [
  { icon: '⚡', title: 'Two-minute setup', text: 'Name your league, set dues, add your teams.' },
  { icon: '✓', title: 'One tap per team', text: 'Paid, partial, bye or make-up — right from your phone.' },
  { icon: '💬', title: 'Know who owes', text: 'Late teams at a glance, plus a ready-made reminder to copy.' },
  { icon: '📊', title: 'Books that balance', text: 'Cash vs Venmo totals, bank deposits, PDF and CSV reports.' },
];

/** Landing: the four things Duezy does, in one row. */
export default function DuezyAuthFeatures() {
  return (
    <ul className="dz-land-features" aria-label="What Duezy does">
      {FEATURES.map((f) => (
        <li key={f.title}>
          <span className="dz-feature-icon">{f.icon}</span>
          <strong>{f.title}</strong>
          <small>{f.text}</small>
        </li>
      ))}
    </ul>
  );
}
